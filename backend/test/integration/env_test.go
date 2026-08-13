//go:build integration

// Package integration_test поднимает приложение целиком — миграции, реальная
// PostgreSQL, все слои и HTTP-роутер — и проверяет ключевые пользовательские
// пути через API. Юнит-тесты работают на фейках репозиториев, поэтому не
// видят ошибок схемы: пропущенную миграцию, разъехавшийся CHECK, потерянный
// частичный уникальный индекс. Эти тесты видят.
//
// Запуск: make test-integration (тег integration + TEST_POSTGRES_DSN).
package integration_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/require"

	"github.com/PaulLocust/Avito-Hackathon-Case-5/backend/internal/config"
	"github.com/PaulLocust/Avito-Hackathon-Case-5/backend/internal/domain"
	"github.com/PaulLocust/Avito-Hackathon-Case-5/backend/internal/repository"
	"github.com/PaulLocust/Avito-Hackathon-Case-5/backend/internal/service"
	httptransport "github.com/PaulLocust/Avito-Hackathon-Case-5/backend/internal/transport/http"
	"github.com/PaulLocust/Avito-Hackathon-Case-5/backend/migrations"
)

// dsnEnv — строка подключения к тестовой базе. Без неё тесты пропускаются:
// на машине без PostgreSQL `go test -tags integration ./...` не должен падать.
const dsnEnv = "TEST_POSTGRES_DSN"

const seedDir = "../../seed"

// env — поднятое приложение: сервер на httptest и пул для прямых проверок
// схемы (статусы, ограничения, индексы).
type env struct {
	t      *testing.T
	server *httptest.Server
	pool   *pgxpool.Pool
	client *http.Client
}

func newJar(t *testing.T) *cookiejar.Jar {
	t.Helper()

	jar, err := cookiejar.New(nil)
	require.NoError(t, err)

	return jar
}

func newEnv(t *testing.T) *env {
	t.Helper()

	dsn := os.Getenv(dsnEnv)
	if dsn == "" {
		t.Skipf("нужна тестовая PostgreSQL: задайте %s", dsnEnv)
	}

	ctx := context.Background()

	migrate(t, dsn)

	pool, err := pgxpool.New(ctx, dsn)
	require.NoError(t, err, "пул к тестовой базе")
	t.Cleanup(pool.Close)

	// Каждый тест стартует с пустыми пользовательскими данными: контент
	// перезаливается сидером ниже, поэтому чистим всё.
	_, err = pool.Exec(ctx, `TRUNCATE
		answers, sessions, refresh_tokens, guest_sessions, revoked_tokens,
		users, options, steps, scenarios, risk_signals
		RESTART IDENTITY CASCADE`)
	require.NoError(t, err, "очистка таблиц")

	cfg := testConfig()

	repos := repository.New(pool)
	services := service.New(repos, cfg)

	log := slog.New(slog.NewTextHandler(io.Discard, nil))

	report, err := services.Content.LoadFromDir(ctx, seedDir)
	require.NoError(t, err, "загрузка контента")
	require.Empty(t, report.Issues, "контент из seed не проходит валидатор")
	require.NotEmpty(t, report.ScenariosCreated, "сценарии не загрузились")

	handler := httptransport.NewHandler(services, cfg, log, pool, "test")
	server := httptest.NewServer(httptransport.NewRouter(handler, cfg, log))
	t.Cleanup(server.Close)

	return &env{
		t:      t,
		server: server,
		pool:   pool,
		// Cookie jar нужен: гостевая сессия и refresh-токен живут в cookie,
		// клиент в тесте ведёт себя как браузер.
		client: &http.Client{Jar: newJar(t), Timeout: 10 * time.Second},
	}
}

func testConfig() config.Config {
	cfg := config.Config{
		Env:     "test",
		HTTP:    config.HTTPConfig{AllowedOrigins: []string{"http://localhost"}},
		Auth:    config.AuthConfig{JWTSecret: "integration-test-secret-key", Issuer: "test", AccessTTL: time.Hour, RefreshTTL: 24 * time.Hour, GuestTTL: 24 * time.Hour, BcryptCost: 4},
		Log:     config.LogConfig{Level: "error", Format: "text"},
		Scoring: config.ScoringConfig{Thresholds: domain.Thresholds{Resilient: 80, Attentive: 60}},
		Content: config.ContentConfig{SeedDir: seedDir},
	}

	return cfg
}

func migrate(t *testing.T, dsn string) {
	t.Helper()

	db, err := sql.Open("pgx", dsn)
	require.NoError(t, err)
	defer func() { _ = db.Close() }()

	goose.SetBaseFS(migrations.FS)
	goose.SetLogger(goose.NopLogger())
	require.NoError(t, goose.SetDialect("postgres"))
	require.NoError(t, goose.UpContext(context.Background(), db, "."), "миграции")
}

// ── HTTP-хелперы ─────────────────────────────────────────────────────────

// response — разобранный ответ API. Тело держим как map, а не как DTO:
// проверяем ровно тот JSON, который видит фронтенд.
type response struct {
	status int
	body   map[string]any
}

func (r response) str(path string) string {
	value, ok := r.at(path).(string)
	if !ok {
		return ""
	}

	return value
}

func (r response) num(path string) int {
	value, ok := r.at(path).(float64)
	if !ok {
		return 0
	}

	return int(value)
}

// at достаёт значение по пути вида "session.current_step.code".
func (r response) at(path string) any {
	var current any = r.body

	for _, key := range strings.Split(path, ".") {
		object, ok := current.(map[string]any)
		if !ok {
			return nil
		}

		current = object[key]
	}

	return current
}

func (e *env) do(method, path string, payload any, token string) response {
	e.t.Helper()

	var body io.Reader

	if payload != nil {
		raw, err := json.Marshal(payload)
		require.NoError(e.t, err)

		body = strings.NewReader(string(raw))
	}

	req, err := http.NewRequestWithContext(context.Background(), method, e.server.URL+path, body)
	require.NoError(e.t, err)

	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	res, err := e.client.Do(req)
	require.NoError(e.t, err)

	defer func() { _ = res.Body.Close() }()

	raw, err := io.ReadAll(res.Body)
	require.NoError(e.t, err)

	parsed := response{status: res.StatusCode}

	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &parsed.body); err != nil {
			e.t.Fatalf("%s %s: тело не JSON (%d): %s", method, path, res.StatusCode, raw)
		}
	}

	return parsed
}

// expect выполняет запрос и требует ожидаемый статус: неожиданный ответ
// печатается целиком, иначе отладка по «ожидал 200, получил 500» слепая.
func (e *env) expect(status int, method, path string, payload any, token string) response {
	e.t.Helper()

	res := e.do(method, path, payload, token)
	if res.status != status {
		raw, _ := json.Marshal(res.body)
		e.t.Fatalf("%s %s: ожидался статус %d, получен %d: %s", method, path, status, res.status, raw)
	}

	return res
}

// unfinishedCount — сколько сессий по сценарию можно продолжить. Инвариант
// FR12 допускает не больше одной.
func (e *env) unfinishedCount(scenarioCode string) int {
	e.t.Helper()

	var count int

	err := e.pool.QueryRow(context.Background(),
		"SELECT count(*) FROM sessions WHERE scenario_code = $1 AND status IN ('in_progress', 'paused')",
		scenarioCode).Scan(&count)
	require.NoError(e.t, err)

	return count
}

func (e *env) sessionStatus(id string) string {
	e.t.Helper()

	var status string

	err := e.pool.QueryRow(context.Background(),
		"SELECT status FROM sessions WHERE id = $1", id).Scan(&status)
	require.NoError(e.t, err)

	return status
}

// registerUser создаёт пользователя и возвращает access-токен. Гостевая
// cookie, если она уже есть в jar, уходит вместе с запросом — так проверяется
// перенос прогресса.
func (e *env) registerUser(nickname string) string {
	e.t.Helper()

	res := e.expect(http.StatusCreated, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"nickname": nickname,
		"password": "integration-pass",
	}, "")

	token := res.str("token")
	require.NotEmpty(e.t, token)

	return token
}

// startSession начинает сценарий и возвращает id сессии и код текущего шага.
func (e *env) startSession(scenarioCode, token string, restart bool) (string, string) {
	e.t.Helper()

	res := e.expect(http.StatusCreated, http.MethodPost, "/api/v1/sessions", map[string]any{
		"scenario_code": scenarioCode,
		"restart":       restart,
	}, token)

	return res.str("id"), res.str("current_step.code")
}

// answer отправляет ответ на текущий шаг.
func (e *env) answer(sessionID, stepCode, optionCode, token string) response {
	e.t.Helper()

	return e.expect(http.StatusOK, http.MethodPost,
		fmt.Sprintf("/api/v1/sessions/%s/answers", sessionID),
		map[string]string{"step_code": stepCode, "option_code": optionCode}, token)
}

// firstScenarioCode берёт код сценария из витрины: тесты не зашивают
// конкретный контент, иначе новый сценарий в seed ломал бы их.
func (e *env) firstScenarioCode() string {
	e.t.Helper()

	res := e.expect(http.StatusOK, http.MethodGet, "/api/v1/scenarios", nil, "")

	items, ok := res.body["items"].([]any)
	require.True(e.t, ok)
	require.NotEmpty(e.t, items)

	first, ok := items[0].(map[string]any)
	require.True(e.t, ok)

	code, ok := first["code"].(string)
	require.True(e.t, ok)

	return code
}

// optionCode выбирает вариант нужного исхода на текущем шаге сессии, а если
// такого на шаге нет — первый доступный. Варианты до ответа не раскрывают
// исход (это часть контракта), поэтому смотрим в базу.
func (e *env) optionCode(sessionID, stepCode string, outcome domain.Outcome) string {
	e.t.Helper()

	var code string

	err := e.pool.QueryRow(context.Background(), `
		SELECT o.code
		FROM options o
		JOIN steps s ON s.id = o.step_id
		JOIN sessions ses ON ses.scenario_id = s.scenario_id
		WHERE ses.id = $1 AND s.code = $2
		ORDER BY (o.outcome = $3) DESC, o.position
		LIMIT 1`, sessionID, stepCode, string(outcome)).Scan(&code)
	require.NoError(e.t, err, "варианты шага %s", stepCode)

	return code
}

// playToEnd проходит сценарий до конца, выбирая вариант заданного исхода;
// если такого на шаге нет, берётся первый доступный. Возвращает последний
// ответ API.
func (e *env) playToEnd(sessionID, stepCode, token string, outcome domain.Outcome) response {
	e.t.Helper()

	var last response

	for step := stepCode; step != ""; {
		last = e.answer(sessionID, step, e.optionCode(sessionID, step, outcome), token)
		if last.at("session.current_step") == nil {
			break
		}

		step = last.str("session.current_step.code")
	}

	require.True(e.t, last.body["session_finished"] == true, "сценарий не завершился")

	return last
}
