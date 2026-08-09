package domain

import "strconv"

// Валидатор сценариев (модуль M5). Проверяет структуру; содержание
// (правдоподобность вариантов, тон обратной связи) проверяется на ревью.

// Issue — нарушение правила. Path указывает место в файле сценария.
type Issue struct {
	Path    string // например: steps[2].options[0].next_step
	Message string
}

// ValidateScenario возвращает все найденные нарушения; пустой срез означает,
// что сценарий пригоден к загрузке. knownSignals — каталог признаков риска.
//
// Правила:
//  1. Обязательные поля заполнены, role и difficulty из перечислений.
//  2. От 3 до 8 шагов типа dialog, ровно один стартовый, есть терминальный.
//  3. У шага dialog ровно три варианта: safe, risky, critical.
//  4. Вес варианта соответствует outcome по таблице Weights.
//  5. Каждый вариант ведёт на существующий шаг.
//  6. Все шаги достижимы от стартового, из каждого достижим терминальный.
//  7. Каждый шаг размечен признаком риска из каталога.
//  8. У каждого варианта непустой feedback.
func ValidateScenario(scenario Scenario, knownSignals map[string]RiskSignal) []Issue {
	issues := make([]Issue, 0, 4)

	add := func(path, message string) {
		issues = append(issues, Issue{Path: path, Message: message})
	}

	if scenario.Code == "" {
		add("code", "код сценария не заполнен")
	}
	if !scenario.Role.Valid() {
		add("role", "роль должна быть buyer или seller")
	}
	if !scenario.Difficulty.Valid() {
		add("difficulty", "сложность должна быть basic, advanced или demo")
	}

	dialogCount := 0
	startCount := 0
	terminalCount := 0
	stepCodes := make(map[string]struct{}, len(scenario.Steps))

	for i, step := range scenario.Steps {
		path := pathAt("steps", i)
		stepCodes[step.Code] = struct{}{}

		if step.Code == "" {
			add(path+".code", "код шага не заполнен")
		}

		switch step.Type {
		case StepTypeDialog:
			dialogCount++
			step.addDialogIssues(path, add)
		case StepTypeTerminal:
			terminalCount++
			if len(step.Options) > 0 {
				add(path+".options", "терминальный шаг не должен иметь вариантов")
			}
		default:
			add(path+".type", "тип шага должен быть dialog или terminal")
		}

		if step.IsStart {
			startCount++
		}
		if len(step.RiskSignalCodes) == 0 {
			add(path+".risk_signals", "шаг не размечен признаком риска")
		}
		for _, code := range step.RiskSignalCodes {
			if _, ok := knownSignals[code]; !ok {
				add(path+".risk_signals", "признак риска "+code+" отсутствует в каталоге")
			}
		}
	}

	if dialogCount < 3 || dialogCount > 8 {
		add("steps", "должно быть от 3 до 8 шагов диалога")
	}
	if startCount != 1 {
		add("steps", "должен быть ровно один стартовый шаг")
	}
	if terminalCount == 0 {
		add("steps", "должен быть терминальный шаг")
	}

	for i, step := range scenario.Steps {
		for _, option := range step.Options {
			path := pathAt("steps", i) + ".options"
			if option.NextStepCode != "" {
				if _, ok := stepCodes[option.NextStepCode]; !ok {
					add(path, "вариант ведёт на несуществующий шаг "+option.NextStepCode)
				}
			}
		}
	}

	for _, code := range unreachable(scenario) {
		add("steps", "шаг "+code+" недостижим от стартового или не ведёт к терминальному")
	}

	return issues
}

func (s Step) addDialogIssues(path string, add func(string, string)) {
	if s.Type != StepTypeDialog {
		return
	}

	if len(s.Options) != 3 {
		add(path+".options", "у шага диалога должно быть ровно три варианта")
		return
	}

	outcomes := make(map[Outcome]int, len(s.Options))
	for i, option := range s.Options {
		optionPath := pathAt(path+".options", i)
		outcomes[option.Outcome]++
		if option.Score != option.Outcome.Score() {
			add(optionPath+".score", "вес варианта не соответствует последствию")
		}
		if option.Feedback == "" {
			add(optionPath+".feedback", "у варианта нет обратной связи")
		}
	}

	for _, outcome := range []Outcome{OutcomeSafe, OutcomeRisky, OutcomeCritical} {
		if outcomes[outcome] != 1 {
			add(path+".options", "нужен ровно один вариант с последствием "+string(outcome))
		}
	}
}

// unreachable находит шаги, которые нельзя достичь от стартового, либо из
// которых не достижим терминальный. Обход в обе стороны по next_step.
func unreachable(scenario Scenario) []string {
	byCode := make(map[string]Step, len(scenario.Steps))
	for _, step := range scenario.Steps {
		byCode[step.Code] = step
	}

	reachableFromStart := map[string]bool{}
	var walk func(code string)
	walk = func(code string) {
		step, ok := byCode[code]
		if !ok || reachableFromStart[code] {
			return
		}
		reachableFromStart[code] = true
		for _, option := range step.Options {
			if option.NextStepCode != "" {
				walk(option.NextStepCode)
			}
		}
	}

	reachesTerminal := map[string]bool{}
	var reverse func(code string) bool
	reverse = func(code string) bool {
		if v, seen := reachesTerminal[code]; seen {
			return v
		}
		step, ok := byCode[code]
		if !ok {
			return false
		}
		reachesTerminal[code] = false // защита от циклов
		for _, option := range step.Options {
			if option.NextStepCode != "" && reverse(option.NextStepCode) {
				reachesTerminal[code] = true
				break
			}
		}
		if step.Type == StepTypeTerminal {
			reachesTerminal[code] = true
		}
		return reachesTerminal[code]
	}

	var start string
	for _, step := range scenario.Steps {
		if step.IsStart {
			start = step.Code
		}
	}
	if start != "" {
		walk(start)
	}
	for _, step := range scenario.Steps {
		reverse(step.Code)
	}

	bad := make([]string, 0)
	for _, step := range scenario.Steps {
		if step.Code == "" {
			continue
		}
		if !reachableFromStart[step.Code] || !reachesTerminal[step.Code] {
			bad = append(bad, step.Code)
		}
	}

	return bad
}

// pathAt собирает путь в отчёте в стиле steps[2].options[0].
func pathAt(prefix string, index int) string {
	return prefix + "[" + strconv.Itoa(index) + "]"
}
