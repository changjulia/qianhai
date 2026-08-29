import { getDatabase } from '../../../lib/server/d1';

type Row = Record<string, unknown>;

const stageLabels: Record<string, string> = {
  new_inquiry: '询盘接待',
  nurturing: '持续培育',
  qualified: '资格确认',
  sample_requested: '样品／会议',
  sample: '样品／会议',
  opportunity: '商机推进',
  quotation: '报价协同',
  negotiation: '商务谈判',
  human_handoff: '人工接管',
  won: '成交',
  lost: '已失单',
};

function jsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function money(value: unknown): string {
  const amount = Number(value ?? 0);
  if (!amount) return '待评估';
  return amount >= 10000 ? `¥${Number((amount / 10000).toFixed(1))} 万` : `¥${amount.toLocaleString('zh-CN')}`;
}

function relativeTime(value: unknown): string {
  if (typeof value !== 'string') return '暂无互动';
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return value.slice(0, 16).replace('T', ' ');
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export async function GET() {
  try {
    const db = getDatabase();
    const [customerResult, messageResult, taskResult, dealResult, orderResult, memoryResult] = await db.batch([
      db.prepare(`
        SELECT c.*, p.company_name, p.industry, p.source_content, p.translated_summary,
          p.reply_draft, p.tags_json, p.qualification_json, p.conversation_tags_json,
          p.psychology_json, p.sales_json, p.evidence_json, p.memory_summary,
          p.qualification_fields_json, cv.id AS conversation_id, cv.started_at,
          cv.status AS conversation_status, cv.current_owner, cv.summary AS conversation_summary,
          cv.channel AS conversation_channel,
          (SELECT body FROM messages WHERE conversation_id = cv.id AND sender_type = 'customer' ORDER BY sent_at DESC LIMIT 1) AS inbound
        FROM customers c
        LEFT JOIN customer_workbench_profiles p ON p.customer_id = c.id
        LEFT JOIN conversations cv ON cv.id = (
          SELECT id FROM conversations WHERE customer_id = c.id ORDER BY started_at DESC LIMIT 1
        )
        ORDER BY c.intent_score DESC, c.id ASC
      `),
      db.prepare('SELECT m.* FROM messages m JOIN conversations c ON c.id = m.conversation_id ORDER BY m.sent_at ASC'),
      db.prepare('SELECT * FROM customer_workbench_tasks ORDER BY CASE status WHEN ? THEN 0 ELSE 1 END, due_at ASC, created_at DESC').bind('待处理'),
      db.prepare('SELECT * FROM opportunities ORDER BY last_activity_at DESC'),
      db.prepare('SELECT * FROM orders ORDER BY ordered_at DESC'),
      db.prepare('SELECT * FROM customer_memories ORDER BY created_at DESC'),
    ]);

    const messagesByConversation = new Map<string, Row[]>();
    for (const message of (messageResult.results ?? []) as Row[]) {
      const id = String(message.conversation_id);
      messagesByConversation.set(id, [...(messagesByConversation.get(id) ?? []), message]);
    }
    const memoriesByCustomer = new Map<string, Row[]>();
    for (const memory of (memoryResult.results ?? []) as Row[]) {
      const id = String(memory.customer_id);
      memoriesByCustomer.set(id, [...(memoriesByCustomer.get(id) ?? []), memory]);
    }

    const customers = ((customerResult.results ?? []) as Row[]).map((row) => {
      const requirements = jsonValue<string[]>(row.requirements_json, []);
      const painPoints = jsonValue<string[]>(row.pain_points_json, []);
      const conversationId = row.conversation_id ? String(row.conversation_id) : '';
      const qualification = jsonValue<Array<[string, string, string]>>(row.qualification_json, [
        ['需求 Need', row.estimated_volume ? String(row.estimated_volume) : '待确认', '80%'],
        ['时间 Timeline', '待确认', '45%'],
        ['决策 Authority', String(row.contact_role ?? '待确认'), '70%'],
        ['预算 Budget', '待确认', '40%'],
      ]);
      const defaultSales: Array<[string, string, string]> = [
        ['情境 Situation', String(row.conversation_summary ?? row.next_step ?? '待确认'), '已识别'],
        ['问题 Problem', painPoints[0] ?? '待追问', painPoints.length ? '明确' : '待确认'],
        ['影响 Implication', '可能影响采购决策与实施进度', '待追问'],
        ['价值 Need-payoff', requirements[0] ?? '补全需求后评估', '待确认'],
        ['决策链', String(row.contact_role ?? '联系人') + '＋相关业务负责人', '待确认'],
        ['竞争态势', '可能处于多供应商比选', '需关注'],
        ['成交阻力', painPoints.join('、') || '预算与交付条件未补全', `${Math.max(1, painPoints.length)} 项`],
        ['推进窗口', String(row.next_step ?? '尽快安排下一步'), Number(row.intent_score) >= 80 ? '高优先' : '中优先'],
      ];
      return {
        id: String(row.id),
        name: String(row.display_name),
        company: String(row.company_name ?? row.company_type),
        market: String(row.market),
        industry: String(row.industry ?? row.company_type),
        score: Number(row.intent_score),
        stage: stageLabels[String(row.lifecycle_stage)] ?? String(row.lifecycle_stage),
        risk: ['human_handoff', 'waiting_approval'].includes(String(row.conversation_status)) || painPoints.length > 1,
        last: relativeTime(row.started_at),
        need: String(row.conversation_summary ?? row.next_step ?? requirements.join('、')),
        source: String(row.conversation_channel ?? row.source_channel),
        sourceContent: String(row.source_content ?? '客户主动询盘'),
        inbound: String(row.inbound ?? '暂无客户消息'),
        translation: String(row.translated_summary ?? row.inbound ?? '暂无翻译'),
        draft: String(row.reply_draft ?? ''),
        tags: jsonValue<string[]>(row.tags_json, [...requirements, ...painPoints].slice(0, 4)),
        qualification,
        conversationTags: jsonValue<Array<[string, string, string]>>(row.conversation_tags_json, [
          ['采购阶段', stageLabels[String(row.lifecycle_stage)] ?? String(row.lifecycle_stage), String(row.next_step ?? '待跟进')],
          ['核心意图', requirements[0] ?? '需求待补全', String(row.conversation_summary ?? '')],
          ['显性关注', requirements.slice(0, 2).join(' / ') || '待识别', painPoints[0] ?? '暂无'],
        ]),
        psychology: jsonValue<Array<[string, string, string, string]>>(row.psychology_json, [
          ['决策风格', '信息验证型', `${Math.max(60, Number(row.intent_score))}%`, '根据当前询盘和行为综合判断'],
          ['风险敏感度', painPoints.length > 1 ? '高' : '中等', painPoints.length > 1 ? '85%' : '65%', painPoints.join('、') || '尚无显著风险信号'],
        ]),
        sales: jsonValue<Array<[string, string, string]>>(row.sales_json, defaultSales),
        evidence: jsonValue<Array<[string, string, string]>>(row.evidence_json, [
          ['客户原话', String(row.inbound ?? '暂无客户消息'), String(row.conversation_channel ?? row.source_channel)],
          ['客户身份', String(row.company_type), `CRM · ${row.contact_role}`],
          ['需求信号', requirements.join(' / ') || '待识别', '客户档案'],
          ['风险信号', painPoints.join(' / ') || '暂无', '客户档案'],
        ]),
        memory: String(row.memory_summary ?? row.next_step ?? ''),
        memories: (memoriesByCustomer.get(String(row.id)) ?? []).map((memory) => ({
          id: String(memory.id), body: String(memory.body), createdAt: String(memory.created_at), createdBy: String(memory.created_by),
        })),
        qualificationFields: jsonValue<Record<string, string>>(row.qualification_fields_json, {}),
        conversationId,
        messages: (messagesByConversation.get(conversationId) ?? []).map((message) => ({
          id: String(message.id), body: String(message.body), senderType: String(message.sender_type),
          senderLabel: String(message.sender_label), sentAt: String(message.sent_at), automated: Boolean(message.automated),
        })),
        owner: String(row.current_owner ?? row.owner_role),
        handedOff: String(row.conversation_status) === 'human_handoff',
      };
    });

    const tasks = ((taskResult.results ?? []) as Row[]).map((row) => ({
      id: String(row.id), customerId: String(row.customer_id), opportunityId: row.opportunity_id ? String(row.opportunity_id) : undefined,
      title: String(row.title), reason: String(row.reason), amount: money(row.amount_cny), amountCny: Number(row.amount_cny),
      sla: String(row.sla_text), kind: String(row.kind), status: String(row.status),
    }));
    const deals = ((dealResult.results ?? []) as Row[]).map((row) => ({
      id: String(row.id), customerId: String(row.customer_id), title: String(row.name), amount: money(row.amount_cny),
      amountCny: Number(row.amount_cny), stage: stageLabels[String(row.stage)] ?? String(row.stage), rawStage: String(row.stage),
      probability: Math.round(Number(row.probability) * 100), next: String(row.next_step),
    }));
    const orders = ((orderResult.results ?? []) as Row[]).map((row) => ({
      id: String(row.id), customerId: String(row.customer_id), opportunityId: String(row.opportunity_id),
      amountCny: Number(row.amount_cny), amount: money(row.amount_cny), status: String(row.status), orderedAt: String(row.ordered_at),
    }));
    const openDeals = deals.filter((deal) => !['won', 'lost'].includes(deal.rawStage));
    const wonOrders = orders.filter((order) => order.status === 'won');
    const highIntent = customers.filter((customer) => customer.score >= 80).length;

    return Response.json({
      customers,
      tasks,
      deals,
      orders,
      metrics: {
        highIntent,
        inProgressCount: openDeals.length,
        pipelineCny: openDeals.reduce((sum, deal) => sum + deal.amountCny, 0),
        wonCount: wonOrders.length,
        wonRevenueCny: wonOrders.reduce((sum, order) => sum + order.amountCny, 0),
        pendingTasks: tasks.filter((task) => task.status === '待处理').length,
        newInquiries: customers.filter((customer) => customer.stage === '询盘接待').length,
        quotations: deals.filter((deal) => deal.rawStage === 'quotation').length,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('customer_snapshot_failed', error);
    return Response.json({ error: 'customer_snapshot_failed', message: '客户经营数据暂时无法加载' }, { status: 503 });
  }
}
