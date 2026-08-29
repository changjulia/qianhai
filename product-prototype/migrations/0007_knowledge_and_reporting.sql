PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS enterprise_knowledge_state (
  enterprise_id TEXT PRIMARY KEY REFERENCES enterprises(id),
  state_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_exports (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL,
  filters_json TEXT NOT NULL DEFAULT '{}',
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_exports_actor_time
ON report_exports(requested_by, created_at);
