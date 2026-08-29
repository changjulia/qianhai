PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organization_nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  node_type TEXT NOT NULL,
  parent_id TEXT REFERENCES organization_nodes(id),
  owner_member_id TEXT REFERENCES organization_members(id),
  data_boundary TEXT NOT NULL DEFAULT 'node_and_descendants',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_node_members (
  node_id TEXT NOT NULL REFERENCES organization_nodes(id),
  member_id TEXT NOT NULL REFERENCES organization_members(id),
  title TEXT NOT NULL DEFAULT '',
  is_primary INTEGER NOT NULL DEFAULT 1,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (node_id, member_id)
);

CREATE TABLE IF NOT EXISTS approval_chains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  steps_json TEXT NOT NULL DEFAULT '[]',
  applies_to TEXT NOT NULL,
  sla_text TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integration_configs (
  integration_id TEXT PRIMARY KEY REFERENCES integrations(id),
  endpoint_url TEXT,
  auth_method TEXT NOT NULL DEFAULT 'api_key',
  secret_ref TEXT,
  sync_direction TEXT NOT NULL DEFAULT 'read_only',
  sync_scopes_json TEXT NOT NULL DEFAULT '[]',
  schedule_text TEXT,
  configured_by TEXT,
  configured_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_quality_issues (
  id TEXT PRIMARY KEY,
  issue_type TEXT NOT NULL,
  source_id TEXT REFERENCES data_sources(id),
  affected_count INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  resolution_note TEXT,
  resolved_at TEXT,
  resolved_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  policy_domain TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  enforcement_level TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'enterprise',
  config_json TEXT NOT NULL DEFAULT '{}',
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_event_dispositions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES security_audit_events(id),
  disposition TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_import_runs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  imported_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_nodes_parent ON organization_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_org_members_node ON organization_node_members(node_id);
CREATE INDEX IF NOT EXISTS idx_quality_status ON data_quality_issues(status, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_dispositions_event ON audit_event_dispositions(event_id, created_at);

INSERT OR IGNORE INTO organization_nodes (id, name, node_type, parent_id, owner_member_id, data_boundary, description) VALUES
  ('org-group', '黔山国际产业集团', '集团', NULL, 'member-owner', 'all', '集团安全、经营与数据治理根节点'),
  ('org-growth', '国际增长中心', '共享中心', 'org-group', 'member-owner', 'node_and_descendants', '国际市场增长共享服务'),
  ('org-tea', '茶与食品事业部', '事业部', 'org-group', 'member-owner', 'node_and_descendants', '茶与食品品牌和经营任务'),
  ('org-matcha', '黔绿方舟品牌', '品牌', 'org-tea', 'member-owner', 'project', '贵州抹茶国际业务品牌'),
  ('org-fruit', '山王果品牌', '品牌', 'org-tea', 'member-owner', 'project', '山地特色果品品牌'),
  ('org-industry', '工业品事业部', '事业部', 'org-group', 'member-owner', 'node_and_descendants', '工业品出海业务'),
  ('org-partner', '海外渠道服务商', '外部协作组织', 'org-group', NULL, 'project', '限时、最小权限的外部协作边界');

INSERT OR IGNORE INTO organization_node_members (node_id, member_id, title) VALUES
  ('org-tea', 'member-owner', '事业部负责人'),
  ('org-growth', 'member-agent-market', '市场研究数字员工'),
  ('org-tea', 'member-agent-content', '内容数字员工'),
  ('org-tea', 'member-agent-crm', '客户经营数字员工');

INSERT OR IGNORE INTO approval_chains VALUES
  ('chain-content', '内容事实与认证', '["内容运营","品牌审核人","质量负责人"]', '产品参数、认证、对比性表述', '4 小时', 1, CURRENT_TIMESTAMP),
  ('chain-budget', '投流与预算', '["项目负责人","事业部负责人"]', '超限预算、跨渠道调配、新市场首投', '2 小时', 1, CURRENT_TIMESTAMP),
  ('chain-commercial', '价格与商务承诺', '["海外销售","销售总监","法务"]', '报价、折扣、独家代理、交期', '必须人工', 1, CURRENT_TIMESTAMP),
  ('chain-export', '数据导出与外部共享', '["数据负责人","系统管理员"]', '客户明细、报价、收入与个人信息', '一次一批', 1, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO integrations (id, name, integration_type, environment, status, scopes_json, records_count) VALUES
  ('int-sso', '企业身份与 SSO', 'identity', 'production', 'needs_configuration', '["identity.read","member.sync"]', 0),
  ('int-erp', '现有 ERP', 'erp', 'production', 'needs_configuration', '["product.read","inventory.read","order.read"]', 0),
  ('int-meta', 'Meta', 'advertising', 'production', 'needs_configuration', '["campaign.read","analytics.read"]', 0),
  ('int-google-ads', 'Google Ads', 'advertising', 'production', 'needs_configuration', '["campaign.read","analytics.read"]', 0),
  ('int-email', '企业邮箱', 'messaging', 'production', 'needs_configuration', '["message.read"]', 0);

INSERT OR IGNORE INTO integration_configs (integration_id, auth_method, sync_direction, sync_scopes_json) VALUES
  ('int-sso', 'oauth', 'read_only', '["组织与成员"]'),
  ('int-erp', 'api_key', 'read_only', '["产品与库存","商机与订单"]'),
  ('int-meta', 'oauth', 'controlled_write', '["内容与 Campaign"]'),
  ('int-google-ads', 'oauth', 'controlled_write', '["内容与 Campaign"]'),
  ('int-email', 'oauth', 'read_only', '["客户与联系人"]');

UPDATE integrations
SET status = 'needs_configuration', error_message = '需要配置服务端凭证环境变量'
WHERE environment = 'demo' AND integration_type != 'storage';

INSERT OR IGNORE INTO data_quality_issues (id, issue_type, source_id, affected_count, recommendation) VALUES
  ('quality-duplicates', '重复客户记录', 'src-demo-crm', 27, '建议合并'),
  ('quality-unmatched', '待匹配询盘', 'src-demo-crm', 14, '需要确认'),
  ('quality-channel', '异常渠道数据', NULL, 2, '检查凭证后重试'),
  ('quality-consent', '缺少同意状态', 'src-demo-crm', 8, '禁止自动外发');

INSERT OR IGNORE INTO security_policies (id, name, description, policy_domain, enabled, enforcement_level, scope) VALUES
  ('policy-minimize', '数据最小化', '模型只接收完成当前动作必需的字段，屏蔽价格底表、个人联系方式与合同。', 'ai', 1, '强制', 'enterprise'),
  ('policy-routing', '模型路由与驻留', '按项目选择企业本地模型、专属模型网关或获批云模型。', 'ai', 1, '按项目', 'project'),
  ('policy-training', '训练与留存', '企业数据禁止用于第三方模型训练，请求与响应按策略脱敏留痕。', 'ai', 1, '禁止训练', 'enterprise'),
  ('policy-retrieval', '检索与知识权限', '数字员工只能检索当前组织、品牌、项目和角色有权访问的资料。', 'ai', 1, '继承权限', 'enterprise'),
  ('policy-risk', '高风险动作隔离', '价格、独家代理、预算扩张、合同与个人数据外发不得自动执行。', 'ai', 1, '人工审批', 'enterprise'),
  ('policy-masking', '敏感字段脱敏', '敏感字段离开企业数据边界前执行脱敏。', 'security', 1, '强制', 'enterprise'),
  ('policy-blocking', '异常自动拦截', '越权或异常动作自动暂停并产生审计事件。', 'security', 1, '强制', 'enterprise'),
  ('policy-approval', '强制人工审批', '价格、预算与外发动作必须人工确认。', 'security', 1, '强制', 'enterprise');

INSERT OR IGNORE INTO platform_settings (setting_key, value_json, updated_by) VALUES
  ('deployment', '{"mode":"混合部署","data_residency":"enterprise","model_context":"minimum_masked","audit_storage":"dual"}', 'migration');

PRAGMA optimize;
