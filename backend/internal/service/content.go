package service

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/PaulLocust/Avito-Hackathon-Case-5/backend/internal/domain"
	"github.com/PaulLocust/Avito-Hackathon-Case-5/backend/internal/repository"
)

type contentService struct {
	scenarios repository.ScenarioRepository
	signals   repository.RiskSignalRepository
}

var _ ContentService = (*contentService)(nil)

// LoadFromDir загружает каталог признаков риска и все сценарии из
// <dir>/scenarios/*.json (M5). Загрузка идемпотентна: версия сценария
// поднимается только при изменении хеша содержимого, неизменный контент
// помечается как пропущенный. Сценарий с нарушениями не загружается, но не
// останавливает загрузку остальных — нарушения собираются в отчёт.
func (s *contentService) LoadFromDir(ctx context.Context, dir string) (LoadReport, error) {
	report := LoadReport{Issues: make(map[string][]domain.Issue)}

	signals, err := loadRiskSignals(filepath.Join(dir, "risk_signals.json"))
	if err != nil {
		return report, err
	}
	if err = s.signals.Upsert(ctx, signals); err != nil {
		return report, fmt.Errorf("загрузка признаков риска: %w", err)
	}
	report.SignalsLoaded = len(signals)

	known := make(map[string]domain.RiskSignal, len(signals))
	for _, signal := range signals {
		known[signal.Code] = signal
	}

	paths, err := filepath.Glob(filepath.Join(dir, "scenarios", "*.json"))
	if err != nil {
		return report, fmt.Errorf("поиск сценариев: %w", err)
	}
	sort.Strings(paths)

	for _, path := range paths {
		name := filepath.Base(path)
		if name == scenarioSchemaFile {
			continue
		}

		data, err := os.ReadFile(path) //nolint:gosec // путь собирается из фиксированного каталога seed, а не из ввода пользователя
		if err != nil {
			report.Issues[name] = []domain.Issue{{Message: fmt.Sprintf("чтение файла: %v", err)}}
			continue
		}

		scenario, err := parseScenario(data)
		if err != nil {
			report.Issues[name] = []domain.Issue{{Message: err.Error()}}
			continue
		}

		if issues := domain.ValidateScenario(scenario, known); len(issues) > 0 {
			report.Issues[name] = issues
			continue
		}

		version, written, err := s.scenarios.Upsert(ctx, scenario, contentHash(data))
		if err != nil {
			return report, fmt.Errorf("сценарий %s: %w", scenario.Code, err)
		}
		switch {
		case !written:
			report.ScenariosSkipped = append(report.ScenariosSkipped, scenario.Code)
		case version == 1:
			report.ScenariosCreated = append(report.ScenariosCreated, scenario.Code)
		default:
			report.ScenariosUpdated = append(report.ScenariosUpdated, scenario.Code)
		}
	}

	return report, nil
}

// loadRiskSignals разбирает risk_signals.json. Каталог — общий словарь
// контента, оценки и интерфейса, поэтому нарушение формата останавливает
// загрузку целиком.
func loadRiskSignals(path string) ([]domain.RiskSignal, error) {
	data, err := os.ReadFile(path) //nolint:gosec // путь фиксированный: seed/risk_signals.json из конфигурации
	if err != nil {
		return nil, fmt.Errorf("чтение каталога признаков риска: %w", err)
	}

	var fileSignals []struct {
		Code           string   `json:"code"`
		Side           string   `json:"side"`
		Title          string   `json:"title"`
		Summary        string   `json:"summary"`
		Description    string   `json:"description"`
		HowToRecognize []string `json:"how_to_recognize"`
		HowToAct       string   `json:"how_to_act"`
	}
	if err := json.Unmarshal(data, &fileSignals); err != nil {
		return nil, fmt.Errorf("разбор каталога признаков риска: %w", err)
	}

	signals := make([]domain.RiskSignal, 0, len(fileSignals))
	for _, s := range fileSignals {
		signals = append(signals, domain.RiskSignal{
			Code:           s.Code,
			Side:           domain.Side(s.Side),
			Title:          s.Title,
			Summary:        s.Summary,
			Description:    s.Description,
			HowToRecognize: s.HowToRecognize,
			HowToAct:       s.HowToAct,
		})
	}

	return signals, nil
}

// parseScenario разбирает файл сценария по scenario.schema.json. Неизвестные
// поля отвергаются (additionalProperties: false), чтобы опечатка в имени не
// привела к молчаливому исчезновению шага.
func parseScenario(data []byte) (domain.Scenario, error) {
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()

	var file scenarioFile
	if err := decoder.Decode(&file); err != nil {
		return domain.Scenario{}, fmt.Errorf("разбор файла сценария: %w", err)
	}

	scenario := domain.Scenario{
		Code:             file.Code,
		Role:             file.Role,
		Title:            file.Title,
		Description:      file.Description,
		Intro:            file.Intro,
		Difficulty:       file.Difficulty,
		EstimatedMinutes: file.EstimatedMinutes,
	}

	start := make(map[string]bool)
	if file.StartStep != "" {
		start[file.StartStep] = true
	}

	for i, fileStep := range file.Steps {
		step := domain.Step{
			Code:            fileStep.Code,
			Type:            domain.StepType(fileStep.Type),
			Position:        i,
			Content:         fileStep.Content.toDomain(),
			RiskSignalCodes: fileStep.RiskSignals,
			IsStart:         start[fileStep.Code],
		}
		if step.Type == domain.StepTypeDialog {
			scenario.StepsCount++
		}
		for j, fileOption := range fileStep.Options {
			step.Options = append(step.Options, domain.Option{
				Code:         fileOption.Code,
				Text:         fileOption.Text,
				Outcome:      fileOption.Outcome,
				Score:        fileOption.Score,
				Feedback:     fileOption.Feedback,
				NextStepCode: fileOption.NextStep,
				Position:     j,
			})
		}
		scenario.Steps = append(scenario.Steps, step)
	}

	return scenario, nil
}

// contentHash — хеш файла сценария: правка контента поднимает версию (FR32).
func contentHash(data []byte) string {
	sum := sha256.Sum256(data)
	return fmt.Sprintf("%x", sum)
}

// scenarioSchemaFile — схема сценария живёт в том же каталоге, что и сами
// сценарии (контракт из дня 1), поэтому загрузчик её пропускает.
const scenarioSchemaFile = "scenario.schema.json"

type scenarioFile struct {
	Code             string            `json:"code"`
	Role             domain.Role       `json:"role"`
	Title            string            `json:"title"`
	Description      string            `json:"description"`
	Intro            string            `json:"intro"`
	Difficulty       domain.Difficulty `json:"difficulty"`
	EstimatedMinutes int               `json:"estimated_minutes"`
	StartStep        string            `json:"start_step"`
	Steps            []stepFile        `json:"steps"`
}

type stepFile struct {
	Code        string       `json:"code"`
	Type        string       `json:"type"`
	Content     contentFile  `json:"content"`
	RiskSignals []string     `json:"risk_signals"`
	Options     []optionFile `json:"options"`
}

type contentFile struct {
	Message    string          `json:"message"`
	Sender     string          `json:"sender"`
	Context    string          `json:"context"`
	Attachment *attachmentFile `json:"attachment"`
}

type attachmentFile struct {
	Kind    string `json:"kind"`
	Caption string `json:"caption"`
}

type optionFile struct {
	Code     string         `json:"code"`
	Text     string         `json:"text"`
	Outcome  domain.Outcome `json:"outcome"`
	Score    int            `json:"score"`
	Feedback string         `json:"feedback"`
	NextStep string         `json:"next_step"`
}

func (c contentFile) toDomain() domain.StepContent {
	content := domain.StepContent{
		Message: c.Message,
		Context: c.Context,
		Sender:  domain.SenderCounterparty,
	}
	if c.Sender != "" {
		content.Sender = domain.MessageSender(c.Sender)
	}
	if c.Attachment != nil {
		content.Attachment = &domain.Attachment{Kind: c.Attachment.Kind, Caption: c.Attachment.Caption}
	}
	return content
}
