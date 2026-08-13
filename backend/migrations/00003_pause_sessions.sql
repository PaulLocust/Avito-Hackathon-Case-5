-- +goose Up
-- +goose StatementBegin

-- Пауза — не завершение. Сессия со статусом paused продолжается с того же
-- шага, поэтому finished_at у неё пустой, а инвариант «не более одной
-- незавершённой тренировки на сценарий» обязан учитывать и её.
--
-- Имена ограничений в 00001 сгенерированы автоматически, поэтому снимаем их
-- по определению, а не по имени.
DO $$
DECLARE constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'sessions'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE sessions DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END $$;

ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
    CHECK (status IN ('in_progress', 'paused', 'completed', 'abandoned'));

ALTER TABLE sessions ADD CONSTRAINT sessions_finished_at_check
    CHECK ((status IN ('in_progress', 'paused')) = (finished_at IS NULL));

DROP INDEX IF EXISTS sessions_single_active_idx;

CREATE UNIQUE INDEX sessions_single_active_idx
    ON sessions (COALESCE(user_id, guest_session_id), scenario_code)
    WHERE status IN ('in_progress', 'paused');

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

UPDATE sessions SET status = 'abandoned', finished_at = now() WHERE status = 'paused';

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_finished_at_check;

ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
    CHECK (status IN ('in_progress', 'completed', 'abandoned'));

ALTER TABLE sessions ADD CONSTRAINT sessions_finished_at_check
    CHECK ((status = 'in_progress') = (finished_at IS NULL));

DROP INDEX IF EXISTS sessions_single_active_idx;

CREATE UNIQUE INDEX sessions_single_active_idx
    ON sessions (COALESCE(user_id, guest_session_id), scenario_code)
    WHERE status = 'in_progress';

-- +goose StatementEnd
