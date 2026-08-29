type ChatMessage = { role: 'assistant' | 'user'; content: string };

const PAGE_NAMES: Record<string, string> = {
  home: '首页', projects: '经营任务', approvals: '审批与异常', content: '内容与素材',
  schedule: '排期与分发', traffic: '广告投放', inquiries: '客户经营', workbench: '客户工作台',
  revenue: '收入分析', knowledge: '企业知识库', structure: '组织架构', permissions: '权限管理',
  data: '数据管理', security: '系统与安全',
};

const VERIFIED_DEMO_CONTEXT = `
当前页面展示的已知业务数据（仅可在相关问题中引用）：
- 本月获得精准流量 38,420，目标 48,000，达成 80%，同比 +18.6%。
- 晋级筛选型盘 333，目标 420，达成 79%，同比 +24.1%。
- 新增活跃商家 42，目标 56，达成 75%，同比 +8.3%。
- 今日焦点：3 条高意向询盘等待接管；贵州茶项目询盘转化低于目标 22%；第二轮投流预算需确认。
- 项目：贵州茶｜东南亚市场，商机推进，目标达成 78%，商机管道 ¥486 万，投入产出 6.8x。
- 客户工作台已知：Adrian Tan（Lumi Ingredients，马来西亚）意向分 91，正在确认贵州茶等级、食品级认证与 500kg 正式报价。
`;

function cleanMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-10).flatMap((item): ChatMessage[] => {
    if (!item || typeof item !== 'object') return [];
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== 'assistant' && role !== 'user') || typeof content !== 'string') return [];
    const trimmed = content.trim().slice(0, 2000);
    return trimmed ? [{ role, content: trimmed }] : [];
  });
}

function safeFallback(message: string, view: string) {
  const page = PAGE_NAMES[view] || view;
  if (/本月|今天|关注|异常|重点|总结/.test(message)) {
    return `结论：当前最需要关注三件事。\n\n已知事实：3 条高意向询盘等待接管；贵州茶项目询盘转化低于目标 22%；第二轮投流预算需确认。\n\n建议：先处理高意向询盘，再核对贵州茶项目的转化漏损，最后结合预期询盘质量审批投流预算。`;
  }
  if (/待处理|审批/.test(message)) return '已知事实：当前有 7 项等待审批，并有 3 条高意向询盘等待接管。建议按超时风险和潜在商机金额排序处理；当前页面没有足够数据确认每项审批的最终优先级。';
  return `当前位于“${page}”。当前页面没有足够数据确认这个问题，请补充要分析的客户、项目或时间范围。`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: unknown; view?: unknown; history?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';
    const view = typeof body.view === 'string' ? body.view : 'home';
    if (!message) return Response.json({ error: '请输入问题。' }, { status: 400 });
    // Questions about current operating data are answered from the verified
    // snapshot instead of a generative model. This prevents plausible but
    // unsupported causes, industries or actions from entering a management
    // answer.
    if (/本月|今天|当前|关注|异常|重点|总结|待处理|审批/.test(message)) {
      return Response.json({ message: safeFallback(message, view), provider: 'verified-rules' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) return Response.json({ message: safeFallback(message, view), provider: 'local', warning: 'ai_unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
    const baseUrl = (process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '');
    const history = cleanMessages(body.history);
    const system = `你是黔海 Global Growth OS 的全局 AI 助手“黔小海”。用简洁、自然、可执行的中文回答。
用户当前位于：${PAGE_NAMES[view] || view}。
${VERIFIED_DEMO_CONTEXT}
规则：
1. 不得捏造平台里没有提供的数字、客户、订单、审批状态、使用场景、素材或已执行动作。不得把某个已知客户与未提供的工厂、使用、拍摄、收货等情节拼成案例。
2. 用户问当前数据而上下文不足时，直说“当前页面没有足够数据确认”，并说明需要什么。
3. 可回答通用市场、内容、客户跟进与经营分析问题，但要区分“通用建议”与“平台已知事实”。
4. 如果给出假设或创意示例，必须明确标注“示例，非已发生事实”，且不得带入已知客户姓名。示例中严禁编造 CTR、播放量、转化率、收入或任何结果数字，也不得声称示例已取得某种效果。
5. 默认 2–4 个短段或要点，先给结论，不要说“正在分析”。只输出纯文本，不使用 Markdown 标记。`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(12_000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.QWEN_MODEL || 'qwen-plus', temperature: 0.25,
        messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: message }],
      }),
    });
    if (!response.ok) throw new Error(`upstream_${response.status}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('empty_response');
    return Response.json({ message: content, provider: 'qwen' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    return Response.json({ message: safeFallback('', 'home'), provider: 'local', warning: timedOut ? 'ai_timeout' : 'ai_unavailable' }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
