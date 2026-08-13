# Единые команды для команды. Запускать из корня репозитория.
# Windows: нужен GNU make; всё, что связано с запуском, работает и без него
# через docker compose.

SHELL := /bin/sh

BACKEND_DIR := backend
API_SPEC    := api/openapi.yaml
COVER_FILE  := coverage.out

GOLANGCI_LINT_VERSION := v2.1.6
PLAYWRIGHT_VERSION    := v1.50.0-noble
COMPOSE_NETWORK       := antiscam-trainer_default

# Отдельная база под интеграционные тесты: они чистят таблицы.
TEST_DSN := postgres://antiscam:antiscam-local-password@localhost:5432/antiscam_test?sslmode=disable

.DEFAULT_GOAL := help

.PHONY: up
up: ## Поднять приложение (postgres + backend)
	docker compose up -d --build
	@echo "API: http://localhost:8080/readyz"

.PHONY: down
down: ## Остановить, данные сохранить
	docker compose down

.PHONY: clean
clean: ## Остановить и удалить данные БД
	docker compose down -v

.PHONY: logs
logs: ## Логи сервисов
	docker compose logs -f

.PHONY: restart-backend
restart-backend: ## Пересобрать и перезапустить бэкенд
	docker compose up -d --build backend

.PHONY: psql
psql: ## Консоль psql
	docker compose exec postgres psql -U $${POSTGRES_USER:-antiscam} -d $${POSTGRES_DB:-antiscam}

.PHONY: seed
seed: ## Загрузить сценарии и справочник в поднятую БД
	docker compose exec backend /app/seeder

.PHONY: test
test: ## Тесты
	cd $(BACKEND_DIR) && go test ./... -count=1

# -race требует cgo и установленного C-компилятора: на Windows без него
# команда не запускается вовсе. В CI гонки проверяются всегда (там Linux).
.PHONY: test-race
test-race: ## Тесты с детектором гонок (нужен gcc)
	cd $(BACKEND_DIR) && CGO_ENABLED=1 go test ./... -race -count=1

.PHONY: test-integration
test-integration: ## Интеграционные тесты с реальной PostgreSQL (нужна поднятая БД)
	cd $(BACKEND_DIR) && TEST_POSTGRES_DSN=$${TEST_POSTGRES_DSN:-$(TEST_DSN)} 		go test -tags integration ./test/... -count=1

.PHONY: test-e2e
test-e2e: ## E2E в браузере против поднятого стека (docker compose up)
	docker run --rm --network $(COMPOSE_NETWORK) 		-v "$$(pwd)/frontend:/work" -w /work 		-e E2E_BASE_URL=http://frontend 		mcr.microsoft.com/playwright:$(PLAYWRIGHT_VERSION) 		sh -c "npm ci && npx playwright test"

.PHONY: cover
cover: ## Тесты с отчётом о покрытии
	cd $(BACKEND_DIR) && go test ./... -count=1 -coverprofile=$(COVER_FILE) -covermode=atomic
	cd $(BACKEND_DIR) && go tool cover -func=$(COVER_FILE) | tail -1

.PHONY: cover-html
cover-html: cover ## Покрытие в браузере
	cd $(BACKEND_DIR) && go tool cover -html=$(COVER_FILE)

.PHONY: lint
lint: ## Линтер по .golangci.yaml
	cd $(BACKEND_DIR) && golangci-lint run --config ../.golangci.yaml ./...

.PHONY: lint-install
lint-install: ## Установить golangci-lint нужной версии
	go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@$(GOLANGCI_LINT_VERSION)

.PHONY: fmt
fmt: ## Форматирование
	cd $(BACKEND_DIR) && go fmt ./...

.PHONY: tidy
tidy: ## Привести go.mod в порядок
	cd $(BACKEND_DIR) && go mod tidy

.PHONY: run
run: ## Запустить API локально (БД должна быть поднята)
	cd $(BACKEND_DIR) && POSTGRES_HOST=localhost go run ./cmd/api

.PHONY: api-lint
api-lint: ## Проверить OpenAPI
	npx --yes @redocly/cli@latest lint $(API_SPEC)

.PHONY: api-types
api-types: ## Сгенерировать типы TypeScript из спецификации
	npx --yes openapi-typescript@latest $(API_SPEC) -o frontend/src/api/schema.ts

.PHONY: api-mock
api-mock: ## Мок-сервер по спецификации на :4010
	docker run --rm -p 4010:4010 -v "$$(pwd)/api:/tmp" stoplight/prism:4 mock -h 0.0.0.0 /tmp/openapi.yaml

.PHONY: api-docs
api-docs: ## Документация по спецификации на :8081
	docker run --rm -p 8081:80 -e SPEC_URL=openapi.yaml \
		-v "$$(pwd)/api/openapi.yaml:/usr/share/nginx/html/openapi.yaml" redocly/redoc

.PHONY: test-db
test-db: ## Создать пустую базу под интеграционные тесты
	docker compose exec postgres psql -U $${POSTGRES_USER:-antiscam} -d postgres 		-c "DROP DATABASE IF EXISTS antiscam_test" -c "CREATE DATABASE antiscam_test"

.PHONY: ci
ci: lint test ## То же, что проверяет CI

.PHONY: help
help: ## Список команд
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
