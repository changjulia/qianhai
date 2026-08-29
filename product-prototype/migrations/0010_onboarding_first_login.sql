ALTER TABLE app_users ADD COLUMN onboarding_task_issued_at TEXT;

-- Accounts that existed before this rollout must not receive a "new account"
-- task on their next login. Accounts created after this migration keep NULL
-- until the first-login endpoint atomically claims the task for them.
UPDATE app_users
SET onboarding_task_issued_at = COALESCE(onboarding_task_issued_at, created_at);
