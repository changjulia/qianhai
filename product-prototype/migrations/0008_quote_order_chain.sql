PRAGMA foreign_keys = ON;

CREATE TABLE workflow_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  workflow_type TEXT NOT NULL DEFAULT 'commercial_e2e',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed','cleaning','cleaned')),
  correlation_id TEXT NOT NULL,
  input_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  error_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  cleaned_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, correlation_id)
);

-- Registry used by cleanup_run. Existing business tables predate workflow runs, so this
-- gives the API one authoritative, ordered list of records created by an E2E run.
CREATE TABLE workflow_run_resources (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  delete_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workflow_run_id, resource_type, resource_id)
);

-- Generic idempotency ledger supports every workflow action, including tables that do
-- not have their own idempotency column. response_json enables deterministic retries.
CREATE TABLE idempotency_keys (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  workflow_run_id TEXT REFERENCES workflow_runs(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','succeeded','failed')),
  resource_type TEXT,
  resource_id TEXT,
  response_json TEXT NOT NULL DEFAULT '{}',
  error_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  expires_at TEXT,
  UNIQUE (organization_id, action_type, idempotency_key)
);

-- Commercial documents are immutable by version. A revised offer is a new quote row;
-- the previous version remains available for audit and attribution.
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  workflow_run_id TEXT REFERENCES workflow_runs(id) ON DELETE SET NULL,
  task_id TEXT NOT NULL REFERENCES growth_tasks(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  quote_number TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  currency TEXT NOT NULL DEFAULT 'CNY' CHECK (length(currency) = 3),
  subtotal_amount REAL NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount REAL NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount REAL NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount REAL NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL CHECK (status IN (
    'draft','pending_approval','approved','rejected','sent','accepted','expired','cancelled'
  )),
  approval_id TEXT REFERENCES approvals(id),
  payment_terms TEXT,
  delivery_terms TEXT,
  valid_until TEXT NOT NULL,
  approved_at TEXT,
  sent_at TEXT,
  accepted_at TEXT,
  rejected_at TEXT,
  customer_snapshot_json TEXT NOT NULL DEFAULT '{}',
  terms_json TEXT NOT NULL DEFAULT '{}',
  mock_notice TEXT NOT NULL,
  created_by TEXT NOT NULL,
  idempotency_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, quote_number),
  UNIQUE (organization_id, idempotency_key),
  UNIQUE (opportunity_id, version),
  CHECK (discount_amount <= subtotal_amount),
  CHECK (abs(total_amount - (subtotal_amount - discount_amount + tax_amount)) < 0.01)
);

CREATE TABLE quote_lines (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  product_id TEXT REFERENCES products(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  discount_amount REAL NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total REAL NOT NULL CHECK (line_total >= 0),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE (quote_id, line_number),
  CHECK (abs(line_total - (quantity * unit_price - discount_amount)) < 0.01)
);

-- Orders retain their accepted quote and currency so commercial totals cannot drift.
ALTER TABLE orders ADD COLUMN quote_id TEXT REFERENCES quotes(id);
ALTER TABLE orders ADD COLUMN currency TEXT NOT NULL DEFAULT 'CNY';
ALTER TABLE orders ADD COLUMN accepted_at TEXT;
ALTER TABLE orders ADD COLUMN created_at TEXT;
ALTER TABLE orders ADD COLUMN updated_at TEXT;
ALTER TABLE orders ADD COLUMN workflow_run_id TEXT REFERENCES workflow_runs(id);
ALTER TABLE orders ADD COLUMN idempotency_key TEXT;

ALTER TABLE growth_tasks ADD COLUMN workflow_run_id TEXT REFERENCES workflow_runs(id);
ALTER TABLE growth_tasks ADD COLUMN idempotency_key TEXT;
ALTER TABLE contents ADD COLUMN workflow_run_id TEXT REFERENCES workflow_runs(id);
ALTER TABLE contents ADD COLUMN idempotency_key TEXT;
ALTER TABLE content_schedule ADD COLUMN workflow_run_id TEXT REFERENCES workflow_runs(id);
ALTER TABLE content_schedule ADD COLUMN idempotency_key TEXT;
ALTER TABLE ad_campaigns ADD COLUMN workflow_run_id TEXT REFERENCES workflow_runs(id);
ALTER TABLE ad_campaigns ADD COLUMN idempotency_key TEXT;
ALTER TABLE customers ADD COLUMN workflow_run_id TEXT REFERENCES workflow_runs(id);
ALTER TABLE customers ADD COLUMN idempotency_key TEXT;
ALTER TABLE conversations ADD COLUMN workflow_run_id TEXT REFERENCES workflow_runs(id);
ALTER TABLE conversations ADD COLUMN idempotency_key TEXT;
ALTER TABLE opportunities ADD COLUMN workflow_run_id TEXT REFERENCES workflow_runs(id);
ALTER TABLE opportunities ADD COLUMN idempotency_key TEXT;
ALTER TABLE approvals ADD COLUMN workflow_run_id TEXT REFERENCES workflow_runs(id);
ALTER TABLE approvals ADD COLUMN idempotency_key TEXT;
ALTER TABLE attribution_events ADD COLUMN workflow_run_id TEXT REFERENCES workflow_runs(id);
ALTER TABLE attribution_events ADD COLUMN idempotency_key TEXT;

CREATE TABLE order_lines (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quote_line_id TEXT REFERENCES quote_lines(id),
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  product_id TEXT REFERENCES products(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  line_total REAL NOT NULL CHECK (line_total >= 0),
  UNIQUE (order_id, line_number),
  CHECK (abs(line_total - quantity * unit_price) < 0.01)
);

-- Append-only business transition ledger. before/after snapshots make state changes
-- reproducible; idempotency_key makes retries safe inside one D1 transaction.
CREATE TABLE business_state_history (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  workflow_run_id TEXT REFERENCES workflow_runs(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES growth_tasks(id),
  customer_id TEXT REFERENCES customers(id),
  opportunity_id TEXT REFERENCES opportunities(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('approval','quote','opportunity','order','attribution')),
  entity_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  correlation_id TEXT NOT NULL,
  causation_id TEXT,
  idempotency_key TEXT NOT NULL,
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, idempotency_key)
);

-- Transactional outbox: the domain write and integration intent are committed together.
CREATE TABLE business_outbox (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','published','failed','cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at TEXT,
  locked_by TEXT,
  published_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX idx_quotes_opportunity_status ON quotes(opportunity_id, status, updated_at);
CREATE INDEX idx_workflow_runs_org_status ON workflow_runs(organization_id, status, started_at);
CREATE INDEX idx_workflow_resources_cleanup ON workflow_run_resources(workflow_run_id, delete_order DESC);
CREATE INDEX idx_idempotency_run ON idempotency_keys(workflow_run_id, created_at);
CREATE INDEX idx_quotes_customer_created ON quotes(customer_id, created_at);
CREATE INDEX idx_quote_lines_quote ON quote_lines(quote_id, line_number);
CREATE UNIQUE INDEX idx_orders_quote ON orders(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX idx_order_lines_order ON order_lines(order_id, line_number);
CREATE INDEX idx_business_history_entity ON business_state_history(entity_type, entity_id, occurred_at);
CREATE INDEX idx_business_history_correlation ON business_state_history(correlation_id, occurred_at);
CREATE INDEX idx_business_outbox_dispatch ON business_outbox(status, available_at, created_at);
CREATE INDEX idx_business_outbox_aggregate ON business_outbox(aggregate_type, aggregate_id, created_at);
CREATE UNIQUE INDEX idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX idx_tasks_idempotency ON growth_tasks(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX idx_contents_idempotency ON contents(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX idx_schedules_idempotency ON content_schedule(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX idx_campaigns_idempotency ON ad_campaigns(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX idx_customers_idempotency ON customers(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX idx_conversations_idempotency ON conversations(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX idx_opportunities_idempotency ON opportunities(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX idx_approvals_idempotency ON approvals(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX idx_attribution_idempotency ON attribution_events(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Correct the original Demo chain to one consistent CNY 680,000 won opportunity.
UPDATE opportunities
SET stage = 'won',
    amount_cny = 680000,
    probability = 1.0,
    expected_close_on = '2026-09-26',
    last_activity_at = '2026-09-26T11:22:00+08:00',
    next_step = '订单已确认，进入Demo履约跟踪'
WHERE id = 'opp-a';

INSERT OR IGNORE INTO approvals
  (id, task_id, action_id, approval_type, title, reason, risk_level, payload_json,
   requested_at, status, approver_role, decided_at, decision_note)
VALUES
  ('appr-sample-a','task-my-30d',NULL,'sample_request','客户A首次寄样审批',
   '首次寄样需由海外销售确认','medium','{"customer_id":"cust-a","opportunity_id":"opp-a","quantity":"100g"}',
   '2026-09-04T15:00:00+08:00','approved','海外销售','2026-09-05T09:00:00+08:00','Demo审批通过'),
  ('appr-quote-a','task-my-30d',NULL,'formal_quote','客户A年度供应正式报价审批',
   '最终价格、付款与交付条款必须人工确认','high','{"customer_id":"cust-a","opportunity_id":"opp-a","quote_id":"quote-demo-001","amount_cny":680000}',
   '2026-09-12T14:30:00+08:00','approved','海外销售','2026-09-12T15:08:00+08:00','Demo正式报价已人工确认');

INSERT INTO quotes
  (id, organization_id, workflow_run_id, task_id, customer_id, opportunity_id, quote_number, version,
   currency, subtotal_amount, discount_amount, tax_amount, total_amount, status,
   approval_id, payment_terms, delivery_terms, valid_until, approved_at, sent_at,
   accepted_at, customer_snapshot_json, terms_json, mock_notice, created_by, idempotency_key, created_at, updated_at)
VALUES
  ('quote-demo-001','org-demo-guikesong',NULL,'task-my-30d','cust-a','opp-a','DEMO-Q-202609-001',1,
   'CNY',680000,0,0,680000,'accepted','appr-quote-a','Demo：30%预付款，余款发货前支付',
   'Demo：交付安排以人工确认合同为准','2026-09-25T23:59:59+08:00',
   '2026-09-12T15:08:00+08:00','2026-09-12T15:15:00+08:00','2026-09-20T10:00:00+08:00',
   '{"display_name":"客户A（Mock）","market":"马来西亚"}',
   '{"classification":"demo_mock","binding":false}',
   'Demo模拟报价，不作为实际交易依据','海外销售','seed:quote-demo-001',
   '2026-09-12T14:20:00+08:00','2026-09-20T10:00:00+08:00');

INSERT INTO quote_lines VALUES
  ('quote-line-demo-001','quote-demo-001',1,'prd-m02','M-02 饮品级抹茶粉（Demo）',2000,'kg',340,0,680000,
   '{"classification":"demo_mock"}');

UPDATE orders
SET amount_cny = 680000,
    status = 'won',
    ordered_at = '2026-09-26T11:22:00+08:00',
    quote_id = 'quote-demo-001',
    currency = 'CNY',
    accepted_at = '2026-09-26T11:22:00+08:00',
    created_at = '2026-09-26T11:22:00+08:00',
    updated_at = '2026-09-26T11:22:00+08:00'
WHERE id = 'ord-demo-001';

INSERT INTO order_lines VALUES
  ('order-line-demo-001','ord-demo-001','quote-line-demo-001',1,'prd-m02',
   'M-02 饮品级抹茶粉（Demo）',2000,'kg',340,680000);

UPDATE attribution_events
SET source_id = 'appr-sample-a', metadata_json = '{"approval_id":"appr-sample-a","classification":"demo_mock"}'
WHERE id = 'attr-06';

UPDATE attribution_events
SET event_type = 'quote_approved', source_type = 'quote', source_id = 'quote-demo-001',
    metadata_json = '{"quote_id":"quote-demo-001","approval_id":"appr-quote-a","amount_cny":680000,"classification":"demo_mock"}'
WHERE id = 'attr-07';

INSERT OR IGNORE INTO attribution_events
  (id, customer_id, opportunity_id, occurred_at, event_type, source_type, source_id,
   campaign_id, content_id, metadata_json, workflow_run_id, idempotency_key)
VALUES
  ('attr-09','cust-a','opp-a','2026-09-12T15:15:00+08:00','quote_sent','quote','quote-demo-001',NULL,'cnt-quality-en','{"amount_cny":680000,"classification":"demo_mock"}',NULL,'seed:attr-09'),
  ('attr-10','cust-a','opp-a','2026-09-20T10:00:00+08:00','quote_accepted','quote','quote-demo-001',NULL,'cnt-quality-en','{"amount_cny":680000,"classification":"demo_mock"}',NULL,'seed:attr-10');

INSERT INTO business_state_history
  (id, organization_id, workflow_run_id, task_id, customer_id, opportunity_id, entity_type, entity_id,
   from_state, to_state, event_type, actor_type, actor_id, correlation_id, causation_id,
   idempotency_key, before_json, after_json, occurred_at, created_at)
VALUES
  ('bsh-quote-approved','org-demo-guikesong',NULL,'task-my-30d','cust-a','opp-a','quote','quote-demo-001',
   'pending_approval','approved','quote.approved','human','role-sales','corr-demo-order-001','appr-quote-a',
   'seed:quote-demo-001:approved','{"status":"pending_approval"}','{"status":"approved","total_amount":680000}',
   '2026-09-12T15:08:00+08:00','2026-09-12T15:08:00+08:00'),
  ('bsh-quote-sent','org-demo-guikesong',NULL,'task-my-30d','cust-a','opp-a','quote','quote-demo-001',
   'approved','sent','quote.sent','human','role-sales','corr-demo-order-001','bsh-quote-approved',
   'seed:quote-demo-001:sent','{"status":"approved"}','{"status":"sent"}',
   '2026-09-12T15:15:00+08:00','2026-09-12T15:15:00+08:00'),
  ('bsh-quote-accepted','org-demo-guikesong',NULL,'task-my-30d','cust-a','opp-a','quote','quote-demo-001',
   'sent','accepted','quote.accepted','customer','cust-a','corr-demo-order-001','bsh-quote-sent',
   'seed:quote-demo-001:accepted','{"status":"sent"}','{"status":"accepted"}',
   '2026-09-20T10:00:00+08:00','2026-09-20T10:00:00+08:00'),
  ('bsh-order-won','org-demo-guikesong',NULL,'task-my-30d','cust-a','opp-a','order','ord-demo-001',
   NULL,'won','order.won','human','role-sales','corr-demo-order-001','bsh-quote-accepted',
   'seed:ord-demo-001:won','{}','{"status":"won","amount_cny":680000,"quote_id":"quote-demo-001"}',
   '2026-09-26T11:22:00+08:00','2026-09-26T11:22:00+08:00'),
  ('bsh-opportunity-won','org-demo-guikesong',NULL,'task-my-30d','cust-a','opp-a','opportunity','opp-a',
   'qualified','won','opportunity.won','system',NULL,'corr-demo-order-001','bsh-order-won',
   'seed:opp-a:won','{"stage":"qualified","amount_cny":420000,"probability":0.45}',
   '{"stage":"won","amount_cny":680000,"probability":1}',
   '2026-09-26T11:22:00+08:00','2026-09-26T11:22:00+08:00');

INSERT INTO business_outbox
  (id, organization_id, aggregate_type, aggregate_id, event_type, payload_json,
   correlation_id, idempotency_key, status, attempt_count, available_at, published_at,
   created_at, updated_at)
VALUES
  ('outbox-order-demo-won','org-demo-guikesong','order','ord-demo-001','order.won',
   '{"order_id":"ord-demo-001","opportunity_id":"opp-a","quote_id":"quote-demo-001","amount_cny":680000,"currency":"CNY","classification":"demo_mock"}',
   'corr-demo-order-001','seed:outbox:ord-demo-001:won','published',1,
   '2026-09-26T11:22:00+08:00','2026-09-26T11:22:01+08:00',
   '2026-09-26T11:22:00+08:00','2026-09-26T11:22:01+08:00');

PRAGMA optimize;
