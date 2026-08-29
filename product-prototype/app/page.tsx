'use client';

import { useEffect, useState } from 'react';

type View = 'home' | 'projects' | 'agents' | 'approvals' | 'content' | 'schedule' | 'distribution' | 'traffic' | 'inquiries' | 'customerLive' | 'customers' | 'revenue' | 'structure' | 'permissions' | 'accounts' | 'data' | 'security';
type SourceView = '全部' | '人员创建' | '数字员工执行' | '待我处理';

const agents = [
  { name: '市场策略 Agent', action: '完成马来西亚市场路径建议', unit: '项目管理', view: 'projects' as View, tone: 'blue' },
  { name: '内容策划 Agent', action: '生成首轮 36 个内容任务', unit: '内容创作', view: 'content' as View, tone: 'amber' },
  { name: '内容生产 Agent', action: '完成 18 个多平台版本', unit: '内容创作', view: 'content' as View, tone: 'violet' },
  { name: '分发增长 Agent', action: '发现 1 项预算优化机会', unit: '流量分发', view: 'traffic' as View, tone: 'green' },
  { name: '询盘接待 Agent', action: '识别 3 条高意向询盘', unit: '询盘中心', view: 'inquiries' as View, tone: 'cyan' },
  { name: '成交推进 Agent', action: '发现 2 个超期商机', unit: '客户管理', view: 'customers' as View, tone: 'red' },
];

const viewNames: Record<View, string> = {
  home: '首页', projects: '经营任务', agents: '执行动态', approvals: '审批与异常', content: '内容与素材', schedule: '排期与分发', distribution: '分发管理', traffic: '广告投放', inquiries: '客户经营', customerLive: '客户工作现场', customers: '客户与商机', revenue: '收入归因',
  structure: '组织架构', permissions: '权限管理', accounts: '账号管理', data: '数据管理', security: '系统与安全',
};

function Metric({ label, value, change, warn }: { label: string; value: string; change?: string; warn?: boolean }) {
  return <article className="stat-card"><div><span>{label}</span><b>{value}</b></div>{change && <em className={warn ? 'metric-warn' : ''}>{change}</em>}</article>;
}

function PageHeader({ title, desc, action, secondary, onAction, onSecondary }: { title: string; desc: string; action?: string; secondary?: string; onAction?: () => void; onSecondary?: () => void }) {
  return <div className="page-heading"><div><p className="eyebrow">黔海 · {title}</p><h1>{title}</h1><p>{desc}</p></div><div className="header-actions">{secondary && <button className="secondary" onClick={onSecondary}>{secondary}</button>}{action && <button className="primary" onClick={onAction}>＋ {action}</button>}</div></div>;
}

function ActionDialog({ title, desc, confirm='确认', onClose, onConfirm }: { title:string; desc:string; confirm?:string; onClose:()=>void; onConfirm?:()=>void }) {
  return <div className="action-dialog-backdrop" onMouseDown={onClose}><section className="action-dialog" onMouseDown={e=>e.stopPropagation()}><header><span>黔海工作台</span><button onClick={onClose}>×</button></header><h2>{title}</h2><p>{desc}</p><label>补充说明（可选）<textarea placeholder="输入处理说明，相关记录将写入行动账本"/></label><footer><button onClick={onClose}>取消</button><button className="primary" onClick={()=>{onConfirm?.();onClose()}}>{confirm}</button></footer></section></div>;
}

function AgentNote({ agent, children, action = '查看建议', onAction }: { agent: string; children: React.ReactNode; action?: string; onAction?: () => void }) {
  return <aside className="agent-note"><div className="agent-note-head"><span className="agent-spark">AI</span><div><strong>{agent}</strong><small>基于当前项目数据</small></div><i>运行中</i></div><div className="agent-note-body">{children}</div><button onClick={onAction}>{action} <span>→</span></button></aside>;
}

function Tabs({ items, active, setActive }: { items: string[]; active: string; setActive: (value: string) => void }) {
  return <div className="tabs">{items.map(item => <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>{item}</button>)}</div>;
}

function SourceSwitcher({ active, setActive }: { active: SourceView; setActive: (value: SourceView) => void }) {
  const items: SourceView[] = ['全部', '人员创建', '数字员工执行', '待我处理'];
  return <div className="source-switcher"><span>任务来源</span>{items.map(item => <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>{item}{item === '待我处理' && <em>7</em>}</button>)}</div>;
}

function sourceActions(source: SourceView, manualAction: string) {
  if (source === '数字员工执行') return { action: '调整权限', secondary: '暂停执行' };
  if (source === '待我处理') return { action: '批量批准', secondary: '转交处理' };
  if (source === '人员创建') return { action: manualAction, secondary: '批量导入' };
  return { action: undefined, secondary: '导出视图' };
}

function HomePage({ go }: { go: (view: View) => void }) {
  const [dialog,setDialog]=useState(false);
  const stats = [
    ['海外精准访问', '38,420', '+18.6%'], ['新增有效询盘', '186', '+24.1%'], ['活跃商机', '42', '+8.3%'], ['预计成交金额', '¥ 286万', '+31.5%'],
  ];
  return <>
    <PageHeader title="上午好，陈雨晴" desc="关注增长结果，处理今天最重要的工作。" action="新建增长项目" onAction={()=>setDialog(true)} />
    <div className="stat-grid">{stats.map(s => <Metric key={s[0]} label={s[0]} value={s[1]} change={s[2]} />)}</div>
    <div className="dashboard-grid">
      <section className="panel projects-panel">
        <div className="panel-title"><div><h2>重点项目</h2><p>按商业结果跟踪项目进展</p></div><button onClick={() => go('projects')}>查看全部</button></div>
        <div className="project-row head"><span>项目</span><span>精准流量</span><span>有效询盘</span><span>商机金额</span><span>健康度</span></div>
        {[
          ['贵州抹茶 · 东南亚渠道增长', '26,480', '186', '¥ 486万', '良好'],
          ['刺梨浓缩汁 · 马来西亚渠道', '9,260', '54', '¥ 216万', '关注'],
          ['工业轮胎 · 中东经销网络', '6,480', '93', '¥ 842万', '良好'],
        ].map((row, i) => <button className="project-row clickable" key={row[0]} onClick={() => go('projects')}><span><i className={`project-dot d${i}`}/><strong>{row[0]}</strong></span><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span><small className={row[4] === '良好' ? 'good' : 'warn'}>{row[4]}</small></span></button>)}
      </section>
      <aside className="panel todo-panel">
        <div className="panel-title"><div><h2>我的待办</h2><p>跨单元统一处理</p></div><span className="count">12</span></div>
        {[
          ['内容审核', '4', '今天 14:00 前', 'content'], ['投流预算审批', '2', '2 个项目', 'traffic'], ['高意向询盘接管', '3', '平均等待 18 分钟', 'inquiries'], ['报价与订单确认', '3', '总金额 ¥ 42.6万', 'customers'],
        ].map(item => <button className="todo" key={item[0]} onClick={() => go(item[3] as View)}><span className="todo-num">{item[1]}</span><span><strong>{item[0]}</strong><small>{item[2]}</small></span><b>›</b></button>)}
      </aside>
    </div>
    <section className="panel agent-panel">
      <div className="panel-title"><div><h2>AI 协同动态</h2><p>六位 Agent 嵌入业务单元，首页只汇总结果和待确认动作</p></div><span className="live-dot">6 位在线</span></div>
      <div className="agent-grid">{agents.map(agent => <button className="agent-card" key={agent.name} onClick={() => go(agent.view)}><span className={`agent-avatar ${agent.tone}`}>AI</span><span><strong>{agent.name}</strong><small>{agent.action}</small><em>{agent.unit}</em></span><b>›</b></button>)}</div>
    </section>{dialog&&<ActionDialog title="新建增长项目" desc="设置目标市场、预算和数字员工行动边界，创建后进入经营任务配置。" confirm="开始配置" onClose={()=>setDialog(false)} onConfirm={()=>go('projects')}/>}
  </>;
}

function ProjectsPage() {
  const [tab, setTab] = useState('项目列表');
  const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);
  const tabs = ['项目列表', '执行动态', '市场策略', '目标预算', '执行计划', '项目价值'];
  return <>
    <PageHeader title="经营任务" desc="为数字员工配置目标、预算、自主等级和行动边界。" action="新建经营任务" secondary="任务模板" onAction={()=>setDialog({title:'新建经营任务',desc:'填写经营目标后，系统将生成预算、执行计划和数字员工配置草案。'})} onSecondary={()=>setDialog({title:'经营任务模板',desc:'已加载海外获客、渠道增长和新品验证等 6 个企业模板。'})}/>
    <Tabs items={tabs} active={tab} setActive={setTab} />
    {tab === '项目列表' ? <>
      <div className="stat-grid five"><Metric label="进行中项目" value="8" change="3 个重点"/><Metric label="项目总预算" value="¥ 246万" change="已用 48%"/><Metric label="累计有效询盘" value="333" change="+21.8%"/><Metric label="商机管道" value="¥ 1,544万" change="6.3× 投入"/><Metric label="异常项目" value="2" change="需要处理" warn/></div>
      <div className="two-col-wide">
        <section className="panel table-panel"><div className="panel-title"><div><h2>增长项目</h2><p>当前组织 · 全部事业部</p></div><div className="filter-chips"><button>全部状态⌄</button><button>全部市场⌄</button></div></div>
          <div className="data-table project-table"><div className="tr th"><span>项目</span><span>市场</span><span>阶段</span><span>内容</span><span>预算</span><span>询盘</span><span>商机金额</span><span>健康度</span></div>
            {[
              ['贵州抹茶东南亚渠道增长','马来西亚 / 新加坡','获客验证','68 / 96','61%','186','¥ 486万','正常'],
              ['刺梨浓缩汁渠道增长','马来西亚','内容测试','32 / 72','38%','54','¥ 216万','关注'],
              ['工业轮胎中东经销增长','阿联酋 / 沙特','商机推进','84 / 110','72%','93','¥ 842万','正常'],
            ].map(row => <button className="tr" key={row[0]} onClick={()=>setDialog({title:row[0],desc:`${row[1]} · ${row[2]}。项目详情已载入，可继续查看目标预算和执行计划。`})}>{row.map((cell, i) => <span key={i} className={i === 0 ? 'strong-cell' : ''}>{i === 7 ? <small className={cell === '正常' ? 'good' : 'warn'}>{cell}</small> : cell}</span>)}</button>)}
          </div>
        </section>
        <AgentNote agent="市场策略 Agent" onAction={()=>setDialog({title:'市场策略建议',desc:'建议优先扩大马来西亚食品原料进口商渠道，并在第二轮投放前补齐清真认证材料。'})}><h3>抹茶项目优先扩大马来西亚</h3><p>渠道匹配度和询盘质量均高于新加坡；清真认证材料仍需在第二轮投放前补齐。</p><ul><li>优先客户：食品原料进口商</li><li>推荐路径：进口商 → 连锁饮品渠道</li><li>建议周期：90 天</li></ul></AgentNote>
      </div>
    </> : tab === '执行动态' ? <section className="panel"><div className="panel-title"><div><h2>数字员工执行动态</h2><p>围绕当前经营任务查看行动、依据、权限和待人工介入事项</p></div><button onClick={()=>setDialog({title:'行动账本',desc:'今日 128 次行动均已记录调用依据、权限检查和执行结果。'})}>查看行动账本</button></div><div className="agent-runtime-grid">{agents.map((agent,i)=><button key={agent.name} onClick={()=>setDialog({title:agent.name,desc:`${agent.action}。当前为${i<3?'自主执行':'审批'}模式。`})}><span className={`agent-avatar ${agent.tone}`}>AI</span><span><strong>{agent.name.replace(' Agent','数字员工')}</strong><small>{agent.action}</small><em>{i<3?'自主执行':'审批模式'} · 贵州抹茶项目</em></span><b>{i===3?'待审批':'运行中'}</b></button>)}</div></section> : <ProjectDetail tab={tab} />}
    {dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} confirm="继续" onClose={()=>setDialog(null)}/>}
  </>;
}

function ProjectDetail({ tab }: { tab: string }) {
  const maps: Record<string, {title: string; desc: string; cards: string[][]}> = {
    市场策略: { title: '马来西亚优先，验证食品原料进口商渠道', desc: '结合准入、渠道结构、历史询盘和企业交付能力形成路径建议。', cards: [['市场吸引力','84 / 100','需求增长稳定'],['渠道匹配度','91 / 100','进口商结构清晰'],['进入准备度','76 / 100','认证待补充']] },
    目标预算: { title: '从流量目标倒推项目投入', desc: '预算与流量、询盘、商机和订单目标绑定。', cards: [['曝光目标','250万','当前 74%'],['访问目标','40,000','当前 66%'],['订单目标','5 笔','当前 3 笔']] },
    执行计划: { title: '六阶段增长计划', desc: '让策略、内容、分发和成交团队围绕同一项目节奏协作。', cards: [['市场验证','已完成','8月15日'],['第一轮投放','进行中','完成 68%'],['商机推进','待启动','9月16日']] },
    项目价值: { title: '不只看当期订单，也沉淀可复用增长资产', desc: '项目资产将继续支持后续市场与品牌项目。', cards: [['已沉淀受众','82,600','可再营销'],['目标企业','312 家','67 家已合格'],['成交金额','¥ 126万','商机管道 ¥486万']] },
  };
  const item = maps[tab];
  return <div className="two-col-wide"><section className="panel detail-canvas"><div className="detail-hero"><div><span>贵州抹茶东南亚渠道增长</span><h2>{item.title}</h2><p>{item.desc}</p></div><small>项目周期 2026.08.15 — 10.31</small></div><div className="mini-metrics">{item.cards.map(card => <div key={card[0]}><span>{card[0]}</span><b>{card[1]}</b><small>{card[2]}</small></div>)}</div><div className="funnel"><div><b>184万</b><span>海外曝光</span></div><i>→</i><div><b>26,480</b><span>精准访问</span></div><i>→</i><div><b>186</b><span>询盘</span></div><i>→</i><div><b>21</b><span>商机</span></div><i>→</i><div><b>3</b><span>订单</span></div></div></section><AgentNote agent="市场策略 Agent"><h3>本页有 2 项建议</h3><p>系统引用项目资料、市场数据和成交反馈给出下一步动作，所有预算与对外承诺均需人工确认。</p></AgentNote></div>;
}

function ContentPage() {
  const [watchingRun, setWatchingRun] = useState(false);
  const [dialog, setDialog] = useState<{title:string;desc:string}|null>(null);
  const [project, setProject] = useState('贵州抹茶东南亚渠道增长');
  const campaign = project.startsWith('贵州')?'马来西亚食品原料商获客':'中东经销商获客';
  return <>
    <header className="content-command-head">
      <div><span className="content-breadcrumb">经营任务　/　{project}</span><h1>{campaign}</h1><p>让马来西亚食品原料进口商看见工厂实力，并留下有效采购询盘。</p></div>
      <div className="content-head-actions"><button className="project-switch" onClick={()=>setProject(p=>p.startsWith('贵州')?'工业轮胎中东经销增长':'贵州抹茶东南亚渠道增长')}>切换项目 ⌄</button><button className="primary" onClick={()=>setDialog({title:'创建内容任务',desc:'将为当前 Campaign 创建一条待策划任务。'})}>＋ 新建任务</button></div>
    </header>
    <AgentTaskCenter onWatch={()=>setWatchingRun(true)} onAction={(title,desc)=>setDialog({title,desc})}/>
    {watchingRun && <AgentLiveView onExit={()=>setWatchingRun(false)}/>}
    {dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} onClose={()=>setDialog(null)}/>}
  </>;
}

type ContentTask = {id:string;stage:string;title:string;owner:string;meta:string;kind:'normal'|'running'|'attention'|'review'};

const contentTasks:ContentTask[] = [
  {id:'selection',stage:'待策划',title:'进口商选品清单',owner:'采购经理',meta:'明天',kind:'normal'},
  {id:'grades',stage:'待策划',title:'抹茶等级指南',owner:'品类经理',meta:'周四',kind:'normal'},
  {id:'halal',stage:'资料准备',title:'清真认证说明',owner:'质量负责人',meta:'缺少附件',kind:'attention'},
  {id:'capacity',stage:'资料准备',title:'工厂产能证据包',owner:'采购经理',meta:'待确认',kind:'attention'},
  {id:'factory',stage:'创作中',title:'工厂品质 30 秒视频',owner:'内容生产 Agent',meta:'镜头 3 / 6',kind:'running'},
  {id:'profit',stage:'创作中',title:'渠道利润政策图文',owner:'经销商老板',meta:'人员编辑',kind:'normal'},
  {id:'recipe',stage:'待审核',title:'马来语应用配方短片',owner:'品类经理',meta:'今天 14:00',kind:'review'},
  {id:'case',stage:'待审核',title:'500kg 采购案例',owner:'进口商',meta:'今天 16:30',kind:'review'},
];

function AgentTaskCenter({onWatch,onAction}:{onWatch:()=>void;onAction:(title:string,desc:string)=>void}) {
  const [selectedId,setSelectedId]=useState('factory');
  const [filter,setFilter]=useState<'all'|'running'|'attention'|'mine'>('all');
  const stages=['待策划','资料准备','创作中','待审核'];
  const selected=contentTasks.find(task=>task.id===selectedId)??contentTasks[4];
  const shown=contentTasks.filter(task=>filter==='all'||(filter==='running'&&task.kind==='running')||(filter==='attention'&&(task.kind==='attention'||task.kind==='review'))||(filter==='mine'&&['capacity','recipe','profit'].includes(task.id)));
  const selectTask=(task:ContentTask)=>setSelectedId(task.id);
  return <section className="agent-task-center">
    <div className="task-center-toolbar"><div><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>全部任务</button><button className={filter==='running'?'active':''} onClick={()=>{setFilter('running');setSelectedId('factory')}}><i className="live-dot-mini"/>AI 执行中</button><button className={filter==='attention'?'active attention':''} onClick={()=>{setFilter('attention');setSelectedId('halal')}}>待我处理 <b>2</b></button><button className={filter==='mine'?'active':''} onClick={()=>{setFilter('mine');setSelectedId('capacity')}}>与我相关</button></div><button onClick={()=>onAction('筛选内容任务','可按负责人、截止时间、内容类型和 Agent 执行状态进行筛选。')}>筛选 ⌄</button></div>
    <div className="task-center-body"><div className="task-flow"><div className="task-columns">{stages.map((stage,index)=><section className="task-stage" key={stage}><header><span>{String(index+1).padStart(2,'0')}</span><strong>{stage}</strong><b>{contentTasks.filter(task=>task.stage===stage).length}</b>{index<stages.length-1&&<i>→</i>}</header><div>{shown.filter(task=>task.stage===stage).map(task=><button key={task.id} className={`${task.kind} ${selected.id===task.id?'selected':''}`} onClick={()=>selectTask(task)}><span className="task-kind">{task.kind==='running'?<><i className="live-dot-mini"/>AI 正在执行</>:task.kind==='attention'?'!需要你介入':task.kind==='review'?'待你审核':task.owner}</span><strong>{task.title}</strong><small>{task.owner} · {task.meta}</small>{task.kind==='running'&&<span className="mini-run-progress"><i><b style={{width:'52%'}}/></i><em>52%</em></span>}</button>)}</div></section>)}</div>{shown.length===0&&<div className="task-empty">当前筛选下没有任务</div>}</div>
      <aside className={`task-live-inspector ${selected.kind}`}><header><div><span className="inspector-agent"><i/>{selected.kind==='running'?'内容生产 Agent':selected.kind==='attention'?'人工协作节点':'任务详情'}</span><h3>{selected.title}</h3><p>{selected.kind==='running'?'已运行 02:18 · 预计还需 4 分钟':`${selected.owner} · ${selected.meta}`}</p></div>{selected.kind==='running'&&<button onClick={onWatch}>查看完整现场 →</button>}</header>
        {selected.kind==='running'?<><section className="current-operation"><span>当前正在做</span><strong>生成「自动化生产线」镜头</strong><p>正在从企业素材库匹配可验证工厂产能的画面，已检查 18 份素材，选中 6 份。</p><div><span><i style={{width:'52%'}}/></span><b>52%</b></div></section><ExecutionSteps/><section className="recent-output"><header><strong>最近产出</strong><span>刚刚更新</span></header><div>{[['脚本 V1','已完成'],['6 镜头分镜稿','可查看'],['镜头 01','可预览'],['镜头 02','可预览']].map(item=><button key={item[0]} onClick={()=>onAction(item[0],'该产出已保存至当前内容任务，可继续预览或查看生成依据。')}><span>▣</span><strong>{item[0]}</strong><small>{item[1]}</small></button>)}</div></section></>:selected.kind==='attention'?<section className="intervention-panel"><span>!　当前阻塞</span><h4>{selected.id==='halal'?'需要补充有效的清真认证附件':'需要确认工厂月产能数据'}</h4><p>完成该操作后，Agent 将自动恢复后续内容生产，无需重新创建任务。</p><button onClick={()=>onAction(selected.id==='halal'?'补充认证资料':'确认产能数据','处理完成后，相关 Agent 任务将自动继续执行。')}>{selected.id==='halal'?'补充资料':'立即确认'} →</button></section>:<section className="task-detail-panel"><span>{selected.kind==='review'?'等待人工审核':'当前任务'}</span><h4>{selected.kind==='review'?'确认事实、品牌表达与对外承诺':'任务按计划推进中'}</h4><p>负责人：{selected.owner}<br/>截止或当前状态：{selected.meta}</p><button onClick={()=>onAction(selected.title,'已载入任务目标、负责人、截止时间、引用资料和完整执行记录。')}>{selected.kind==='review'?'去审核':'查看详情'} →</button></section>}
      </aside></div>
  </section>;
}

function ExecutionSteps(){
  const steps=[['理解任务','done'],['调用资料','done'],['生成脚本','done'],['生成分镜','done'],['生成画面','active'],['合成检查','wait'],['提交审核','wait']];
  return <section className="execution-steps"><header><strong>执行进度</strong><span>5 / 7</span></header><div>{steps.map(([name,state],index)=><span className={state} key={name}><i>{state==='done'?'✓':index+1}</i><small>{name}</small>{index<steps.length-1&&<em/>}</span>)}</div></section>;
}

function AgentLiveView({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(2);
  const steps = [['选模式','确认产品、平台与内容目标'],['分镜与声音','生成可执行脚本与英文口播'],['选素材','按分镜匹配企业真实素材'],['封面','生成封面与标题候选'],['成片预览','确认成片并交付审核']];
  useEffect(()=>{const timer=window.setInterval(()=>setStep(s=>s<4?s+1:s),5200);return()=>window.clearInterval(timer)},[]);
  return <div className="agent-live-overlay"><section className="agent-live-shell lingshu-live"><header className="studio-workbar"><button onClick={onExit}>← 退出观看</button><span className="work-file">▤</span><div><strong>工厂品质 30 秒视频</strong><small>已自动保存</small></div><span className="live-running"><i/> 内容生产 Agent 运行中 · 02:18</span><button>保存草稿</button><button className="work-primary">打开任务详情</button></header><div className="studio-layout"><aside className="studio-steps"><header><small>AI 生成</small><strong>AI 智能素材</strong></header>{steps.map((x,i)=><button key={x[0]} className={i<step?'done':i===step?'active':''} onClick={()=>i<=step&&setStep(i)} disabled={i>step}><i>{i<step?'✓':i+1}</i><span><strong>{x[0]}</strong><small>{x[1]}</small></span>{i===step&&<em/>}</button>)}</aside><main className="studio-operation"><div className="operation-head"><div><span>步骤 {step+1} / {steps.length}</span><h2>{steps[step][0]}</h2><p>{steps[step][1]}</p></div><span className="agent-follow"><i/> Agent 正在操作此页面</span></div><LingshuStepCanvas step={step}/><div className="studio-bottom"><button disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>← 上一步</button><div>{steps.map((_,i)=><i key={i} className={i<=step?'active':''}/>)}</div><button disabled={step===4}>{step===4?'已进入审核':'Agent 完成本步后继续 →'}</button></div></main><aside className="studio-context"><header><strong>本次生成依据</strong><small>只显示当前步骤使用的上下文</small></header><section className="selected-product"><span>抹</span><p><strong>食品级抹茶 M-02</strong><small>企业中心 · 已确认产品</small></p></section><dl><dt>目标买家</dt><dd>食品原料采购经理</dd><dt>市场</dt><dd>马来西亚</dd><dt>平台</dt><dd>LinkedIn</dd><dt>CTA</dt><dd>下载英文规格书</dd></dl><section className="context-evidence"><strong>当前引用</strong>{(step<2?['英文产品手册','批次质检流程']:step===2?['工厂视频 8 条','实验室素材 4 条']:['品牌视觉规范','英文标题规则']).map(x=><p key={x}><i>✓</i>{x}</p>)}</section><section className="live-boundary"><strong>行动边界</strong><p><span>✓</span> 可自动生成和匹配</p><p><span>!</span> 发布前必须人工审核</p></section></aside></div></section></div>;
}

function LingshuStepCanvas({ step }: { step: number }) {
  if(step===0)return <div className="mode-canvas"><div className="selected-mode"><span>✓ 已选择</span><strong>产品实证视频</strong><p>用规格、包装、工厂与检测资料建立采购判断依据。</p></div><div className="mode-options">{['真人口播','应用场景','渠道合作'].map(x=><button key={x}><span>模式</span><strong>{x}</strong><small>可切换内容生成方式</small></button>)}</div></div>;
  if(step===1)return <div className="script-canvas"><section><header><strong>英文口播脚本</strong><span>已生成 · 68 词</span></header><h3>Built for consistency at scale</h3><p>From Guizhou&apos;s highlands to your next beverage line. Controlled sourcing, batch-level quality records and export-ready specifications...</p><div><span>00:00—00:05　产地与原料</span><span>00:05—00:12　生产与批次稳定性</span><span>00:12—00:22　检测与认证</span><span>00:22—00:30　规格书 CTA</span></div></section><aside><strong>声音策略</strong><button className="active">英文专业旁白 <span>▶ 试听</span></button><button>仅字幕，无配音</button><button>上传真人口播</button></aside></div>;
  if(step===2)return <VideoWorkflowCanvas step={2}/>;
  if(step===3)return <div className="cover-canvas"><section className="cover-preview"><span>GUIZHOU MATCHA</span><strong>Consistency<br/>you can verify.</strong><small>Export-ready specifications for beverage brands</small></section><aside><strong>封面候选</strong>{['质量实证','工厂实力','采购规格'].map((x,i)=><button key={x} className={i===0?'active':''}><span>0{i+1}</span><p><strong>{x}</strong><small>{i===0?'Agent 推荐':'备选方案'}</small></p></button>)}</aside></div>;
  return <div className="final-preview"><section><div className="final-video"><button>▶</button><span>00:30</span><strong>Consistency you can verify.</strong></div><div className="final-track"><i/><i/><i/><i/><i/><i/></div></section><aside><span>成片已生成</span><h3>工厂品质 30 秒视频</h3><dl><dt>画幅</dt><dd>1080 × 1920</dd><dt>语言</dt><dd>English</dd><dt>字幕</dt><dd>已烧录</dd><dt>事实检查</dt><dd>5 / 6 通过</dd></dl><p>“月产 200 吨”仍需质量负责人确认，通过后可进入排期。</p><button>提交审核</button></aside></div>;
}

function VideoWorkflowCanvas({ step }: { step: number }) {
  const scenes = [['01','贵州高山茶园','航拍建立产地可信感'],['02','鲜叶与原料筛选','展示源头质量控制'],['03','自动化生产线','强调稳定规模供应'],['04','实验室批次检测','呈现可验证的质量记录'],['05','食品级抹茶包装','展示出口就绪状态'],['06','英文规格书 CTA','引导采购经理获取资料']];
  return <div className="video-workflow-canvas"><section className="video-preview"><div className={`preview-frame phase-${step}`}><span>SCENE {Math.min(step+1,6)} / 6</span><div className="preview-visual"><i/><i/><i/></div><strong>{scenes[Math.min(step,5)][1]}</strong><small>{scenes[Math.min(step,5)][2]}</small><button>▶</button></div><div className="preview-track"><i style={{width:`${Math.max(18,(step+1)*16)}%`}}/></div><div className="preview-meta"><span>00:{String(Math.min(30,(step+1)*5)).padStart(2,'0')} / 00:30</span><span>1080 × 1920 · 英文</span></div></section><section className="scene-panel"><header><strong>视频分镜</strong><span>6 个镜头 · 30 秒</span></header>{scenes.map((s,i)=><div key={s[0]} className={i<step?'ready':i===step?'generating':''}><span>{i<step?'✓':s[0]}</span><p><strong>{s[1]}</strong><small>{s[2]}</small></p><em>{i<step?'已生成':i===step?'生成中…':'等待'}</em></div>)}</section></div>;
}

function ReviewWorkbench() {
  const [selected,setSelected]=useState(0); const [dialog,setDialog]=useState<string|null>(null);
  const rows=[['工厂品质 30 秒视频','事实与技术参数','高'],['经销合作政策图文','商务承诺','高'],['马来语应用配方短片','本地化表达','中']];
  return <><div className="review-workbench"><aside><div className="review-queue-head"><strong>待我审核</strong><span>7</span></div>{rows.map((r,i)=><button key={r[0]} className={i===selected?'active':''} onClick={()=>setSelected(i)}><span className="review-icon">{i+1}</span><span><strong>{r[0]}</strong><small>{r[1]} · {r[2]}风险</small></span></button>)}</aside><article><div className="review-doc-head"><div><small>LinkedIn · 英文内容</small><h3>{rows[selected][0]}</h3></div><span>版本 3</span></div><p>Built for consistency at scale. Our production combines controlled sourcing, batch-level quality records and export-ready specifications.</p><div className="claim-check"><strong>事实核验</strong><span className="checked">✓ 产地描述已引用产品手册</span><span className="checked">✓ 批次记录已引用质检流程</span><span className="warning">! 关键参数待负责人确认</span></div><footer><button onClick={()=>setDialog('退回修改')}>退回修改</button><button onClick={()=>setDialog('补充批注')}>补充批注</button><button className="approve" onClick={()=>setDialog('确认通过并进入排期')}>确认通过并进入排期</button></footer></article></div>{dialog&&<ActionDialog title={dialog} desc={`对“${rows[selected][0]}”执行此审核动作，结果将记入行动账本。`} onClose={()=>setDialog(null)}/>}</>;
}

function SchedulePage() {
  const [tab, setTab] = useState('排期编排');
  const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);
  return <>
    <PageHeader title="排期与分发" desc="把审核通过的内容排入日历，并处理发布异常。" action={tab==='排期编排'?'新建排期':'批量重试'} secondary="导出视图" onAction={()=>setDialog({title:tab==='排期编排'?'新建排期':'批量重试',desc:tab==='排期编排'?'为已审核内容选择平台、账号与发布时间。':'将重试 3 条发布异常任务。'})} onSecondary={()=>setDialog({title:'导出排期视图',desc:'导出当前排期与发布状态。'})}/>
    <div className="content-flow-switch schedule-flow-switch"><button className={tab==='排期编排'?'active':''} onClick={()=>setTab('排期编排')}><i>1</i><span><strong>排期编排</strong><small>安排平台、账号与发布时间</small></span><b>5 待排</b></button><em>→</em><button className={tab==='发布处理'?'active':''} onClick={()=>setTab('发布处理')}><i>2</i><span><strong>发布处理</strong><small>发布检查、异常与重试</small></span><b className="attention-count">3 待处理</b></button></div>
    {tab==='排期编排'?<><div className="compact-ops-bar"><p><b>今日节奏</b>　09:30 LinkedIn 已发布　·　11:00 Meta 待发布　·　16:30 邮件待审核</p><div><span>本周 26</span><span>已就绪 21</span></div></div><section className="schedule-workspace schedule-simple"><aside className="unscheduled"><header><div><strong>待排内容</strong><small>点击内容完成编排</small></div><span>5</span></header>{[['渠道利润政策','LinkedIn','审核通过'],['采购规格清单','邮件','待选账号'],['应用配方短片','YouTube','审核通过']].map((item,i)=><button key={item[0]} onClick={()=>setDialog({title:`编排：${item[0]}`,desc:`为 ${item[1]} 选择发布账号和受众活跃时间。`})}><i className={`channel-dot c${i}`}/><span><strong>{item[0]}</strong><small>{item[1]} · {item[2]}</small></span><b>⠿</b></button>)}</aside><section className="panel schedule-canvas"><div className="panel-title"><div><h2>本周发布编排</h2><p>Asia/Shanghai · 受众活跃时间已标注</p></div><div className="filter-chips"><button onClick={()=>setDialog({title:'来源筛选',desc:'可按人员创建或数字员工执行筛选排期。'})}>全部来源⌄</button><button onClick={()=>setDialog({title:'切换日历视图',desc:'可切换周视图或月视图查看发布计划。'})}>周视图⌄</button></div></div><TrafficVisual tab="分发计划" onSelect={item=>setDialog({title:'排期详情',desc:`${item}的发布时间、账号和审核状态已载入。`})}/></section></section></>:<PublishExceptionWorkbench onAction={(title,desc)=>setDialog({title,desc})}/>}
    {dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} onClose={()=>setDialog(null)}/>}
  </>;
}

function PublishExceptionWorkbench({onAction}:{onAction:(title:string,desc:string)=>void}){
  const rows=[['邮件渠道政策','企业邮箱','内容审核未通过','补充渠道授权依据','高'],['应用场景获客','Meta','账号授权 3 天后过期','重新授权账号','中'],['应用配方短片','YouTube','平台处理超时','立即重试','中']];
  return <section className="panel publish-exceptions"><div className="panel-title"><div><h2>发布异常处理</h2><p>只展示阻塞发布或需要人工确认的事项</p></div><div className="filter-chips"><button onClick={()=>onAction('平台筛选','可按 LinkedIn、Meta、YouTube 或企业邮箱筛选发布异常。')}>全部平台⌄</button><button onClick={()=>onAction('来源筛选','可按人员或数字员工执行来源筛选。')}>全部来源⌄</button></div></div><div className="exception-table"><div className="exception-row head"><span>内容</span><span>平台</span><span>阻塞原因</span><span>建议动作</span><span>操作</span></div>{rows.map(r=><div className="exception-row" key={r[0]}><span><strong>{r[0]}</strong><small>{r[4]}优先级</small></span><span>{r[1]}</span><span>{r[2]}</span><span>{r[3]}</span><span><button onClick={()=>onAction(`异常详情：${r[0]}`,`${r[1]}：${r[2]}。建议${r[3]}。`)}>查看</button><button className="primary" onClick={()=>onAction(`处理：${r[0]}`,`将执行“${r[3]}”并记录处理结果。`)}>处理</button></span></div>)}</div><aside className="publish-check-summary"><div><strong>发布前自动检查</strong><small>内容审核、账号授权、链接追踪和频次冲突</small></div>{[['内容审核','24 / 26'],['平台授权','5 / 5'],['链接追踪','26 / 26'],['频次冲突','1 项']].map((x,i)=><span key={x[0]} className={i===0||i===3?'warn':''}>{x[0]} <b>{x[1]}</b></span>)}</aside></section>;
}

function AgentsPage() {
  return <>
    <PageHeader title="员工团队" desc="查看数字员工正在为哪些目标工作、采取了什么行动。" action="配置员工团队"/>
    <div className="stat-grid four"><Metric label="运行中员工" value="6"/><Metric label="今日自主动作" value="128" change="92% 自动完成"/><Metric label="等待审批" value="7" change="需要处理" warn/><Metric label="Agent 主导商机" value="21" change="¥486万"/></div>
    <section className="panel"><div className="panel-title"><div><h2>数字员工运行状态</h2><p>内容 40% · 信号 30% · 客户承接 30%</p></div><button>查看行动账本</button></div><div className="agent-runtime-grid">{agents.map((agent,i)=><button key={agent.name}><span className={`agent-avatar ${agent.tone}`}>AI</span><span><strong>{agent.name.replace(' Agent','数字员工')}</strong><small>{agent.action}</small><em>{i<3?'自主执行':'审批模式'} · 贵州抹茶项目</em></span><b>{i===3?'待审批':'运行中'}</b></button>)}</div></section>
  </>;
}

function ApprovalsPage() {
  const items = [['预算调整','分发增长数字员工','将 LinkedIn 预算提高 12%','预计 +4 条合格询盘','高'],['商务承诺','询盘接待数字员工','客户询问马来西亚独家代理','必须由销售总监确认','高'],['内容事实','内容生产数字员工','英文检测报告有效期待确认','等待质量负责人','中'],['发布异常','内容发布数字员工','Instagram 授权将在 3 天后过期','重新授权账号','中']];
  const [handled,setHandled]=useState<Record<string,string>>({});
  const [dialog,setDialog]=useState<{title:string;desc:string;action?:()=>void}|null>(null);
  const decide=(name:string,result:string)=>setHandled(old=>({...old,[name]:result}));
  return <>
    <PageHeader title="审批与异常" desc="集中处理数字员工无法自主完成的受限动作和异常。" action="批量批准" secondary="转交处理" onAction={()=>setDialog({title:'批量批准',desc:`将批准 ${items.filter(x=>!handled[x[0]]).length} 项待处理事项，结果会写入审批记录。`,action:()=>setHandled(Object.fromEntries(items.map(x=>[x[0],'已批准'])))})} onSecondary={()=>setDialog({title:'转交处理',desc:'选择接收人后，未处理事项将进入对方待办并保留原审批期限。'})}/>
    <div className="stat-grid four"><Metric label="待审批" value="7"/><Metric label="运行异常" value="3" change="1 项高风险" warn/><Metric label="平均处理时间" value="18分钟"/><Metric label="今日自动通过" value="86" change="规则命中"/></div>
    <section className="panel"><div className="approval-list"><div className="approval-row head"><span>事项</span><span>来源</span><span>数字员工请求</span><span>影响与原因</span><span>操作</span></div>{items.map(item=><div className={`approval-row ${handled[item[0]]?'handled':''}`} key={item[0]}><span><strong>{item[0]}</strong><small className={item[4]==='高'?'risk-high':''}>{handled[item[0]]||`${item[4]}风险`}</small></span><span>{item[1]}</span><span>{item[2]}</span><span>{item[3]}</span><span>{handled[item[0]]?<b className="decision-result">✓ {handled[item[0]]}</b>:<><button onClick={()=>setDialog({title:`驳回「${item[0]}」`,desc:'驳回后数字员工将停止该动作，并依据你的说明重新生成方案。',action:()=>decide(item[0],'已驳回')})}>驳回</button><button className="approve" onClick={()=>setDialog({title:`批准「${item[0]}」`,desc:item[3]+'。确认后数字员工将继续执行。',action:()=>decide(item[0],'已批准')})}>批准</button></>}</span></div>)}</div></section>
    {dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} confirm="确认处理" onClose={()=>setDialog(null)} onConfirm={dialog.action}/>}
  </>;
}

function DistributionPage() {
  const [source, setSource] = useState<SourceView>('全部');
  const [tab, setTab] = useState('分发计划');
  const actions = sourceActions(source, '创建分发计划');
  return <>
    <PageHeader title="分发管理" desc="统一管理自然分发、平台版本、发布状态和失败重试。" action={actions.action} secondary={actions.secondary}/>
    <SourceSwitcher active={source} setActive={setSource}/>
    {source !== '全部' && <div className={`source-context ${source === '待我处理' ? 'attention' : ''}`}><span>{source === '人员创建' ? '人工分发' : source === '数字员工执行' ? '自动分发中' : '分发异常'}</span><strong>{source === '人员创建' ? '显示人员创建的平台分发计划' : source === '数字员工执行' ? '数字员工已将 18 条内容适配并分发到 4 个海外平台' : '1 个账号授权异常，2 条内容等待平台审核'}</strong></div>}
    <Tabs items={['分发计划','平台账号','发布状态','失败重试']} active={tab} setActive={setTab}/>
    <div className="stat-grid four"><Metric label="本周分发" value="48"/><Metric label="成功发布" value="43" change="89.6%"/><Metric label="数字员工执行" value="35"/><Metric label="待处理" value="3" change="需要确认" warn/></div>
    <section className="panel table-panel"><div className="panel-title"><div><h2>{tab}</h2><p>当前项目 · 贵州抹茶东南亚渠道增长</p></div><button>筛选⌄</button></div>{tab === '分发计划' ? <TrafficVisual tab="分发计划"/> : <div className="data-table traffic-table"><div className="tr th"><span>内容／账号</span><span>平台</span><span>来源</span><span>计划时间</span><span>状态</span><span>结果</span><span>操作</span></div>{[['工厂品质验证','LinkedIn','数字员工','今天 09:30','已发布','访问 6,800','查看'],['应用场景获客','Meta','人员创建','今天 11:00','已发布','访问 12,400','查看'],['渠道利润政策','LinkedIn','数字员工','今天 16:30','待审核','—','处理'],['应用配方视频','YouTube','数字员工','明天 10:00','已排期','—','调整']].map(r=><button className="tr" key={r[0]}>{r.map((x,i)=><span key={i} className={i===0?'strong-cell':''}>{x}</span>)}</button>)}</div>}</section>
  </>;
}

function TrafficPage() {
  const [tab, setTab] = useState('投流管理');
  const [platform,setPlatform]=useState('全部平台');
  const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);
  const tabs = ['投流管理', '受众', '流量分析', '优化建议'];
  return <>
    <PageHeader title="广告投放" desc="管理付费流量，并监督数字员工的预算、受众和素材动作。" secondary="导出视图" onSecondary={()=>setDialog({title:'导出投流视图',desc:'将导出当前项目的预算、访问、询盘与成本数据。'})}/>
    <Tabs items={tabs} active={tab} setActive={setTab} />
    <div className="traffic-command"><div className="command-primary"><span>今日预算消耗</span><strong>¥ 18,420 <small>/ ¥ 24,000</small></strong><i><em style={{width:'76%'}}/></i><p>节奏正常，预计 22:40 完成今日预算</p></div><div><span>新增有效询盘</span><strong>14</strong><small>目标 12 · 已超 16%</small></div><div><span>单询盘成本</span><strong>¥ 1,316</strong><small className="positive">较目标低 11%</small></div><div className="command-alert"><span>待决策动作</span><strong>2</strong><small>预计影响 4 条询盘</small></div></div>
    <div className="two-col-wide"><section className="panel table-panel"><div className="panel-title"><div><h2>{tab === '投流管理' ? 'Campaign 操作台' : tab}</h2><p>当前项目 · 2026.08.15 — 08.28</p></div><div className="filter-chips"><button onClick={()=>setPlatform(p=>p==='全部平台'?'LinkedIn':'全部平台')}>{platform}⌄</button><button onClick={()=>setDialog({title:'批量操作 Campaign',desc:'已选择当前筛选范围，可批量调整预算、暂停或更换素材。'})}>批量操作</button></div></div>
      {tab === '投流管理' || tab === '优化建议' ? <div className="data-table traffic-table ops-table"><div className="tr th"><span>Campaign／状态</span><span>平台</span><span>预算节奏</span><span>访问</span><span>询盘</span><span>成本</span><span>下一动作</span></div>{[
        ['● 工厂品质验证','LinkedIn','85% · 正常','6,800','63','¥968','维持'],['● 应用场景获客','Meta','90% · 偏快','12,400','71','¥1,113','降预算 8%'],['● 采购需求搜索','Google','89% · 正常','4,900','38','¥1,263','扩展词包'],['Ⅱ 品牌认知视频','YouTube','83% · 已暂停','2,380','14','¥2,142','更换素材'],
      ].filter(r=>platform==='全部平台'||r[1]===platform).map(r=><button className="tr" key={r[0]} onClick={()=>setDialog({title:r[0].replace(/^[●Ⅱ]\s*/,''),desc:`${r[1]} Campaign：预算节奏 ${r[2]}，当前建议“${r[6]}”。`})}>{r.map((x,i)=><span key={i} className={i===0?'strong-cell':i===6?'row-action':''}>{x}</span>)}</button>)}</div> : <TrafficVisual tab={tab}/>}
    </section><AgentNote agent="分发增长数字员工" action="审批预算调整" onAction={()=>setDialog({title:'审批预算调整',desc:'将 20% 预算从低效 Campaign 调整至“渠道利润与合作政策”，预计节省 ¥3,200。'})}><h3>建议重新分配 20% 预算</h3><p>“渠道利润与合作政策”内容的合格询盘率高出消费场景短片 38%。每次调整均记录依据、权限和结果。</p><div className="impact"><span><b>+12</b> 有效询盘</span><span><b>+4</b> 合格客户</span><span><b>¥3,200</b> 预计节省</span></div></AgentNote></div>
    {dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} onClose={()=>setDialog(null)}/>}
  </>;
}

function TrafficVisual({ tab, onSelect }: { tab: string; onSelect?: (item:string)=>void }) {
  if (tab === '分发计划') return <div className="week-grid">{['周一','周二','周三','周四','周五'].map((d,i)=>{const item=['LinkedIn 工厂视频','Meta 应用图文','YouTube 品质片','邮件渠道政策','再营销案例'][i];return <div key={d}><strong>{d}</strong><button onClick={()=>onSelect?.(item)}><small>{9+i}:30</small><span>{item}</span><em>{i<3?'已发布':'已排期'}</em></button></div>})}</div>;
  if (tab === '受众') return <div className="audience-grid">{[['食品原料进口商','18,400'],['饮品经销商','26,800'],['连锁茶饮采购','9,600'],['网站高意向访问者','4,280'],['再营销受众','12,700'],['目标账户名单','312 家']].map(a=><div key={a[0]}><span>{a[0]}</span><b>{a[1]}</b><small>已同步 · 可使用</small></div>)}</div>;
  return <div className="chart-box"><div className="bars">{[42,58,49,76,68,88,82,96,90,112,105,126].map((h,i)=><i key={i} style={{height:`${h}px`}}/>)}</div><div className="chart-labels"><span>8月15日</span><span>精准访问持续增长</span><span>8月28日</span></div><div className="channel-split">{[['LinkedIn','34%'],['Meta','29%'],['Google','24%'],['YouTube','13%']].map(c=><div key={c[0]}><span>{c[0]}</span><b>{c[1]}</b></div>)}</div></div>;
}

function CustomerOperationsPage({ go }: { go: (view: View) => void }) {
  const [reportOpen,setReportOpen]=useState(false);
  return <>
    <div className="customer-ops-heading"><div><p className="eyebrow">黔海 · 客户经营</p><h1>客户经营</h1><p>先看自动化经营结果与风险，需要时再进入现场处理具体客户。</p></div><button className="primary" onClick={()=>go('customerLive')}><span className="live-entry-dot"/>进入客户工作现场 <b>3</b></button></div>
    <div className="customer-ops-stats">
      {[['Agent 自动处理','128','本周 +24%','green'],['新增高意向客户','18','转化率 14.1%','blue'],['推进中商机','21','预计 ¥486万','violet'],['需要人工介入','3','最急剩余 18 分钟','amber']].map(x=><article key={x[0]}><span className={`ops-stat-icon ${x[3]}`}>AI</span><div><small>{x[0]}</small><strong>{x[1]}</strong><em>{x[2]}</em></div></article>)}
    </div>
    <CustomerJourney active="商机推进"/>
    <div className="customer-ops-layout">
      <section className="panel ops-flow-panel"><div className="panel-title"><div><h2>Agent 自动化流程</h2><p>从识别、回复到推进的实时过程与结果</p></div><span className="live-dot">5 个流程运行中</span></div>
        <div className="ops-flow-list">
          {[
            ['询盘接待 Agent','自动识别并回复新询盘','WhatsApp · LinkedIn · 邮件','42','平均首响 1分36秒','运行中','blue'],
            ['客户资格 Agent','补全企业、需求与采购意向','BANT / SPIN 资格判断','18','识别 6 条高意向','运行中','violet'],
            ['成交推进 Agent','生成跟进任务并监控里程碑','21 个活跃商机','8','2 个商机即将超期','需关注','amber'],
            ['客户记忆 Agent','沉淀对话、证据与客户偏好','本周 286 次更新','286','完整率 94%','运行中','green'],
          ].map(x=><button key={x[0]} onClick={()=>go(x[0]==='成交推进 Agent'?'customers':'customerLive')}><span className={`ops-agent-icon ${x[6]}`}>AI</span><span><strong>{x[0]}</strong><small>{x[1]}</small><em>{x[2]}</em></span><span className="ops-flow-result"><b>{x[3]}</b><small>{x[4]}</small></span><i className={x[5]==='需关注'?'attention':''}>{x[5]}</i><b className="ops-arrow">›</b></button>)}
        </div>
      </section>
      <aside className="panel ops-attention"><div className="panel-title"><div><h2>需要人工介入</h2><p>Agent 已整理好上下文</p></div><span className="count">3</span></div>
        {[['Adrian Tan','确认 500kg 正式报价','18 分钟','customerLive'],['Maya Food','独家代理承诺需审批','42 分钟','customerLive'],['Lumi Ingredients','商机里程碑已超期','已超 2 小时','customers']].map((x,i)=><button key={x[0]} onClick={()=>go(x[3] as View)}><span className={`attention-level l${i}`}/><span><strong>{x[0]}</strong><small>{x[1]}</small></span><em>{x[2]}</em><b>›</b></button>)}
        <button className="ops-all-live" onClick={()=>go('customerLive')}>进入现场统一处理 →</button>
      </aside>
    </div>
      <section className="panel ops-results"><div className="panel-title"><div><h2>近 7 天经营结果</h2><p>汇总 Agent 自动执行与人工协同后的业务产出</p></div><button onClick={()=>setReportOpen(true)}>查看完整报告</button></div><div className="ops-result-grid"><div className="ops-chart"><div className="ops-bars">{[34,48,42,65,58,78,92].map((h,i)=><i key={i} style={{height:`${h}%`}}><span>{[12,18,15,24,21,31,36][i]}</span></i>)}</div><div><span>8月23日</span><strong>自动完成动作数</strong><span>今天</span></div></div>{[['自动回复','86','91% 无需人工修改'],['资格判断','34','18 条高意向'],['自动跟进','28','按时完成率 89%'],['创建商机','11','商机金额 ¥286万']].map(x=><div className="ops-result-card" key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong><small>{x[2]}</small></div>)}</div></section>
    {reportOpen&&<ActionDialog title="客户经营完整报告" desc="已汇总近 7 天 128 次自动处理、18 条高意向客户与 21 个推进中商机。报告将包含渠道、Agent 贡献和人工介入明细。" confirm="导出报告" onClose={()=>setReportOpen(false)}/>}
  </>;
}

function InquiriesPage({ go }: { go: (view: View) => void }) {
  const [selected, setSelected] = useState(0);
  const [detailTab, setDetailTab] = useState('资格判断');
  const inquiries = [
    ['Adrian Tan','Lumi Ingredients','马来西亚 · 采购经理','希望获取规格书、样品及 500kg 报价','91','待人工确认','报价诉求'],
    ['Nur Aisyah','Maya Food Distribution','马来西亚 · 品类负责人','询问独家代理政策和首批起订量','86','待人工接管','独家代理'],
    ['Daniel Lim','Pacific Beverage SG','新加坡 · 采购总监','希望预约下周产品与供应能力会议','82','AI 处理中','会议意向'],
    ['Siti Hana','GreenCup Distribution','马来西亚 · 创始人','对应用配方视频感兴趣，希望申请样品','76','等待客户','样品申请'],
  ];
  const q = inquiries[selected];
  return <>
    <div className="live-page-header"><button onClick={()=>go('inquiries')}>← 返回客户经营总览</button><div><span className="live-entry-dot"/><strong>客户工作现场</strong><small>Agent 正在处理 5 个流程 · 实时更新</small></div><Tabs items={['询盘回复','商机跟进']} active="询盘回复" setActive={(next)=>{if(next==='商机跟进') go('customers')}}/></div>
    <CustomerJourney active="询盘接待"/>
    <div className="inquiry-toolbar"><div><button className="active">待首次响应 <b>12</b></button><button>跟进中 <b>16</b></button><button>待人工接管 <b>3</b></button><button>已关闭</button></div><p><span/> 3 条高意向询盘将在 30 分钟内超时</p></div>
    <div className="conversation-workbench">
      <aside className="inquiry-list"><div className="list-search">搜索会话、企业或采购需求</div><div className="queue-filter"><button className="active">优先级</button><button>最新</button><button>负责人⌄</button></div>{inquiries.map((item,i)=><button key={item[0]} className={selected===i?'active':''} onClick={()=>setSelected(i)}><span className="contact-avatar">{item[0].slice(0,1)}</span><span><strong>{item[0]} <em>{item[4]}</em></strong><small>{item[1]} · {item[2]}</small><p>{item[3]}</p><span className={`conversation-state s${i}`}>{item[5]} · {item[6]}</span></span></button>)}</aside>
      <section className="conversation"><header><div><strong>{q[0]} <em className="channel-tag">WA</em></strong><small>{q[1]} · {q[2]}</small></div><div className="conversation-actions"><button>历史记录</button><button>查看来源内容</button></div></header><div className="messages"><p className="system-msg">来自 LinkedIn · 工厂品质视频 · 今天 10:42</p><div className="action-event"><span>AI</span><p><strong>已识别企业和采购意图</strong><small>食品原料进口商 · 500kg 测试采购 · 置信度 91%</small></p><button>查看依据</button></div><div className="bubble inbound">Hi, we are looking for a stable matcha supplier for our beverage clients. Could you share the specifications, sample options and a quote for 500kg?</div><div className="translation"><span>译</span><p>我们正在为饮品客户寻找稳定的抹茶供应商，希望获取规格、样品方案以及 500kg 报价。</p><button>显示原文</button></div><div className="action-event knowledge"><span>知</span><p><strong>已调用企业知识库</strong><small>英文产品规格书 · 样品政策 · 出口认证资料</small></p><button>3 个来源</button></div><div className="bubble outbound draft"><span>AI 回复草稿 · 尚未发送</span>Hi Adrian, thank you for reaching out. I can share our export specification and sample options. Before preparing the right quote, may I confirm your required grade and target application?<div className="draft-actions"><button>重新生成</button><button>编辑</button><button>批准发送</button></div></div></div><footer><button className="attach">＋</button><input aria-label="回复询盘" placeholder="输入回复，或采用 AI 草稿…"/><button>发送</button></footer></section>
      <aside className="customer-intelligence"><header><div><strong>客户洞察</strong><small>AI 提取 · 2 分钟前更新</small></div><span>91 高意向</span></header><div className="intelligence-tabs">{['资格判断','证据与记忆','接管与权限'].map(x=><button key={x} className={detailTab===x?'active':''} onClick={()=>setDetailTab(x)}>{x}</button>)}</div>{detailTab==='资格判断'?<QualificationPanel go={go}/>:detailTab==='证据与记忆'?<EvidenceMemory/>:<HandoffPanel/>}</aside>
    </div>
  </>;
}

function QualificationPanel({ go }: { go: (view: View) => void }) {
  return <div className="intelligence-body"><section className="company-match"><div><span>LI</span><p><strong>Lumi Ingredients</strong><small>食品原料进口商 · 马来西亚</small></p></div><button>企业档案 ›</button></section><div className="intent-tags"><span>500kg 测试采购</span><span>索取样品</span><span>需要报价</span></div><section className="score-card"><header><strong>BANT / SPIN 资格评分</strong><b>78 / 100</b></header>{[['需求 Need','明确','100%'],['时间 Timeline','30 天内','82%'],['决策 Authority','采购经理','75%'],['预算 Budget','待确认','40%']].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong><i><em style={{width:x[2]}}/></i></div>)}</section><section className="evidence-quote"><header><strong>关键判断依据</strong><button>查看全部 4 条</button></header><blockquote>“Could you share the specifications, sample options and a quote for <b>500kg</b>?”</blockquote><small>支持判断：采购量明确 · 报价意图 · 样品需求</small></section><section className="missing-fields"><strong>还需确认</strong><span>目标等级</span><span>预算范围</span><span>认证要求</span></section><button className="create-opportunity" onClick={()=>go('customers')}>确认合格并创建商机</button></div>;
}

function EvidenceMemory() {
  return <div className="intelligence-body"><section className="memory-summary"><strong>客户记忆摘要</strong><p>该客户服务马来西亚连锁饮品品牌，关注批次稳定性与清真认证。此前下载英文规格书 3 次，尚未提供目标价。</p></section><section className="evidence-list"><strong>知识与证据</strong>{[['产品规格书 v3.2','支持等级与检测参数','已引用'],['样品政策 2026','支持标准样品流程','已引用'],['渠道授权政策','涉及区域承诺','禁止自动发送']].map(x=><button key={x[0]}><span><strong>{x[0]}</strong><small>{x[1]}</small></span><em>{x[2]}</em></button>)}</section><section className="history-strip"><strong>历史互动</strong><p><i/> 今天 · 询问 500kg 报价</p><p><i/> 8月27日 · 查看英文规格书</p><p><i/> 8月24日 · 来自 LinkedIn 内容互动</p></section></div>;
}

function HandoffPanel() {
  return <div className="intelligence-body"><section className="boundary-card"><header><strong>自动回复边界</strong><span>已触发</span></header>{[['产品规格与认证','可自动回复','safe'],['标准样品政策','可自动发送','safe'],['价格与交期','必须人工确认','risk'],['区域独家代理','禁止自动承诺','risk']].map(x=><div key={x[0]}><span>{x[0]}</span><em className={x[2]}>{x[1]}</em></div>)}</section><section className="handoff-package"><strong>人工接管包已就绪</strong><p>已包含客户摘要、原始证据、AI 已执行动作、缺失信息、知识来源与推荐回复。</p><dl><dt>升级原因</dt><dd>客户提出正式报价</dd><dt>建议负责人</dt><dd>海外业务部 · 王宁</dd><dt>响应时限</dt><dd>剩余 18 分钟</dd></dl></section><button className="handoff-primary">接管并继续回复</button><button className="handoff-secondary">批准本次 AI 回复</button><small className="handoff-note">接管后 AI 将停止对外发送，仍可协助生成草稿。</small></div>;
}

function CustomersPage({ go }: { go: (view: View) => void }) {
  const [tab, setTab] = useState('客户列表');
  const tabs = ['客户列表','商机看板','跟进任务','报价订单','转化归因'];
  return <>
    <div className="live-page-header"><button onClick={()=>go('inquiries')}>← 返回客户经营总览</button><div><span className="live-entry-dot"/><strong>客户工作现场</strong><small>查看 Agent 如何推进线索、商机与成交</small></div><Tabs items={['询盘回复','商机跟进']} active="商机跟进" setActive={(next)=>{if(next==='询盘回复') go('customerLive')}}/></div>
    <Tabs items={tabs} active={tab} setActive={setTab}/>
    <CustomerJourney active={tab === '客户列表' ? '资格确认' : tab === '商机看板' || tab === '跟进任务' ? '商机推进' : tab === '报价订单' ? '报价协同' : '成交复盘'}/>
    <div className="two-col-wide"><section className="panel table-panel"><div className="panel-title"><div><h2>{tab}</h2><p>当前项目 · 贵州抹茶东南亚渠道增长</p></div><button>筛选⌄</button></div>
      {tab === '商机看板' ? <DealBoard/> : tab === '跟进任务' ? <FollowupWorkbench/> : tab === '报价订单' ? <QuoteWorkbench/> : tab === '转化归因' ? <Attribution/> : <CustomerQualification/>}
    </section><AgentNote agent="成交推进 Agent" action={tab === '报价订单' ? '打开报价草稿' : '生成下一步任务'}><h3>Lumi Ingredients · 报价阶段</h3><div className="impact"><span><b>¥68万</b> 商机金额</span><span><b>65%</b> 成交概率</span></div><p>对方已确认首批采购量，但尚未确认区域授权条件。建议今天发送阶梯报价、区域说明和市场支持计划。</p><small className="risk-note">风险：清真认证文件仍待补充</small></AgentNote></div>
  </>;
}

function CustomerJourney({ active }: { active: string }) {
  const stages = [['询盘接待','32','响应与识别'],['资格确认','11','需求与匹配'],['商机推进','21','任务与里程碑'],['报价协同','8','成本与审批'],['成交复盘','3','订单与归因']];
  const activeIndex = Math.max(0, stages.findIndex(x=>x[0]===active));
  return <section className="customer-journey"><div className="journey-label"><span>客户转化工作流</span><strong>从首次响应到成交</strong></div>{stages.map((stage,i)=><div key={stage[0]} className={i===activeIndex?'active':i<activeIndex?'done':''}><i>{i<activeIndex?'✓':i+1}</i><span><strong>{stage[0]}</strong><small>{stage[2]}</small></span><b>{stage[1]}</b>{i<stages.length-1&&<em>→</em>}</div>)}</section>;
}

function CustomerQualification() {
  return <div className="qualification"><div className="qualification-list">{[['Lumi Ingredients','91','报价准备','资料完整'],['Maya Food Distribution','86','资格确认','缺采购预算'],['Pacific Beverage SG','82','会议准备','缺决策链'],['GreenCup Distribution','76','样品测试','待签收']].map((x,i)=><button key={x[0]} className={i===0?'active':''}><span className="contact-avatar">{x[0][0]}</span><span><strong>{x[0]}</strong><small>{x[2]} · {x[3]}</small></span><b>{x[1]}</b></button>)}</div><article><header><div><small>马来西亚 · 食品原料进口商</small><h3>Lumi Ingredients</h3></div><button>查看完整档案</button></header><div className="qualification-grid">{[['采购需求','500kg 首批测试'],['应用场景','连锁饮品客户'],['目标时间','9 月完成样品'],['决策角色','采购经理＋创始人'],['认证要求','Halal / SGS'],['负责人','王宁']].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</div><div className="qualification-check"><strong>资格确认清单</strong><label><input type="checkbox" defaultChecked/> 企业与联系人真实性已确认</label><label><input type="checkbox" defaultChecked/> 需求和应用场景明确</label><label><input type="checkbox"/> 预算范围待确认</label><label><input type="checkbox"/> 决策流程待补充</label></div><footer><button>标记无效</button><button className="primary">确认合格并创建商机</button></footer></article></div>;
}

function FollowupWorkbench() {
  return <div className="followup-workbench"><div className="today-agenda"><header><strong>今天 · 8月29日</strong><span>5 项</span></header>{[['14:00','Lumi Ingredients','确认认证与区域政策','高'],['16:30','GreenCup Distribution','跟进样品签收','中'],['17:30','Pacific Beverage SG','发送会议议程','高']].map((x,i)=><button key={x[1]} className={i===0?'active':''}><time>{x[0]}</time><span><strong>{x[1]}</strong><small>{x[2]}</small></span><em>{x[3]}</em></button>)}</div><article><header><div><small>Lumi Ingredients · 报价阶段</small><h3>确认认证与区域政策</h3></div><span>今天 14:00</span></header><div className="activity-timeline"><p><i/> <strong>8月28日</strong> 客户确认首批采购量为 500kg</p><p><i/> <strong>8月26日</strong> 英文规格书已查看 3 次</p><p><i/> <strong>8月24日</strong> 样品已签收</p></div><textarea aria-label="跟进记录" placeholder="记录沟通结果、客户异议或下一步承诺…"/><footer><button>稍后提醒</button><button>标记完成并创建下一步</button></footer></article></div>;
}

function QuoteWorkbench() {
  return <div className="quote-workbench"><aside>{[['QT-202608-014','Pacific Beverage','待审批'],['QT-202608-012','GreenCup','已发送'],['SO-202608-003','Lumi Ingredients','已确认']].map((x,i)=><button key={x[0]} className={i===0?'active':''}><span><strong>{x[0]}</strong><small>{x[1]}</small></span><em>{x[2]}</em></button>)}</aside><article><header><div><small>报价草稿 · Pacific Beverage SG</small><h3>2,000kg 食品级抹茶年度框架报价</h3></div><span>待销售总监审批</span></header><div className="quote-lines"><div className="head"><span>产品</span><span>数量</span><span>单价</span><span>小计</span></div><div><strong>食品级抹茶 M-02</strong><span>2,000kg</span><span>¥ 510/kg</span><b>¥ 102万</b></div><div><strong>出口包装与文件</strong><span>1 项</span><span>¥ 8万</span><b>¥ 8万</b></div></div><div className="quote-total"><span>报价总额</span><strong>¥ 110万</strong><small>毛利率 31.6% · 有效期 15 天</small></div><footer><button>退回修改</button><button className="primary">批准并发送</button></footer></article></div>;
}

function RevenuePage() {
  const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);
  const [model,setModel]=useState('线性归因');
  return <>
    <PageHeader title="收入归因" desc="区分数字员工自主增长、人工协同增长与自然／纯人工增长。" secondary="导出归因报告" onSecondary={()=>setDialog({title:'导出归因报告',desc:`将按${model}生成收入、商机及完整证据链报告，包含当前筛选范围和归因口径。`})}/>
    <div className="stat-grid four"><Metric label="数字员工自主增长" value="¥68万" change="18%"/><Metric label="人工＋AI 协同增长" value="¥168万" change="44%"/><Metric label="自然／纯人工增长" value="¥146万" change="38%"/><Metric label="可归因商机" value="¥486万" change="完整率 92%"/></div>
    <section className="panel"><div className="panel-title"><div><h2>转化证据链</h2><p>从经营任务、执行来源和客户触点追溯到商业结果</p></div><button onClick={()=>{const next=model==='线性归因'?'最终触点归因':model==='最终触点归因'?'首次触点归因':'线性归因';setModel(next);setDialog({title:'归因模型已切换',desc:`当前采用${next}，收入贡献和证据链口径已重新计算。`})}}>{model}⌄</button></div><Attribution/></section>
    {dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} confirm="完成" onClose={()=>setDialog(null)}/>}
  </>;
}

function DealBoard(){const columns: Array<[string,string[]]>=[['合格线索',['Maya Food','Nusa Ingredients']],['样品／会议',['GreenCup','Pacific Beverage']],['报价',['Lumi Ingredients','TeaWorks MY']],['商务谈判',['Golden Leaf']],['成交',['Lumi Ingredients · SO-003']]];return <div className="deal-board">{columns.map(([stage,customers])=><div key={stage}><strong>{stage} <em>{customers.length}</em></strong>{customers.map(customer=><button key={customer}><span>{customer}</span><small>¥ 42—110万</small></button>)}</div>)}</div>}

function Attribution(){return <div className="attribution"><div><span>首次触点</span><b>LinkedIn 工厂品质视频</b><small>8月18日 · 自然触达</small></div><i>→</i><div><span>内容承接</span><b>英文规格书落地页</b><small>访问 3 次 · 下载 1 次</small></div><i>→</i><div><span>询盘</span><b>WhatsApp 样品咨询</b><small>8月20日 · 高意向</small></div><i>→</i><div><span>订单</span><b>SO-202608-003</b><small>成交 ¥68万</small></div></div>}

function OrganizationPage({ view }: { view: View }) {
  const [permissionTab, setPermissionTab] = useState(view === 'accounts' ? '账号连接' : '权限管理');
  const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);
  const configs: Record<View, {desc:string; metrics:string[][]}> = {
    structure:{desc:'管理组织归属、跨部门项目团队、外部协作与责任权限。',metrics:[['运行中项目','8'],['跨部门项目','5'],['外部协作团队','3'],['待补责任岗位','2']]},
    permissions:{desc:'管理角色、数据范围、审批流程与 Agent 行动边界。',metrics:[['预置角色','8'],['权限策略','36'],['审批流程','9'],['异常权限','1']]},
    accounts:{desc:'统一管理登录账号、社媒账号、广告账户和沟通渠道。',metrics:[['平台连接','31'],['正常','28'],['即将过期','2'],['待验证','1']]},
    data:{desc:'管理数据源、字段映射、质量、导入导出和保留策略。',metrics:[['数据完整率','96.8%'],['数据源','18'],['待匹配询盘','14'],['同步异常','2']]},
    security:{desc:'配置登录安全、自动化边界、审计日志和 API。',metrics:[['安全评分','92'],['MFA 覆盖','86%'],['今日审计事件','248'],['高风险动作','0']]},
    home:{desc:'',metrics:[]},projects:{desc:'',metrics:[]},content:{desc:'',metrics:[]},traffic:{desc:'',metrics:[]},inquiries:{desc:'',metrics:[]},customerLive:{desc:'',metrics:[]},customers:{desc:'',metrics:[]},
  };
  const item=configs[view];
  const mergedPermissionPage = view === 'permissions' || view === 'accounts';
  return <><PageHeader title={mergedPermissionPage ? '权限与账号' : viewNames[view]} desc={mergedPermissionPage ? '统一管理成员权限、数字员工行动边界和平台账号连接。' : item.desc} action={view==='structure'?'新建组织节点':undefined} onAction={()=>setDialog({title:'新建组织节点',desc:'创建事业部、品牌或职能团队，并设置负责人、成员和默认项目权限。'})}/>{mergedPermissionPage && <Tabs items={['权限管理','账号连接']} active={permissionTab} setActive={setPermissionTab}/>}<div className="stat-grid four">{item.metrics.map(m=><Metric key={m[0]} label={m[0]} value={m[1]}/>)}</div><section className="panel org-panel">{view==='structure'?<OrgTree/>:mergedPermissionPage?(permissionTab === '权限管理'?<PermissionMatrix/>:<AccountGrid/>):view==='data'?<DataManagement/>:<SecurityPage/>}</section>{dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} confirm="创建" onClose={()=>setDialog(null)}/>}</>;
}

type OrgView = '组织结构' | '项目团队' | '外部协作' | '权限影响';

const orgViewData: Record<OrgView, { title:string; subtitle:string; items:Array<{name:string; meta:string; tag:string; tone?:string}> }> = {
  组织结构:{title:'黔山国际产业集团',subtitle:'稳定的行政与品牌归属',items:[
    {name:'国际增长中心',meta:'18 人 · 4 个项目',tag:'中心'},
    {name:'茶与食品事业部',meta:'32 人 · 3 个项目',tag:'事业部'},
    {name:'黔绿方舟',meta:'16 人 · 2 个项目',tag:'品牌'},
    {name:'山王果',meta:'11 人 · 1 个项目',tag:'品牌'},
    {name:'工业品事业部',meta:'21 人 · 2 个项目',tag:'事业部'},
    {name:'黔轮制造',meta:'13 人 · 2 个项目',tag:'品牌'},
  ]},
  项目团队:{title:'跨部门增长项目',subtitle:'围绕经营任务动态组队',items:[
    {name:'马来西亚抹茶渠道增长',meta:'8 人 · 审批模式',tag:'进行中'},
    {name:'泰国刺梨经销商招募',meta:'6 人 · 自主模式',tag:'进行中'},
    {name:'中东轮胎目标账户开发',meta:'11 人 · 审批模式',tag:'有风险',tone:'warn'},
    {name:'新加坡品牌茶验证',meta:'5 人 · 建议模式',tag:'准备中'},
  ]},
  外部协作:{title:'合作机构与服务团队',subtitle:'按项目授权，默认数据隔离',items:[
    {name:'贵州广电国际传播中心',meta:'内容制作 · 海外分发',tag:'合作中'},
    {name:'SEA Growth Partners',meta:'马来西亚 · 渠道顾问',tag:'合作中'},
    {name:'LinguaBridge 本地化',meta:'翻译 · 文化审核',tag:'7天到期',tone:'warn'},
  ]},
  权限影响:{title:'成员与责任岗位',subtitle:'检查实际可见范围与动作边界',items:[
    {name:'陈妍',meta:'事业部负责人 · 5 个项目',tag:'组织角色'},
    {name:'王宁',meta:'项目负责人 · 马来西亚',tag:'项目角色'},
    {name:'周岚',meta:'海外销售 · 2 个项目',tag:'项目角色'},
    {name:'贵州广电项目组',meta:'外部内容协作 · 1 个项目',tag:'临时授权',tone:'warn'},
  ]},
};

function OrgTree(){
  const [activeView,setActiveView]=useState<OrgView>('组织结构');
  const [selected,setSelected]=useState(1);
  const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);
  const current=orgViewData[activeView];
  const selectView=(view:OrgView)=>{setActiveView(view);setSelected(view==='组织结构'?1:0)};
  const handleAction=(e:React.MouseEvent<HTMLDivElement>)=>{const button=(e.target as HTMLElement).closest('button');if(!button)return;const label=button.textContent?.trim()||'';if(label==='•••')setDialog({title:'组织更多操作',desc:'可导入组织成员、调整层级、停用节点或导出当前组织视图。'});else if(label.startsWith('＋ 新建'))setDialog({title:label.replace('＋ ',''),desc:'填写名称、负责人、授权范围和有效期后即可创建。'});else if(['查看审计记录','编辑配置','查看全部项目','调整团队','调整边界'].some(x=>label.startsWith(x)))setDialog({title:label.replace(' →',''),desc:'相关配置与历史记录已载入。确认后可继续完成调整，所有变更均会写入审计日志。'});};
  return <div className="org-workspace" onClick={handleAction}>
    <div className="org-view-tabs">{(['组织结构','项目团队','外部协作','权限影响'] as OrgView[]).map((view,i)=><button key={view} className={activeView===view?'active':''} onClick={()=>selectView(view)}><span>{['组','项','协','权'][i]}</span><strong>{view}</strong>{view==='权限影响'&&<em>2</em>}</button>)}</div>
    <div className="org-layout">
      <aside className="org-tree">
        <div className="org-tree-heading"><div><h3>{current.title}</h3><p>{current.subtitle}</p></div><button aria-label="更多操作">•••</button></div>
        <div className="org-search">⌕　搜索组织、项目或成员</div>
        <div className="org-tree-list">{current.items.map((item,i)=><button className={`${selected===i?'active':''} ${i>1&&activeView==='组织结构'?'child':''}`} onClick={()=>setSelected(i)} key={item.name}><span><i>{item.tag.slice(0,1)}</i><span><strong>{item.name}</strong><small>{item.meta}</small></span></span><em className={item.tone}>{item.tag}</em></button>)}</div>
        <button className="org-add">＋ 新建{activeView==='组织结构'?'组织节点':activeView==='项目团队'?'项目团队':activeView==='外部协作'?'合作关系':'成员授权'}</button>
      </aside>
      <OrgDetail view={activeView} selected={selected}/>
    </div>{dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} confirm="继续" onClose={()=>setDialog(null)}/>}
  </div>
}

function OrgDetail({view,selected}:{view:OrgView;selected:number}){
  if(view==='项目团队') return <ProjectTeamDetail compact={selected!==0}/>;
  if(view==='外部协作') return <PartnerDetail expiring={selected===2}/>;
  if(view==='权限影响') return <PermissionImpact external={selected===3}/>;
  return <BusinessUnitDetail brand={selected>1}/>;
}

function DetailHeader({tag,title,desc,actions=true}:{tag:string;title:string;desc:string;actions?:boolean}){return <div className="org-detail-header"><div><span>{tag}</span><h2>{title}</h2><p>{desc}</p></div>{actions&&<div><button>查看审计记录</button><button className="primary-lite">编辑配置</button></div>}</div>}

function BusinessUnitDetail({brand}:{brand:boolean}){return <main className="org-detail"><DetailHeader tag={brand?'品牌':'事业部'} title={brand?'黔绿方舟':'茶与食品事业部'} desc={brand?'面向东南亚市场的贵州茶品牌，归属茶与食品事业部。':'负责茶、刺梨与特色食品品牌的国内外增长项目。'}/><div className="org-summary-grid"><Summary label="负责人" value={brand?'刘蓁':'陈妍'} note={brand?'品牌负责人':'事业部总经理'}/><Summary label="成员" value={brand?'16 人':'32 人'} note="跨 4 个职能"/><Summary label="运行项目" value={brand?'2':'3'} note="本月新增 1 个"/><Summary label="待处理" value="2" note="缺少业务接管人" warn/></div><section className="org-section"><SectionTitle title="经营范围与项目" note="行政归属不等于项目权限，具体范围由项目配置" action="查看全部项目"/><div className="project-cards"><ProjectCard title="马来西亚抹茶渠道增长" market="马来西亚 · 渠道型 B2B" status="正常运行" people="8 人协作"/><ProjectCard title="泰国刺梨经销商招募" market="泰国 · 渠道验证" status="待补岗位" people="6 人协作" warn/></div></section><section className="org-section"><SectionTitle title="默认责任与权限" note="新项目可继承，项目负责人可申请覆盖"/><div className="responsibility-row"><span><i>任</i><b>项目负责人</b><small>经营目标、预算和异常接管</small></span><strong>王宁</strong><em>已配置</em></div><div className="responsibility-row"><span><i>审</i><b>品牌审核人</b><small>产品事实、认证与品牌表达</small></span><strong>刘蓁</strong><em>已配置</em></div><div className="responsibility-row attention"><span><i>销</i><b>高价值商机接管</b><small>报价、独家代理与商务承诺</small></span><strong>未指定</strong><em>需补充</em></div></section></main>}

function ProjectTeamDetail({compact}:{compact:boolean}){return <main className="org-detail"><DetailHeader tag="跨部门项目团队" title={compact?'中东轮胎目标账户开发':'马来西亚抹茶渠道增长'} desc="团队随经营任务组建，成员权限仅在本项目与授权周期内有效。"/><div className="team-context"><span><small>所属组织</small><strong>茶与食品事业部 / 黔绿方舟</strong></span><span><small>运行模式</small><strong>审批模式</strong></span><span><small>授权周期</small><strong>2026.08.01—11.30</strong></span><span><small>数字员工</small><strong>6 位运行中</strong></span></div><section className="org-section"><SectionTitle title="项目责任链" note="关键岗位缺失时，相关动作不会自动执行" action="调整团队"/><div className="team-role-grid">{[['王宁','项目负责人','目标、预算与异常'],['刘蓁','品牌审核','事实、认证与表达'],['周岚','海外销售','询盘、报价与谈判'],['何嘉','技术质量','规格与检测文件'],['贵州广电项目组','外部内容协作','制作、译制与分发'],['待指定','销售总监','折扣与独家代理']].map((x,i)=><div className={i===5?'missing':''} key={x[1]}><i>{x[0].slice(0,1)}</i><span><strong>{x[0]}</strong><b>{x[1]}</b><small>{x[2]}</small></span>{i===5&&<em>缺口</em>}</div>)}</div></section><section className="org-section"><SectionTitle title="协作与审批链" note="普通动作自动流转，越界动作准确交给责任人"/><div className="approval-flow"><span><i>AI</i><b>内容生产</b><small>数字员工</small></span><em>→</em><span><i>品</i><b>事实与品牌审核</b><small>刘蓁</small></span><em>→</em><span><i>发</i><b>发布与小额投流</b><small>自动执行</small></span><em>→</em><span className="risk"><i>商</i><b>报价／代理承诺</b><small>人工接管</small></span></div></section></main>}

function PartnerDetail({expiring}:{expiring:boolean}){return <main className="org-detail"><DetailHeader tag="外部合作机构" title={expiring?'LinguaBridge 本地化':'贵州广电国际传播中心'} desc="外部协作按项目授权，不进入企业行政组织，默认隔离客户与商业数据。"/><div className="boundary-banner"><span>隔离边界</span><strong>仅可访问指定项目的内容、素材与排期；不可查看客户报价、毛利及其他品牌数据。</strong><button>调整边界</button></div><section className="org-section"><SectionTitle title="合作范围" note="权限来自项目合同与临时授权"/><div className="scope-grid"><Summary label="合作项目" value="1 个" note="马来西亚抹茶增长"/><Summary label="外部成员" value="5 人" note="均已开启 MFA"/><Summary label="授权有效期" value={expiring?'剩余 7 天':'92 天'} note="到期自动回收" warn={expiring}/></div></section><section className="org-section"><SectionTitle title="可执行动作" note="字段级数据脱敏已开启"/><div className="action-chips"><span className="allowed">✓ 创建与编辑内容</span><span className="allowed">✓ 提交品牌审核</span><span className="allowed">✓ 管理指定海外账号排期</span><span className="review">审批　正式发布</span><span className="denied">— 客户与询盘</span><span className="denied">— 报价、成本与毛利</span></div></section></main>}

function PermissionImpact({external}:{external:boolean}){return <main className="org-detail"><DetailHeader tag={external?'外部协作者':'成员权限画像'} title={external?'贵州广电项目组':'陈妍'} desc="汇总组织角色、项目角色与临时授权产生的实际权限。"/><div className="permission-formula"><span>实际权限</span><b>角色权限</b><i>×</i><b>数据范围</b><i>×</i><b>动作风险</b><i>×</i><b>项目上下文</b></div><section className="org-section"><SectionTitle title="权限来源" note="冲突时执行更严格的限制"/><div className="permission-source"><span><i>组</i><b>事业部负责人</b><small>茶与食品事业部 · 长期</small></span><em>组织角色</em><strong>管理事业部品牌与项目</strong></div><div className="permission-source"><span><i>项</i><b>项目经营审批人</b><small>马来西亚、泰国项目 · 至 11月30日</small></span><em>项目角色</em><strong>目标、预算和异常审批</strong></div><div className="permission-source muted"><span><i>临</i><b>中东轮胎项目观察者</b><small>仅看汇总数据 · 至 9月15日</small></span><em>临时授权</em><strong>只读</strong></div></section><section className="org-section"><SectionTitle title="高风险动作影响" note="数字员工越界后将按此责任链路由"/><div className="impact-table"><div><span>预算单次上调 ＞10%</span><b>需要本人审批</b><em>2 项待处理</em></div><div><span>产品事实／认证变更</span><b>品牌审核人审批</b><em>正常</em></div><div><span>报价、折扣与独家代理</span><b>销售总监审批</b><em className="danger">责任人缺失</em></div></div></section></main>}

function Summary({label,value,note,warn}:{label:string;value:string;note:string;warn?:boolean}){return <div className={warn?'summary-warn':''}><span>{label}</span><b>{value}</b><small>{note}</small></div>}
function SectionTitle({title,note,action}:{title:string;note:string;action?:string}){return <div className="org-section-title"><div><h3>{title}</h3><p>{note}</p></div>{action&&<button>{action} →</button>}</div>}
function ProjectCard({title,market,status,people,warn}:{title:string;market:string;status:string;people:string;warn?:boolean}){return <button><span><i className={warn?'amber':''}>项</i><span><strong>{title}</strong><small>{market}</small></span></span><span><b>{people}</b><em className={warn?'warn':''}>{status}</em></span></button>}

function PermissionMatrix(){const roles=['集团管理员','事业部负责人','项目负责人','内容运营','内容审核','投流人员','海外销售','外部协作者']; const [open,setOpen]=useState(false); return <div><div className="panel-title"><div><h2>角色与权限矩阵</h2><p>同时控制功能动作和组织／品牌／项目数据范围</p></div><button onClick={()=>setOpen(true)}>编辑权限</button></div><div className="permission-table"><div className="ptr head"><span>角色</span>{['项目','内容','投流','询盘','报价订单','Agent'].map(x=><span key={x}>{x}</span>)}</div>{roles.map((r,i)=><div className="ptr" key={r}><strong>{r}</strong>{[0,1,2,3,4,5].map(j=><span key={j} className={(i+j)%4===0?'limited':''}>{(i+j)%4===0?'审批':i===7&&j>2?'—':'✓'}</span>)}</div>)}</div>{open&&<ActionDialog title="编辑角色权限" desc="调整功能动作、数据范围和 Agent 行动边界。高风险权限变更提交后需要管理员复核。" confirm="保存草稿" onClose={()=>setOpen(false)}/>}</div>}

const accountGroups = [
  {title:'广告投流账户',desc:'管理广告费、Campaign 与转化追踪',tone:'blue',accounts:[
    {name:'Google Ads',icon:'G',count:'3',status:'正常'}, {name:'Meta Ads',icon:'M',count:'5',status:'1 个即将过期'}, {name:'TikTok Ads',icon:'TK',count:'2',status:'正常'},
  ]},
  {title:'社媒运营账户',desc:'用于内容发布、排期和互动管理',tone:'violet',accounts:[
    {name:'TikTok',icon:'TK',count:'4',status:'正常'}, {name:'Instagram',icon:'IG',count:'5',status:'正常'}, {name:'Facebook',icon:'f',count:'4',status:'正常'}, {name:'YouTube',icon:'YT',count:'3',status:'正常'},
  ]},
  {title:'其他社交与沟通',desc:'用于客户触达、私域沟通和社群运营',tone:'green',accounts:[
    {name:'LinkedIn',icon:'in',count:'2',status:'正常'}, {name:'WhatsApp Business',icon:'WA',count:'2',status:'正常'}, {name:'Telegram',icon:'TG',count:'1',status:'1 个待验证'},
  ]},
];

function AccountGrid(){
  const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);
  return <div className="account-center"><div className="panel-title"><div><h2>平台与账号连接</h2><p>按业务用途分类管理，分开配置投放、发布与沟通权限</p></div><button onClick={()=>setDialog({title:'连接新账号',desc:'先选择账号类型与平台，再设置归属组织、可用项目、授权范围和可执行动作。'})}>连接新账号</button></div><div className="account-groups">{accountGroups.map(group=><section className={`account-group ${group.tone}`} key={group.title}><header><span className="account-group-icon">{group.title.slice(0,1)}</span><div><h3>{group.title}</h3><p>{group.desc}</p></div><b>{group.accounts.reduce((sum,a)=>sum+Number(a.count),0)} 个</b></header><div className="account-grid">{group.accounts.map(a=><button key={a.name} onClick={()=>setDialog({title:`${a.name} 账号详情`,desc:`已连接 ${a.count} 个账号，状态：${a.status}。可继续检查账号归属、项目范围、授权动作或刷新凭证。`})}><span className="platform-icon">{a.icon}</span><span><strong>{a.name}</strong><small>{a.count} 个账号</small></span><em className={a.status==='正常'?'good':'warn'}>{a.status}</em></button>)}</div></section>)}</div>{dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} confirm="继续" onClose={()=>setDialog(null)}/>}</div>
}

function DataManagement(){const [syncing,setSyncing]=useState(false);const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);const rows=[['客户重复记录','27','建议合并'],['待匹配询盘','14','需要确认'],['异常渠道数据','2','正在重试'],['最近同步',syncing?'刚刚':'3 分钟前',syncing?'18 个数据源同步完成':'全部数据源']];return <div><div className="panel-title"><div><h2>数据质量</h2><p>数据源、字段映射、导入导出和保留策略</p></div><button onClick={()=>{setSyncing(true);setDialog({title:'数据同步完成',desc:'18 个数据源已完成增量同步，新增 36 条记录；2 条异常渠道数据仍在自动重试。'})}}>{syncing?'同步完成 ✓':'立即同步'}</button></div><div className="data-health"><div className="health-score"><b>96.8%</b><span>整体完整率</span></div>{rows.map(x=><button key={x[0]} onClick={()=>setDialog({title:x[0],desc:x[0]==='客户重复记录'?'发现 27 组疑似重复客户，可按邮箱、企业域名和电话核对后合并。':x[0]==='待匹配询盘'?'14 条询盘缺少明确客户归属，已按企业名称和域名生成候选匹配。':x[0]==='异常渠道数据'?'2 条渠道数据因字段格式异常正在重试，可查看原始记录并手动修正。':'最近一次同步覆盖全部 18 个数据源，可查看逐源耗时与增量记录。'})}><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></button>)}</div>{dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} confirm="查看详情" onClose={()=>setDialog(null)}/>}</div>}

type GovernanceKey = 'data' | 'agent' | 'approval' | 'deployment' | 'partner' | 'audit';

const governanceItems: Array<{key:GovernanceKey; icon:string; title:string; desc:string; metric:string; metricLabel:string; status:string; tone?:'warn'}> = [
  {key:'data',icon:'数',title:'数据主权',desc:'管理数据位置、跨境、训练使用、保留周期与脱敏策略。',metric:'18',metricLabel:'个受管数据源',status:'策略已启用'},
  {key:'agent',icon:'智',title:'Agent 权限',desc:'控制数字员工可读取的数据、可调用工具与可执行动作。',metric:'6',metricLabel:'位运行中',status:'1 项待检查',tone:'warn'},
  {key:'approval',icon:'审',title:'审批策略',desc:'配置发布、报价、订单与预算调整等高风险动作边界。',metric:'9',metricLabel:'条审批流程',status:'全部生效'},
  {key:'deployment',icon:'部',title:'部署与模型',desc:'管理云端、本地私有化、轻量边缘部署及模型运行位置。',metric:'3',metricLabel:'个运行节点',status:'运行正常'},
  {key:'partner',icon:'协',title:'外部合作方',desc:'管理产业方、服务商、第三方应用与 API 的授权范围。',metric:'12',metricLabel:'项有效授权',status:'2 项即将到期',tone:'warn'},
  {key:'audit',icon:'迹',title:'审计与合规',desc:'追溯数据访问、Agent 操作、人工审批与外部调用记录。',metric:'248',metricLabel:'条今日事件',status:'无高风险事件'},
];

function SecurityPage(){
  const [active,setActive]=useState<GovernanceKey | null>(null);
  return <div className="governance-center">
    <div className="panel-title governance-title"><div><h2>企业治理中心</h2><p>集中管理企业数据、Agent、审批、部署、合作方与审计边界</p></div><span>6 个治理域</span></div>
    <div className="governance-grid">{governanceItems.map(item=><button key={item.key} className={active===item.key?'governance-card active':'governance-card'} onClick={()=>setActive(item.key)}>
      <span className="governance-icon">{item.icon}</span>
      <span className="governance-copy"><span className="governance-card-head"><strong>{item.title}</strong><em className={item.tone}>{item.status}</em></span><small>{item.desc}</small></span>
      <span className="governance-card-foot"><span><b>{item.metric}</b><small>{item.metricLabel}</small></span><span className="governance-enter">进入管理 <i>→</i></span></span>
    </button>)}</div>
  </div>
}

export default function Home() {
  const [view, setView] = useState<View>('home');
  const [showGlobalRuns, setShowGlobalRuns] = useState(false);
  const [topDialog,setTopDialog]=useState<{title:string;desc:string}|null>(null);
  const go = (next: View) => setView(next);
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-logo">黔</span><div><strong>黔海</strong><small>Global Growth OS</small></div></div>
      <nav className="main-nav" aria-label="主导航">
        <button className={view==='home'?'nav-item active':'nav-item'} onClick={()=>go('home')}><span className="nav-mark">⌂</span><span>首页</span></button>
        <p className="nav-section nav-section-first">增长任务</p>
        <button className={view==='projects'||view==='agents'?'nav-item active':'nav-item'} onClick={()=>go('projects')}><span className="nav-mark">任</span><span>经营任务</span></button>
        <button className={view==='approvals'?'nav-item active':'nav-item'} onClick={()=>go('approvals')}><span className="nav-mark">审</span><span>审批与异常</span><b className="nav-badge">7</b></button>
        <p className="nav-section">内容与流量</p>
        <button className={view==='content'?'nav-item active':'nav-item'} onClick={()=>go('content')}><span className="nav-mark">创</span><span>内容与素材</span></button>
        <button className={view==='schedule'||view==='distribution'?'nav-item active':'nav-item'} onClick={()=>go('schedule')}><span className="nav-mark">排</span><span>排期与分发</span></button>
        <button className={view==='traffic'?'nav-item active':'nav-item'} onClick={()=>go('traffic')}><span className="nav-mark">投</span><span>广告投放</span></button>
        <p className="nav-section">客户管理</p>
        <button className={view==='inquiries'||view==='customerLive'||view==='customers'?'nav-item active':'nav-item'} onClick={()=>go('inquiries')}><span className="nav-mark">客</span><span>客户经营</span></button>
        <button className={view==='revenue'?'nav-item active':'nav-item'} onClick={()=>go('revenue')}><span className="nav-mark">收</span><span>收入归因</span></button>
        <p className="nav-section">平台管理</p>
        {([['structure','组织架构','组'],['permissions','权限管理','权'],['data','数据管理','数'],['security','系统与安全','安']] as [View,string,string][]).map(x=><button key={x[0]} className={view===x[0]?'nav-item active':'nav-item'} onClick={()=>go(x[0])}><span className="nav-mark">{x[2]}</span><span>{x[1]}</span></button>)}
      </nav>
      <div className="sidebar-footer"><div className="avatar">陈</div><div><strong>陈雨晴</strong><small>集团管理员</small></div><span>···</span></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><span className="crumb">黔山国际产业集团</span><button className="switcher" onClick={()=>setTopDialog({title:'切换组织',desc:'可切换至茶与食品事业部、轮胎事业部或跨部门项目团队。'})}>切换组织⌄</button></div><div className="top-actions"><button className="search" onClick={()=>setTopDialog({title:'全局搜索',desc:'可搜索经营项目、内容素材和客户，目前已索引 326 条业务记录。'})}>搜索项目、内容或客户</button><button className="global-live-button" onClick={()=>setShowGlobalRuns(true)}><i/> 进入生产现场 <b>8</b></button><button className="agent-status" onClick={()=>setTopDialog({title:'数字员工运行状态',desc:'6 位数字员工运行正常，今日完成 128 次自主动作，7 项等待审批。'})}>AI · 6 位运行中</button><button className="notice" onClick={()=>setTopDialog({title:'通知中心',desc:'3 条未读通知：2 项预算审批和 1 项账号授权即将到期。'})}>3</button></div></header>
      <div className="page">{view==='home'?<HomePage go={go}/>:view==='projects'?<ProjectsPage/>:view==='agents'?<AgentsPage/>:view==='approvals'?<ApprovalsPage/>:view==='content'?<ContentPage/>:view==='schedule'?<SchedulePage/>:view==='distribution'?<DistributionPage/>:view==='traffic'?<TrafficPage/>:view==='inquiries'?<CustomerOperationsPage go={go}/>:view==='customerLive'?<InquiriesPage go={go}/>:view==='customers'?<CustomersPage go={go}/>:view==='revenue'?<RevenuePage/>:<OrganizationPage view={view}/>}</div>
    </section>
    {showGlobalRuns && <GlobalAgentDesk onExit={()=>setShowGlobalRuns(false)}/>}
    {topDialog&&<ActionDialog title={topDialog.title} desc={topDialog.desc} confirm="知道了" onClose={()=>setTopDialog(null)}/>}
  </main>;
}

type LiveCustomer = { id:string; customer:string; company:string; market:string; channel:string; agent:string; action:string; detail:string; next:string; score:number; elapsed:string; kind:'reply'|'qualify'|'followup'|'quote'; attention?:boolean };

const liveCustomers:LiveCustomer[] = [
  {id:'adrian',customer:'Adrian Tan',company:'Lumi Ingredients',market:'马来西亚',channel:'WhatsApp',agent:'询盘接待 Agent',action:'正在组织 500kg 报价回复',detail:'已识别规格书、样品与报价意图',next:'确认目标应用与交付周期',score:91,elapsed:'01:24',kind:'reply'},
  {id:'aisyah',customer:'Nur Aisyah',company:'Maya Food Distribution',market:'马来西亚',channel:'邮件',agent:'资格判断 Agent',action:'正在评估独家代理资格',detail:'已补全渠道覆盖与首批采购量',next:'生成 BANT 评分与风险提示',score:86,elapsed:'03:08',kind:'qualify'},
  {id:'daniel',customer:'Daniel Lim',company:'Pacific Beverage SG',market:'新加坡',channel:'LinkedIn',agent:'成交推进 Agent',action:'正在安排下周产品会议',detail:'已匹配产品经理与技术顾问时间',next:'发送议程与日历邀请',score:82,elapsed:'00:46',kind:'followup'},
  {id:'hana',customer:'Siti Hana',company:'GreenCup Distribution',market:'马来西亚',channel:'WhatsApp',agent:'客户跟进 Agent',action:'正在跟进样品签收反馈',detail:'客户已签收 M-02 与 M-05 样品',next:'询问配方测试时间表',score:76,elapsed:'02:17',kind:'followup'},
  {id:'omar',customer:'Omar Farooq',company:'Gulf Pantry Trading',market:'阿联酋',channel:'邮件',agent:'报价协同 Agent',action:'正在生成 CIF Dubai 报价',detail:'已核对 1.2 吨试订单与包装规格',next:'等待销售总监确认折扣',score:89,elapsed:'04:31',kind:'quote',attention:true},
  {id:'mei',customer:'Mei Wong',company:'Nourish Lab HK',market:'中国香港',channel:'LinkedIn',agent:'需求洞察 Agent',action:'正在提取新品研发需求',detail:'关注低苦涩度、色泽与清洁标签',next:'匹配合适等级与应用案例',score:78,elapsed:'01:53',kind:'qualify'},
  {id:'anong',customer:'Anong S.',company:'Siam Tea Works',market:'泰国',channel:'WhatsApp',agent:'客户记忆 Agent',action:'正在整理历史沟通与偏好',detail:'已合并 4 轮对话与 3 份文档',next:'向成交推进 Agent 交付摘要',score:73,elapsed:'00:58',kind:'followup'},
  {id:'sarah',customer:'Sarah Collins',company:'Pure Origin Foods',market:'澳大利亚',channel:'邮件',agent:'询盘接待 Agent',action:'正在回复认证与溯源问题',detail:'已调用出口证书与批次质检记录',next:'附上证据并询问年度用量',score:84,elapsed:'02:42',kind:'reply'},
];

function GlobalAgentDesk({ onExit }: { onExit: () => void }) {
  const [filter,setFilter] = useState<'all'|'attention'>('all');
  const [compact,setCompact]=useState(false);
  const [activeCustomer,setActiveCustomer]=useState<LiveCustomer|null>(null);
  const shown = filter==='attention' ? liveCustomers.filter(item=>item.attention) : liveCustomers;
  return <div className={`global-agent-desk ${compact?'compact-desk':''}`}><header><div><span className="agent-spark">AI</span><p><strong>客户转化生产现场</strong><small>实时查看 Agent 的客户跟进与销售推进过程</small></p></div><div><span className="desk-live-count"><i/> 8 个现场运行中</span><button onClick={()=>setCompact(v=>!v)}>{compact?'标准排列':'自动排列'}</button><button onClick={onExit}>退出现场</button></div></header><div className="desk-toolbar"><div><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>全部现场 <b>8</b></button><button className={filter==='attention'?'active attention':''} onClick={()=>setFilter('attention')}>需人工介入 <b>1</b></button></div><span>画面自动更新 · 最同步于刚刚</span></div><main><div className="live-customer-grid">{shown.map(item=><LiveCustomerScreen key={item.id} item={item} onOpen={()=>setActiveCustomer(item)}/>)}</div></main>{activeCustomer&&<ActionDialog title={`${activeCustomer.customer} · 完整现场`} desc={`${activeCustomer.agent}正在处理“${activeCustomer.action}”。下一步：${activeCustomer.next}。`} confirm="进入客户详情" onClose={()=>setActiveCustomer(null)}/>}</div>;
}

function LiveCustomerScreen({item,onOpen}:{item:LiveCustomer;onOpen:()=>void}) {
  const steps = item.kind==='quote'?['需求确认','成本核算','报价审批','发送客户']:item.kind==='qualify'?['信息补全','需求判断','资格评分','转入商机']:['读取上下文','生成策略','执行跟进','记录结果'];
  return <article className={`live-customer-screen ${item.attention?'needs-attention':''}`}><header><div className="customer-avatar">{item.customer.slice(0,1)}</div><p><strong>{item.customer}</strong><small>{item.company} · {item.market}</small></p><span className="screen-channel">{item.channel}</span></header><div className="screen-agent"><span className="agent-spark">AI</span><p><strong>{item.agent}</strong><small><i/> 正在操作 · {item.elapsed}</small></p><b>{item.score}</b></div><div className="screen-workspace"><div className="screen-action"><span>当前动作</span><strong>{item.action}</strong><small>{item.detail}</small></div><div className="screen-steps">{steps.map((step,index)=><div key={step} className={index<2?'done':index===2?'active':''}><i>{index<2?'✓':index+1}</i><span>{step}</span></div>)}</div><div className="screen-chat"><span className="customer-line">{item.kind==='quote'?'请提供含运费的正式报价和交付时间。':'我们想进一步了解产品规格与合作方式。'}</span><span className="agent-line">Agent 正在根据客户记忆与企业资料生成下一步回复…</span></div></div><footer><span><i/> 实时更新</span><p><small>下一步</small><strong>{item.next}</strong></p><button aria-label={`打开 ${item.customer} 的完整现场`} onClick={onOpen}>打开 →</button></footer></article>;
}
