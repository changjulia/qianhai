PRAGMA foreign_keys = ON;

-- Complete the platform-management demo without presenting external systems as
-- genuinely connected. `demo_ready` means the UI has credible seeded data only.
INSERT OR IGNORE INTO roles (id, name, permissions_json, data_scope) VALUES
  ('role-platform-admin', '平台管理员', '["platform.read","platform.manage","audit.read","data.export"]', 'all'),
  ('role-data-steward', '数据治理负责人', '["data.read","data.manage","quality.manage"]', 'enterprise'),
  ('role-channel-operator', '渠道运营', '["account.read","campaign.manage","analytics.read"]', 'project');

INSERT OR IGNORE INTO organization_members (id, display_name, role_id, member_type, status, last_active_at) VALUES
  ('member-platform-admin', '周启明（Demo）', 'role-platform-admin', 'human', 'active', '2026-08-30T09:18:00+08:00'),
  ('member-data-steward', '罗思远（Demo）', 'role-data-steward', 'human', 'active', '2026-08-30T09:06:00+08:00'),
  ('member-channel', '林悦（Demo）', 'role-channel-operator', 'human', 'active', '2026-08-30T08:52:00+08:00'),
  ('member-agent-governance', '平台治理数字员工', 'role-platform-admin', 'agent', 'active', '2026-08-30T09:20:00+08:00');

INSERT OR IGNORE INTO organization_nodes
  (id, name, node_type, parent_id, owner_member_id, data_boundary, description) VALUES
  ('org-tea-demo', '贵州茶行业演示项目', '项目组', 'org-matcha', 'member-owner', 'project', '贵州茶行业全链路演示数据与内容生产项目'),
  ('org-tea-content', '茶内容与素材小组', '项目组', 'org-tea-demo', 'member-channel', 'project', '负责素材、视频、图文和渠道演示'),
  ('org-tea-data', '茶数据治理小组', '项目组', 'org-tea-demo', 'member-data-steward', 'project', '负责 Mock 数据、来源标签和质量检查');

INSERT OR IGNORE INTO organization_node_members (node_id, member_id, title) VALUES
  ('org-group', 'member-platform-admin', '平台管理员'),
  ('org-tea-demo', 'member-data-steward', '数据治理负责人'),
  ('org-tea-content', 'member-channel', '渠道运营'),
  ('org-tea-data', 'member-agent-governance', '平台治理数字员工');

INSERT OR IGNORE INTO integrations
  (id, name, integration_type, environment, status, scopes_json, last_sync_at, records_count, error_message) VALUES
  ('int-tea-media', '贵州茶素材库（Demo）', 'storage', 'demo', 'demo_ready', '["asset.read","asset.tag","license.read"]', '2026-08-30T09:12:00+08:00', 20, NULL),
  ('int-tea-catalog', '贵州茶产品目录（Demo）', 'erp', 'demo', 'demo_ready', '["product.read","inventory.read"]', '2026-08-30T09:10:00+08:00', 15, NULL),
  ('int-demo-crm', '海外客户 CRM（Demo）', 'crm', 'demo', 'demo_ready', '["customer.read","inquiry.read","opportunity.read"]', '2026-08-30T09:08:00+08:00', 86, NULL),
  ('int-demo-social', '海外社媒矩阵（Demo）', 'social', 'demo', 'demo_ready', '["content.read","campaign.read","analytics.read"]', '2026-08-30T09:05:00+08:00', 48, NULL);

INSERT OR IGNORE INTO integration_configs
  (integration_id, auth_method, sync_direction, sync_scopes_json, schedule_text, configured_by, configured_at) VALUES
  ('int-tea-media', 'file_exchange', 'read_only', '["素材与授权"]', '每 30 分钟（Demo）', 'migration', CURRENT_TIMESTAMP),
  ('int-tea-catalog', 'file_exchange', 'read_only', '["产品与库存"]', '每小时（Demo）', 'migration', CURRENT_TIMESTAMP),
  ('int-demo-crm', 'file_exchange', 'read_only', '["客户与联系人","商机与订单"]', '每 15 分钟（Demo）', 'migration', CURRENT_TIMESTAMP),
  ('int-demo-social', 'file_exchange', 'read_only', '["内容与 Campaign"]', '每小时（Demo）', 'migration', CURRENT_TIMESTAMP);

UPDATE integrations
SET environment='demo', status='demo_ready', error_message=NULL,
    last_sync_at=COALESCE(last_sync_at, '2026-08-30T09:00:00+08:00'),
    records_count=CASE id
      WHEN 'int-sso' THEN 8 WHEN 'int-erp' THEN 15 WHEN 'int-meta' THEN 24
      WHEN 'int-google-ads' THEN 12 WHEN 'int-email' THEN 36 ELSE records_count END
WHERE id IN ('int-sso','int-erp','int-meta','int-google-ads','int-email','int-crm','int-linkedin','int-whatsapp');

INSERT OR IGNORE INTO data_sources
  (id, name, source_type, classification, status, record_count, last_synced_at, source_url, usage_note) VALUES
  ('src-tea-media', '贵州茶开放素材清单', 'storage', 'demo_mock', 'healthy', 20, '2026-08-30T09:12:00+08:00', NULL, '开放许可真实媒体与授权元数据；行业通用素材已明确标注'),
  ('src-tea-catalog', '贵州茶产品与内容目录', 'erp', 'demo_mock', 'healthy', 35, '2026-08-30T09:10:00+08:00', NULL, '用于产品、买家、内容和 Campaign 演示'),
  ('src-demo-crm', '东南亚客户与询盘（Demo）', 'crm', 'demo_mock', 'healthy', 86, '2026-08-30T09:08:00+08:00', NULL, '模拟客户及询盘，不对应真实个人'),
  ('src-demo-social', '海外渠道内容表现（Demo）', 'social', 'demo_mock', 'healthy', 48, '2026-08-30T09:05:00+08:00', NULL, '模拟渠道发布与互动数据'),
  ('src-guizhou-public', '贵州茶产业公开资料索引', 'government_web', 'public_fact', 'healthy', 32, '2026-08-30T08:40:00+08:00', 'https://www.guizhou.gov.cn/', '只保存公开来源索引与事实摘要');

INSERT OR IGNORE INTO sync_runs
  (id, source_id, started_at, completed_at, status, inserted_count, updated_count, error_count, details_json) VALUES
  ('sync-demo-media', 'src-tea-media', '2026-08-30T09:11:00+08:00', '2026-08-30T09:12:00+08:00', 'success', 20, 0, 0, '{"mode":"seeded_demo","verified":true}'),
  ('sync-demo-catalog', 'src-tea-catalog', '2026-08-30T09:09:00+08:00', '2026-08-30T09:10:00+08:00', 'success', 35, 0, 0, '{"mode":"seeded_demo","verified":true}'),
  ('sync-demo-crm', 'src-demo-crm', '2026-08-30T09:07:00+08:00', '2026-08-30T09:08:00+08:00', 'success', 86, 0, 0, '{"mode":"seeded_demo"}'),
  ('sync-demo-social', 'src-demo-social', '2026-08-30T09:04:00+08:00', '2026-08-30T09:05:00+08:00', 'success', 48, 0, 0, '{"mode":"seeded_demo"}'),
  ('sync-demo-public', 'src-guizhou-public', '2026-08-30T08:38:00+08:00', '2026-08-30T08:40:00+08:00', 'success', 32, 0, 0, '{"mode":"source_index"}');

UPDATE data_quality_issues
SET status='resolved', resolution_note='已在 Demo 数据集中完成规则化处理',
    resolved_at='2026-08-30T08:50:00+08:00', resolved_by='member-data-steward', updated_at=CURRENT_TIMESTAMP
WHERE id IN ('quality-duplicates','quality-unmatched','quality-consent');
UPDATE data_quality_issues SET affected_count=2, recommendation='演示前复核渠道标签' WHERE id='quality-channel';

INSERT OR IGNORE INTO security_audit_events
  (id, occurred_at, actor_type, actor_id, action, resource_type, resource_id, risk_level, result, details_json) VALUES
  ('audit-demo-01', '2026-08-30T09:18:00+08:00', 'human', 'member-platform-admin', 'platform.demo.verify', 'platform', 'platform', 'low', 'success', '{"classification":"demo_mock"}'),
  ('audit-demo-02', '2026-08-30T09:12:00+08:00', 'agent', 'member-agent-governance', 'media.license.verify', 'asset_catalog', 'src-tea-media', 'low', 'success', '{"verified":20}'),
  ('audit-demo-03', '2026-08-30T09:10:00+08:00', 'agent', 'member-agent-governance', 'catalog.sync', 'data_source', 'src-tea-catalog', 'low', 'success', '{"records":35}'),
  ('audit-demo-04', '2026-08-30T08:55:00+08:00', 'human', 'member-data-steward', 'quality.review', 'data_quality', 'quality-channel', 'medium', 'review_required', '{"affected":2}');

INSERT OR IGNORE INTO platform_settings (setting_key, value_json, updated_by) VALUES
  ('organization_rules', '{"defaultBoundary":true,"externalLeastPrivilege":true,"revokeOnExit":true}', 'migration'),
  ('demo_profile', '{"industry":"贵州茶","mode":"presentation","externalConnections":"simulated","warningBudget":2}', 'migration');

PRAGMA optimize;
