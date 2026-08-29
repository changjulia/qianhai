export type BusinessNodeStage = '品牌事实' | '内容生产' | '协同运营' | '内容传播' | '目标市场' | '客户信号' | '人工接管';

export type BusinessNode = {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  stage: BusinessNodeStage;
  status: string;
  description: string;
  tone: 'blue' | 'white' | 'orange';
  introStep: number;
  alwaysLabel?: boolean;
};

export type BusinessArc = {
  id: string;
  from: string;
  to: string;
  type: 'content' | 'signal' | 'handoff';
  introStep: number;
};

export const BUSINESS_NODES: BusinessNode[] = [
  {
    id: 'guizhou', name: '贵州｜品牌与产品起点', shortName: '贵州', lat: 26.58, lng: 106.72,
    stage: '品牌事实', status: '模拟运行 · 事实资料已载入', tone: 'blue', introStep: 0, alwaysLabel: true,
    description: '贵州抹茶的产品资料、目标客户和商务边界在此进入演示链路。',
  },
  {
    id: 'guiyang-agent', name: '贵阳｜国际内容数字员工', shortName: '贵阳内容 Agent', lat: 27.8, lng: 109.3,
    stage: '内容生产', status: '模拟运行 · 正在组织多语种内容', tone: 'blue', introStep: 1,
    description: '把已确认的品牌事实组织为面向海外采购角色的多语种内容。',
  },
  {
    id: 'linkedin', name: 'LinkedIn｜B2B 内容触点', shortName: 'LinkedIn', lat: 14.8, lng: 103.5,
    stage: '内容传播', status: '模拟触点 · B2B 内容', tone: 'blue', introStep: 2,
    description: '用于演示食品原料进口商可能看到专业内容的传播触点。',
  },
  {
    id: 'youtube', name: 'YouTube｜视频内容触点', shortName: 'YouTube', lat: 9.2, lng: 112.5,
    stage: '内容传播', status: '模拟触点 · 视频内容', tone: 'blue', introStep: 2,
    description: '用于演示工厂、品质与应用场景视频的传播路径。',
  },
  {
    id: 'tiktok', name: 'TikTok｜短视频传播触点', shortName: 'TikTok', lat: 4.4, lng: 116.8,
    stage: '内容传播', status: '模拟触点 · 短视频内容', tone: 'blue', introStep: 2,
    description: '用于演示短视频内容触达目标市场的路径。',
  },
  {
    id: 'kuala-lumpur', name: '吉隆坡｜目标市场', shortName: '吉隆坡', lat: 3.14, lng: 101.69,
    stage: '目标市场', status: '模拟运行 · 马来西亚市场', tone: 'white', introStep: 3, alwaysLabel: true,
    description: '当前演示案例的目标市场中心：马来西亚食品原料进口商。',
  },
  {
    id: 'importer-signal', name: '马来西亚进口商｜客户信号', shortName: '进口商信号', lat: 5.35, lng: 103.15,
    stage: '客户信号', status: '模拟信号 · 待低风险承接', tone: 'white', introStep: 4,
    description: '评论、私信、邮件或表单意向被识别后，回传至客户经营链路。',
  },
  {
    id: 'human-handoff', name: '人工接管｜商务红线', shortName: '人工接管', lat: 1.3, lng: 104.8,
    stage: '人工接管', status: '模拟规则 · 商务承诺需人工确认', tone: 'orange', introStep: 5, alwaysLabel: true,
    description: '涉及独家代理、价格、合同、折扣或交期时，数字员工停止并交给人。',
  },
];

export const BUSINESS_ARCS: BusinessArc[] = [
  { id: 'origin-agent', from: 'guizhou', to: 'guiyang-agent', type: 'content', introStep: 1 },
  { id: 'agent-linkedin', from: 'guiyang-agent', to: 'linkedin', type: 'content', introStep: 2 },
  { id: 'agent-youtube', from: 'guiyang-agent', to: 'youtube', type: 'content', introStep: 2 },
  { id: 'agent-tiktok', from: 'guiyang-agent', to: 'tiktok', type: 'content', introStep: 2 },
  { id: 'linkedin-market', from: 'linkedin', to: 'kuala-lumpur', type: 'content', introStep: 3 },
  { id: 'youtube-market', from: 'youtube', to: 'kuala-lumpur', type: 'content', introStep: 3 },
  { id: 'tiktok-market', from: 'tiktok', to: 'kuala-lumpur', type: 'content', introStep: 3 },
  { id: 'market-signal', from: 'kuala-lumpur', to: 'importer-signal', type: 'signal', introStep: 4 },
  { id: 'signal-return', from: 'importer-signal', to: 'guizhou', type: 'signal', introStep: 4 },
  { id: 'signal-handoff', from: 'importer-signal', to: 'human-handoff', type: 'handoff', introStep: 5 },
];

export const BUSINESS_NODE_BY_ID = new Map(BUSINESS_NODES.map((node) => [node.id, node]));
