"use client";

import { useMemo, useState } from "react";
import "./customer-workbench-page.css";

export type WorkbenchTab = "待处理" | "客户" | "商机";

export interface CustomerWorkbenchPageProps {
  initialTab?: WorkbenchTab;
  initialFilter?: string;
  initialCustomerId?: string;
  onBack?: () => void;
}

type Customer = { id:string; name:string; company:string; market:string; score:number; stage:string; risk?:boolean; last:string; need:string };
type Task = { id:string; customerId:string; title:string; reason:string; amount:string; sla:string; kind:string; status:"待处理"|"已完成"|"已驳回" };
type Deal = { id:string; customerId:string; title:string; amount:string; stage:string; probability:number; next:string };

const customers: Customer[] = [
  {id:"adrian",name:"Adrian Tan",company:"Lumi Ingredients",market:"马来西亚",score:91,stage:"报价协同",risk:true,last:"8 分钟前",need:"500kg 抹茶，要求食品级认证与正式报价"},
  {id:"maya",name:"Maya Chen",company:"Maya Food",market:"新加坡",score:86,stage:"商机推进",last:"32 分钟前",need:"评估东南亚区域代理，关注年度返利政策"},
  {id:"omar",name:"Omar Said",company:"Nour Trading",market:"阿联酋",score:78,stage:"资格确认",last:"今天 09:42",need:"索取样品及清真认证文件"},
  {id:"elena",name:"Elena Rossi",company:"Verde Café",market:"意大利",score:64,stage:"询盘接待",risk:true,last:"2 天前",need:"咨询 100kg 试单价格与欧洲运输时效"},
];

const seedTasks: Task[] = [
  {id:"t1",customerId:"adrian",title:"确认 500kg 正式报价",reason:"AI 已整理规格、成本和历史价格，需要人工确认最终价格",amount:"¥68 万",sla:"剩余 18 分钟",kind:"报价",status:"待处理"},
  {id:"t2",customerId:"maya",title:"审批独家代理申请",reason:"涉及区域独家权益，超出 AI 自动承诺边界",amount:"¥120 万",sla:"剩余 42 分钟",kind:"审批",status:"待处理"},
  {id:"t3",customerId:"elena",title:"跟进超时商机",reason:"客户 48 小时未响应，AI 建议调整跟进内容",amount:"¥23 万",sla:"已超时 2 小时",kind:"跟进",status:"待处理"},
];

const seedDeals: Deal[] = [
  {id:"d1",customerId:"omar",title:"样品测试采购",amount:"¥18 万",stage:"资格确认",probability:35,next:"确认清真认证要求"},
  {id:"d2",customerId:"maya",title:"东南亚区域代理",amount:"¥120 万",stage:"商机推进",probability:60,next:"审批代理政策"},
  {id:"d3",customerId:"adrian",title:"500kg 抹茶采购",amount:"¥68 万",stage:"报价协同",probability:78,next:"确认并发送报价"},
];

const stages = ["资格确认","商机推进","报价协同","商务谈判","成交"];

export function CustomerWorkbenchPage({initialTab="客户",initialFilter="全部",initialCustomerId="adrian",onBack}:CustomerWorkbenchPageProps){
  const [tab,setTab]=useState<WorkbenchTab>(initialTab);
  const [filter,setFilter]=useState(initialFilter);
  const [selectedId,setSelectedId]=useState(initialCustomerId);
  const [tasks,setTasks]=useState(seedTasks);
  const [deals,setDeals]=useState(seedDeals);
  const [query,setQuery]=useState("");
  const [draft,setDraft]=useState("Hi Adrian，感谢您确认采购数量。我们已按照 500kg 规格准备正式报价，并附上食品级认证文件。确认交付地址后，我可以立即为您锁定本批次产能。");
  const [sent,setSent]=useState<string[]>([]);
  const [notice,setNotice]=useState("");
  const [detailTab,setDetailTab]=useState("资格判断");
  const selected=customers.find(c=>c.id===selectedId) ?? customers[0];
  const showNotice=(text:string)=>{setNotice(text);window.setTimeout(()=>setNotice(""),2200)};
  const filteredCustomers=useMemo(()=>customers.filter(c=>{
    const matchQuery=`${c.name}${c.company}${c.market}`.toLowerCase().includes(query.toLowerCase());
    const matchFilter=filter==="全部" || (filter==="高意向"&&c.score>=80) || (filter==="风险"&&c.risk) || c.stage===filter;
    return matchQuery&&matchFilter;
  }),[query,filter]);
  const decideTask=(id:string,status:"已完成"|"已驳回")=>{setTasks(v=>v.map(t=>t.id===id?{...t,status}:t));showNotice(status==="已完成"?"任务已完成，客户时间线已更新":"任务已驳回，已退回 AI 重新处理")};
  const moveDeal=(id:string,direction:number)=>setDeals(v=>v.map(d=>{if(d.id!==id)return d;const i=stages.indexOf(d.stage);return {...d,stage:stages[Math.max(0,Math.min(stages.length-1,i+direction))]}}));
  const selectCustomer=(id:string)=>{setSelectedId(id)};

  return <main className="cwb-page">
    {notice&&<div className="cwb-toast">✓ {notice}</div>}
    <header className="cwb-head">
      <div>{onBack&&<button className="cwb-back" onClick={onBack}>← 返回客户经营</button>}<p>黔海 · 客户管理</p><h1>客户工作台</h1><span>处理待办、客户沟通和商机推进。</span></div>
      <div className="cwb-head-summary"><b>{tasks.filter(task=>task.status==="待处理").length}</b> 项待处理<i/>客户链路运行正常</div>
    </header>
    <nav className="cwb-tabs" aria-label="客户工作台视图">{(["待处理","客户","商机"] as WorkbenchTab[]).map(item=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}>{item}{item==="待处理"&&<em>{tasks.filter(task=>task.status==="待处理").length}</em>}</button>)}</nav>
    {tab==="待处理"&&<section className="cwb-task-layout">
      <div className="cwb-card cwb-task-main"><div className="cwb-section-title"><div><h2>需要你处理</h2><p>AI 已整理好上下文，可直接做出决定。</p></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option>全部</option><option>报价</option><option>审批</option><option>跟进</option></select></div>
        <div className="cwb-task-list">{tasks.filter(t=>filter==="全部"||t.kind===filter).map(t=>{const c=customers.find(x=>x.id===t.customerId)!;return <article key={t.id} className={`cwb-task ${t.status!=="待处理"?"handled":""}`}>
          <button className="cwb-person" onClick={()=>selectCustomer(c.id)}><i>{c.name[0]}</i><span><b>{t.title}</b><small>{c.name} · {c.company}</small></span></button>
          <p>{t.reason}</p><div className="cwb-task-meta"><span>{t.amount}</span><span className={t.sla.includes("超时")?"danger":""}>{t.sla}</span></div>
          {t.status==="待处理"?<div className="cwb-actions"><button onClick={()=>{setSelectedId(c.id);showNotice("已打开客户上下文")}}>查看上下文</button><button onClick={()=>decideTask(t.id,"已驳回")}>驳回</button><button className="primary" onClick={()=>decideTask(t.id,"已完成")}>{t.kind==="跟进"?"完成跟进":"确认处理"}</button></div>:<strong className="cwb-result">{t.status}</strong>}
        </article>})}</div>
      </div><CustomerPanel customer={selected} onAction={showNotice}/>
    </section>}

    {tab==="客户"&&<><div className="inquiry-toolbar cwb-lingshu-toolbar"><div>{["全部","高意向","风险"].map(x=><button key={x} className={filter===x?"active":""} onClick={()=>setFilter(x)}>{x}{x==="高意向"&&<b>3</b>}</button>)}</div><p><span/> 3 条高意向询盘将在 30 分钟内超时</p></div>
      <section className="conversation-workbench cwb-lingshu-workbench">
        <aside className="inquiry-list"><input className="cwb-lingshu-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索会话、企业或采购需求"/><div className="queue-filter"><button className="active" onClick={()=>showNotice("已按客户优先级排序")}>优先级</button><button onClick={()=>showNotice("已按最新消息排序")}>最新</button><button onClick={()=>showNotice("负责人筛选已展开")}>负责人⌄</button></div>{filteredCustomers.map(c=><button key={c.id} className={selected.id===c.id?"active":""} onClick={()=>setSelectedId(c.id)}><span className="contact-avatar">{c.name[0]}</span><span><strong>{c.name} <em>{c.score}</em></strong><small>{c.company} · {c.market}</small><p>{c.need}</p><span className="conversation-state">{c.stage} · {c.last}</span></span></button>)}</aside>
        <section className="conversation"><header><div><strong>{selected.name} <em className="channel-tag">WA</em></strong><small>{selected.company} · {selected.market}</small></div></header><div className="messages"><p className="system-msg">来自 LinkedIn · 工厂品质视频 · 今天 10:42</p><div className="action-event"><span>AI</span><p><strong>已识别企业和采购意图</strong><small>{selected.need} · 置信度 {selected.score}%</small></p><button onClick={()=>setDetailTab("资格判断")}>查看依据</button></div><div className="bubble inbound">Hi, we need a quotation and food-grade certification for a 500kg order.</div><div className="translation"><span>译</span><p>我们需要一份 500kg 订单的正式报价及食品级认证文件。</p></div>{sent.map((x,i)=><div className="bubble outbound" key={i}>{x}</div>)}<div className="bubble outbound draft"><span>AI 回复草稿 · 尚未发送</span><textarea className="cwb-inline-draft" value={draft} onChange={e=>setDraft(e.target.value)}/><div className="draft-actions"><button onClick={()=>{setDraft(`Hi ${selected.name}，已收到您的需求。我已整理产品规格与报价信息，确认交付地点后将立即发送正式方案。`);showNotice("已重新生成回复")}}>重新生成</button><button onClick={()=>showNotice("可以直接在草稿中编辑")}>编辑</button><button onClick={()=>{if(!draft.trim())return;setSent(v=>[...v,draft]);setDraft("");showNotice("消息已发送并记录到客户时间线")}}>批准发送</button></div></div></div><footer><button className="attach" onClick={()=>showNotice("附件选择器已打开")}>＋</button><input aria-label="回复询盘" placeholder="输入回复，或采用 AI 草稿…"/><button onClick={()=>showNotice("请输入回复内容")}>发送</button></footer></section>
        <aside className="customer-intelligence"><header><div><strong>客户洞察</strong><small>AI 提取 · 2 分钟前更新</small></div><span>{selected.score} 高意向</span></header><div className="intelligence-tabs">{["资格判断","证据与记忆","接管与权限"].map(x=><button key={x} className={detailTab===x?"active":""} onClick={()=>setDetailTab(x)}>{x}</button>)}</div><div className="intelligence-body"><section className="company-match"><div><span>{selected.company.slice(0,2)}</span><p><strong>{selected.company}</strong><small>{selected.market} · {selected.stage}</small></p></div></section>{detailTab==="资格判断"?<><div className="intent-tags"><span>500kg 测试采购</span><span>需要报价</span><span>认证要求</span></div><section className="score-card"><header><strong>BANT / SPIN 资格评分</strong><b>{selected.score} / 100</b></header>{[["需求 Need","明确","100%"],["时间 Timeline","30 天内","82%"],["决策 Authority","采购经理","75%"],["预算 Budget","待确认","40%"]].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong><i><em style={{width:x[2]}}/></i></div>)}</section><section className="missing-fields"><strong>还需确认</strong><span>目标等级</span><span>预算范围</span><span>交付地址</span></section></>:detailTab==="证据与记忆"?<><section className="memory-summary"><strong>客户记忆摘要</strong><p>{selected.need}。此前查看英文规格书 3 次，关注认证、批次稳定性与交期。</p></section><section className="history-strip"><strong>历史互动</strong><p><i/> 今天 · 提出正式报价需求</p><p><i/> 昨天 · 查看英文规格书</p><p><i/> 8月24日 · 来自 LinkedIn 内容互动</p></section></>:<><section className="boundary-card"><header><strong>自动回复边界</strong><span>已触发</span></header><div><span>产品规格与认证</span><em className="safe">可自动回复</em></div><div><span>价格与交期</span><em className="risk">必须人工确认</em></div></section><section className="handoff-package"><strong>人工接管包已就绪</strong><p>已包含客户摘要、原始证据、AI 已执行动作和推荐回复。</p></section><button className="handoff-primary" onClick={()=>showNotice("已切换为人工接管，AI 将停止自动发送")}>接管并继续回复</button></>}</div></aside>
      </section></>}

    {tab==="商机"&&<section className="cwb-deal-layout"><div className="cwb-deal-toolbar"><div><h2>商机推进</h2><p>按阶段查看业务机会，卡片操作会即时更新。</p></div><button className="primary" onClick={()=>{const d:Deal={id:`d${Date.now()}`,customerId:selected.id,title:`${selected.company} 新商机`,amount:"待评估",stage:"资格确认",probability:20,next:"补全采购需求"};setDeals(v=>[...v,d]);showNotice("已创建商机")}}>＋ 创建商机</button></div>
      <div className="cwb-board">{stages.map(stage=><div className="cwb-column" key={stage}><header><b>{stage}</b><span>{deals.filter(d=>d.stage===stage).length}</span></header>{deals.filter(d=>d.stage===stage).map(d=>{const c=customers.find(x=>x.id===d.customerId)!;return <article className="cwb-deal-card" key={d.id} onClick={()=>setSelectedId(c.id)}><small>{d.id.toUpperCase()}</small><h3>{d.title}</h3><p>{c.company}</p><strong>{d.amount}</strong><div className="cwb-progress"><i style={{width:`${d.probability}%`}}/></div><em>成交概率 {d.probability}%</em><footer><button disabled={stage===stages[0]} onClick={e=>{e.stopPropagation();moveDeal(d.id,-1)}}>←</button><button onClick={e=>{e.stopPropagation();showNotice(`已为 ${c.company} 创建跟进任务`)}}>＋跟进</button><button disabled={stage===stages.at(-1)} onClick={e=>{e.stopPropagation();moveDeal(d.id,1);showNotice("商机阶段已推进")}}>推进 →</button></footer></article>})}</div>)}</div>
      <div className="cwb-deal-drawer"><CustomerPanel customer={selected} onAction={showNotice}/><div className="cwb-card cwb-next"><h3>快速操作</h3><p>围绕当前客户继续推进业务。</p><button onClick={()=>showNotice("跟进任务已创建，截止时间为明天 18:00")}>创建跟进</button><button onClick={()=>showNotice("报价草稿已生成，进入待确认队列")}>生成报价</button></div></div>
    </section>}
  </main>
}

function CustomerPanel({customer,onAction}:{customer:Customer;onAction:(x:string)=>void}){
 return <aside className="cwb-card cwb-insight"><header><div><span>客户洞察</span><h2>{customer.company}</h2><p>{customer.name} · {customer.market}</p></div><b>{customer.score}<small>意向分</small></b></header><div className="cwb-stage"><span>当前阶段</span><strong>{customer.stage}</strong>{customer.risk&&<em>需要关注</em>}</div><section><h3>核心需求</h3><p>{customer.need}</p></section><section><h3>AI 判断依据</h3><ul><li>采购需求明确，已给出数量</li><li>近期多次查看规格与认证材料</li><li>预计 30 天内完成采购决策</li></ul></section><section><h3>建议下一步</h3><p>确认关键商务条件，并在本次会话中明确下一次行动时间。</p><button onClick={()=>onAction("建议已采纳，并创建下一步行动")}>采纳建议</button></section></aside>
}
