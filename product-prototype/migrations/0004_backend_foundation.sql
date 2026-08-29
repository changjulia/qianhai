PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT REFERENCES enterprises(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','archived')),
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  external_user_id TEXT NOT NULL UNIQUE,
  email TEXT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  profile_json TEXT NOT NULL DEFAULT '{}',
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_user_memberships (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES app_users(id),
  role_id TEXT REFERENCES roles(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended')),
  permissions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS durable_task_states (
  task_id TEXT PRIMARY KEY REFERENCES growth_tasks(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  state_key TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  state_json TEXT NOT NULL DEFAULT '{}',
  last_action_id TEXT,
  updated_by_user_id TEXT REFERENCES app_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, task_id, state_key)
);

CREATE TABLE IF NOT EXISTS knowledge_records (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  enterprise_id TEXT REFERENCES enterprises(id),
  record_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'internal',
  source_url TEXT,
  source_ref TEXT,
  language TEXT NOT NULL DEFAULT 'zh-CN',
  classification TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','superseded','archived')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  tags_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  valid_from TEXT,
  valid_until TEXT,
  created_by_user_id TEXT REFERENCES app_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ui_actions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT REFERENCES app_users(id),
  task_id TEXT REFERENCES growth_tasks(id),
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed','cancelled')),
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  error_code TEXT,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integration_credentials_metadata (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  integration_id TEXT NOT NULL REFERENCES integrations(id),
  provider TEXT NOT NULL,
  auth_scheme TEXT NOT NULL,
  secret_binding TEXT NOT NULL,
  secret_fingerprint TEXT,
  status TEXT NOT NULL DEFAULT 'not_configured' CHECK (status IN ('not_configured','active','expired','revoked','error')),
  scopes_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  configured_by_user_id TEXT REFERENCES app_users(id),
  configured_at TEXT,
  rotated_at TEXT,
  expires_at TEXT,
  last_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, integration_id, secret_binding)
);

CREATE TABLE IF NOT EXISTS organization_security_policies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  policy_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enforcement TEXT NOT NULL DEFAULT 'enforce' CHECK (enforcement IN ('monitor','enforce','disabled')),
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  rules_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_by_user_id TEXT REFERENCES app_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, policy_key)
);

CREATE INDEX IF NOT EXISTS idx_organizations_enterprise ON organizations(enterprise_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_user_status ON organization_user_memberships(user_id, status);

CREATE INDEX IF NOT EXISTS idx_task_states_org_status ON durable_task_states(organization_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_org_type_status ON knowledge_records(organization_id, record_type, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_enterprise ON knowledge_records(enterprise_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_ui_actions_org_time ON ui_actions(organization_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_ui_actions_task_status ON ui_actions(task_id, status, occurred_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ui_actions_idempotency ON ui_actions(organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credentials_integration_status ON integration_credentials_metadata(integration_id, status);

CREATE INDEX IF NOT EXISTS idx_org_security_policies_active ON organization_security_policies(organization_id, active, policy_key);

INSERT OR IGNORE INTO organizations (id, enterprise_id, slug, name, status, settings_json, created_at, updated_at) VALUES ('org-demo-guikesong', 'ent-demo-matcha', 'demo-guikesong', '贵客松 Demo 组织', 'active', '{"classification":"demo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO app_users (id, external_user_id, email, display_name, status, profile_json, created_at, updated_at) VALUES ('user-demo-local', 'demo-local-user', 'demo@example.invalid', '本地 Demo 用户', 'active', '{"actor_source":"local_demo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO organization_user_memberships (id, organization_id, user_id, role_id, status, permissions_json, created_at, updated_at) VALUES ('membership-demo-local', 'org-demo-guikesong', 'user-demo-local', 'role-admin', 'active', '["*"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO durable_task_states (task_id, organization_id, state_key, status, version, state_json, updated_by_user_id, created_at, updated_at) VALUES ('task-my-30d', 'org-demo-guikesong', 'default', 'active', 1, '{"source":"migration","durable":true}', 'user-demo-local', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO organization_security_policies (id, organization_id, policy_key, name, description, enforcement, risk_level, rules_json, version, active, created_by_user_id, created_at, updated_at) VALUES ('policy-no-plaintext-secrets', 'org-demo-guikesong', 'integration.no_plaintext_secrets', '集成密钥引用策略', '仅保存 Worker secret binding 引用、指纹与轮换元数据，禁止明文凭证入库。', 'enforce', 'critical', '{"forbidden_fields":["access_token","refresh_token","api_key","client_secret","password","secret_value"]}', 1, 1, 'user-demo-local', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO organization_security_policies (id, organization_id, policy_key, name, description, enforcement, risk_level, rules_json, version, active, created_by_user_id, created_at, updated_at) VALUES ('policy-human-commercial', 'org-demo-guikesong', 'commercial.human_approval', '高风险商务动作人工审批', '报价、折扣、账期、独家代理和交期承诺需要人工审批。', 'enforce', 'high', '{"actions":["quote","discount","payment_terms","exclusive_distribution","delivery_commitment"]}', 1, 1, 'user-demo-local', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
