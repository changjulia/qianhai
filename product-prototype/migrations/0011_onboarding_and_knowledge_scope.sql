PRAGMA foreign_keys = ON;

-- Onboarding is scoped to a membership, not globally to an app user. This lets
-- the same identity join multiple organizations without leaking setup state.
CREATE TABLE IF NOT EXISTS organization_onboarding_states (
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES app_users(id),
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id),
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued','in_progress','completed','skipped')),
  config_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  first_growth_task_id TEXT UNIQUE REFERENCES growth_tasks(id),
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  skipped_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_enterprise_status
ON organization_onboarding_states(organization_id, enterprise_id, status, updated_at);

-- Migration 0010 marked all pre-existing accounts as already seen. Preserve
-- that behavior as an explicit organization-scoped skipped state.
INSERT OR IGNORE INTO organization_onboarding_states (
  organization_id, user_id, enterprise_id, status, config_json, version,
  issued_at, skipped_at, created_at, updated_at
)
SELECT
  m.organization_id,
  m.user_id,
  o.enterprise_id,
  'skipped',
  '{"migration":"0011","reason":"preexisting_account"}',
  1,
  COALESCE(u.onboarding_task_issued_at, u.created_at),
  COALESCE(u.onboarding_task_issued_at, u.created_at),
  COALESCE(u.created_at, CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM organization_user_memberships m
JOIN organizations o ON o.id = m.organization_id
JOIN app_users u ON u.id = m.user_id
WHERE o.enterprise_id IS NOT NULL
  AND u.onboarding_task_issued_at IS NOT NULL;

-- enterprise_knowledge_state predates organization scoping. Keep it as a
-- compatibility source, but all API reads/writes use this composite boundary.
CREATE TABLE IF NOT EXISTS organization_enterprise_knowledge_state (
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id),
  state_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by_user_id TEXT NOT NULL REFERENCES app_users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, enterprise_id)
);

CREATE INDEX IF NOT EXISTS idx_org_enterprise_knowledge_updated
ON organization_enterprise_knowledge_state(organization_id, enterprise_id, updated_at);

INSERT OR IGNORE INTO organization_enterprise_knowledge_state (
  organization_id, enterprise_id, state_json, version, updated_by_user_id, updated_at
)
SELECT
  o.id,
  legacy.enterprise_id,
  legacy.state_json,
  legacy.version,
  COALESCE(
    (SELECT u.id FROM app_users u WHERE u.external_user_id = legacy.updated_by LIMIT 1),
    (SELECT m.user_id FROM organization_user_memberships m
      WHERE m.organization_id = o.id AND m.status = 'active'
      ORDER BY m.created_at LIMIT 1)
  ),
  legacy.updated_at
FROM enterprise_knowledge_state legacy
JOIN organizations o ON o.enterprise_id = legacy.enterprise_id
WHERE EXISTS (
  SELECT 1 FROM organization_user_memberships m
  WHERE m.organization_id = o.id AND m.status = 'active'
);
