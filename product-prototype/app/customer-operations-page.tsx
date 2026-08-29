'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './customer-operations-page.module.css';
import { requestAi } from '../lib/ai-client';
import type { AiResult } from '../lib/ai';

export type CustomerWorkspaceTab = 'tasks' | 'customers' | 'opportunities' | 'ai-activity';
export interface CustomerWorkspaceTarget { tab:CustomerWorkspaceTab; filter?:string; customerId?:string; opportunityId?:string; taskId?:string }
export interface CustomerOperationsPageProps { onOpenWorkspace:(target:CustomerWorkspaceTarget)=>void; onOpenRevenueAnalysis:()=>void }
type Task={id:string;customerId:string;title:string;reason:string;amount:string;sla:string;kind:string;status:string};
type Deal={id:string;customerId:string;title:string;amount:string;stage:string;rawStage:string;probability:number;next:string};
type Customer={id:string;name:string;company:string;score:number;stage:string};
type Metrics={highIntent:number;inProgressCount:number;pipelineCny:number;wonCount:number;wonRevenueCny:number;pendingTasks:number;newInquiries:number;quotations:number};
type Snapshot={tasks:Task[];deals:Deal[];customers:Customer[];metrics:Metrics};
const money=(value:number)=>value>=10000?`¥${Number((value/10000).toFixed(1))}万`:`¥${value.toLocaleString('zh-CN')}`;

async function action<T>(payload:Record<string,unknown>):Promise<T>{const response=await fetch('/api/customer-actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json() as T&{message?:string;error?:string};if(!response.ok)throw new Error(data.message||data.error||'操作失败');return data}

export function CustomerOperationsPage({onOpenWorkspace,onOpenRevenueAnalysis}:CustomerOperationsPageProps){
 const [data,setData]=useState<Snapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[feedback,setFeedback]=useState(''),[saving,setSaving]=useState(false),[aiSummary,setAiSummary]=useState<AiResult|null>(null);
 const load=useCallback(async()=>{setLoading(true);setError('');try{const response=await fetch('/api/customers',{cache:'no-store'});const result=await response.json() as Snapshot&{message?:string};if(!response.ok)throw new Error(result.message||'客户经营数据加载失败');setData(result)}catch(cause){setError(cause instanceof Error?cause.message:'加载失败')}finally{setLoading(false)}},[]);
 useEffect(()=>{void Promise.resolve().then(load)},[load]);
 useEffect(()=>{if(!data)return;let active=true;requestAi('executive_summary',{scope:'客户经营',metrics:data.metrics,pending:data.tasks.filter(item=>item.status==='待处理'),deals:data.deals}).then(result=>{if(active)setAiSummary(result)}).catch(()=>{});return()=>{active=false}},[data]);
 const openWorkspace=(target:CustomerWorkspaceTarget,message:string)=>{setFeedback(message);onOpenWorkspace(target)};
 const run=async(work:()=>Promise<void>)=>{setSaving(true);setError('');try{await work()}catch(cause){setError(cause instanceof Error?cause.message:'操作失败')}finally{setSaving(false)}};
 if(loading)return <main className={styles.root}><div className={styles.panel} role="status">正在加载客户经营数据…</div></main>;
 if(error&&!data)return <main className={styles.root}><div className={styles.panel} role="alert"><h2>客户经营数据加载失败</h2><p>{error}</p><button className={styles.heroAction} onClick={()=>void load()}>重试</button></div></main>;
 if(!data)return null;
 const pending=data.tasks.filter(task=>task.status==='待处理');
 const metrics=[
  {label:'新增高意向客户',value:String(data.metrics.highIntent),note:'实时意向分 ≥ 80',hint:'查看高意向客户',target:{tab:'customers',filter:'high-intent'} as CustomerWorkspaceTarget},
  {label:'推进中商机',value:`${data.metrics.inProgressCount} · ${money(data.metrics.pipelineCny)}`,note:`${data.metrics.quotations} 个报价中`,hint:'查看正在推进的商机',target:{tab:'opportunities',filter:'in-progress'} as CustomerWorkspaceTarget},
  {label:'成交收入',value:money(data.metrics.wonRevenueCny),note:`${data.metrics.wonCount} 笔订单已成交`,hint:'查看收入来源与贡献证据',revenue:true},
 ];
 const funnel=[
  {label:'新询盘',value:data.metrics.newInquiries,detail:'CRM 实时数据',filter:'new-inquiry',tab:'customers' as const},
  {label:'高意向',value:data.metrics.highIntent,detail:'意向分 ≥ 80',filter:'high-intent',tab:'customers' as const},
  {label:'商机',value:data.metrics.inProgressCount,detail:money(data.metrics.pipelineCny),filter:'in-progress',tab:'opportunities' as const},
  {label:'报价',value:data.metrics.quotations,detail:'正在报价协同',filter:'quotation',tab:'opportunities' as const},
  {label:'成交',value:data.metrics.wonCount,detail:money(data.metrics.wonRevenueCny),filter:'won',tab:'opportunities' as const},
 ];
 return <main className={styles.root} aria-label="客户经营总览" aria-busy={saving}>
  <header className={styles.hero}><div><p className={styles.eyebrow}>客户管理 · 客户经营</p><h1>客户经营</h1><p className={styles.heroDesc}>AI 已完成日常跟进；现在有 {pending.length} 项工作需要你处理。</p></div><button className={styles.heroAction} onClick={()=>document.getElementById('customer-tasks')?.scrollIntoView({behavior:'smooth'})}>处理 {pending.length} 项待办 →</button></header>
  {error&&<div className={styles.panel} role="alert">{error}</div>}
  <div className={styles.summaryGrid}><section className={styles.panel}><div className={styles.panelHead}><div><h2>需要你关注</h2><p>按响应时限和潜在商机金额排序</p></div><span className={styles.count}>{pending.length} 项</span></div><div className={styles.attentionList}>{pending.map(item=><button className={styles.attentionItem} key={item.id} onClick={()=>openWorkspace({tab:'tasks',filter:'needs-attention',customerId:item.customerId,taskId:item.id},`已定位到「${item.title}」。`)}><i className={styles.priority}/><span className={styles.attentionCopy}><strong>{item.title}</strong><small>{item.reason}</small></span><span className={styles.attentionMeta}><b>{item.sla}</b><small>商机 {item.amount}</small></span><span className={styles.itemAction}>{item.kind==='审批'?'去审批':'立即处理'}</span></button>)}{!pending.length&&<p>暂无需要人工处理的任务。</p>}</div></section><aside className={styles.aiCard}><div className={styles.aiTop}><span className={styles.aiIcon}>AI</span><div><strong>{aiSummary?.headline||'AI 工作摘要'}</strong><small>{aiSummary?.provider==='qwen'?'千问实时总结':'客户链路分析中'}</small></div></div><p className={styles.aiCopy}>{aiSummary?.summary||`当前有 ${data.customers.length} 个客户、${data.deals.length} 个商机由客户经营流程持续跟进。`}</p><button className={styles.linkButton} onClick={()=>openWorkspace({tab:'ai-activity',filter:'today'},'正在打开今日 AI 执行记录。')}>查看 AI 执行记录 →</button></aside></div>
  <section><div className={styles.panelHead}><div><h2>经营状态</h2><p>来自 D1 客户、商机和订单的实时汇总</p></div></div><div className={styles.metricGrid}>{metrics.map(metric=><button className={styles.clickCard} key={metric.label} onClick={()=>metric.revenue?onOpenRevenueAnalysis():openWorkspace(metric.target!,`正在打开「${metric.label}」明细。`)}><span className={styles.metricLabel}>{metric.label}</span><strong className={styles.metricValue}>{metric.value}</strong><span className={styles.metricNote}>{metric.note}</span><span className={styles.metricHint}>{metric.hint}</span><span className={styles.arrow}>›</span></button>)}</div></section>
  <section className={styles.panel}><div className={styles.panelHead}><div><h2>客户转化概况</h2><p>从新询盘到成交</p></div><button className={styles.linkButton} onClick={onOpenRevenueAnalysis}>查看收入贡献 →</button></div><div className={styles.funnel}>{funnel.map(node=><button className={styles.funnelNode} key={node.label} onClick={()=>openWorkspace({tab:node.tab,filter:node.filter},`正在打开「${node.label}」阶段。`)}><b>{node.value}</b><span>{node.label}</span><small>{node.detail}</small></button>)}</div></section>
  <section className={styles.panel} id="customer-tasks"><div className={styles.panelHead}><div><h2>待处理</h2><p>直接完成确认与驳回</p></div><span className={styles.count}>{pending.length} 项</span></div><div className={styles.workRows}>{data.tasks.map(item=>{const customer=data.customers.find(c=>c.id===item.customerId);return <article className={`${styles.workRow} ${item.status!=='待处理'?styles.completed:''}`} key={item.id}><span className={styles.workAvatar}>{customer?.name[0]||'?'}</span><span className={styles.workMain}><strong>{item.title}</strong><small>{item.reason}</small></span><span className={styles.workAmount}><b>{item.amount}</b><small>{item.sla}</small></span>{item.status!=='待处理'?<em className={styles.done}>{item.status}</em>:<div className={styles.rowActions}><button onClick={()=>openWorkspace({tab:'customers',customerId:item.customerId},`正在打开 ${item.title} 的客户上下文。`)}>查看客户</button><button className={styles.primaryMini} disabled={saving} onClick={()=>void run(async()=>{await action({action:'decide_task',taskId:item.id,status:'已完成'});setData(value=>value?{...value,tasks:value.tasks.map(task=>task.id===item.id?{...task,status:'已完成'}:task),metrics:{...value.metrics,pendingTasks:Math.max(0,value.metrics.pendingTasks-1)}}:value);setFeedback(`「${item.title}」已处理。`)})}>确认处理</button></div>}</article>})}</div></section>
  <section className={styles.panel}><div className={styles.panelHead}><div><h2>商机推进</h2><p>当前阶段、金额与下一步</p></div></div><div className={styles.opportunityRows}>{data.deals.map(item=>{const customer=data.customers.find(c=>c.id===item.customerId);const nextStage=item.stage==='报价协同'?'商务谈判':item.stage==='商机推进'?'报价协同':'商机推进';return <article className={styles.opportunityRow} key={item.id}><span className={styles.stagePill}>{item.stage}</span><span className={styles.workMain}><strong>{customer?.company||customer?.name} · {item.title}</strong><small>下一步：{item.next}</small></span><span className={styles.opportunityValue}><b>{item.amount}</b><small>成交概率 {item.probability}%</small></span><div className={styles.rowActions}><button onClick={()=>openWorkspace({tab:'customers',customerId:item.customerId},`正在打开 ${customer?.company||'客户'} 会话。`)}>查看客户</button><button className={styles.primaryMini} disabled={saving} onClick={()=>void run(async()=>{await action({action:'move_opportunity',opportunityId:item.id,stage:nextStage});setData(value=>value?{...value,deals:value.deals.map(deal=>deal.id===item.id?{...deal,stage:nextStage}:deal)}:value);setFeedback(`商机已推进到「${nextStage}」。`)})}>推进阶段</button></div></article>})}</div></section>
  {feedback&&<div className={styles.feedback} role="status" onAnimationEnd={()=>setFeedback('')}><strong>已选择：</strong>{feedback}</div>}
 </main>
}
export default CustomerOperationsPage;
