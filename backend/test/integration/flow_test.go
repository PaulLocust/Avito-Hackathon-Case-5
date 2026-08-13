//go:build integration

package integration_test

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/PaulLocust/Avito-Hackathon-Case-5/backend/internal/domain"
)

// TestKeyUserPath — сквозной путь, ради которого продукт существует:
// регистрация → витрина → тренировка → разбор → прогресс.
func TestKeyUserPath(t *testing.T) {
	e := newEnv(t)
	token := e.registerUser("keypath")

	scenarios := e.expect(http.StatusOK, http.MethodGet, "/api/v1/scenarios", nil, token)
	items, ok := scenarios.body["items"].([]any)
	require.True(t, ok)
	require.NotEmpty(t, items, "витрина пуста — контент не загрузился")

	code := e.firstScenarioCode()

	sessionID, stepCode := e.startSession(code, token, false)
	require.NotEmpty(t, stepCode, "старт не отдал текущий шаг")

	// Проходим безопасно: ожидаем максимальный процент и верхний уровень.
	last := e.playToEnd(sessionID, stepCode, token, domain.OutcomeSafe)
	require.Nil(t, last.at("session.current_step"), "у завершённой сессии не должно быть текущего шага")
	require.Equal(t, "completed", e.sessionStatus(sessionID))

	result := e.expect(http.StatusOK, http.MethodGet,
		"/api/v1/sessions/"+sessionID+"/result", nil, token)

	require.Equal(t, 100, result.num("score.percent"))
	require.Equal(t, "resilient", result.str("score.level"))
	require.NotZero(t, result.num("score.answers_count"))

	breakdown, ok := result.body["breakdown"].([]any)
	require.True(t, ok)
	require.Len(t, breakdown, result.num("score.answers_count"), "разбор должен быть по каждому ответу")

	progress := e.expect(http.StatusOK, http.MethodGet, "/api/v1/progress", nil, token)
	require.Equal(t, 1, progress.num("completed_scenarios"))
	require.Equal(t, 1, progress.num("attempts_count"))
	require.Equal(t, 100, progress.num("best_percent"))
	require.Nil(t, progress.at("active_session"), "завершённая сессия не активна")

	attempts := e.expect(http.StatusOK, http.MethodGet,
		"/api/v1/scenarios/"+code+"/attempts", nil, token)
	attemptItems, ok := attempts.body["items"].([]any)
	require.True(t, ok)
	require.Len(t, attemptItems, 1)
}

// TestPauseAndContinue — замечание ментора: «Прервать тренировку» обещает
// возможность продолжить. Проверяем, что обещание выполняется, а не
// завершает сессию.
func TestPauseAndContinue(t *testing.T) {
	e := newEnv(t)
	token := e.registerUser("pauser")
	code := e.firstScenarioCode()

	sessionID, stepCode := e.startSession(code, token, false)

	first := e.answer(sessionID, stepCode, e.optionCode(sessionID, stepCode, domain.OutcomeSafe), token)
	require.False(t, first.body["session_finished"] == true, "сценарий короче двух шагов — тест бессмысленен")

	nextStep := first.str("session.current_step.code")
	scoreBeforePause := first.num("session.score")

	e.expect(http.StatusNoContent, http.MethodPost,
		"/api/v1/sessions/"+sessionID+"/abandon", nil, token)

	require.Equal(t, "paused", e.sessionStatus(sessionID), "прерывание должно ставить на паузу")

	// Пауза — не завершение: finished_at пустой, иначе сессия попадёт в
	// историю попыток как законченная.
	var finishedAt *string

	require.NoError(t, e.pool.QueryRow(context.Background(),
		"SELECT finished_at::text FROM sessions WHERE id = $1", sessionID).Scan(&finishedAt))
	require.Nil(t, finishedAt, "у приостановленной сессии не должно быть finished_at")

	paused := e.expect(http.StatusOK, http.MethodGet, "/api/v1/sessions/"+sessionID, nil, token)
	require.Equal(t, "paused", paused.str("status"))
	require.Equal(t, nextStep, paused.str("current_step.code"), "шаг для продолжения потерян")
	require.Equal(t, scoreBeforePause, paused.num("score"))

	// Приостановленную сессию главная страница предлагает продолжить.
	progress := e.expect(http.StatusOK, http.MethodGet, "/api/v1/progress", nil, token)
	require.Equal(t, sessionID, progress.str("active_session.session_id"))

	// Продолжение: ответ принимается и возвращает сессию в работу.
	resumed := e.answer(sessionID, nextStep, e.optionCode(sessionID, nextStep, domain.OutcomeSafe), token)
	require.Equal(t, "in_progress", resumed.str("session.status"))
	require.Equal(t, "in_progress", e.sessionStatus(sessionID))

	if resumed.at("session.current_step") != nil {
		e.playToEnd(sessionID, resumed.str("session.current_step.code"), token, domain.OutcomeSafe)
	}

	require.Equal(t, "completed", e.sessionStatus(sessionID), "продолженная тренировка должна доходить до конца")
}

// TestPauseIsIdempotent — повторное прерывание безвредно, а завершённую
// сессию прервать нельзя.
func TestPauseIsIdempotent(t *testing.T) {
	e := newEnv(t)
	token := e.registerUser("idempotent")
	code := e.firstScenarioCode()

	sessionID, stepCode := e.startSession(code, token, false)
	path := "/api/v1/sessions/" + sessionID + "/abandon"

	e.expect(http.StatusNoContent, http.MethodPost, path, nil, token)
	e.expect(http.StatusNoContent, http.MethodPost, path, nil, token)
	require.Equal(t, "paused", e.sessionStatus(sessionID))

	e.playToEnd(sessionID, stepCode, token, domain.OutcomeSafe)

	conflict := e.do(http.MethodPost, path, nil, token)
	require.Equal(t, http.StatusConflict, conflict.status, "завершённую сессию прерывать нельзя")
	require.Equal(t, "completed", e.sessionStatus(sessionID))
}

// TestRestartReplacesUnfinished — перезапуск атомарен и не оставляет двух
// незавершённых сессий по сценарию, в том числе если прежняя на паузе.
func TestRestartReplacesUnfinished(t *testing.T) {
	e := newEnv(t)
	token := e.registerUser("restarter")
	code := e.firstScenarioCode()

	first, stepCode := e.startSession(code, token, false)

	// Без restart вторая попытка запрещена — иначе «продолжить» неоднозначно.
	conflict := e.do(http.MethodPost, "/api/v1/sessions",
		map[string]any{"scenario_code": code}, token)
	require.Equal(t, http.StatusConflict, conflict.status)
	require.Equal(t, "session_already_active", conflict.str("error.code"))
	require.Equal(t, first, conflict.str("error.details.session_id"))

	e.answer(first, stepCode, e.optionCode(first, stepCode, domain.OutcomeSafe), token)
	e.expect(http.StatusNoContent, http.MethodPost, "/api/v1/sessions/"+first+"/abandon", nil, token)

	second, _ := e.startSession(code, token, true)
	require.NotEqual(t, first, second)
	require.Equal(t, "abandoned", e.sessionStatus(first), "перезапуск должен вытеснять приостановленную")

	require.Equal(t, 1, e.unfinishedCount(code), "по сценарию осталось больше одной незавершённой сессии")

	// Ответы прежней попытки не переносятся в новую.
	var answers int

	require.NoError(t, e.pool.QueryRow(context.Background(),
		"SELECT count(*) FROM answers WHERE session_id = $1", second).Scan(&answers))
	require.Zero(t, answers)
}

// TestGuestProgressIsClaimed — гость проходит тренировку без регистрации,
// после регистрации прогресс принадлежит аккаунту.
func TestGuestProgressIsClaimed(t *testing.T) {
	e := newEnv(t)
	code := e.firstScenarioCode()

	// Без токена: владельцем становится гостевая сессия из cookie.
	sessionID, stepCode := e.startSession(code, "", false)
	e.playToEnd(sessionID, stepCode, "", domain.OutcomeSafe)

	var guestOwned bool

	require.NoError(t, e.pool.QueryRow(context.Background(),
		"SELECT guest_session_id IS NOT NULL AND user_id IS NULL FROM sessions WHERE id = $1",
		sessionID).Scan(&guestOwned))
	require.True(t, guestOwned, "гостевая сессия должна принадлежать гостю")

	// Регистрация с той же cookie переносит прогресс.
	token := e.registerUser("claimer")

	var userOwned bool

	require.NoError(t, e.pool.QueryRow(context.Background(),
		"SELECT user_id IS NOT NULL AND guest_session_id IS NULL FROM sessions WHERE id = $1",
		sessionID).Scan(&userOwned))
	require.True(t, userOwned, "прогресс гостя не перенесён на аккаунт")

	progress := e.expect(http.StatusOK, http.MethodGet, "/api/v1/progress", nil, token)
	require.Equal(t, 1, progress.num("attempts_count"))
	require.Equal(t, 100, progress.num("best_percent"))

	// Разбор старой сессии доступен уже как свой.
	result := e.expect(http.StatusOK, http.MethodGet,
		"/api/v1/sessions/"+sessionID+"/result", nil, token)
	require.Equal(t, "resilient", result.str("score.level"))
}

// TestConcurrentAnswerIsSavedOnce — двойная отправка одного ответа (ретрай
// после таймаута, дабл-клик) не должна ни дублировать запись, ни ломать балл.
func TestConcurrentAnswerIsSavedOnce(t *testing.T) {
	e := newEnv(t)
	token := e.registerUser("racer")
	code := e.firstScenarioCode()

	sessionID, stepCode := e.startSession(code, token, false)
	optionCode := e.optionCode(sessionID, stepCode, domain.OutcomeCritical)

	const parallel = 4

	var (
		wg        sync.WaitGroup
		mu        sync.Mutex
		responses []response
	)

	wg.Add(parallel)

	for range parallel {
		go func() {
			defer wg.Done()

			res := e.do(http.MethodPost, fmt.Sprintf("/api/v1/sessions/%s/answers", sessionID),
				map[string]string{"step_code": stepCode, "option_code": optionCode}, token)

			mu.Lock()
			responses = append(responses, res)
			mu.Unlock()
		}()
	}

	wg.Wait()

	for _, res := range responses {
		require.Equal(t, http.StatusOK, res.status, "параллельная отправка не должна давать ошибку")
		require.Equal(t, -10, res.num("score_delta"))
	}

	var answers, score int

	require.NoError(t, e.pool.QueryRow(context.Background(),
		"SELECT count(*) FROM answers WHERE session_id = $1 AND step_code = $2",
		sessionID, stepCode).Scan(&answers))
	require.Equal(t, 1, answers, "ответ записан больше одного раза")

	require.NoError(t, e.pool.QueryRow(context.Background(),
		"SELECT score FROM sessions WHERE id = $1", sessionID).Scan(&score))
	require.Equal(t, -10, score, "балл начислен несколько раз")
}

// TestAnswerIsImmutable — изменить сделанный выбор нельзя: повторный запрос
// возвращает уже зафиксированный ответ, а не применяет новый.
func TestAnswerIsImmutable(t *testing.T) {
	e := newEnv(t)
	token := e.registerUser("immutable")
	code := e.firstScenarioCode()

	sessionID, stepCode := e.startSession(code, token, false)
	safe := e.optionCode(sessionID, stepCode, domain.OutcomeSafe)
	critical := e.optionCode(sessionID, stepCode, domain.OutcomeCritical)

	first := e.answer(sessionID, stepCode, safe, token)
	require.Equal(t, 10, first.num("score_delta"))
	require.False(t, first.body["already_answered"] == true)

	replay := e.answer(sessionID, stepCode, critical, token)
	require.True(t, replay.body["already_answered"] == true, "повтор должен помечаться already_answered")
	require.Equal(t, safe, replay.str("option_code"), "выбор подменён вторым запросом")
	require.Equal(t, 10, replay.num("session.score"))
}

// TestSchemaRejectsSecondUnfinishedSession — инвариант «одна незавершённая
// сессия на сценарий» держится схемой, а не только кодом сервиса. Проверяем
// напрямую в базе: сервис можно обойти, индекс — нет.
func TestSchemaRejectsSecondUnfinishedSession(t *testing.T) {
	e := newEnv(t)
	token := e.registerUser("invariant")
	code := e.firstScenarioCode()

	sessionID, _ := e.startSession(code, token, false)

	var userID, scenarioID string

	require.NoError(t, e.pool.QueryRow(context.Background(),
		"SELECT user_id::text, scenario_id::text FROM sessions WHERE id = $1",
		sessionID).Scan(&userID, &scenarioID))

	insert := func(status string) error {
		_, err := e.pool.Exec(context.Background(), `
			INSERT INTO sessions (user_id, scenario_id, scenario_code, scenario_version,
			                      status, current_step_code)
			VALUES ($1, $2, $3, 1, $4, 'x')`, userID, scenarioID, code, status)

		return err
	}

	require.Error(t, insert("in_progress"), "индекс пропустил вторую идущую сессию")

	e.expect(http.StatusNoContent, http.MethodPost,
		"/api/v1/sessions/"+sessionID+"/abandon", nil, token)

	require.Error(t, insert("paused"), "индекс не учитывает приостановленные сессии")
	require.Error(t, insert("in_progress"), "рядом с приостановленной нельзя завести идущую")
}

// TestPausedStatusIsAllowedBySchema — статус paused разрешён CHECK-ограничением
// и обязан идти без finished_at.
func TestPausedStatusIsAllowedBySchema(t *testing.T) {
	e := newEnv(t)
	token := e.registerUser("schema")
	code := e.firstScenarioCode()

	sessionID, _ := e.startSession(code, token, false)

	_, err := e.pool.Exec(context.Background(),
		"UPDATE sessions SET status = 'paused' WHERE id = $1", sessionID)
	require.NoError(t, err, "миграция не разрешает статус paused")

	_, err = e.pool.Exec(context.Background(),
		"UPDATE sessions SET finished_at = now() WHERE id = $1", sessionID)
	require.Error(t, err, "у приостановленной сессии не должно быть finished_at")
}
