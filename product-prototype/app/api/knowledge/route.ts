import { tryWriteAuditEvent } from '../../../lib/server/audit';
import { execute, queryFirst } from '../../../lib/server/d1';
import { ApiError, jsonResponse, withApiErrors } from '../../../lib/server/errors';
import { createRequestContext, type RequestContext } from '../../../lib/server/request-context';
import { objectValue, readJsonBody } from '../../../lib/server/validation';

interface KnowledgeRow extends Record<string, unknown> {
  state_json: string;
  version: number;
  updated_by_user_id: string;
  updated_at: string;
}

export async function GET(request: Request) {
  return withApiErrors(async (requestId) => {
    const context = await createRequestContext(request, { requestId });
    const enterpriseId = requireKnowledgeScope(
      context,
      new URL(request.url).searchParams.get('enterpriseId'),
    );
    const row = await getKnowledge(context, enterpriseId);
    return jsonResponse(row ? {
      state: JSON.parse(row.state_json) as unknown,
      version: row.version,
      updatedBy: row.updated_by_user_id,
      updatedAt: row.updated_at,
      organizationId: context.actor.organizationId,
      enterpriseId,
    } : {
      state: null,
      version: 0,
      organizationId: context.actor.organizationId,
      enterpriseId,
    });
  }, request.headers.get('x-request-id') ?? crypto.randomUUID());
}

export async function PUT(request: Request) {
  return withApiErrors(async (requestId) => {
    const context = await createRequestContext(request, { requestId });
    const body = objectValue(await readJsonBody(request, { maxBytes: 256_000 }));
    const enterpriseId = requireKnowledgeScope(context, body.enterpriseId);
    if (!body.state || typeof body.state !== 'object' || Array.isArray(body.state)) {
      return jsonResponse({ error: 'invalid_knowledge_state' }, { status: 400 });
    }
    const encoded = JSON.stringify(body.state);
    if (new TextEncoder().encode(encoded).byteLength > 250_000) {
      return jsonResponse({ error: 'knowledge_state_too_large' }, { status: 413 });
    }
    if (body.version !== undefined && (!Number.isInteger(body.version) || Number(body.version) < 0)) {
      return jsonResponse({ error: 'invalid_knowledge_version' }, { status: 400 });
    }

    const current = await getKnowledge(context, enterpriseId);
    const suppliedVersion = typeof body.version === 'number' ? body.version : undefined;
    if (suppliedVersion !== undefined && suppliedVersion !== (current?.version ?? 0)) {
      return jsonResponse({ error: 'version_conflict', currentVersion: current?.version ?? 0 }, { status: 409 });
    }

    const nextVersion = (current?.version ?? 0) + 1;
    const now = new Date().toISOString();
    if (current) {
      const result = await execute(context.db, {
        sql: `UPDATE organization_enterprise_knowledge_state
          SET state_json = ?, version = ?, updated_by_user_id = ?, updated_at = ?
          WHERE organization_id = ? AND enterprise_id = ? AND version = ?`,
        params: [
          encoded,
          nextVersion,
          context.actor.userId,
          now,
          context.actor.organizationId,
          enterpriseId,
          current.version,
        ],
      });
      if (result.meta.changes !== 1) {
        const latest = await getKnowledge(context, enterpriseId);
        return jsonResponse({ error: 'version_conflict', currentVersion: latest?.version ?? 0 }, { status: 409 });
      }
    } else {
      const result = await execute(context.db, {
        sql: `INSERT OR IGNORE INTO organization_enterprise_knowledge_state
          (organization_id, enterprise_id, state_json, version, updated_by_user_id, updated_at)
          VALUES (?, ?, ?, 1, ?, ?)`,
        params: [context.actor.organizationId, enterpriseId, encoded, context.actor.userId, now],
      });
      if (result.meta.changes !== 1) {
        const latest = await getKnowledge(context, enterpriseId);
        return jsonResponse({ error: 'version_conflict', currentVersion: latest?.version ?? 0 }, { status: 409 });
      }
    }

    const auditId = await tryWriteAuditEvent(context.db, {
      actor: context.actor,
      action: 'knowledge.update',
      resourceType: 'enterprise_knowledge',
      resourceId: enterpriseId,
      riskLevel: 'medium',
      requestId,
      details: {
        enterprise_id: enterpriseId,
        version: nextVersion,
      },
    });
    return jsonResponse({
      ok: true,
      version: nextVersion,
      updatedAt: now,
      updatedBy: context.actor.userId,
      organizationId: context.actor.organizationId,
      enterpriseId,
      auditRecorded: auditId !== null,
    });
  }, request.headers.get('x-request-id') ?? crypto.randomUUID());
}

async function getKnowledge(context: RequestContext, enterpriseId: string) {
  return queryFirst<KnowledgeRow>(context.db, {
    sql: `SELECT state_json, version, updated_by_user_id, updated_at
      FROM organization_enterprise_knowledge_state
      WHERE organization_id = ? AND enterprise_id = ?`,
    params: [context.actor.organizationId, enterpriseId],
  });
}

function requireKnowledgeScope(context: RequestContext, requestedEnterpriseId: unknown): string {
  const enterpriseId = context.organization.enterpriseId;
  if (!enterpriseId) {
    throw new ApiError(409, 'enterprise_context_required', 'The active organization is not linked to an enterprise');
  }
  if (
    requestedEnterpriseId !== undefined &&
    requestedEnterpriseId !== null &&
    requestedEnterpriseId !== '' &&
    requestedEnterpriseId !== enterpriseId
  ) {
    throw new ApiError(403, 'enterprise_scope_forbidden', 'Enterprise is outside the active organization scope');
  }
  return enterpriseId;
}
