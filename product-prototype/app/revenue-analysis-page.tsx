'use client';

import { useMemo, useState } from 'react';
import './revenue-analysis-page.css';

type Dimension = '渠道' | '内容' | 'AI Agent' | '客户经理';
type Model = '经营贡献' | '首次触点' | '最终触点' | '线性归因';
type Order = {
  id: string; customerId: string; customer: string; market: string; channel: string;
  amount: number; type: string; completeness: number; path: string;
};

const orders: Order[] = [
  { id: 'SO-003', customerId: 'lumi', customer: 'Lumi Ingredients', market: '马来西亚', channel: 'LinkedIn', amount: 680000, type: 'AI + 人工', completeness: 96, path: '工厂视频 → WhatsApp 询盘 → AI 跟进 → 人工报价' },
  { id: 'SO-011', customerId: 'maya', customer: 'Maya Food', market: '新加坡', channel: 'Google', amount: 520000, type: 'AI 自主', completeness: 91, path: '搜索广告 → 规格书 → AI 资格判断 → 自动跟进' },
  { id: 'SO-018', customerId: 'adrian', customer: 'Adrian Trading', market: '马来西亚', channel: 'WhatsApp', amount: 860000, type: 'AI + 人工', completeness: 100, path: '老客转介 → WhatsApp → AI 补全需求 → 人工谈判' },
  { id: 'SO-024', customerId: 'nexus', customer: 'Nexus Beverages', market: '印尼', channel: 'LinkedIn', amount: 740000, type: '纯人工', completeness: 82, path: '展会名单 → 内容触达 → 人工跟进 → 成交' },
];

const rankings: Record<Dimension, [string, string, number, string][]> = {
  '渠道': [['LinkedIn', '贡献 2 笔成交', 126, '+38%'], ['WhatsApp', '贡献 1 笔成交', 86, '+21%'], ['Google', '贡献 1 笔成交', 52, '+12%']],
  '内容': [['工厂品质视频', '3 个高意向客户', 98, '+42%'], ['英文规格书', '5 次关键转化', 82, '+31%'], ['清真认证解读', '2 个成交客户', 55, '+17%']],
  'AI Agent': [['资格判断 Agent', '参与 68% 成交商机', 112, '+34%'], ['成交推进 Agent', '完成 21 次有效跟进', 87, '+27%'], ['询盘接待 Agent', '识别 18 个高意向', 64, '+19%']],
  '客户经理': [['陈雨晴', 'AI 协同转化率 34%', 105, '+29%'], ['王宁', '报价转化率 31%', 91, '+23%'], ['林晓群', '成交周期缩短 6 天', 68, '+15%']],
};

const modelFactors: Record<Model, number> = { '经营贡献': 1, '首次触点': .86, '最终触点': 1.12, '线性归因': .94 };

const evidence = [
  { title: 'LinkedIn 工厂品质视频', time: '8月12日 10:32', actor: '内容触达', detail: '客户完整观看 76% 并点击了英文规格书。证据来自 LinkedIn Campaign 事件和 UTM 参数。' },
  { title: '下载英文规格书', time: '8月12日 10:41', actor: '客户行为', detail: '下载资料中包含企业识别参数，已与 Lumi Ingredients 访客身份合并。' },
  { title: 'WhatsApp 发起 500kg 询盘', time: '8月13日 09:18', actor: '询盘', detail: '原始消息明确提到 500kg 试采、30 天交期与清真认证需求。' },
  { title: 'AI 资格判断', time: '8月13日 09:19', actor: 'AI Agent', detail: '资格判断 Agent 将意向分从 61 提升到 86，依据为采购量、时间窗口、认证要求与企业匹配度。' },
  { title: 'AI 完成 3 次跟进', time: '8月14—18日', actor: 'AI Agent', detail: '分别补充产品参数、发送认证材料并确认寄样信息；消息均在授权边界内自动发送。' },
  { title: '客户经理确认正式报价', time: '8月19日 15:08', actor: '陈雨晴', detail: '客户经理将 AI 报价草稿中的账期从 15 天调整为 30 天，并完成最终发送。' },
  { title: '订单成交 ¥68 万', time: '8月26日 11:22', actor: '订单', detail: '订单 SO-003 已与商机 OPP-019 和客户档案关联，归因证据完整度 96%。' },
];

export type RevenueAnalysisPageProps = { onOpenWorkbench?: (customerId: string) => void };

export function RevenueAnalysisPage({ onOpenWorkbench }: RevenueAnalysisPageProps) {
  const [dimension, setDimension] = useState<Dimension>('渠道');
  const [model, setModel] = useState<Model>('经营贡献');
  const [filters, setFilters] = useState({ time: '本月', project: '贵州抹茶东南亚增长', market: '全部市场', channel: '全部渠道' });
  const [selected, setSelected] = useState<Order | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState(0);
  const [exported, setExported] = useState(false);
  const factor = modelFactors[model];
  const visibleOrders = useMemo(() => orders.filter(order =>
    (filters.market === '全部市场' || order.market === filters.market) &&
    (filters.channel === '全部渠道' || order.channel === filters.channel)
  ), [filters]);
  const total = visibleOrders.reduce((sum, order) => sum + order.amount, 0);
  const format = (amount: number) => `¥${(amount / 10000).toFixed(0)}万`;
  const contribution = rankings[dimension].map(row => ({ ...row, value: Math.round(row[2] * factor) }));

  return <div className="ra-page">
    <header className="ra-heading"><div><p>黔海 · 客户管理</p><h1>收入分析</h1><span>看清收入由什么带来，并找到值得复制的增长路径。</span></div><button onClick={() => setExported(true)}>⇩ 导出分析</button></header>

    <section className="ra-conclusion"><div className="ra-ai">AI</div><div><span>本月经营结论</span><h2>成交收入 {format(total || 3820000)}，<span>{Math.round(62 * factor)}%</span> 受到数字员工直接影响。</h2><p>最佳路径是“LinkedIn 工厂内容 → WhatsApp 询盘 → AI 跟进 → 人工报价”，转化率高于平均 38%。</p></div><button onClick={() => { setDimension('内容'); document.getElementById('ra-analysis')?.scrollIntoView({ behavior: 'smooth' }); }}>查看最佳路径 →</button></section>

    <section className="ra-filterbar">
      <Filter label="时间" value={filters.time} values={['本月', '近 90 天', '本季度']} onChange={v => setFilters({...filters,time:v})}/>
      <Filter label="项目" value={filters.project} values={['贵州抹茶东南亚增长', '刺梨浓缩汁渠道增长']} onChange={v => setFilters({...filters,project:v})}/>
      <Filter label="市场" value={filters.market} values={['全部市场', '马来西亚', '新加坡', '印尼']} onChange={v => setFilters({...filters,market:v})}/>
      <Filter label="渠道" value={filters.channel} values={['全部渠道', 'LinkedIn', 'WhatsApp', 'Google']} onChange={v => setFilters({...filters,channel:v})}/>
      <label className="ra-model"><span>归因模型</span><select value={model} onChange={e => setModel(e.target.value as Model)}>{(['经营贡献','首次触点','最终触点','线性归因'] as Model[]).map(v=><option key={v}>{v}</option>)}</select></label>
    </section>

    <div className="ra-metrics"><Metric label="已成交收入" value={format(total)} note={`${visibleOrders.length} 笔订单`} /><Metric label="AI 影响收入" value={format(total * .62 * factor)} note={`${Math.round(62*factor)}% 的收入有 AI 参与`} accent/><Metric label="在途商机" value="¥486万" note="21 个推进中商机"/><Metric label="证据完整率" value={`${visibleOrders.length ? Math.round(visibleOrders.reduce((s,o)=>s+o.completeness,0)/visibleOrders.length) : 0}%`} note="4 笔记录建议补齐" warn/></div>

    <section className="ra-card" id="ra-analysis"><div className="ra-section-head"><div><h2>什么带来了收入</h2><p>切换视角查看各经营要素的实际贡献</p></div><span>当前模型：{model}</span></div><div className="ra-tabs">{(['渠道','内容','AI Agent','客户经理'] as Dimension[]).map(v=><button className={dimension===v?'active':''} onClick={()=>setDimension(v)} key={v}>{v}</button>)}</div>
      <div className="ra-rankings">{contribution.map((row,i)=><article key={row[0]}><b>{i+1}</b><div><strong>{row[0]}</strong><small>{row[1]}</small></div><div className="ra-bar"><i style={{width:`${Math.min(row.value,126)/1.26}%`}}/></div><span>¥{row.value}万<em>{row[3]}</em></span></article>)}</div>
    </section>

    <section className="ra-card"><div className="ra-section-head"><div><h2>订单与归因证据</h2><p>从收入下钻到客户、经营动作和原始证据</p></div><span>{visibleOrders.length} 笔订单</span></div><div className="ra-table"><div className="ra-tr ra-th"><span>订单 / 客户</span><span>收入</span><span>来源渠道</span><span>贡献类型</span><span>证据完整度</span><span></span></div>{visibleOrders.map(order=><button className="ra-tr" key={order.id} onClick={()=>{setSelected(order);setSelectedEvidence(0)}}><span><strong>{order.id}</strong><small>{order.customer} · {order.market}</small></span><span><strong>{format(order.amount)}</strong></span><span>{order.channel}</span><span><em>{order.type}</em></span><span><i className="ra-progress"><b style={{width:`${order.completeness}%`}}/></i>{order.completeness}%</span><span>查看证据链 ›</span></button>)}{!visibleOrders.length&&<div className="ra-empty">当前筛选条件下暂无成交订单</div>}</div></section>

    {selected && <><button className="ra-scrim" onClick={()=>setSelected(null)} aria-label="关闭"/><aside className="ra-drawer"><header><div><span>收入证据链 · {selected.id}</span><h2>{selected.customer}</h2><p>{format(selected.amount)} · {selected.type} · 证据完整度 {selected.completeness}%</p></div><button onClick={()=>setSelected(null)}>×</button></header><div className="ra-drawer-actions"><button onClick={()=>onOpenWorkbench?.(selected.customerId)}>进入客户工作台 →</button></div><section className="ra-path-summary"><span>当前归因路径</span><p>{selected.path}</p></section><section className="ra-evidence"><h3>完整经营过程</h3>{evidence.map((node,i)=><button key={node.title} className={selectedEvidence===i?'active':''} onClick={()=>setSelectedEvidence(i)}><i>{i+1}</i><span><strong>{node.title}</strong><small>{node.time} · {node.actor}</small></span></button>)}</section><section className="ra-proof"><span>原始证据说明</span><h3>{evidence[selectedEvidence].title}</h3><p>{evidence[selectedEvidence].detail}</p><small>该记录已写入行动账本，可追溯且不可篡改。</small></section></aside></>}
    {exported && <div className="ra-modal-backdrop" onClick={()=>setExported(false)}><section className="ra-modal" onClick={e=>e.stopPropagation()}><span>导出就绪</span><h2>收入分析报告已生成</h2><p>已按当前筛选条件和“{model}”模型生成，包含管理结论、贡献排行、订单明细与证据完整度。</p><button onClick={()=>setExported(false)}>完成</button></section></div>}
  </div>;
}

function Filter({label,value,values,onChange}:{label:string;value:string;values:string[];onChange:(value:string)=>void}) { return <label className="ra-filter"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{values.map(v=><option key={v}>{v}</option>)}</select></label> }
function Metric({label,value,note,accent,warn}:{label:string;value:string;note:string;accent?:boolean;warn?:boolean}) { return <article className={`ra-metric ${accent?'accent':''} ${warn?'warn':''}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article> }

export default RevenueAnalysisPage;
