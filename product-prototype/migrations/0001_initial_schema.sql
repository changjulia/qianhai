PRAGMA foreign_keys = ON;

CREATE TABLE enterprises (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, display_name TEXT NOT NULL,
  demo_status TEXT NOT NULL CHECK (demo_status IN ('mock','public_reference')),
  industry TEXT NOT NULL, region TEXT, profile TEXT, founded_year INTEGER,
  employee_range TEXT, factory_area_sqm INTEGER, annual_capacity_tons REAL,
  export_markets_json TEXT NOT NULL DEFAULT '[]', contact_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id TEXT PRIMARY KEY, enterprise_id TEXT NOT NULL REFERENCES enterprises(id), sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, grade TEXT NOT NULL, applications_json TEXT NOT NULL DEFAULT '[]', origin TEXT,
  color TEXT, aroma TEXT, fineness_mesh INTEGER, package_options_json TEXT NOT NULL DEFAULT '[]',
  shelf_life_months INTEGER, storage TEXT, moq_kg REAL, sample_policy TEXT,
  monthly_capacity_tons REAL, lead_time_days INTEGER, oem_odm INTEGER NOT NULL DEFAULT 0,
  price_band_usd_per_kg TEXT, compliance_json TEXT NOT NULL DEFAULT '{}', mock_notice TEXT NOT NULL
);

CREATE TABLE enterprise_documents (
  id TEXT PRIMARY KEY, enterprise_id TEXT NOT NULL REFERENCES enterprises(id), product_id TEXT REFERENCES products(id),
  document_type TEXT NOT NULL, title TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'zh-CN',
  status TEXT NOT NULL, source_kind TEXT NOT NULL, source_url TEXT, local_path TEXT,
  version TEXT NOT NULL DEFAULT '1.0', valid_until TEXT, metadata_json TEXT NOT NULL DEFAULT '{}', mock_notice TEXT
);

CREATE TABLE business_rules (
  id TEXT PRIMARY KEY, enterprise_id TEXT NOT NULL REFERENCES enterprises(id), category TEXT NOT NULL,
  action TEXT NOT NULL, permission_level TEXT NOT NULL CHECK(permission_level IN ('auto','approval','human_only')),
  condition_json TEXT NOT NULL DEFAULT '{}', response_guidance TEXT, owner_role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE industry_facts (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, geography TEXT NOT NULL, title TEXT NOT NULL,
  value_text TEXT NOT NULL, unit TEXT, period TEXT, source_name TEXT NOT NULL, source_url TEXT,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('public','inference','mock')),
  confidence REAL NOT NULL DEFAULT 0.8, collected_at TEXT NOT NULL, page_uses_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE buyer_personas (
  id TEXT PRIMARY KEY, market TEXT NOT NULL, segment TEXT NOT NULL, role TEXT NOT NULL,
  needs_json TEXT NOT NULL, objections_json TEXT NOT NULL, qualification_json TEXT NOT NULL,
  preferred_channels_json TEXT NOT NULL, languages_json TEXT NOT NULL
);

CREATE TABLE assets (
  id TEXT PRIMARY KEY, enterprise_id TEXT REFERENCES enterprises(id), asset_type TEXT NOT NULL,
  title TEXT NOT NULL, category TEXT NOT NULL, description TEXT, proof_point TEXT,
  target_markets_json TEXT NOT NULL DEFAULT '[]', target_personas_json TEXT NOT NULL DEFAULT '[]',
  channels_json TEXT NOT NULL DEFAULT '[]', source_kind TEXT NOT NULL, source_url TEXT, local_path TEXT,
  license_status TEXT NOT NULL, ai_generated INTEGER NOT NULL DEFAULT 0, tags_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE inspirations (
  id TEXT PRIMARY KEY, market TEXT NOT NULL, platform TEXT NOT NULL, source_url TEXT,
  content_format TEXT NOT NULL, hook TEXT NOT NULL, buyer_question TEXT NOT NULL,
  transferable_structure TEXT NOT NULL, avoid_copying TEXT, recommended_cta TEXT,
  asset_match_score INTEGER NOT NULL, confidence REAL NOT NULL, status TEXT NOT NULL DEFAULT 'collected'
);

CREATE TABLE growth_tasks (
  id TEXT PRIMARY KEY, enterprise_id TEXT NOT NULL REFERENCES enterprises(id), name TEXT NOT NULL,
  product_ids_json TEXT NOT NULL, target_market TEXT NOT NULL, target_segments_json TEXT NOT NULL,
  languages_json TEXT NOT NULL, channels_json TEXT NOT NULL, autonomy_mode TEXT NOT NULL,
  starts_on TEXT NOT NULL, ends_on TEXT NOT NULL, budget_cny REAL NOT NULL,
  goals_json TEXT NOT NULL, status TEXT NOT NULL, owner_role TEXT NOT NULL
);

CREATE TABLE task_actions (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES growth_tasks(id), occurred_at TEXT NOT NULL,
  agent_role TEXT NOT NULL, action_type TEXT NOT NULL, summary TEXT NOT NULL, rationale TEXT,
  input_refs_json TEXT NOT NULL DEFAULT '[]', cost_cny REAL NOT NULL DEFAULT 0,
  result_json TEXT NOT NULL DEFAULT '{}', next_action TEXT, status TEXT NOT NULL
);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES growth_tasks(id), action_id TEXT REFERENCES task_actions(id),
  approval_type TEXT NOT NULL, title TEXT NOT NULL, reason TEXT NOT NULL, risk_level TEXT NOT NULL,
  payload_json TEXT NOT NULL, requested_at TEXT NOT NULL, status TEXT NOT NULL,
  approver_role TEXT NOT NULL, decided_at TEXT, decision_note TEXT
);

CREATE TABLE contents (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES growth_tasks(id), inspiration_id TEXT REFERENCES inspirations(id),
  product_id TEXT REFERENCES products(id), title TEXT NOT NULL, content_type TEXT NOT NULL,
  language TEXT NOT NULL, target_segment TEXT NOT NULL, channel TEXT NOT NULL,
  body TEXT NOT NULL, cta TEXT NOT NULL, evidence_refs_json TEXT NOT NULL DEFAULT '[]',
  asset_refs_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL, mock_notice TEXT NOT NULL
);

CREATE TABLE content_schedule (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES growth_tasks(id), content_id TEXT NOT NULL REFERENCES contents(id),
  scheduled_at TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, published_at TEXT,
  external_ref TEXT, metrics_json TEXT NOT NULL DEFAULT '{}', retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE ad_campaigns (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES growth_tasks(id), name TEXT NOT NULL,
  objective TEXT NOT NULL, market TEXT NOT NULL, cities_json TEXT NOT NULL, segments_json TEXT NOT NULL,
  job_titles_json TEXT NOT NULL, content_ids_json TEXT NOT NULL, budget_cny REAL NOT NULL,
  spent_cny REAL NOT NULL DEFAULT 0, status TEXT NOT NULL, metrics_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY, display_name TEXT NOT NULL, mock_label TEXT NOT NULL, market TEXT NOT NULL,
  company_type TEXT NOT NULL, contact_role TEXT NOT NULL, source_channel TEXT NOT NULL,
  interested_products_json TEXT NOT NULL, estimated_volume TEXT, requirements_json TEXT NOT NULL,
  pain_points_json TEXT NOT NULL, intent_score INTEGER NOT NULL, lifecycle_stage TEXT NOT NULL,
  owner_role TEXT NOT NULL, next_step TEXT, mock_notice TEXT NOT NULL
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id), channel TEXT NOT NULL,
  started_at TEXT NOT NULL, status TEXT NOT NULL, current_owner TEXT NOT NULL, summary TEXT NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), sent_at TEXT NOT NULL,
  sender_type TEXT NOT NULL, sender_label TEXT NOT NULL, language TEXT NOT NULL, body TEXT NOT NULL,
  attachment_refs_json TEXT NOT NULL DEFAULT '[]', knowledge_refs_json TEXT NOT NULL DEFAULT '[]',
  automated INTEGER NOT NULL DEFAULT 0, handoff_reason TEXT
);

CREATE TABLE opportunities (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES growth_tasks(id), customer_id TEXT NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL, stage TEXT NOT NULL, amount_cny REAL NOT NULL, probability REAL NOT NULL,
  expected_close_on TEXT, product_ids_json TEXT NOT NULL, estimated_volume TEXT,
  last_activity_at TEXT NOT NULL, next_step TEXT NOT NULL, mock_notice TEXT NOT NULL
);

CREATE TABLE attribution_events (
  id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id), opportunity_id TEXT REFERENCES opportunities(id),
  occurred_at TEXT NOT NULL, event_type TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT,
  campaign_id TEXT REFERENCES ad_campaigns(id), content_id TEXT REFERENCES contents(id),
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, permissions_json TEXT NOT NULL, data_scope TEXT NOT NULL
);

CREATE TABLE organization_members (
  id TEXT PRIMARY KEY, display_name TEXT NOT NULL, role_id TEXT NOT NULL REFERENCES roles(id),
  member_type TEXT NOT NULL, status TEXT NOT NULL, last_active_at TEXT
);

CREATE TABLE integrations (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, integration_type TEXT NOT NULL, environment TEXT NOT NULL,
  status TEXT NOT NULL, scopes_json TEXT NOT NULL, last_sync_at TEXT, records_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE TABLE security_audit_events (
  id TEXT PRIMARY KEY, occurred_at TEXT NOT NULL, actor_type TEXT NOT NULL, actor_id TEXT,
  action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT, risk_level TEXT NOT NULL,
  result TEXT NOT NULL, details_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_products_enterprise ON products(enterprise_id);
CREATE INDEX idx_actions_task_time ON task_actions(task_id, occurred_at);
CREATE INDEX idx_approvals_status ON approvals(status, requested_at);
CREATE INDEX idx_customers_stage ON customers(lifecycle_stage, intent_score);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, sent_at);
CREATE INDEX idx_opportunities_task_stage ON opportunities(task_id, stage);
CREATE INDEX idx_attribution_customer_time ON attribution_events(customer_id, occurred_at);
