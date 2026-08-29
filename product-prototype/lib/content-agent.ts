export type CreationStrategy = 'viral_remix' | 'product_led' | 'asset_led';

export type StrategySource = 'ai_recommended' | 'user_selected';

export type StrategyInput = {
  product: string;
  market: string;
  audience: string;
  goal: string;
  platform: string;
  language: string;
  productFacts: string[];
  assets: string[];
  references: string[];
};

export type StrategyDecision = {
  strategy: CreationStrategy;
  source: StrategySource;
  confidence: number;
  reason: string;
  evidence: string[];
  requiredInputs: string[];
  missingInputs: string[];
  alternatives: Array<{ strategy: CreationStrategy; reason: string }>;
  provider: 'qwen' | 'local';
};

export type WorkflowStep = {
  id: string;
  name: string;
  objective: string;
  output: string;
  evidence: string[];
  checks: string[];
  status: 'ready' | 'blocked';
};

export type VideoWorkflow = {
  strategy: CreationStrategy;
  title: string;
  summary: string;
  steps: WorkflowStep[];
  sharedGates: string[];
  provider: 'qwen' | 'local';
};

export const strategyMeta: Record<CreationStrategy, { label: string; description: string }> = {
  product_led: { label: '从产品生成', description: '从产品事实、目标买家和经营目标反推主题、脚本与画面。' },
  asset_led: { label: '基于素材创作', description: '先识别真实素材可证明什么，再规划剪辑结构。' },
  viral_remix: { label: '爆款结构迁移', description: '迁移钩子、证明顺序与节奏，用企业事实和素材重建。' },
};

const missing = (input: StrategyInput) => [
  !input.product.trim() && '已确认产品',
  !input.audience.trim() && '目标买家',
  !input.goal.trim() && '经营目标',
].filter(Boolean) as string[];

export function decideStrategyLocally(input: StrategyInput): StrategyDecision {
  const referencesReady = input.references.length > 0 && input.productFacts.length > 0;
  const assetsReady = input.assets.length >= 2;
  const productReady = Boolean(input.product.trim() && input.audience.trim() && input.goal.trim() && input.productFacts.length);
  const strategy: CreationStrategy = referencesReady ? 'viral_remix' : assetsReady ? 'asset_led' : 'product_led';
  const reasons: Record<CreationStrategy, string> = {
    viral_remix: '存在与目标市场和买家匹配的参考内容，且已有产品事实可完成逐镜映射。',
    asset_led: '现有真实素材足以组成“钩子—证明—价值—CTA”，优先从可见证据组织内容。',
    product_led: productReady ? '产品事实、目标买家和转化目标完整，适合从买家问题反推内容。' : '参考与素材不足，先从产品路径梳理主题，同时补齐缺失资料。',
  };
  const evidence = strategy === 'viral_remix'
    ? [...input.references.slice(0, 2), ...input.productFacts.slice(0, 2)]
    : strategy === 'asset_led'
      ? input.assets.slice(0, 4)
      : [input.product, input.audience, ...input.productFacts.slice(0, 2)].filter(Boolean);
  return {
    strategy,
    source: 'ai_recommended',
    confidence: referencesReady ? 91 : assetsReady ? 88 : productReady ? 86 : 62,
    reason: reasons[strategy],
    evidence,
    requiredInputs: strategy === 'viral_remix' ? ['参考逐镜分析', '已确认产品事实', '企业真实素材'] : strategy === 'asset_led' ? ['已授权素材', '素材证据标签', '目标买家'] : ['产品规格', '目标买家', '市场与平台'],
    missingInputs: missing(input),
    alternatives: (Object.keys(strategyMeta) as CreationStrategy[]).filter(item => item !== strategy).map(item => ({ strategy: item, reason: `可切换为${strategyMeta[item].label}，但需要补齐该路径的关键输入。` })),
    provider: 'local',
  };
}

export function buildWorkflowLocally(input: StrategyInput, strategy: CreationStrategy): VideoWorkflow {
  const product = input.product || '待确认产品';
  const context = `${input.market || '目标市场'} · ${input.audience || '目标买家'} · ${input.platform || '目标平台'}`;
  const steps: Record<CreationStrategy, Array<[string, string, string]>> = {
    product_led: [
      ['理解产品', '确认产品、买家与转化目标', `已建立 ${product} 的事实边界与买家任务：${input.goal || '待补充目标'}`],
      ['生成主题', '从买家问题生成内容角度', `主题：采购 ${product} 前需要核对的三项供应证据`],
      ['脚本分镜', '将已确认事实编排为可执行镜头', '结构：问题钩子 → 产能证明 → 批次品质 → 准入资料 → CTA'],
      ['生成画面', '匹配企业素材并标记需要补齐的画面', `优先匹配 ${input.assets.length} 项企业素材，缺口只生成非事实性辅助画面`],
      ['成片预览', '合成多语言成片并提交审核', `${input.language || 'English'} · 30秒 · 9:16 · ${context}`],
    ],
    asset_led: [
      ['理解素材', '识别画面对象、动作、质量与授权', `已读取 ${input.assets.length} 项素材并建立可用范围`],
      ['识别证据', '提取画面能够直接支持的企业事实', `证据：${input.assets.slice(0, 3).join('、') || '等待素材标签'}`],
      ['规划结构', '按可见证据规划叙事顺序', '结构：真实画面钩子 → 工厂/产品证明 → 检测证明 → 采购价值 → CTA'],
      ['剪辑包装', '生成剪辑脚本、字幕、标题和封面', `按 ${input.platform || '目标平台'} 节奏完成镜头排序，禁止写入画面无法支持的事实`],
      ['成片预览', '完成合成并执行素材落地检查', `${input.language || 'English'} · 30秒 · 9:16 · ${context}`],
    ],
    viral_remix: [
      ['拆解参考', '识别钩子、节奏、证明顺序与CTA', `已拆解 ${input.references.length} 条参考，只保留结构特征`],
      ['产品映射', '将参考表达映射为企业已确认事实', `参考表达已替换为 ${product} 的产品事实，不沿用竞品主张`],
      ['素材回填', '用企业真实素材重建每个镜头', `已从 ${input.assets.length} 项企业素材中匹配镜头，无法映射的镜头重新设计`],
      ['差异检查', '检查品牌、文案、事实和视觉泄漏', '竞品品牌、原文案、产品参数和原素材均不得进入新成片'],
      ['成片预览', '确认结构迁移后的独立成片', `${input.language || 'English'} · 30秒 · 9:16 · ${context}`],
    ],
  };
  return {
    strategy,
    title: `${product}｜${strategyMeta[strategy].label}视频工作流`,
    summary: strategyMeta[strategy].description,
    steps: steps[strategy].map(([name, objective, output], index) => ({
      id: `${strategy}-${index + 1}`,
      name,
      objective,
      output,
      evidence: index === 0 ? [product, context] : input.productFacts.slice(0, 3),
      checks: index === 4 ? ['事实核验', '品牌规范', '平台合规', '发布前人工审核'] : ['输入完整', '无阻断风险'],
      status: missing(input).length && index === 0 ? 'blocked' : 'ready',
    })),
    sharedGates: ['事实与商业承诺核验', '品牌与版权检查', '平台合规检查', '发布前人工审核'],
    provider: 'local',
  };
}
