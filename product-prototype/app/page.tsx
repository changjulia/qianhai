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

function PageHeader({ title, desc, action, secondary }: { title: string; desc: string; action?: string; secondary?: string }) {
  return <div className="page-heading"><div><p className="eyebrow">黔海 · {title}</p><h1>{title}</h1><p>{desc}</p></div><div className="header-actions">{secondary && <button className="secondary">{secondary}</button>}{action && <button className="primary">＋ {action}</button>}</div></div>;
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
  const stats = [
    ['海外精准访问', '38,420', '+18.6%'], ['新增有效询盘', '186', '+24.1%'], ['活跃商机', '42', '+8.3%'], ['预计成交金额', '¥ 286万', '+31.5%'],
  ];
  return <>
    <PageHeader title="上午好，陈雨晴" desc="关注增长结果，处理今天最重要的工作。" action="新建增长项目" />
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
    </section>
  </>;
}

function ProjectsPage() {
  const [tab, setTab] = useState('项目列表');
  const tabs = ['项目列表', '执行动态', '市场策略', '目标预算', '执行计划', '项目价值'];
  return <>
    <PageHeader title="经营任务" desc="为数字员工配置目标、预算、自主等级和行动边界。" action="新建经营任务" secondary="任务模板" />
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
            ].map(row => <button className="tr" key={row[0]}>{row.map((cell, i) => <span key={i} className={i === 0 ? 'strong-cell' : ''}>{i === 7 ? <small className={cell === '正常' ? 'good' : 'warn'}>{cell}</small> : cell}</span>)}</button>)}
          </div>
        </section>
        <AgentNote agent="市场策略 Agent"><h3>抹茶项目优先扩大马来西亚</h3><p>渠道匹配度和询盘质量均高于新加坡；清真认证材料仍需在第二轮投放前补齐。</p><ul><li>优先客户：食品原料进口商</li><li>推荐路径：进口商 → 连锁饮品渠道</li><li>建议周期：90 天</li></ul></AgentNote>
      </div>
    </> : tab === '执行动态' ? <section className="panel"><div className="panel-title"><div><h2>数字员工执行动态</h2><p>围绕当前经营任务查看行动、依据、权限和待人工介入事项</p></div><button>查看行动账本</button></div><div className="agent-runtime-grid">{agents.map((agent,i)=><button key={agent.name}><span className={`agent-avatar ${agent.tone}`}>AI</span><span><strong>{agent.name.replace(' Agent','数字员工')}</strong><small>{agent.action}</small><em>{i<3?'自主执行':'审批模式'} · 贵州抹茶项目</em></span><b>{i===3?'待审批':'运行中'}</b></button>)}</div></section> : <ProjectDetail tab={tab} />}
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
  const [tab, setTab] = useState('生产工作台');
  const [watchingRun, setWatchingRun] = useState(false);
  return <>
    <PageHeader title="内容与素材" desc="围绕一个经营目标完成内容生产，以及审核发布。" action="创建内容任务" secondary="导出视图" />
    <div className="context-strip"><span>当前项目</span><strong>贵州抹茶东南亚渠道增长</strong><i>／</i><span>Campaign</span><strong>马来西亚食品原料商获客</strong><button>切换⌄</button></div>
    <div className="content-flow-switch"><button className={tab==='生产工作台'?'active':''} onClick={()=>setTab('生产工作台')}><i>1</i><span><strong>生产工作台</strong><small>策划、创作与 Agent 执行</small></span><b>8 进行中</b></button><em>→</em><button className={tab==='审核与发布'?'active':''} onClick={()=>setTab('审核与发布')}><i>2</i><span><strong>审核与发布</strong><small>事实确认、审批与发布</small></span><b className="attention-count">7 待处理</b></button></div>
    {tab==='生产工作台'?<><button className="active-run-banner" onClick={()=>setWatchingRun(true)}><span className="run-orbit"><i/><b>AI</b></span><span><strong>内容生产 Agent 正在工作</strong><small>工厂品质 30 秒视频 · 正在生成第 3 / 6 个分镜 · 已运行 02:18</small></span><em><i><b style={{width:'52%'}}/></i>52%</em><b>进入工作现场　→</b></button><section className="panel content-main"><div className="panel-title"><div><h2>内容生产任务</h2><p>从任务开始，完成策划、创作并进入审核</p></div><div className="filter-chips"><button>全部来源⌄</button><button>全部状态⌄</button></div></div><ContentKanban onWatch={()=>setWatchingRun(true)}/></section></>:<section className="panel content-main"><div className="panel-title"><div><h2>审核与发布</h2><p>只处理需要人工确认的事实、承诺和风险</p></div><button>批量处理</button></div><ReviewWorkbench/></section>}
    {watchingRun && <AgentLiveView onExit={()=>setWatchingRun(false)}/>}
  </>;
}

function ContentKanban({ onWatch }: { onWatch: () => void }) {
  const columns = [
    ['待策划','4',[['进口商选品清单','采购经理','明天'],['抹茶等级指南','品类经理','周四']]],
    ['资料准备','3',[['清真认证说明','质量负责人','缺少附件'],['工厂产能证据包','采购经理','待确认']]],
    ['创作中','5',[['工厂品质 30 秒视频','采购经理','AI 创作中'],['渠道利润政策图文','经销商老板','人员编辑']]],
    ['待审核','7',[['马来语应用配方短片','品类经理','今天 14:00'],['500kg 采购案例','进口商','今天 16:30']]],
  ] as const;
  return <div className="content-board">{columns.map(([title,count,cards])=><div className="content-column" key={title}><header><strong>{title}</strong><span>{count}</span></header>{cards.map((card,i)=>title==='创作中'&&i===0?<article key={card[0]} className="running-task-card"><small>{card[1]}</small><strong>{card[0]}</strong><div className="task-progress"><i><b style={{width:'52%'}}/></i><span>分镜 3 / 6</span></div><button onClick={onWatch}><span><i/> Agent 正在操作页面</span><b>进入工作现场 →</b></button></article>:<button key={card[0]}><small>{card[1]}</small><strong>{card[0]}</strong><div><span>{card[2]}</span><em>⋯</em></div></button>)}<button className="add-card">＋ 添加任务</button></div>)}</div>;
}

function AgentLiveView({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(2);
  const steps = ['读取任务与产品资料','生成视频脚本','生成分镜与画面','合成配音与字幕','渲染预览','事实检查并提交'];
  useEffect(()=>{const timer=window.setInterval(()=>setStep(s=>s<5?s+1:s),4200);return()=>window.clearInterval(timer)},[]);
  return <div className="agent-live-overlay"><section className="agent-live-shell"><header className="live-topbar"><button onClick={onExit}>← 退出观看</button><div><span className="agent-spark">AI</span><p><strong>内容生产 Agent</strong><small>工厂品质 30 秒视频 · 自动执行中</small></p></div><span className="live-running"><i/> 运行中 · 02:18</span><button className="live-more">暂停任务　···</button></header><div className="live-layout"><aside className="live-timeline"><header><strong>执行步骤</strong><span>{Math.round((step+1)/steps.length*100)}%</span></header>{steps.map((x,i)=><div key={x} className={i<step?'done':i===step?'active':''}><i>{i<step?'✓':i+1}</i><p><strong>{x}</strong><small>{i<step?'已完成':i===step?'正在执行':'等待执行'}</small></p>{i===step&&<em/>}</div>)}<section><strong>最近动作</strong><p>14:31:08　生成第 3 个分镜</p><p>14:30:54　引用工厂产能资料</p><p>14:30:41　脚本事实检查通过</p></section></aside><main className="live-canvas"><div className="canvas-head"><div><small>实时工作画布</small><strong>{steps[step]}</strong></div><span>自动跟随 Agent</span></div><VideoWorkflowCanvas step={step}/><div className="current-action"><span className="agent-spark">AI</span><p><strong>{step<3?'正在把“批次稳定性”脚本转换为 6 个镜头':'正在组合画面、英文配音和字幕'}</strong><small>使用：英文产品手册 · 质检流程 · 工厂素材 12 项</small></p><i>···</i></div></main><aside className="live-context"><header><strong>任务上下文</strong><small>Agent 可使用的资料与边界</small></header><dl><dt>目标受众</dt><dd>食品原料采购经理</dd><dt>目标市场</dt><dd>马来西亚</dd><dt>核心 CTA</dt><dd>下载英文规格书</dd></dl><section><strong>已调用资料</strong>{['企业产品手册','批次质检流程','工厂素材库'].map((x,i)=><button key={x}><span>{i===2?'素':'文'}</span><p><strong>{x}</strong><small>{i===2?'12 项素材':'已引用'}</small></p><em>✓</em></button>)}</section><section className="live-boundary"><strong>行动边界</strong><p><span>✓</span> 可生成草稿与预览</p><p><span>!</span> 发布前必须人工审核</p></section><section className="live-artifact"><strong>本次产物</strong><button>视频脚本 v2 <span>已生成</span></button><button>分镜方案 <span>{step>2?'已生成':'生成中'}</span></button></section></aside></div></section></div>;
}

function VideoWorkflowCanvas({ step }: { step: number }) {
  const scenes = [['01','贵州高山茶园','航拍建立产地可信感'],['02','鲜叶与原料筛选','展示源头质量控制'],['03','自动化生产线','强调稳定规模供应'],['04','实验室批次检测','呈现可验证的质量记录'],['05','食品级抹茶包装','展示出口就绪状态'],['06','英文规格书 CTA','引导采购经理获取资料']];
  return <div className="video-workflow-canvas"><section className="video-preview"><div className={`preview-frame phase-${step}`}><span>SCENE {Math.min(step+1,6)} / 6</span><div className="preview-visual"><i/><i/><i/></div><strong>{scenes[Math.min(step,5)][1]}</strong><small>{scenes[Math.min(step,5)][2]}</small><button>▶</button></div><div className="preview-track"><i style={{width:`${Math.max(18,(step+1)*16)}%`}}/></div><div className="preview-meta"><span>00:{String(Math.min(30,(step+1)*5)).padStart(2,'0')} / 00:30</span><span>1080 × 1920 · 英文</span></div></section><section className="scene-panel"><header><strong>视频分镜</strong><span>6 个镜头 · 30 秒</span></header>{scenes.map((s,i)=><div key={s[0]} className={i<step?'ready':i===step?'generating':''}><span>{i<step?'✓':s[0]}</span><p><strong>{s[1]}</strong><small>{s[2]}</small></p><em>{i<step?'已生成':i===step?'生成中…':'等待'}</em></div>)}</section></div>;
}

function ReviewWorkbench() {
  return <div className="review-workbench"><aside><div className="review-queue-head"><strong>待我审核</strong><span>7</span></div>{[['工厂品质 30 秒视频','事实与技术参数','高'],['经销合作政策图文','商务承诺','高'],['马来语应用配方短片','本地化表达','中']].map((r,i)=><button key={r[0]} className={i===0?'active':''}><span className="review-icon">{i+1}</span><span><strong>{r[0]}</strong><small>{r[1]} · {r[2]}风险</small></span></button>)}</aside><article><div className="review-doc-head"><div><small>LinkedIn · 英文视频脚本</small><h3>From Guizhou&apos;s highlands to your next beverage line</h3></div><span>版本 3</span></div><p>Built for consistency at scale. Our matcha production combines controlled sourcing, batch-level quality records and export-ready specifications.</p><div className="claim-check"><strong>事实核验</strong><span className="checked">✓ 产地描述已引用产品手册</span><span className="checked">✓ 批次记录已引用质检流程</span><span className="warning">! “每月 200 吨”产能待负责人确认</span></div><footer><button>退回修改</button><button>补充批注</button><button className="approve">确认通过并进入排期</button></footer></article></div>;
}

function SchedulePage() {
  const [tab, setTab] = useState('排期编排');
  return <>
    <PageHeader title="排期与分发" desc="把审核通过的内容排入日历，并处理发布异常。" action={tab==='排期编排'?'新建排期':'批量重试'} secondary="导出视图"/>
    <div className="content-flow-switch schedule-flow-switch"><button className={tab==='排期编排'?'active':''} onClick={()=>setTab('排期编排')}><i>1</i><span><strong>排期编排</strong><small>安排平台、账号与发布时间</small></span><b>5 待排</b></button><em>→</em><button className={tab==='发布处理'?'active':''} onClick={()=>setTab('发布处理')}><i>2</i><span><strong>发布处理</strong><small>发布检查、异常与重试</small></span><b className="attention-count">3 待处理</b></button></div>
    {tab==='排期编排'?<><div className="compact-ops-bar"><p><b>今日节奏</b>　09:30 LinkedIn 已发布　·　11:00 Meta 待发布　·　16:30 邮件待审核</p><div><span>本周 26</span><span>已就绪 21</span></div></div><section className="schedule-workspace schedule-simple"><aside className="unscheduled"><header><div><strong>待排内容</strong><small>拖入日历完成编排</small></div><span>5</span></header>{[['渠道利润政策','LinkedIn','审核通过'],['采购规格清单','邮件','待选账号'],['应用配方短片','YouTube','审核通过']].map((item,i)=><button key={item[0]}><i className={`channel-dot c${i}`}/><span><strong>{item[0]}</strong><small>{item[1]} · {item[2]}</small></span><b>⠿</b></button>)}</aside><section className="panel schedule-canvas"><div className="panel-title"><div><h2>本周发布编排</h2><p>Asia/Shanghai · 受众活跃时间已标注</p></div><div className="filter-chips"><button>全部来源⌄</button><button>周视图⌄</button></div></div><TrafficVisual tab="分发计划"/></section></section></>:<PublishExceptionWorkbench/>}
  </>;
}

function PublishExceptionWorkbench(){
  const rows=[['邮件渠道政策','企业邮箱','内容审核未通过','补充渠道授权依据','高'],['应用场景获客','Meta','账号授权 3 天后过期','重新授权账号','中'],['应用配方短片','YouTube','平台处理超时','立即重试','中']];
  return <section className="panel publish-exceptions"><div className="panel-title"><div><h2>发布异常处理</h2><p>只展示阻塞发布或需要人工确认的事项</p></div><div className="filter-chips"><button>全部平台⌄</button><button>全部来源⌄</button></div></div><div className="exception-table"><div className="exception-row head"><span>内容</span><span>平台</span><span>阻塞原因</span><span>建议动作</span><span>操作</span></div>{rows.map(r=><div className="exception-row" key={r[0]}><span><strong>{r[0]}</strong><small>{r[4]}优先级</small></span><span>{r[1]}</span><span>{r[2]}</span><span>{r[3]}</span><span><button>查看</button><button className="primary">处理</button></span></div>)}</div><aside className="publish-check-summary"><div><strong>发布前自动检查</strong><small>内容审核、账号授权、链接追踪和频次冲突</small></div>{[['内容审核','24 / 26'],['平台授权','5 / 5'],['链接追踪','26 / 26'],['频次冲突','1 项']].map((x,i)=><span key={x[0]} className={i===0||i===3?'warn':''}>{x[0]} <b>{x[1]}</b></span>)}</aside></section>;
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
  return <>
    <PageHeader title="审批与异常" desc="集中处理数字员工无法自主完成的受限动作和异常。" action="批量批准" secondary="转交处理"/>
    <div className="stat-grid four"><Metric label="待审批" value="7"/><Metric label="运行异常" value="3" change="1 项高风险" warn/><Metric label="平均处理时间" value="18分钟"/><Metric label="今日自动通过" value="86" change="规则命中"/></div>
    <section className="panel"><div className="approval-list"><div className="approval-row head"><span>事项</span><span>来源</span><span>数字员工请求</span><span>影响与原因</span><span>操作</span></div>{items.map(item=><div className="approval-row" key={item[0]}><span><strong>{item[0]}</strong><small className={item[4]==='高'?'risk-high':''}>{item[4]}风险</small></span><span>{item[1]}</span><span>{item[2]}</span><span>{item[3]}</span><span><button>驳回</button><button className="approve">批准</button></span></div>)}</div></section>
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
  const [source, setSource] = useState<SourceView>('全部');
  const tabs = ['投流管理', '受众', '流量分析', '优化建议'];
  const actions = sourceActions(source, '创建投流计划');
  return <>
    <PageHeader title="广告投放" desc="管理付费流量，并监督数字员工的预算、受众和素材动作。" action={actions.action} secondary={actions.secondary} />
    <SourceSwitcher active={source} setActive={setSource}/>
    {source !== '全部' && <div className={`source-context ${source === '待我处理' ? 'attention' : ''}`}><span>{source === '人员创建' ? '人工投放' : source === '数字员工执行' ? '自主执行中' : '待审批预算'}</span><strong>{source === '人员创建' ? '显示由人员创建和调整的投流计划' : source === '数字员工执行' ? '数字员工正在运行 4 个 Campaign，预算动作均在授权范围内' : '2 项预算调整等待批准，预计影响 4 条合格询盘'}</strong></div>}
    <Tabs items={tabs} active={tab} setActive={setTab} />
    <div className="traffic-command"><div className="command-primary"><span>今日预算消耗</span><strong>¥ 18,420 <small>/ ¥ 24,000</small></strong><i><em style={{width:'76%'}}/></i><p>节奏正常，预计 22:40 完成今日预算</p></div><div><span>新增有效询盘</span><strong>14</strong><small>目标 12 · 已超 16%</small></div><div><span>单询盘成本</span><strong>¥ 1,316</strong><small className="positive">较目标低 11%</small></div><div className="command-alert"><span>待决策动作</span><strong>2</strong><small>预计影响 4 条询盘</small></div></div>
    <div className="two-col-wide"><section className="panel table-panel"><div className="panel-title"><div><h2>{tab === '投流管理' ? 'Campaign 操作台' : tab}</h2><p>当前项目 · 2026.08.15 — 08.28</p></div><div className="filter-chips"><button>全部平台⌄</button><button>批量操作</button></div></div>
      {tab === '投流管理' || tab === '优化建议' ? <div className="data-table traffic-table ops-table"><div className="tr th"><span>Campaign／状态</span><span>平台</span><span>预算节奏</span><span>访问</span><span>询盘</span><span>成本</span><span>下一动作</span></div>{[
        ['● 工厂品质验证','LinkedIn','85% · 正常','6,800','63','¥968','维持'],['● 应用场景获客','Meta','90% · 偏快','12,400','71','¥1,113','降预算 8%'],['● 采购需求搜索','Google','89% · 正常','4,900','38','¥1,263','扩展词包'],['Ⅱ 品牌认知视频','YouTube','83% · 已暂停','2,380','14','¥2,142','更换素材'],
      ].map(r=><button className="tr" key={r[0]}>{r.map((x,i)=><span key={i} className={i===0?'strong-cell':i===6?'row-action':''}>{x}</span>)}</button>)}</div> : <TrafficVisual tab={tab}/>}
    </section><AgentNote agent="分发增长数字员工" action={source === '数字员工执行' ? '查看行动依据' : '审批预算调整'}><h3>{source === '数字员工执行' ? '已在权限内调整 8% 预算' : '建议重新分配 20% 预算'}</h3><p>“渠道利润与合作政策”内容的合格询盘率高出消费场景短片 38%。每次调整均记录依据、权限和结果。</p><div className="impact"><span><b>+12</b> 有效询盘</span><span><b>+4</b> 合格客户</span><span><b>¥3,200</b> 预计节省</span></div></AgentNote></div>
  </>;
}

function TrafficVisual({ tab }: { tab: string }) {
  if (tab === '分发计划') return <div className="week-grid">{['周一','周二','周三','周四','周五'].map((d,i)=><div key={d}><strong>{d}</strong><button><small>{9+i}:30</small><span>{['LinkedIn 工厂视频','Meta 应用图文','YouTube 品质片','邮件渠道政策','再营销案例'][i]}</span><em>{i<3?'已发布':'已排期'}</em></button></div>)}</div>;
  if (tab === '受众') return <div className="audience-grid">{[['食品原料进口商','18,400'],['饮品经销商','26,800'],['连锁茶饮采购','9,600'],['网站高意向访问者','4,280'],['再营销受众','12,700'],['目标账户名单','312 家']].map(a=><div key={a[0]}><span>{a[0]}</span><b>{a[1]}</b><small>已同步 · 可使用</small></div>)}</div>;
  return <div className="chart-box"><div className="bars">{[42,58,49,76,68,88,82,96,90,112,105,126].map((h,i)=><i key={i} style={{height:`${h}px`}}/>)}</div><div className="chart-labels"><span>8月15日</span><span>精准访问持续增长</span><span>8月28日</span></div><div className="channel-split">{[['LinkedIn','34%'],['Meta','29%'],['Google','24%'],['YouTube','13%']].map(c=><div key={c[0]}><span>{c[0]}</span><b>{c[1]}</b></div>)}</div></div>;
}

function CustomerOperationsPage({ go }: { go: (view: View) => void }) {
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
    <section className="panel ops-results"><div className="panel-title"><div><h2>近 7 天经营结果</h2><p>汇总 Agent 自动执行与人工协同后的业务产出</p></div><button>查看完整报告</button></div><div className="ops-result-grid"><div className="ops-chart"><div className="ops-bars">{[34,48,42,65,58,78,92].map((h,i)=><i key={i} style={{height:`${h}%`}}><span>{[12,18,15,24,21,31,36][i]}</span></i>)}</div><div><span>8月23日</span><strong>自动完成动作数</strong><span>今天</span></div></div>{[['自动回复','86','91% 无需人工修改'],['资格判断','34','18 条高意向'],['自动跟进','28','按时完成率 89%'],['创建商机','11','商机金额 ¥286万']].map(x=><div className="ops-result-card" key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong><small>{x[2]}</small></div>)}</div></section>
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
  return <>
    <PageHeader title="收入归因" desc="区分数字员工自主增长、人工协同增长与自然／纯人工增长。" secondary="导出归因报告"/>
    <div className="stat-grid four"><Metric label="数字员工自主增长" value="¥68万" change="18%"/><Metric label="人工＋AI 协同增长" value="¥168万" change="44%"/><Metric label="自然／纯人工增长" value="¥146万" change="38%"/><Metric label="可归因商机" value="¥486万" change="完整率 92%"/></div>
    <section className="panel"><div className="panel-title"><div><h2>转化证据链</h2><p>从经营任务、执行来源和客户触点追溯到商业结果</p></div><button>切换归因模型⌄</button></div><Attribution/></section>
  </>;
}

function DealBoard(){const columns: Array<[string,string[]]>=[['合格线索',['Maya Food','Nusa Ingredients']],['样品／会议',['GreenCup','Pacific Beverage']],['报价',['Lumi Ingredients','TeaWorks MY']],['商务谈判',['Golden Leaf']],['成交',['Lumi Ingredients · SO-003']]];return <div className="deal-board">{columns.map(([stage,customers])=><div key={stage}><strong>{stage} <em>{customers.length}</em></strong>{customers.map(customer=><button key={customer}><span>{customer}</span><small>¥ 42—110万</small></button>)}</div>)}</div>}

function Attribution(){return <div className="attribution"><div><span>首次触点</span><b>LinkedIn 工厂品质视频</b><small>8月18日 · 自然触达</small></div><i>→</i><div><span>内容承接</span><b>英文规格书落地页</b><small>访问 3 次 · 下载 1 次</small></div><i>→</i><div><span>询盘</span><b>WhatsApp 样品咨询</b><small>8月20日 · 高意向</small></div><i>→</i><div><span>订单</span><b>SO-202608-003</b><small>成交 ¥68万</small></div></div>}

function OrganizationPage({ view }: { view: View }) {
  const [permissionTab, setPermissionTab] = useState(view === 'accounts' ? '账号连接' : '权限管理');
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
  return <><PageHeader title={mergedPermissionPage ? '权限与账号' : viewNames[view]} desc={mergedPermissionPage ? '统一管理成员权限、数字员工行动边界和平台账号连接。' : item.desc} action={view==='structure'?'新建组织节点':undefined}/>{mergedPermissionPage && <Tabs items={['权限管理','账号连接']} active={permissionTab} setActive={setPermissionTab}/>}<div className="stat-grid four">{item.metrics.map(m=><Metric key={m[0]} label={m[0]} value={m[1]}/>)}</div><section className="panel org-panel">{view==='structure'?<OrgTree/>:mergedPermissionPage?(permissionTab === '权限管理'?<PermissionMatrix/>:<AccountGrid/>):view==='data'?<DataManagement/>:<SecurityPage/>}</section></>;
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
  const current=orgViewData[activeView];
  const selectView=(view:OrgView)=>{setActiveView(view);setSelected(view==='组织结构'?1:0)};
  return <div className="org-workspace">
    <div className="org-view-tabs">{(['组织结构','项目团队','外部协作','权限影响'] as OrgView[]).map((view,i)=><button key={view} className={activeView===view?'active':''} onClick={()=>selectView(view)}><span>{['组','项','协','权'][i]}</span><strong>{view}</strong>{view==='权限影响'&&<em>2</em>}</button>)}</div>
    <div className="org-layout">
      <aside className="org-tree">
        <div className="org-tree-heading"><div><h3>{current.title}</h3><p>{current.subtitle}</p></div><button aria-label="更多操作">•••</button></div>
        <div className="org-search">⌕　搜索组织、项目或成员</div>
        <div className="org-tree-list">{current.items.map((item,i)=><button className={`${selected===i?'active':''} ${i>1&&activeView==='组织结构'?'child':''}`} onClick={()=>setSelected(i)} key={item.name}><span><i>{item.tag.slice(0,1)}</i><span><strong>{item.name}</strong><small>{item.meta}</small></span></span><em className={item.tone}>{item.tag}</em></button>)}</div>
        <button className="org-add">＋ 新建{activeView==='组织结构'?'组织节点':activeView==='项目团队'?'项目团队':activeView==='外部协作'?'合作关系':'成员授权'}</button>
      </aside>
      <OrgDetail view={activeView} selected={selected}/>
    </div>
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

function PermissionMatrix(){const roles=['集团管理员','事业部负责人','项目负责人','内容运营','内容审核','投流人员','海外销售','外部协作者']; return <div><div className="panel-title"><div><h2>角色与权限矩阵</h2><p>同时控制功能动作和组织／品牌／项目数据范围</p></div><button>编辑权限</button></div><div className="permission-table"><div className="ptr head"><span>角色</span>{['项目','内容','投流','询盘','报价订单','Agent'].map(x=><span key={x}>{x}</span>)}</div>{roles.map((r,i)=><div className="ptr" key={r}><strong>{r}</strong>{[0,1,2,3,4,5].map(j=><span key={j} className={(i+j)%4===0?'limited':''}>{(i+j)%4===0?'审批':i===7&&j>2?'—':'✓'}</span>)}</div>)}</div></div>}

function AccountGrid(){return <div><div className="panel-title"><div><h2>平台与账号连接</h2><p>账号归属、可用项目、授权范围和连接状态</p></div><button>连接新账号</button></div><div className="account-grid">{[['LinkedIn','4','正常'],['Meta','6','1 个即将过期'],['Google Ads','2','正常'],['YouTube','3','正常'],['WhatsApp Business','4','正常'],['企业邮箱','12','2 个待验证']].map((a,i)=><button key={a[0]}><span className={`platform-icon p${i}`}>{a[0][0]}</span><span><strong>{a[0]}</strong><small>{a[1]} 个账号</small></span><em className={a[2]==='正常'?'good':'warn'}>{a[2]}</em></button>)}</div></div>}

function DataManagement(){return <div><div className="panel-title"><div><h2>数据质量</h2><p>数据源、字段映射、导入导出和保留策略</p></div><button>立即同步</button></div><div className="data-health"><div className="health-score"><b>96.8%</b><span>整体完整率</span></div>{[['客户重复记录','27','建议合并'],['待匹配询盘','14','需要确认'],['异常渠道数据','2','正在重试'],['最近同步','3 分钟前','全部数据源']].map(x=><button key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></button>)}</div></div>}

function SecurityPage(){return <div><div className="panel-title"><div><h2>Agent 与系统安全边界</h2><p>高风险动作必须经过人工确认</p></div><button>查看审计日志</button></div><div className="security-list">{[['市场策略 Agent','可读取项目与市场数据','不可修改预算'],['内容生产 Agent','可生成内容','发布前必须人工审核'],['分发增长 Agent','可生成投流方案','预算调整必须审批'],['询盘接待 Agent','可生成回复','价格与代理承诺禁止自动发送'],['成交推进 Agent','可创建跟进任务','不可自动报价或确认订单']].map(x=><div key={x[0]}><span className="agent-spark">AI</span><span><strong>{x[0]}</strong><small>{x[1]}</small></span><em>{x[2]}</em><button>配置</button></div>)}</div></div>}

export default function Home() {
  const [view, setView] = useState<View>('home');
  const [showGlobalRuns, setShowGlobalRuns] = useState(false);
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
      <header className="topbar"><div><span className="crumb">黔山国际产业集团</span><button className="switcher">切换组织⌄</button></div><div className="top-actions"><button className="search">搜索项目、内容或客户</button><button className="global-live-button" onClick={()=>setShowGlobalRuns(true)}><i/> 工作现场 <b>3</b></button><button className="agent-status">AI · 6 位运行中</button><button className="notice">3</button></div></header>
      <div className="page">{view==='home'?<HomePage go={go}/>:view==='projects'?<ProjectsPage/>:view==='agents'?<AgentsPage/>:view==='approvals'?<ApprovalsPage/>:view==='content'?<ContentPage/>:view==='schedule'?<SchedulePage/>:view==='distribution'?<DistributionPage/>:view==='traffic'?<TrafficPage/>:view==='inquiries'?<CustomerOperationsPage go={go}/>:view==='customerLive'?<InquiriesPage go={go}/>:view==='customers'?<CustomersPage go={go}/>:view==='revenue'?<RevenuePage/>:<OrganizationPage view={view}/>}</div>
    </section>
    {showGlobalRuns && <GlobalAgentDesk onExit={()=>setShowGlobalRuns(false)}/>}
  </main>;
}

type RunWindowState = { id: string; title: string; agent: string; kind: 'video'|'research'|'export'; progress: number; x: number; y: number; minimized: boolean; visible: boolean };

function GlobalAgentDesk({ onExit }: { onExit: () => void }) {
  const [windows,setWindows] = useState<RunWindowState[]>([
    {id:'video',title:'工厂品质 30 秒视频',agent:'内容生产 Agent',kind:'video',progress:52,x:38,y:88,minimized:false,visible:true},
    {id:'research',title:'马来西亚采购信号研究',agent:'市场策略 Agent',kind:'research',progress:68,x:520,y:132,minimized:false,visible:true},
    {id:'export',title:'高意向客户名单导出',agent:'数据运营 Agent',kind:'export',progress:81,x:860,y:72,minimized:false,visible:true},
  ]);
  const patchWindow=(id:string,patch:Partial<RunWindowState>)=>setWindows(items=>items.map(item=>item.id===id?{...item,...patch}:item));
  const beginDrag=(event:React.PointerEvent,id:string)=>{if((event.target as HTMLElement).closest('button'))return;const item=windows.find(x=>x.id===id);if(!item)return;const startX=event.clientX,startY=event.clientY,originX=item.x,originY=item.y;const move=(e:PointerEvent)=>patchWindow(id,{x:Math.max(0,originX+e.clientX-startX),y:Math.max(58,originY+e.clientY-startY)});const end=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',end)};
  return <div className="global-agent-desk"><header><div><span className="agent-spark">AI</span><p><strong>数字员工工作现场</strong><small>3 个任务正在运行 · 拖动窗口标题栏调整位置，拖动右下角调整大小</small></p></div><div><button>自动排列</button><button onClick={onExit}>退出现场</button></div></header><aside className="desk-dock">{windows.map(item=><button key={item.id} className={item.visible?'active':''} onClick={()=>patchWindow(item.id,{visible:true,minimized:false})}><span><i className={`run-kind ${item.kind}`}/>{item.agent}</span><strong>{item.progress}%</strong></button>)}</aside><main>{windows.filter(x=>x.visible).map(item=><section key={item.id} className={`floating-run-window ${item.minimized?'minimized':''}`} style={{left:item.x,top:item.y}}><header onPointerDown={e=>beginDrag(e,item.id)}><span className={`run-kind ${item.kind}`}/><p><strong>{item.title}</strong><small>{item.agent} · 运行中</small></p><em>{item.progress}%</em><button onClick={()=>patchWindow(item.id,{minimized:!item.minimized})}>{item.minimized?'□':'—'}</button><button onClick={()=>patchWindow(item.id,{visible:false})}>×</button></header>{!item.minimized&&<><div className="window-progress"><i><b style={{width:`${item.progress}%`}}/></i><span>{item.progress}%</span></div><RunMiniCanvas kind={item.kind}/><footer><span><i/> 实时更新</span><button>打开完整现场 →</button></footer></>}</section>)}</main></div>;
}

function RunMiniCanvas({ kind }: { kind: RunWindowState['kind'] }) {
  if(kind==='research') return <div className="mini-research"><div className="mini-step"><span>已检索</span><b>46 个来源</b><small>政府、行业协会、采购平台</small></div><section><header><strong>正在提取采购信号</strong><span>18 / 26</span></header>{[['清真认证','高频要求','92'],['批次稳定性','采购关注','86'],['500kg 起订','渠道匹配','74']].map(x=><div key={x[0]}><span>{x[0]}</span><small>{x[1]}</small><i><b style={{width:`${x[2]}%`}}/></i></div>)}</section><p><i/> 正在分析马来西亚进口商的认证要求…</p></div>;
  if(kind==='export') return <div className="mini-export"><div className="export-file"><span>CSV</span><p><strong>malaysia-qualified-leads.csv</strong><small>目标记录 312 条 · 8 个字段</small></p></div>{[['查询客户记录','312 / 312','done'],['检查字段权限','8 / 8','done'],['敏感字段脱敏','246 / 312','running'],['生成下载文件','等待','pending']].map(x=><div key={x[0]} className={x[2]}><i>{x[2]==='done'?'✓':'•'}</i><span>{x[0]}</span><b>{x[1]}</b></div>)}<p>手机号与私人邮箱正在按组织策略脱敏</p></div>;
  return <div className="mini-video"><div className="mini-preview"><span>SCENE 3 / 6</span><i/><i/><i/><strong>自动化生产线</strong><small>Built for consistency at scale</small></div><div className="mini-scenes">{[1,2,3,4,5,6].map(i=><span key={i} className={i<3?'done':i===3?'active':''}>{i<3?'✓':i}</span>)}</div><p><i/> 正在生成第 3 个分镜画面…</p></div>;
}
