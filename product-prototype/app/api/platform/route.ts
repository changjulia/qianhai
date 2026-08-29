import { env } from 'cloudflare:workers';
import { withApiErrors } from '../../../lib/server/errors';
import { createRequestContext, type RequestContext } from '../../../lib/server/request-context';

type JsonObject = Record<string, unknown>;
type D1Row = Record<string, unknown>;

const JSON_HEADERS = { 'Cache-Control': 'no-store' };
const SECRET_REF_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/;

function text(value: unknown, max = 300): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function jsonArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 50) : [];
}

function jsonObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function response(body: unknown, init?: ResponseInit) {
  return Response.json(body, { ...init, headers: { ...JSON_HEADERS, ...init?.headers } });
}

function error(code: string, message: string, status = 400) {
  return response({ ok: false, error: code, message }, { status });
}

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function rejectCredentialMaterial(value: unknown, path = 'payload'): string | null {
  if (!value || typeof value !== 'object') return null;
  for (const [key, child] of Object.entries(value as JsonObject)) {
    const nextPath = `${path}.${key}`;
    const normalized = key.toLowerCase();
    if ((normalized.includes('password') || normalized.includes('api_key') || normalized.includes('access_token') || normalized === 'secret' || normalized === 'credential') && normalized !== 'secret_ref') {
      return nextPath;
    }
    const nested = rejectCredentialMaterial(child, nextPath);
    if (nested) return nested;
  }
  return null;
}

function safeEndpoint(value: unknown): string | null {
  const raw = text(value, 500);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function audit(
  database: D1Database,
  actor: { id: string; identitySource: string; organizationId: string },
  action: string,
  resourceType: string,
  resourceId: string | null,
  result: string,
  details: JsonObject = {},
  riskLevel = 'low',
) {
  await database.prepare(`
    INSERT INTO security_audit_events
      (id, occurred_at, actor_type, actor_id, action, resource_type, resource_id, risk_level, result, details_json)
    VALUES (?, ?, 'human', ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    newId('audit'), new Date().toISOString(), actor.id, action, resourceType, resourceId,
    riskLevel, result, JSON.stringify({
      ...details,
      identity_source: actor.identitySource,
      organization_id: actor.organizationId,
    }),
  ).run();
}

async function snapshot(database: D1Database, organization: RequestContext['organization']) {
  const results = await database.batch([
    database.prepare(`
      SELECT n.id, n.name, n.node_type, n.parent_id, n.owner_member_id, n.data_boundary,
             n.description, n.status, n.updated_at, COUNT(nm.member_id) AS member_count
      FROM organization_nodes n
      LEFT JOIN organization_node_members nm ON nm.node_id = n.id
      GROUP BY n.id ORDER BY COALESCE(n.parent_id, ''), n.created_at
    `),
    database.prepare(`
      SELECT m.id, m.display_name, m.member_type, m.status, m.last_active_at, r.id AS role_id,
             r.name AS role_name, r.permissions_json, r.data_scope,
             GROUP_CONCAT(nm.node_id) AS node_ids
      FROM organization_members m
      JOIN roles r ON r.id = m.role_id
      LEFT JOIN organization_node_members nm ON nm.member_id = m.id
      GROUP BY m.id ORDER BY m.display_name
    `),
    database.prepare('SELECT id, name, permissions_json, data_scope FROM roles ORDER BY name'),
    database.prepare('SELECT id, name, steps_json, applies_to, sla_text, active, updated_at FROM approval_chains ORDER BY id'),
    database.prepare(`
      SELECT i.id, i.name, i.integration_type, i.environment, i.status, i.scopes_json,
             i.last_sync_at, i.records_count, i.error_message, c.endpoint_url, c.auth_method,
             c.sync_direction, c.sync_scopes_json, c.schedule_text,
             CASE WHEN c.secret_ref IS NOT NULL AND c.secret_ref != '' THEN 1 ELSE 0 END AS has_secret_ref,
             c.updated_at AS config_updated_at
      FROM integrations i LEFT JOIN integration_configs c ON c.integration_id = i.id
      ORDER BY i.name
    `),
    database.prepare(`
      SELECT d.id, d.name, d.source_type, d.classification, d.status, d.record_count,
             d.last_synced_at, d.source_url, d.usage_note,
             (SELECT status FROM sync_runs s WHERE s.source_id = d.id ORDER BY s.started_at DESC LIMIT 1) AS last_run_status
      FROM data_sources d ORDER BY d.name
    `),
    database.prepare(`
      SELECT s.id, s.source_id, d.name AS source_name, s.started_at, s.completed_at, s.status,
             s.inserted_count, s.updated_count, s.error_count, s.details_json
      FROM sync_runs s JOIN data_sources d ON d.id = s.source_id
      ORDER BY s.started_at DESC LIMIT 50
    `),
    database.prepare(`
      SELECT q.id, q.issue_type, q.source_id, d.name AS source_name, q.affected_count,
             q.recommendation, q.status, q.assigned_to, q.resolution_note, q.resolved_at, q.updated_at
      FROM data_quality_issues q LEFT JOIN data_sources d ON d.id = q.source_id
      ORDER BY CASE q.status WHEN 'open' THEN 0 WHEN 'assigned' THEN 1 ELSE 2 END, q.created_at DESC
    `),
    database.prepare(`
      SELECT id, name, description, policy_domain, enabled, enforcement_level, scope, config_json, updated_by, updated_at
      FROM security_policies ORDER BY policy_domain, id
    `),
    database.prepare(`
      SELECT e.id, e.occurred_at, e.actor_type, e.actor_id, e.action, e.resource_type, e.resource_id,
             e.risk_level, e.result, e.details_json,
             (SELECT disposition FROM audit_event_dispositions d WHERE d.event_id = e.id ORDER BY d.created_at DESC LIMIT 1) AS disposition
      FROM security_audit_events e ORDER BY e.occurred_at DESC LIMIT 100
    `),
    database.prepare("SELECT setting_key, value_json, updated_by, updated_at FROM platform_settings"),
  ]);

  const rows = (index: number) => (results[index].results ?? []) as D1Row[];
  const integrations = rows(4);
  const syncRuns = rows(6);
  const qualityIssues = rows(7);
  const auditEvents = rows(9);
  const connected = integrations.filter((item) => item.status === 'connected').length;
  const needsConfiguration = integrations.filter((item) => item.status === 'needs_configuration').length;
  const completedSyncRuns = syncRuns.filter((item) => item.status === 'success' || item.status === 'failed');
  const unsupportedSyncRuns = syncRuns.filter((item) => item.status === 'unsupported').length;
  const queuedSyncRuns = syncRuns.filter((item) => item.status === 'queued').length;
  const syncSuccess = completedSyncRuns.length
    ? Math.round((completedSyncRuns.filter((item) => item.status === 'success').length / completedSyncRuns.length) * 1000) / 10
    : 0;
  const openQualityCount = qualityIssues
    .filter((item) => item.status !== 'resolved' && item.status !== 'ignored')
    .reduce((sum, item) => sum + Number(item.affected_count ?? 0), 0);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    organization: {
      id: organization.id,
      enterpriseId: organization.enterpriseId,
      slug: organization.slug,
      name: organization.name,
      membershipRoleId: organization.membershipRoleId,
    },
    organizationNodes: rows(0),
    members: rows(1),
    roles: rows(2),
    approvalChains: rows(3),
    integrations,
    dataSources: rows(5),
    syncRuns,
    qualityIssues,
    securityPolicies: rows(8),
    auditEvents,
    settings: Object.fromEntries(rows(10).map((item) => {
      try { return [String(item.setting_key), JSON.parse(String(item.value_json))]; }
      catch { return [String(item.setting_key), {}]; }
    })),
    metrics: {
      organizationNodes: rows(0).length,
      members: rows(1).length,
      roles: rows(2).length,
      connectedIntegrations: connected,
      integrationsTotal: integrations.length,
      needsConfiguration,
      syncSuccess,
      unsupportedSyncRuns,
      queuedSyncRuns,
      openQualityCount,
      policiesEnabled: rows(8).filter((item) => Number(item.enabled) === 1).length,
      highRiskOpen: auditEvents.filter((item) => item.risk_level === 'high' && !item.disposition).length,
    },
    health: [
      { id: 'api', name: 'Web 应用与 API', metric: 'D1 查询成功', status: 'healthy', label: '正常' },
      { id: 'connectors', name: '数据连接器', metric: `${connected} 已连接 · ${needsConfiguration} 待配置`, status: needsConfiguration ? 'warning' : 'healthy', label: needsConfiguration ? '需要配置' : '正常' },
      {
        id: 'sync',
        name: '同步运行',
        metric: syncRuns.some((item) => item.status === 'failed')
          ? `最近成功率 ${syncSuccess}%`
          : unsupportedSyncRuns
            ? `${unsupportedSyncRuns} 次操作不支持`
            : queuedSyncRuns
              ? `${queuedSyncRuns} 个任务排队中`
              : syncRuns.length ? `最近成功率 ${syncSuccess}%` : '暂无运行',
        status: syncRuns.some((item) => item.status === 'failed') || unsupportedSyncRuns || queuedSyncRuns ? 'warning' : 'healthy',
        label: syncRuns.some((item) => item.status === 'failed')
          ? '存在失败'
          : unsupportedSyncRuns ? '尚未支持' : queuedSyncRuns ? '排队中' : '正常',
      },
      { id: 'quality', name: '数据质量', metric: `${openQualityCount} 条待处理`, status: openQualityCount ? 'warning' : 'healthy', label: openQualityCount ? '待处理' : '正常' },
      { id: 'audit', name: '审计与日志', metric: `${auditEvents.length} 条最近事件`, status: 'healthy', label: '正常' },
      { id: 'database', name: '平台数据库', metric: '读写绑定已响应', status: 'healthy', label: '正常' },
    ],
  };
}

export async function GET(request: Request) {
  return withApiErrors(async (requestId) => {
    const context = await createRequestContext(request, { requestId });
    try {
      return response(await snapshot(context.db, context.organization));
    } catch (cause) {
      console.error('platform snapshot failed', cause);
      return error('platform_database_unavailable', '平台治理数据库尚未就绪，请先应用最新 D1 migration。', 503);
    }
  }, request.headers.get('x-request-id') ?? crypto.randomUUID());
}

async function handlePost(request: Request, context: RequestContext) {
  const actor = {
    id: context.actor.userId,
    identitySource: context.actor.source,
    organizationId: context.organization.id,
  };
  let body: JsonObject;
  try {
    body = jsonObject(await request.json());
  } catch {
    return error('invalid_json', '请求内容不是有效 JSON。');
  }

  const credentialPath = rejectCredentialMaterial(body);
  if (credentialPath) return error('plaintext_credentials_rejected', `不接受明文凭证字段：${credentialPath}。请改用 secret_ref 环境变量引用。`);

  const action = text(body.action, 80);
  const payload = jsonObject(body.payload);
  const database = context.db;
  const scopedSnapshot = () => snapshot(database, context.organization);

  try {
    if (action === 'organization.save') {
      const id = text(payload.id, 100) || newId('org');
      const name = text(payload.name, 120);
      const nodeType = text(payload.nodeType, 60) || '项目组';
      if (!name) return error('validation_error', '组织名称不能为空。');
      const parentId = text(payload.parentId, 100) || null;
      const ownerMemberId = text(payload.ownerMemberId, 100) || null;
      const boundary = text(payload.dataBoundary, 80) || 'node_and_descendants';
      await database.prepare(`
        INSERT INTO organization_nodes (id, name, node_type, parent_id, owner_member_id, data_boundary, description, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, node_type=excluded.node_type,
          parent_id=excluded.parent_id, owner_member_id=excluded.owner_member_id,
          data_boundary=excluded.data_boundary, description=excluded.description, updated_at=CURRENT_TIMESTAMP
      `).bind(id, name, nodeType, parentId, ownerMemberId, boundary, text(payload.description, 600)).run();
      await audit(database, actor, 'organization.save', 'organization_node', id, 'success', { name }, 'medium');
      return response({ ok: true, status: 'saved', id, snapshot: await scopedSnapshot() });
    }

    if (action === 'members.import') {
      const filename = text(payload.filename, 180);
      const entries = Array.isArray(payload.entries) ? payload.entries.slice(0, 500).map(jsonObject) : [];
      if (!filename || !entries.length) return error('validation_error', '请选择包含成员数据的 CSV 文件。');
      const valid: Array<{ id: string; name: string; roleId: string; memberType: string; nodeId: string }> = [];
      let rejected = 0;
      for (const entry of entries) {
        const name = text(entry.displayName ?? entry.name, 120);
        const roleId = text(entry.roleId, 100) || 'role-owner';
        if (!name) { rejected += 1; continue; }
        valid.push({
          id: text(entry.id, 100) || newId('member'), name, roleId,
          memberType: text(entry.memberType, 30) || 'human',
          nodeId: text(entry.nodeId, 100) || 'org-group',
        });
      }
      if (!valid.length) return error('validation_error', 'CSV 中没有可导入的有效成员。');
      const runId = newId('member-import');
      const statements: D1PreparedStatement[] = [];
      for (const entry of valid) {
        statements.push(database.prepare(`
          INSERT INTO organization_members (id, display_name, role_id, member_type, status, last_active_at)
          VALUES (?, ?, ?, ?, 'active', NULL)
          ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name, role_id=excluded.role_id,
            member_type=excluded.member_type, status='active'
        `).bind(entry.id, entry.name, entry.roleId, entry.memberType));
        statements.push(database.prepare(`
          INSERT INTO organization_node_members (node_id, member_id, title)
          VALUES (?, ?, '') ON CONFLICT(node_id, member_id) DO NOTHING
        `).bind(entry.nodeId, entry.id));
      }
      statements.push(database.prepare(`
        INSERT INTO member_import_runs (id, actor_id, filename, imported_count, rejected_count, status, details_json)
        VALUES (?, ?, ?, ?, ?, 'completed', ?)
      `).bind(runId, actor.id, filename, valid.length, rejected, JSON.stringify({ format: 'csv' })));
      await database.batch(statements);
      await audit(database, actor, 'members.import', 'member_import', runId, 'success', { imported: valid.length, rejected }, 'medium');
      return response({ ok: true, status: 'imported', imported: valid.length, rejected, snapshot: await scopedSnapshot() });
    }

    if (action === 'role.save') {
      const id = text(payload.id, 100) || newId('role');
      const name = text(payload.name, 120);
      const scope = text(payload.dataScope, 100) || 'project';
      const permissions = jsonArray(payload.permissions);
      if (!name) return error('validation_error', '角色名称不能为空。');
      await database.prepare(`
        INSERT INTO roles (id, name, permissions_json, data_scope) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, permissions_json=excluded.permissions_json, data_scope=excluded.data_scope
      `).bind(id, name, JSON.stringify(permissions), scope).run();
      await audit(database, actor, 'role.save', 'role', id, 'success', { name, scope, permission_count: permissions.length }, 'high');
      return response({ ok: true, status: 'saved', id, snapshot: await scopedSnapshot() });
    }

    if (action === 'approval_chain.save') {
      const id = text(payload.id, 100) || newId('chain');
      const name = text(payload.name, 120);
      if (!name) return error('validation_error', '审批链名称不能为空。');
      await database.prepare(`
        INSERT INTO approval_chains (id, name, steps_json, applies_to, sla_text, active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, steps_json=excluded.steps_json,
          applies_to=excluded.applies_to, sla_text=excluded.sla_text, active=excluded.active, updated_at=CURRENT_TIMESTAMP
      `).bind(id, name, JSON.stringify(jsonArray(payload.steps)), text(payload.appliesTo, 500), text(payload.slaText, 100), payload.active === false ? 0 : 1).run();
      await audit(database, actor, 'approval_chain.save', 'approval_chain', id, 'success', { name }, 'high');
      return response({ ok: true, status: 'saved', id, snapshot: await scopedSnapshot() });
    }

    if (action === 'integration.save' || action === 'integration.test') {
      const id = text(payload.id, 100) || newId('int');
      const name = text(payload.name, 120) || '新连接器';
      const integrationType = text(payload.integrationType, 80) || 'custom';
      const authMethod = text(payload.authMethod, 40) || 'api_key';
      let secretRef = text(payload.secretRef, 128) || null;
      const endpoint = payload.endpointUrl ? safeEndpoint(payload.endpointUrl) : null;
      if (payload.endpointUrl && !endpoint) return error('invalid_endpoint', '连接地址必须是可公开访问的 HTTPS 地址。');
      if (secretRef && !SECRET_REF_PATTERN.test(secretRef)) return error('invalid_secret_ref', 'secret_ref 必须是大写环境变量名，例如 CRM_API_TOKEN。');
      if (!secretRef && text(payload.id, 100)) {
        const existing = await database.prepare('SELECT secret_ref FROM integration_configs WHERE integration_id=?').bind(id).first<{ secret_ref: string | null }>();
        secretRef = existing?.secret_ref || null;
      }
      const scopes = jsonArray(payload.scopes);
      await database.prepare(`
        INSERT INTO integrations (id, name, integration_type, environment, status, scopes_json, records_count)
        VALUES (?, ?, ?, 'production', 'needs_configuration', ?, 0)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, integration_type=excluded.integration_type,
          scopes_json=excluded.scopes_json, status='needs_configuration',
          error_message='连接配置已更新，等待真实连接测试'
      `).bind(id, name, integrationType, JSON.stringify(scopes)).run();
      await database.prepare(`
        INSERT INTO integration_configs
          (integration_id, endpoint_url, auth_method, secret_ref, sync_direction, sync_scopes_json, schedule_text, configured_by, configured_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(integration_id) DO UPDATE SET endpoint_url=excluded.endpoint_url,
          auth_method=excluded.auth_method, secret_ref=excluded.secret_ref,
          sync_direction=excluded.sync_direction, sync_scopes_json=excluded.sync_scopes_json,
          schedule_text=excluded.schedule_text, configured_by=excluded.configured_by,
          configured_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
      `).bind(id, endpoint, authMethod, secretRef, text(payload.syncDirection, 60) || 'read_only', JSON.stringify(jsonArray(payload.syncScopes)), text(payload.scheduleText, 100) || null, actor.id).run();

      if (action === 'integration.save') {
        await audit(database, actor, action, 'integration', id, 'needs_configuration', { configured: Boolean(secretRef), auth_method: authMethod }, 'medium');
        return response({
          ok: true,
          id,
          status: 'needs_configuration',
          configurationSaved: true,
          testRequired: true,
          message: secretRef
            ? '连接设置已保存，但在真实连接测试通过前不会标记为已连接。'
            : '连接设置已保存，但仍需配置服务端凭证引用。',
          snapshot: await scopedSnapshot(),
        });
      }

      const binding = secretRef ? (env as unknown as Record<string, unknown>)[secretRef] : undefined;
      if (!secretRef || typeof binding !== 'string' || !binding || !endpoint) {
        const missing = [
          !endpoint ? 'endpoint_url' : null,
          !secretRef ? 'secret_ref' : null,
          secretRef && (typeof binding !== 'string' || !binding) ? `server_secret:${secretRef}` : null,
        ].filter((item): item is string => Boolean(item));
        await database.prepare("UPDATE integrations SET status='needs_configuration', error_message=? WHERE id=?")
          .bind(!endpoint ? '需要配置 HTTPS 连接地址' : '服务端环境变量凭证未配置', id).run();
        await audit(database, actor, action, 'integration', id, 'needs_configuration', { endpoint_configured: Boolean(endpoint), secret_ref_configured: Boolean(secretRef) }, 'medium');
        return response({
          ok: false,
          id,
          status: 'needs_configuration',
          error: 'integration_needs_configuration',
          missing,
          testAttempted: false,
          message: !endpoint ? '请先配置真实 HTTPS 连接地址。' : `服务端尚未配置 ${secretRef} 环境变量，未执行外部连接测试。`,
          snapshot: await scopedSnapshot(),
        }, { status: 409 });
      }

      let connectionStatus = 'failed';
      let connectionMessage = '外部系统连接失败。';
      try {
        const started = Date.now();
        const check = await fetch(endpoint, {
          method: 'GET',
          headers: { Authorization: `Bearer ${binding}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(8_000),
          redirect: 'error',
        });
        if (check.ok) {
          connectionStatus = 'connected';
          connectionMessage = `连接测试成功（${Date.now() - started} ms）。`;
        } else {
          connectionMessage = `外部系统返回 HTTP ${check.status}。`;
        }
      } catch {
        connectionMessage = '连接超时、网络不可达或目标拒绝请求。';
      }
      await database.prepare('UPDATE integrations SET status=?, error_message=?, last_sync_at=? WHERE id=?')
        .bind(connectionStatus, connectionStatus === 'connected' ? null : connectionMessage, connectionStatus === 'connected' ? new Date().toISOString() : null, id).run();
      await audit(database, actor, action, 'integration', id, connectionStatus, { endpoint_host: new URL(endpoint).hostname }, connectionStatus === 'connected' ? 'low' : 'medium');
      if (connectionStatus === 'failed') {
        return response({
          ok: false,
          id,
          status: 'failed',
          error: 'integration_connection_failed',
          testAttempted: true,
          message: connectionMessage,
          snapshot: await scopedSnapshot(),
        }, { status: 502 });
      }
      return response({ ok: true, id, status: 'connected', testAttempted: true, message: connectionMessage, snapshot: await scopedSnapshot() });
    }

    if (action === 'sync.run') {
      const integrationId = text(payload.integrationId, 100);
      if (!integrationId) return error('validation_error', '缺少 integrationId。');
      const config = await database.prepare(`
        SELECT i.name, i.integration_type, c.endpoint_url, c.secret_ref
        FROM integrations i LEFT JOIN integration_configs c ON c.integration_id=i.id WHERE i.id=?
      `).bind(integrationId).first<D1Row>();
      if (!config) return error('not_found', '未找到该连接器。', 404);
      const sourceId = `source-${integrationId}`;
      await database.prepare(`
        INSERT INTO data_sources (id, name, source_type, classification, status, record_count, usage_note)
        VALUES (?, ?, ?, 'enterprise_private', 'needs_configuration', 0, '由平台连接器管理')
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, source_type=excluded.source_type
      `).bind(sourceId, String(config.name), String(config.integration_type)).run();
      const runId = newId('sync');
      const runStatus = 'unsupported';
      await database.prepare(`
        INSERT INTO sync_runs (id, source_id, started_at, completed_at, status, inserted_count, updated_count, error_count, details_json)
        VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?)
      `).bind(runId, sourceId, new Date().toISOString(), new Date().toISOString(), runStatus, JSON.stringify({
        integration_id: integrationId,
        reason: 'connector_worker_not_implemented',
        retryable: false,
      })).run();
      await audit(database, actor, action, 'sync_run', runId, runStatus, { integration_id: integrationId }, 'medium');
      return response({
        ok: false,
        status: runStatus,
        error: 'connector_worker_not_implemented',
        runId,
        integrationId,
        retryable: false,
        message: '当前版本尚未实现连接器同步 Worker，未创建伪队列任务；本次尝试已作为 unsupported 运行记录留痕。',
        snapshot: await scopedSnapshot(),
      }, { status: 501 });
    }

    if (action === 'quality.resolve') {
      const id = text(payload.id, 100);
      const disposition = text(payload.disposition, 80);
      if (!id || !['接受建议', '分配负责人', '忽略并说明'].includes(disposition)) return error('validation_error', '请选择有效的数据质量处置动作。');
      const status = disposition === '接受建议' ? 'resolved' : disposition === '分配负责人' ? 'assigned' : 'ignored';
      const result = await database.prepare(`
        UPDATE data_quality_issues SET status=?, assigned_to=?, resolution_note=?,
          resolved_at=?, resolved_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).bind(status, status === 'assigned' ? (text(payload.assignedTo, 120) || actor.id) : null, text(payload.note, 500), status === 'assigned' ? null : new Date().toISOString(), status === 'assigned' ? null : actor.id, id).run();
      if (!result.meta.changes) return error('not_found', '未找到该数据质量问题。', 404);
      await audit(database, actor, action, 'data_quality_issue', id, 'success', { disposition, status }, 'medium');
      return response({ ok: true, status, message: '数据质量处置已持久化并写入审计。', snapshot: await scopedSnapshot() });
    }

    if (action === 'security_policy.save') {
      const id = text(payload.id, 100) || newId('policy');
      const name = text(payload.name, 120);
      if (!name) return error('validation_error', '策略名称不能为空。');
      await database.prepare(`
        INSERT INTO security_policies (id, name, description, policy_domain, enabled, enforcement_level, scope, config_json, updated_by, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description,
          policy_domain=excluded.policy_domain, enabled=excluded.enabled,
          enforcement_level=excluded.enforcement_level, scope=excluded.scope,
          config_json=excluded.config_json, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP
      `).bind(id, name, text(payload.description, 800), text(payload.policyDomain, 80) || 'security', payload.enabled === false ? 0 : 1, text(payload.enforcementLevel, 100) || '强制', text(payload.scope, 120) || 'enterprise', JSON.stringify(jsonObject(payload.config)), actor.id).run();
      await audit(database, actor, action, 'security_policy', id, 'success', { name, enabled: payload.enabled !== false }, 'high');
      return response({ ok: true, status: 'saved', message: '安全策略已保存并立即纳入审计。', snapshot: await scopedSnapshot() });
    }

    if (action === 'deployment.save' || action === 'organization_rules.save') {
      const key = action === 'deployment.save' ? 'deployment' : 'organization_rules';
      await database.prepare(`
        INSERT INTO platform_settings (setting_key, value_json, updated_by, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP
      `).bind(key, JSON.stringify(payload), actor.id).run();
      await audit(database, actor, action, 'platform_setting', key, 'success', {}, 'high');
      return response({ ok: true, status: 'saved', message: '治理策略已持久化并写入审计。', snapshot: await scopedSnapshot() });
    }

    if (action === 'audit.resolve') {
      const eventId = text(payload.eventId, 120);
      const disposition = text(payload.disposition, 80);
      if (!eventId || !['确认拦截', '转交审批', '标记误报'].includes(disposition)) return error('validation_error', '请选择有效的审计处置动作。');
      const exists = await database.prepare('SELECT id FROM security_audit_events WHERE id=?').bind(eventId).first();
      if (!exists) return error('not_found', '审计事件不存在。', 404);
      const dispositionId = newId('disposition');
      await database.prepare(`
        INSERT INTO audit_event_dispositions (id, event_id, disposition, note, actor_id)
        VALUES (?, ?, ?, ?, ?)
      `).bind(dispositionId, eventId, disposition, text(payload.note, 500), actor.id).run();
      await audit(database, actor, action, 'security_audit_event', eventId, 'success', { disposition }, 'high');
      return response({ ok: true, status: 'resolved', message: '事件处置已记录，原审计证据保持不可变。', snapshot: await scopedSnapshot() });
    }

    if (action === 'platform.diagnose') {
      await audit(database, actor, action, 'platform', 'platform', 'success', {}, 'low');
      const current = await scopedSnapshot();
      return response({ ok: true, status: current.metrics.needsConfiguration ? 'needs_configuration' : 'healthy', message: current.metrics.needsConfiguration ? `${current.metrics.needsConfiguration} 个连接器仍需服务端配置。` : '平台治理检查通过。', snapshot: current });
    }

    return error('unknown_action', '不支持的平台治理操作。', 404);
  } catch (cause) {
    console.error('platform action failed', action, cause);
    try { await audit(database, actor, action || 'unknown', 'platform', null, 'failed', {}, 'high'); } catch { /* database may be unavailable */ }
    return error('platform_action_failed', '服务端未能完成操作，未返回假成功。请检查 D1 migration 与请求数据。', 500);
  }
}

export async function POST(request: Request) {
  return withApiErrors(async (requestId) => {
    const context = await createRequestContext(request, { requestId });
    return handlePost(request, context);
  }, request.headers.get('x-request-id') ?? crypto.randomUUID());
}
