import { getDatabase } from '../../../lib/server/d1';

type Row = Record<string, unknown>;
type ActionBody = {
  action?: string;
  customerId?: string;
  conversationId?: string;
  taskId?: string;
  opportunityId?: string;
  body?: string;
  owner?: string;
  active?: boolean;
  status?: string;
  stage?: string;
  title?: string;
  nextStep?: string;
  amountCny?: number;
  probability?: number;
  fields?: Record<string, string>;
  note?: string;
};

const stageValues: Record<string, string> = {
  '询盘接待': 'new_inquiry', '资格确认': 'qualified', '样品／会议': 'sample',
  '商机推进': 'opportunity', '报价协同': 'quotation', '商务谈判': 'negotiation', '成交': 'won',
  new_inquiry: 'new_inquiry', qualified: 'qualified', sample: 'sample', opportunity: 'opportunity',
  quotation: 'quotation', negotiation: 'negotiation', won: 'won', lost: 'lost',
};

function actor(request: Request) {
  return {
    id: request.headers.get('oai-authenticated-user-id')
      ?? request.headers.get('oai-authenticated-user-email')
      ?? request.headers.get('x-openai-user-id')
      ?? request.headers.get('cf-access-authenticated-user-email')
      ?? 'development-user',
    name: request.headers.get('oai-authenticated-user-name')
      ?? request.headers.get('oai-authenticated-user-email')
      ?? request.headers.get('x-openai-user-name')
      ?? request.headers.get('x-openai-user-email')
      ?? 'Development User',
  };
}

function text(value: unknown, max = 4000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function audit(db: D1Database, user: ReturnType<typeof actor>, action: string, resourceType: string, resourceId: string, details: Record<string, unknown>) {
  return db.prepare(`
    INSERT INTO security_audit_events
      (id, occurred_at, actor_type, actor_id, action, resource_type, resource_id, risk_level, result, details_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    `audit-${crypto.randomUUID()}`, new Date().toISOString(), 'user', user.id, action,
    resourceType, resourceId, 'low', 'success', JSON.stringify({ actorName: user.name, ...details }),
  );
}

async function customerConversation(db: D1Database, customerId: string, requestedId?: string) {
  if (requestedId) {
    return db.prepare('SELECT * FROM conversations WHERE id = ? AND customer_id = ?').bind(requestedId, customerId).first<Row>();
  }
  return db.prepare('SELECT * FROM conversations WHERE customer_id = ? ORDER BY started_at DESC LIMIT 1').bind(customerId).first<Row>();
}

export async function POST(request: Request) {
  let input: ActionBody;
  try {
    input = await request.json() as ActionBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const action = text(input.action, 60);
  const db = getDatabase();
  const user = actor(request);
  const now = new Date().toISOString();

  try {
    if (action === 'send_message') {
      const customerId = text(input.customerId, 120);
      const messageBody = text(input.body);
      if (!customerId || !messageBody) return Response.json({ error: 'customer_and_message_required' }, { status: 400 });
      const conversation = await customerConversation(db, customerId, text(input.conversationId, 120));
      if (!conversation) return Response.json({ error: 'conversation_not_found' }, { status: 404 });
      const messageId = `msg-${crypto.randomUUID()}`;
      await db.batch([
        db.prepare(`INSERT INTO messages
          (id, conversation_id, sent_at, sender_type, sender_label, language, body, attachment_refs_json, knowledge_refs_json, automated, handoff_reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', 0, NULL)`)
          .bind(messageId, conversation.id, now, 'human', user.name, 'en', messageBody),
        db.prepare('UPDATE conversations SET summary = ? WHERE id = ?').bind(`已回复：${messageBody.slice(0, 120)}`, conversation.id),
        audit(db, user, 'customer.message.send', 'message', messageId, { customerId, conversationId: conversation.id }),
      ]);
      return Response.json({ message: { id: messageId, body: messageBody, senderType: 'human', senderLabel: user.name, sentAt: now, automated: false } });
    }

    if (action === 'update_owner') {
      const customerId = text(input.customerId, 120);
      const owner = text(input.owner, 160);
      if (!customerId || !owner) return Response.json({ error: 'customer_and_owner_required' }, { status: 400 });
      const conversation = await customerConversation(db, customerId);
      const statements = [
        db.prepare('UPDATE customers SET owner_role = ? WHERE id = ?').bind(owner, customerId),
        audit(db, user, 'customer.owner.update', 'customer', customerId, { owner }),
      ];
      if (conversation) statements.splice(1, 0, db.prepare('UPDATE conversations SET current_owner = ? WHERE id = ?').bind(owner, conversation.id));
      await db.batch(statements);
      return Response.json({ customerId, owner });
    }

    if (action === 'set_handoff') {
      const customerId = text(input.customerId, 120);
      if (!customerId || typeof input.active !== 'boolean') return Response.json({ error: 'customer_and_active_required' }, { status: 400 });
      const conversation = await customerConversation(db, customerId);
      if (!conversation) return Response.json({ error: 'conversation_not_found' }, { status: 404 });
      const owner = text(input.owner, 160) || String(conversation.current_owner);
      const status = input.active ? 'human_handoff' : 'active';
      await db.batch([
        db.prepare('UPDATE conversations SET status = ?, current_owner = ? WHERE id = ?').bind(status, owner, conversation.id),
        db.prepare('UPDATE customers SET lifecycle_stage = ?, owner_role = ? WHERE id = ?')
          .bind(input.active ? 'human_handoff' : 'qualified', owner, customerId),
        audit(db, user, input.active ? 'customer.handoff.start' : 'customer.handoff.end', 'conversation', String(conversation.id), { customerId, owner }),
      ]);
      return Response.json({ customerId, conversationId: conversation.id, handedOff: input.active, owner });
    }

    if (action === 'decide_task') {
      const taskId = text(input.taskId, 120);
      const status = text(input.status, 20);
      if (!taskId || !['已完成', '已驳回'].includes(status)) return Response.json({ error: 'invalid_task_decision' }, { status: 400 });
      const task = await db.prepare('SELECT * FROM customer_workbench_tasks WHERE id = ?').bind(taskId).first<Row>();
      if (!task) return Response.json({ error: 'task_not_found' }, { status: 404 });
      await db.batch([
        db.prepare(`UPDATE customer_workbench_tasks
          SET status = ?, decided_at = ?, decided_by = ?, decision_note = ?, updated_at = ? WHERE id = ?`)
          .bind(status, now, user.id, text(input.note, 500), now, taskId),
        audit(db, user, status === '已完成' ? 'customer.task.complete' : 'customer.task.reject', 'customer_workbench_task', taskId, { customerId: task.customer_id }),
      ]);
      return Response.json({ task: { id: taskId, status, decidedAt: now, decidedBy: user.name } });
    }

    if (action === 'move_opportunity') {
      const opportunityId = text(input.opportunityId, 120);
      const stage = stageValues[text(input.stage, 40)];
      if (!opportunityId || !stage) return Response.json({ error: 'invalid_opportunity_stage' }, { status: 400 });
      const opportunity = await db.prepare('SELECT * FROM opportunities WHERE id = ?').bind(opportunityId).first<Row>();
      if (!opportunity) return Response.json({ error: 'opportunity_not_found' }, { status: 404 });
      await db.batch([
        db.prepare('UPDATE opportunities SET stage = ?, last_activity_at = ?, next_step = COALESCE(NULLIF(?, ?), next_step) WHERE id = ?')
          .bind(stage, now, text(input.nextStep, 500), '', opportunityId),
        audit(db, user, 'opportunity.stage.update', 'opportunity', opportunityId, { previousStage: opportunity.stage, stage }),
      ]);
      return Response.json({ opportunity: { id: opportunityId, stage, lastActivityAt: now } });
    }

    if (action === 'create_opportunity') {
      const customerId = text(input.customerId, 120);
      const customer = customerId
        ? await db.prepare('SELECT * FROM customers WHERE id = ?').bind(customerId).first<Row>()
        : null;
      if (!customer) return Response.json({ error: 'customer_not_found' }, { status: 404 });
      const id = `opp-${crypto.randomUUID()}`;
      const amountCny = Number.isFinite(input.amountCny) && Number(input.amountCny) >= 0 ? Number(input.amountCny) : 0;
      const probability = Number.isFinite(input.probability) ? Math.max(0, Math.min(1, Number(input.probability))) : 0.2;
      const title = text(input.title, 240) || `${String(customer.display_name)} 新商机`;
      const nextStep = text(input.nextStep, 500) || '补全采购需求、预算与交付条件';
      await db.batch([
        db.prepare(`INSERT INTO opportunities
          (id, task_id, customer_id, name, stage, amount_cny, probability, expected_close_on, product_ids_json, estimated_volume, last_activity_at, next_step, mock_notice)
          VALUES (?, 'task-my-30d', ?, ?, 'qualified', ?, ?, NULL, ?, ?, ?, ?, ?)`)
          .bind(id, customerId, title, amountCny, probability, String(customer.interested_products_json ?? '[]'), String(customer.estimated_volume ?? ''), now, nextStep, 'Demo模拟商机金额'),
        db.prepare("UPDATE customers SET lifecycle_stage = 'qualified', next_step = ? WHERE id = ?").bind(nextStep, customerId),
        audit(db, user, 'opportunity.create', 'opportunity', id, { customerId, amountCny, probability }),
      ]);
      return Response.json({ opportunity: { id, customerId, title, amountCny, probability: Math.round(probability * 100), stage: '资格确认', rawStage: 'qualified', next: nextStep } }, { status: 201 });
    }

    if (action === 'add_memory') {
      const customerId = text(input.customerId, 120);
      const body = text(input.body, 2000);
      if (!customerId || !body) return Response.json({ error: 'customer_and_memory_required' }, { status: 400 });
      const customer = await db.prepare('SELECT id FROM customers WHERE id = ?').bind(customerId).first<Row>();
      if (!customer) return Response.json({ error: 'customer_not_found' }, { status: 404 });
      const id = `memory-${crypto.randomUUID()}`;
      await db.batch([
        db.prepare('INSERT INTO customer_memories (id, customer_id, body, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(id, customerId, body, user.name, now),
        audit(db, user, 'customer.memory.create', 'customer_memory', id, { customerId }),
      ]);
      return Response.json({ memory: { id, body, createdBy: user.name, createdAt: now } }, { status: 201 });
    }

    if (action === 'save_qualification') {
      const customerId = text(input.customerId, 120);
      const fields = Object.fromEntries(Object.entries(input.fields ?? {}).map(([key, value]) => [key, text(value, 500)]));
      if (!customerId || !Object.keys(fields).length) return Response.json({ error: 'customer_and_fields_required' }, { status: 400 });
      const completed = Object.values(fields).filter(Boolean).length;
      await db.batch([
        db.prepare(`UPDATE customer_workbench_profiles
          SET qualification_fields_json = ?, updated_at = ? WHERE customer_id = ?`)
          .bind(JSON.stringify(fields), now, customerId),
        db.prepare('UPDATE customers SET intent_score = MAX(intent_score, ?) WHERE id = ?').bind(Math.min(100, 70 + completed * 8), customerId),
        audit(db, user, 'customer.qualification.update', 'customer', customerId, { completedFields: completed }),
      ]);
      return Response.json({ customerId, fields, completed, scoreFloor: Math.min(100, 70 + completed * 8) });
    }

    if (action === 'create_followup') {
      const customerId = text(input.customerId, 120);
      const customer = customerId ? await db.prepare('SELECT * FROM customers WHERE id = ?').bind(customerId).first<Row>() : null;
      if (!customer) return Response.json({ error: 'customer_not_found' }, { status: 404 });
      const id = `cwt-${crypto.randomUUID()}`;
      const title = text(input.title, 240) || `跟进 ${String(customer.display_name)}`;
      const reason = text(input.note, 500) || String(customer.next_step ?? '按客户需求继续推进');
      await db.batch([
        db.prepare(`INSERT INTO customer_workbench_tasks
          (id, customer_id, title, reason, amount_cny, sla_text, kind, status, due_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, ?, '跟进', '待处理', ?, ?, ?)`)
          .bind(id, customerId, title, reason, '明天 18:00 前', input.nextStep || null, now, now),
        audit(db, user, 'customer.task.create', 'customer_workbench_task', id, { customerId }),
      ]);
      return Response.json({ task: { id, customerId, title, reason, amount: '待评估', sla: '明天 18:00 前', kind: '跟进', status: '待处理' } }, { status: 201 });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    console.error('customer_action_failed', { action, error });
    return Response.json({ error: 'customer_action_failed', message: '操作未能保存，请稍后重试' }, { status: 500 });
  }
}
