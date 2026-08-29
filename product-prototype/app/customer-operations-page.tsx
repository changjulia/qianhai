'use client';

import { useState } from 'react';
import styles from './customer-operations-page.module.css';

export type CustomerWorkspaceTab = 'tasks' | 'customers' | 'opportunities' | 'ai-activity';

export interface CustomerWorkspaceTarget {
  tab: CustomerWorkspaceTab;
  filter?: string;
  customerId?: string;
  opportunityId?: string;
  taskId?: string;
}

export interface CustomerOperationsPageProps {
  onOpenWorkspace: (target: CustomerWorkspaceTarget) => void;
  onOpenRevenueAnalysis: () => void;
}

const attentionItems = [
  { id: 'task-quote-adrian', customerId: 'adrian-tan', title: '确认 Adrian Tan 的 500kg 正式报价', reason: 'AI 已整理询盘摘要、产品规格和报价参数', deadline: '剩余 18 分钟', amount: '¥68 万', action: '处理报价' },
  { id: 'task-agent-maya', customerId: 'maya-food', title: '审批 Maya Food 的独家代理申请', reason: '涉及区域授权，需要负责人确认经营边界', deadline: '剩余 42 分钟', amount: '¥36 万', action: '去审批' },
  { id: 'task-risk-lumi', customerId: 'lumi-ingredients', title: '跟进 Lumi Ingredients 的超期商机', reason: '报价后 2 天未推进，AI 建议今天再次触达', deadline: '已超时 2 小时', amount: '¥84 万', action: '立即跟进' },
];

const metrics = [
  { label: '新增高意向客户', value: '18', note: '较上周 +14.1%', hint: '查看评分 80 分以上客户', target: { tab: 'customers', filter: 'high-intent' } as CustomerWorkspaceTarget },
  { label: '推进中商机', value: '21 · ¥486万', note: '本周新增 8 个', hint: '查看正在推进的商机', target: { tab: 'opportunities', filter: 'in-progress' } as CustomerWorkspaceTarget },
  { label: '本周成交收入', value: '¥68万', note: '3 笔订单已成交', hint: '查看收入来源与贡献证据', revenue: true },
];

const funnel = [
  { label: '新询盘', value: 32, detail: '今日新增 6', filter: 'new-inquiry', tab: 'customers' as const },
  { label: '高意向', value: 18, detail: '转化率 56%', filter: 'high-intent', tab: 'customers' as const },
  { label: '商机', value: 21, detail: '¥486 万', filter: 'in-progress', tab: 'opportunities' as const },
  { label: '报价', value: 8, detail: '2 项待确认', filter: 'quotation', tab: 'opportunities' as const },
  { label: '成交', value: 3, detail: '本周 ¥68 万', filter: 'won', tab: 'opportunities' as const },
];

export function CustomerOperationsPage({ onOpenWorkspace, onOpenRevenueAnalysis }: CustomerOperationsPageProps) {
  const [feedback, setFeedback] = useState('');
  const [handledTasks, setHandledTasks] = useState<string[]>([]);
  const [opportunityStages, setOpportunityStages] = useState<Record<string,string>>({ lumi: '报价协同', maya: '商机推进', pacific: '样品／会议' });

  const openWorkspace = (target: CustomerWorkspaceTarget, message: string) => {
    setFeedback(message);
    onOpenWorkspace(target);
  };

  const openRevenue = () => {
    setFeedback('正在打开收入分析，并保留本周成交范围。');
    onOpenRevenueAnalysis();
  };

  return <main className={styles.root} aria-label="客户经营总览">
    <header className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>客户管理 · 客户经营</p>
        <h1>客户经营</h1>
        <p className={styles.heroDesc}>AI 已完成日常跟进；现在有 3 项工作需要你处理。</p>
      </div>
      <button className={styles.heroAction} onClick={() => document.getElementById('customer-tasks')?.scrollIntoView({ behavior: 'smooth' })}>处理 3 项待办 →</button>
    </header>

    <div className={styles.summaryGrid}>
      <section className={styles.panel} aria-labelledby="attention-title">
        <div className={styles.panelHead}><div><h2 id="attention-title">需要你关注</h2><p>按响应时限和潜在商机金额排序</p></div><span className={styles.count}>3 项</span></div>
        <div className={styles.attentionList}>
          {attentionItems.map(item => <button className={styles.attentionItem} key={item.id} onClick={() => openWorkspace({ tab: 'tasks', filter: 'needs-attention', customerId: item.customerId, taskId: item.id }, `已定位到「${item.title}」。`)}>
            <i className={styles.priority}/><span className={styles.attentionCopy}><strong>{item.title}</strong><small>{item.reason}</small></span><span className={styles.attentionMeta}><b>{item.deadline}</b><small>商机 {item.amount}</small></span><span className={styles.itemAction}>{item.action}</span>
          </button>)}
        </div>
      </section>

      <aside className={styles.aiCard} aria-label="AI 工作摘要">
        <div className={styles.aiTop}><span className={styles.aiIcon}>AI</span><div><strong>AI 工作摘要</strong><small>5 个流程运行正常</small></div></div>
        <p className={styles.aiCopy}>今日自动完成 128 项客户动作，其中 2 项异常已升级到人工待办。</p>
        <div className={styles.aiStats}><div><b>91%</b><span>无需人工修改</span></div><div><b>12.4h</b><span>预计节省工时</span></div></div>
        <button className={styles.linkButton} onClick={() => openWorkspace({ tab: 'ai-activity', filter: 'today' }, '正在打开今日 AI 执行记录。')}>查看 AI 执行记录 →</button>
      </aside>
    </div>

    <section aria-labelledby="metric-title">
      <div className={styles.panelHead}><div><h2 id="metric-title">本周经营状态</h2><p>点击指标进入对应的客户或商机视图</p></div></div>
      <div className={styles.metricGrid}>{metrics.map(metric => <button className={styles.clickCard} key={metric.label} onClick={() => metric.revenue ? openRevenue() : openWorkspace(metric.target!, `正在打开「${metric.label}」明细。`)}>
        <span className={styles.metricLabel}>{metric.label}</span><strong className={styles.metricValue}>{metric.value}</strong><span className={styles.metricNote}>{metric.note}</span><span className={styles.metricHint}>{metric.hint}</span><span className={styles.arrow}>›</span>
      </button>)}</div>
    </section>

    <section className={styles.panel} aria-labelledby="funnel-title">
      <div className={styles.panelHead}><div><h2 id="funnel-title">客户转化概况</h2><p>从新询盘到成交，点击阶段查看对应客户</p></div><button className={styles.linkButton} onClick={openRevenue}>查看收入贡献 →</button></div>
      <div className={styles.funnel}>{funnel.map(node => <button className={styles.funnelNode} key={node.label} onClick={() => openWorkspace({ tab: node.tab, filter: node.filter }, `正在打开「${node.label}」阶段。`)}><b>{node.value}</b><span>{node.label}</span><small>{node.detail}</small></button>)}</div>
    </section>

    <section className={styles.panel} id="customer-tasks" aria-labelledby="tasks-title">
      <div className={styles.panelHead}><div><h2 id="tasks-title">待处理</h2><p>AI 已整理好上下文，在客户经营页直接完成确认与接管</p></div><span className={styles.count}>{attentionItems.length-handledTasks.length} 项</span></div>
      <div className={styles.workRows}>{attentionItems.map(item => <article className={`${styles.workRow} ${handledTasks.includes(item.id)?styles.completed:''}`} key={item.id}><span className={styles.workAvatar}>{item.title.includes('Adrian')?'A':item.title.includes('Maya')?'M':'L'}</span><span className={styles.workMain}><strong>{item.title}</strong><small>{item.reason}</small></span><span className={styles.workAmount}><b>{item.amount}</b><small>{item.deadline}</small></span>{handledTasks.includes(item.id)?<em className={styles.done}>已完成</em>:<div className={styles.rowActions}><button onClick={()=>openWorkspace({tab:'customers',customerId:item.customerId},`正在打开 ${item.title} 的客户上下文。`)}>查看客户</button><button className={styles.primaryMini} onClick={()=>{setHandledTasks(v=>[...v,item.id]);setFeedback(`「${item.title}」已处理，客户时间线已更新。`)}}>{item.action}</button></div>}</article>)}</div>
    </section>

    <section className={styles.panel} id="customer-opportunities" aria-labelledby="opportunities-title">
      <div className={styles.panelHead}><div><h2 id="opportunities-title">商机推进</h2><p>按客户查看当前阶段、金额和下一步，直接完成阶段推进</p></div><button className={styles.linkButton} onClick={()=>setFeedback('已创建空白商机草稿，可从客户会话补全需求。')}>＋ 创建商机</button></div>
      <div className={styles.opportunityRows}>{[
        {id:'lumi',customerId:'adrian-tan',company:'Lumi Ingredients',title:'500kg 抹茶正式采购',amount:'¥68 万',probability:'78%',next:'确认并发送正式报价'},
        {id:'maya',customerId:'maya-food',company:'Maya Food',title:'东南亚区域代理',amount:'¥120 万',probability:'60%',next:'审批区域代理政策'},
        {id:'pacific',customerId:'adrian-tan',company:'Pacific Beverage',title:'年度框架采购',amount:'¥110 万',probability:'45%',next:'安排产品与供应会议'},
      ].map(item=><article className={styles.opportunityRow} key={item.id}><span className={styles.stagePill}>{opportunityStages[item.id]}</span><span className={styles.workMain}><strong>{item.company} · {item.title}</strong><small>下一步：{item.next}</small></span><span className={styles.opportunityValue}><b>{item.amount}</b><small>成交概率 {item.probability}</small></span><div className={styles.rowActions}><button onClick={()=>openWorkspace({tab:'customers',customerId:item.customerId},`正在打开 ${item.company} 客户会话。`)}>查看客户</button><button className={styles.primaryMini} onClick={()=>{const next=opportunityStages[item.id]==='报价协同'?'商务谈判':opportunityStages[item.id]==='商机推进'?'报价协同':'商机推进';setOpportunityStages(v=>({...v,[item.id]:next}));setFeedback(`${item.company} 已推进到「${next}」。`)}}>推进阶段</button></div></article>)}</div>
    </section>

    {feedback && <div className={styles.feedback} role="status" onAnimationEnd={() => setFeedback('')}><strong>已选择：</strong>{feedback}</div>}
  </main>;
}

export default CustomerOperationsPage;
