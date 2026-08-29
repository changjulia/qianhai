import type { StrategyDecision, StrategyInput, VideoWorkflow, CreationStrategy } from './content-agent';

const defaultBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

async function complete<T>(system: string, payload: unknown): Promise<T | null> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.QWEN_BASE_URL || defaultBaseUrl).replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(8_000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.QWEN_MODEL || 'qwen-plus',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${system}\n只返回合法 JSON，不使用 Markdown。不得补造产品事实、认证、产能、价格、MOQ或交期。` },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Qwen request failed: ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  return content ? extractJson(content) as T : null;
}

export async function decideWithQwen(input: StrategyInput) {
  return complete<StrategyDecision>('你是灵枢内容策略路由器。只可在 viral_remix、asset_led、product_led 中选择。优先级：高匹配且可映射的参考；能组成完整结构的真实素材；完整产品与买家信息。返回 StrategyDecision 全部字段，provider 固定为 qwen。', input);
}

export async function buildWorkflowWithQwen(input: StrategyInput, strategy: CreationStrategy) {
  return complete<VideoWorkflow>('你是灵枢视频生产编排器。严格按照指定策略生成5步可执行工作流；每步返回 id、name、objective、output、evidence、checks、status。viral_remix 只迁移结构，asset_led 不得超出素材证据，product_led 不得补造产品事实。返回 VideoWorkflow 全部字段，provider 固定为 qwen。', { strategy, input });
}
