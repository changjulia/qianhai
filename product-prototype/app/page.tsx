'use client';

import { useEffect, useState } from 'react';
import { PlatformManagementPage, type PlatformView } from './components/platform-management';
import { Metric, PageHeader, Tabs } from './components/shared-ui';

type View = 'home' | 'projects' | 'agents' | 'approvals' | 'content' | 'schedule' | 'distribution' | 'traffic' | 'inquiries' | 'customers' | 'revenue' | 'structure' | 'permissions' | 'accounts' | 'data' | 'security';
type SourceView = '全部' | '人员创建' | '数字员工执行' | '待我处理';

const demoViews: View[] = ['home', 'projects', 'agents', 'approvals', 'content', 'schedule', 'distribution', 'traffic', 'inquiries', 'customers', 'revenue', 'structure', 'permissions', 'accounts', 'data', 'security'];

const agents = [
  { name: '市场策略 Agent', action: '完成马来西亚市场路径建议', unit: '项目管理', view: 'projects' as View, tone: 'blue' },
  { name: '内容策划 Agent', action: '生成首轮 36 个内容任务', unit: '内容创作', view: 'content' as View, tone: 'amber' },
  { name: '内容生产 Agent', action: '完成 18 个多平台版本', unit: '内容创作', view: 'content' as View, tone: 'violet' },
  { name: '分发增长 Agent', action: '发现 1 项预算优化机会', unit: '流量分发', view: 'traffic' as View, tone: 'green' },
  { name: '询盘接待 Agent', action: '识别 3 条高意向询盘', unit: '询盘中心', view: 'inquiries' as View, tone: 'cyan' },
  { name: '成交推进 Agent', action: '发现 2 个超期商机', unit: '客户管理', view: 'customers' as View, tone: 'red' },
];

function AgentNote({ agent, children, action = '查看建议' }: { agent: string; children: React.ReactNode; action?: string }) {
  return <aside className="agent-note"><div className="agent-note-head"><span className="agent-spark">AI</span><div><strong>{agent}</strong><small>基于当前项目数据</small></div><i>运行中</i></div><div className="agent-note-body">{children}</div><button>{action} <span>→</span></button></aside>;
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
  const [tab, setTab] = useState('内容计划');
  const [source, setSource] = useState<SourceView>('全部');
  const tabs = ['内容计划', '创作工作台', '素材库', '内容审核', '内容库'];
  const actions = sourceActions(source, '创建内容');
  return <>
    <PageHeader title="内容与素材" desc="人员可直接创作，也可监督、审批和接管数字员工产出的内容。" action={actions.action} secondary={actions.secondary} />
    <div className="context-strip"><span>当前项目</span><strong>贵州抹茶东南亚渠道增长</strong><i>／</i><span>Campaign</span><strong>马来西亚食品原料商获客</strong><button>切换⌄</button></div>
    <SourceSwitcher active={source} setActive={setSource}/>
    {source !== '全部' && <div className={`source-context ${source === '待我处理' ? 'attention' : ''}`}><span>{source === '人员创建' ? '人工工作区' : source === '数字员工执行' ? '数字员工行动流' : '集中处理队列'}</span><strong>{source === '人员创建' ? '显示由人员主动新建和推动的内容任务' : source === '数字员工执行' ? '显示数字员工创建、运行中及已完成的内容，并保留行动依据' : '7 项内容等待审核、补充证据或人工接管'}</strong></div>}
    <Tabs items={tabs} active={tab} setActive={setTab} />
    <div className="stat-grid five"><Metric label="本月计划" value="42"/><Metric label="已完成" value="31" change="74%"/><Metric label="待审核" value="7" change="今天 4 条" warn/><Metric label="已发布" value="26"/><Metric label="产生询盘" value="73" change="+19.7%"/></div>
    <div className="content-layout">
      <section className="panel content-main">
        <div className="panel-title"><div><h2>{tab}</h2><p>内容与市场、采购角色和商业 CTA 绑定</p></div><button>筛选⌄</button></div>
        {tab === '内容计划' && <div className="data-table content-table"><div className="tr th"><span>内容主题</span><span>采购角色</span><span>平台</span><span>形式</span><span>数量</span><span>CTA</span></div>{[
          ['工厂与产能','采购经理','LinkedIn / YouTube','视频','6','下载规格书'],['认证与品质','质量负责人','LinkedIn / 邮件','图文','8','申请检测报告'],['渠道利润','经销商老板','Meta / 邮件','图文','6','预约渠道洽谈'],['应用配方','品类经理','YouTube / 落地页','短视频','10','申请样品'],
        ].map(row => <button className="tr" key={row[0]}>{row.map((x,i)=><span key={i} className={i===0?'strong-cell':''}>{x}</span>)}</button>)}</div>}
        {tab === '创作工作台' && <div className="studio"><aside><span>创作任务</span><h3>30 秒工厂与质量体系视频</h3><dl><dt>目标角色</dt><dd>食品原料采购经理</dd><dt>核心证据</dt><dd>产能、检测、批次稳定性</dd><dt>核心 CTA</dt><dd>获取英文规格书与样品</dd></dl></aside><article><div className="doc-top"><span>英文 LinkedIn 视频文案</span><small>已自动保存</small></div><h3>From Guizhou&apos;s highlands to your next beverage line</h3><p>Built for consistency at scale. Our matcha production combines controlled sourcing, batch-level quality records and export-ready specifications...</p><div className="evidence-tags"><span>引用：企业产品手册</span><span>引用：检测与认证资料</span><span className="pending">交期待确认</span></div></article></div>}
        {tab === '素材库' && <div className="asset-grid">{['高山茶园航拍','自动化生产线','SGS 检测报告','食品级抹茶包装','海外客户应用案例','品牌视觉规范'].map((x,i)=><button key={x}><span className={`asset-thumb asset-${i}`}>0{i+1}</span><strong>{x}</strong><small>{i===2?'2027-06 到期':'已授权 · 全市场'}</small></button>)}</div>}
        {tab === '内容审核' && <div className="review-list">{[['工厂品质 30 秒视频','事实＋技术参数','等待质量负责人','今天 14:00'],['经销合作政策图文','商务承诺','等待销售总监','今天 16:30'],['马来语应用配方短片','本地化＋平台','等待区域运营','明天 10:00']].map(r=><button key={r[0]}><span className="review-icon">审</span><span><strong>{r[0]}</strong><small>{r[1]}</small></span><span>{r[2]}</span><time>{r[3]}</time></button>)}</div>}
        {tab === '内容库' && <div className="data-table library-table"><div className="tr th"><span>内容</span><span>平台</span><span>曝光</span><span>访问</span><span>询盘</span><span>商机贡献</span></div>{[['Factory Quality in 30 Seconds','LinkedIn','286,000','4,260','31','¥ 68万'],['Why Matcha Consistency Matters','YouTube','168,000','2,980','18','¥ 42万'],['Distributor Margin Guide','Meta','196,000','3,420','27','¥ 76万']].map(r=><button className="tr" key={r[0]}>{r.map((x,i)=><span key={i} className={i===0?'strong-cell':''}>{x}</span>)}</button>)}</div>}
      </section>
      <div className="stacked-agents"><AgentNote agent="内容策划 Agent"><h3>首轮内容计划已生成</h3><p>5 个主题、3 类采购角色、4 个发布平台，共 36 个内容版本。</p><ul><li>缺少英文检测报告</li><li>缺少渠道授权政策</li></ul></AgentNote><AgentNote agent="内容生产 Agent" action="打开创作任务"><h3>18 个版本已完成</h3><p>3 项产品事实待确认，通过后可进入审核队列。</p></AgentNote></div>
    </div>
  </>;
}

function SchedulePage() {
  const [source, setSource] = useState<SourceView>('全部');
  const [tab, setTab] = useState('排期日历');
  const actions = sourceActions(source, tab === '排期日历' ? '新建排期' : '创建分发计划');
  return <>
    <PageHeader title="排期与分发" desc="统一管理排期、跨平台分发、发布状态与失败重试。" action={actions.action} secondary={actions.secondary}/>
    <SourceSwitcher active={source} setActive={setSource}/>
    {source !== '全部' && <div className={`source-context ${source === '待我处理' ? 'attention' : ''}`}><span>{source === '人员创建' ? '人工排期' : source === '数字员工执行' ? '数字员工排期' : '发布异常'}</span><strong>{source === '人员创建' ? '拖拽调整、批量排期并锁定重要发布日期' : source === '数字员工执行' ? '本周已自动安排 18 条内容，3 条根据受众活跃时间调整' : '2 条内容缺少审核，1 个平台授权即将过期'}</strong></div>}
    <Tabs items={['排期日历','分发管理']} active={tab} setActive={setTab}/>
    <div className="stat-grid four"><Metric label={tab === '排期日历' ? '本周计划' : '本周分发'} value={tab === '排期日历' ? '26' : '48'}/><Metric label="数字员工执行" value={tab === '排期日历' ? '18' : '35'} change={tab === '排期日历' ? '69%' : '72.9%'}/><Metric label="人员创建" value={tab === '排期日历' ? '8' : '13'}/><Metric label="待处理" value="3" change="需要确认" warn/></div>
    <section className="panel table-panel"><div className="panel-title"><div><h2>{tab === '排期日历' ? '本周发布日历' : '跨平台分发计划'}</h2><p>来源、审批状态、平台状态和接管状态始终可追踪</p></div><button>{tab === '排期日历' ? '周视图⌄' : '筛选⌄'}</button></div><TrafficVisual tab="分发计划"/></section>
  </>;
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
    <div className="stat-grid five"><Metric label="海外曝光" value="184万" change="+22.4%"/><Metric label="目标市场触达" value="132万"/><Metric label="精准访问" value="26,480" change="+18.6%"/><Metric label="有效询盘" value="186" change="+24.1%"/><Metric label="单条询盘成本" value="¥ 1,172" change="-14.3%"/></div>
    <div className="two-col-wide"><section className="panel table-panel"><div className="panel-title"><div><h2>{tab}</h2><p>当前项目 · 2026.08.15 — 08.28</p></div><button>导出报告</button></div>
      {tab === '投流管理' || tab === '优化建议' ? <div className="data-table traffic-table"><div className="tr th"><span>Campaign</span><span>平台</span><span>预算／消耗</span><span>访问</span><span>询盘</span><span>合格客户</span><span>商机贡献</span></div>{[
        ['工厂品质验证','LinkedIn','¥72K / ¥61K','6,800','63','31','¥142万'],['应用场景获客','Meta','¥88K / ¥79K','12,400','71','19','¥98万'],['采购需求搜索','Google','¥54K / ¥48K','4,900','38','12','¥116万'],['品牌认知视频','YouTube','¥36K / ¥30K','2,380','14','5','¥36万'],
      ].map(r=><button className="tr" key={r[0]}>{r.map((x,i)=><span key={i} className={i===0?'strong-cell':''}>{x}</span>)}</button>)}</div> : <TrafficVisual tab={tab}/>} 
    </section><AgentNote agent="分发增长数字员工" action={source === '数字员工执行' ? '查看行动依据' : '审批预算调整'}><h3>{source === '数字员工执行' ? '已在权限内调整 8% 预算' : '建议重新分配 20% 预算'}</h3><p>“渠道利润与合作政策”内容的合格询盘率高出消费场景短片 38%。每次调整均记录依据、权限和结果。</p><div className="impact"><span><b>+12</b> 有效询盘</span><span><b>+4</b> 合格客户</span><span><b>¥3,200</b> 预计节省</span></div></AgentNote></div>
  </>;
}

function TrafficVisual({ tab }: { tab: string }) {
  if (tab === '分发计划') return <div className="week-grid">{['周一','周二','周三','周四','周五'].map((d,i)=><div key={d}><strong>{d}</strong><button><small>{9+i}:30</small><span>{['LinkedIn 工厂视频','Meta 应用图文','YouTube 品质片','邮件渠道政策','再营销案例'][i]}</span><em>{i<3?'已发布':'已排期'}</em></button></div>)}</div>;
  if (tab === '受众') return <div className="audience-grid">{[['食品原料进口商','18,400'],['饮品经销商','26,800'],['连锁茶饮采购','9,600'],['网站高意向访问者','4,280'],['再营销受众','12,700'],['目标账户名单','312 家']].map(a=><div key={a[0]}><span>{a[0]}</span><b>{a[1]}</b><small>已同步 · 可使用</small></div>)}</div>;
  return <div className="chart-box"><div className="bars">{[42,58,49,76,68,88,82,96,90,112,105,126].map((h,i)=><i key={i} style={{height:`${h}px`}}/>)}</div><div className="chart-labels"><span>8月15日</span><span>精准访问持续增长</span><span>8月28日</span></div><div className="channel-split">{[['LinkedIn','34%'],['Meta','29%'],['Google','24%'],['YouTube','13%']].map(c=><div key={c[0]}><span>{c[0]}</span><b>{c[1]}</b></div>)}</div></div>;
}

function InquiriesPage({ go }: { go: (view: View) => void }) {
  const [selected, setSelected] = useState(0);
  const inquiries = [
    ['Adrian Tan','Lumi Ingredients','马来西亚 · 采购经理','希望获取规格书、样品及 500kg 报价','91'],
    ['Nur Aisyah','Maya Food Distribution','马来西亚 · 品类负责人','询问独家代理政策和首批起订量','86'],
    ['Daniel Lim','Pacific Beverage SG','新加坡 · 采购总监','希望预约下周产品与供应能力会议','82'],
    ['Siti Hana','GreenCup Distribution','马来西亚 · 创始人','对应用配方视频感兴趣，希望申请样品','76'],
  ];
  const q = inquiries[selected];
  return <>
    <PageHeader title="客户经营" desc="统一承接询盘、客户、商机和成交推进。" />
    <Tabs items={['询盘与对话','客户与商机']} active="询盘与对话" setActive={(next)=>{if(next==='客户与商机') go('customers')}}/>
    <div className="stat-grid five"><Metric label="今日新增" value="18" change="+6"/><Metric label="待处理" value="32" change="需要响应" warn/><Metric label="高意向" value="11"/><Metric label="平均首次响应" value="16 分钟" change="-21%"/><Metric label="本月转客户率" value="36%" change="+4.8%"/></div>
    <div className="inquiry-layout">
      <aside className="inquiry-list"><div className="list-search">搜索询盘或企业</div>{inquiries.map((item,i)=><button key={item[0]} className={selected===i?'active':''} onClick={()=>setSelected(i)}><span className="contact-avatar">{item[0].slice(0,1)}</span><span><strong>{item[0]} <em>{item[4]}</em></strong><small>{item[1]} · {item[2]}</small><p>{item[3]}</p></span></button>)}</aside>
      <section className="conversation"><header><div><strong>{q[0]}</strong><small>{q[1]} · {q[2]}</small></div><button>查看来源内容</button></header><div className="messages"><p className="system-msg">来自 LinkedIn · 工厂品质视频 · 今天 10:42</p><div className="bubble inbound">Hi, we are looking for a stable matcha supplier for our beverage clients. Could you share the specifications, sample options and a quote for 500kg?</div><div className="translation">AI 翻译：我们正在为饮品客户寻找稳定的抹茶供应商，希望获取规格、样品方案以及 500kg 报价。</div><div className="bubble outbound draft"><span>AI 回复草稿</span>Hi Adrian, thank you for reaching out. I can share our export specification and sample options. Before preparing the right quote, may I confirm your required grade and target application?</div></div><footer><input aria-label="回复询盘" placeholder="输入回复，或采用 AI 草稿…"/><button>发送</button></footer></section>
      <AgentNote agent="询盘接待 Agent" action="转为客户并创建商机"><h3>高意向渠道商询盘</h3><dl className="agent-facts"><dt>企业类型</dt><dd>食品原料进口商</dd><dt>渠道匹配度</dt><dd>高</dd><dt>采购需求</dt><dd>500kg 首批测试</dd><dt>建议负责人</dt><dd>海外业务部 · 王宁</dd></dl><p>建议先发送英文规格书，确认认证要求，再安排样品和阶梯报价。</p><button className="link-button" onClick={()=>go('customers')}>查看客户档案 →</button></AgentNote>
    </div>
  </>;
}

function CustomersPage({ go }: { go: (view: View) => void }) {
  const [tab, setTab] = useState('客户列表');
  const tabs = ['客户列表','商机看板','跟进任务','报价订单','转化归因'];
  return <>
    <PageHeader title="客户经营" desc="统一承接询盘、客户、商机和成交推进。" action="新建客户" />
    <Tabs items={['询盘与对话','客户与商机']} active="客户与商机" setActive={(next)=>{if(next==='询盘与对话') go('inquiries')}}/>
    <Tabs items={tabs} active={tab} setActive={setTab}/>
    <div className="stat-grid five"><Metric label="合格客户" value="67" change="+12"/><Metric label="活跃商机" value="21"/><Metric label="报价中" value="8"/><Metric label="成交订单" value="3"/><Metric label="成交金额" value="¥126万" change="3.8× 投入"/></div>
    <div className="two-col-wide"><section className="panel table-panel"><div className="panel-title"><div><h2>{tab}</h2><p>当前项目 · 贵州抹茶东南亚渠道增长</p></div><button>筛选⌄</button></div>
      {tab === '商机看板' ? <DealBoard/> : tab === '转化归因' ? <Attribution/> : <CustomerTable mode={tab}/>} 
    </section><AgentNote agent="成交推进 Agent" action="生成跟进任务"><h3>Lumi Ingredients · 报价阶段</h3><div className="impact"><span><b>¥68万</b> 商机金额</span><span><b>65%</b> 成交概率</span></div><p>对方已确认首批采购量，但尚未确认区域授权条件。建议今天发送阶梯报价、区域说明和市场支持计划。</p><small className="risk-note">风险：清真认证文件仍待补充</small></AgentNote></div>
  </>;
}

function RevenuePage() {
  return <>
    <PageHeader title="收入归因" desc="区分数字员工自主增长、人工协同增长与自然／纯人工增长。" secondary="导出归因报告"/>
    <div className="stat-grid four"><Metric label="数字员工自主增长" value="¥68万" change="18%"/><Metric label="人工＋AI 协同增长" value="¥168万" change="44%"/><Metric label="自然／纯人工增长" value="¥146万" change="38%"/><Metric label="可归因商机" value="¥486万" change="完整率 92%"/></div>
    <section className="panel"><div className="panel-title"><div><h2>转化证据链</h2><p>从经营任务、执行来源和客户触点追溯到商业结果</p></div><button>切换归因模型⌄</button></div><Attribution/></section>
  </>;
}

function CustomerTable({ mode }: { mode: string }) {
  const rows = mode === '报价订单' ? [['SO-202608-003','Lumi Ingredients','1,200kg','¥68万','已确认'],['QT-202608-014','Pacific Beverage SG','2,000kg','¥110万','待审批'],['QT-202608-012','GreenCup Distribution','800kg','¥42万','已发送']] : mode === '跟进任务' ? [['今天 14:00','Lumi Ingredients','确认认证与区域政策','王宁','高'],['今天 16:30','GreenCup Distribution','跟进样品签收','林悦','中'],['明天 10:00','Pacific Beverage SG','准备采购会议','王宁','高']] : [['Lumi Ingredients','马来西亚','原料进口商','报价','¥68万','王宁'],['GreenCup Distribution','马来西亚','饮品经销商','样品','¥42万','林悦'],['Pacific Beverage SG','新加坡','连锁渠道','商务会议','¥110万','王宁']];
  return <div className="data-table customer-table"><div className="tr th">{(mode==='报价订单'?['单号','客户','数量','金额','状态']:mode==='跟进任务'?['时间','客户','任务','负责人','优先级']:['企业','国家','类型','阶段','商机金额','负责人']).map(h=><span key={h}>{h}</span>)}</div>{rows.map(r=><button className="tr" key={r[0]}>{r.map((x,i)=><span key={i} className={i===0?'strong-cell':''}>{x}</span>)}</button>)}</div>;
}

function DealBoard(){const columns: Array<[string,string[]]>=[['合格线索',['Maya Food','Nusa Ingredients']],['样品／会议',['GreenCup','Pacific Beverage']],['报价',['Lumi Ingredients','TeaWorks MY']],['商务谈判',['Golden Leaf']],['成交',['Lumi Ingredients · SO-003']]];return <div className="deal-board">{columns.map(([stage,customers])=><div key={stage}><strong>{stage} <em>{customers.length}</em></strong>{customers.map(customer=><button key={customer}><span>{customer}</span><small>¥ 42—110万</small></button>)}</div>)}</div>}

function Attribution(){return <div className="attribution"><div><span>首次触点</span><b>LinkedIn 工厂品质视频</b><small>8月18日 · 自然触达</small></div><i>→</i><div><span>内容承接</span><b>英文规格书落地页</b><small>访问 3 次 · 下载 1 次</small></div><i>→</i><div><span>询盘</span><b>WhatsApp 样品咨询</b><small>8月20日 · 高意向</small></div><i>→</i><div><span>订单</span><b>SO-202608-003</b><small>成交 ¥68万</small></div></div>}

export default function Home() {
  const [view, setView] = useState<View>('home');
  const [organization, setOrganization] = useState('黔山国际产业集团');
  const [topPanel, setTopPanel] = useState<'organization' | 'search' | 'agents' | 'notifications' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unread, setUnread] = useState(3);
  const [pausedAgents, setPausedAgents] = useState<string[]>([]);
  useEffect(() => {
    const syncFromHash = () => {
      const hashView = window.location.hash.slice(1) as View;
      if (demoViews.includes(hashView)) setView(hashView);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);
  useEffect(() => {
    if (!topPanel) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTopPanel(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [topPanel]);
  const go = (next: View) => {
    setView(next);
    window.history.replaceState(null, '', `#${next}`);
    setTopPanel(null);
  };
  const toggleTopPanel = (panel: NonNullable<typeof topPanel>) => setTopPanel(current => current === panel ? null : panel);
  const runtimeAgents = [['内容生产 Agent','正在生成英文规格页'],['渠道分发 Agent','正在同步 LinkedIn'],['询盘接待 Agent','正在整理 4 条询盘'],['客户经营 Agent','正在更新跟进任务'],['收入归因 Agent','正在校验订单归因'],['数据治理 Agent','正在检查字段质量']];
  const searchItems: Array<[string,string,View]> = [['组织架构','配置集团、事业部与协作边界','structure'],['角色与数据权限','管理成员和数字员工权限','permissions'],['系统连接','接入 ERP、CRM 与渠道平台','data'],['AI 安全策略','设置模型、数据与审批边界','security'],['Lumi Ingredients','客户档案与成交记录','customers'],['马来西亚市场拓展','经营任务与目标进度','projects']];
  const visibleSearchItems = searchItems.filter(item => `${item[0]}${item[1]}`.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-logo">黔</span><div><strong>黔海</strong><small>Global Growth OS</small></div></div>
      <nav className="main-nav" aria-label="主导航">
        <button className={view==='home'?'nav-item active':'nav-item'} onClick={()=>go('home')}><span className="nav-mark">⌂</span><span>首页</span></button>
        <p className="nav-section">内容与流量运营</p>
        <button className={view==='content'?'nav-item active':'nav-item'} onClick={()=>go('content')}><span className="nav-mark">创</span><span>内容与素材</span></button>
        <button className={view==='schedule'||view==='distribution'?'nav-item active':'nav-item'} onClick={()=>go('schedule')}><span className="nav-mark">排</span><span>排期与分发</span></button>
        <button className={view==='traffic'?'nav-item active':'nav-item'} onClick={()=>go('traffic')}><span className="nav-mark">投</span><span>广告投放</span></button>
        <p className="nav-section">增长任务</p>
        <button className={view==='projects'||view==='agents'?'nav-item active':'nav-item'} onClick={()=>go('projects')}><span className="nav-mark">任</span><span>经营任务</span></button>
        <button className={view==='approvals'?'nav-item active':'nav-item'} onClick={()=>go('approvals')}><span className="nav-mark">审</span><span>审批与异常</span><b className="nav-badge">7</b></button>
        <p className="nav-section">客户经营</p>
        <button className={view==='inquiries'||view==='customers'?'nav-item active':'nav-item'} onClick={()=>go('inquiries')}><span className="nav-mark">客</span><span>客户经营</span></button>
        <button className={view==='revenue'?'nav-item active':'nav-item'} onClick={()=>go('revenue')}><span className="nav-mark">收</span><span>收入归因</span></button>
        <p className="nav-section">平台管理</p>
        {([['structure','组织架构','组'],['permissions','权限与账号','权'],['data','数据管理','数'],['security','系统与安全','安']] as [View,string,string][]).map(x=><button key={x[0]} className={view===x[0]||(x[0]==='permissions'&&view==='accounts')?'nav-item active':'nav-item'} onClick={()=>go(x[0])}><span className="nav-mark">{x[2]}</span><span>{x[1]}</span></button>)}
      </nav>
      <div className="sidebar-footer"><div className="avatar">陈</div><div><strong>陈雨晴</strong><small>集团管理员</small></div><span>···</span></div>
    </aside>
    <section className="workspace">
      <header className="topbar">
        <div className="organization-trigger"><span className="crumb">{organization}</span><button type="button" className={topPanel==='organization'?'switcher active':'switcher'} aria-expanded={topPanel==='organization'} aria-controls="organization-panel" onClick={() => toggleTopPanel('organization')}>切换组织⌄</button></div>
        <div className="top-actions"><button type="button" className={topPanel==='search'?'search active':'search'} aria-label="打开全局搜索" aria-expanded={topPanel==='search'} aria-controls="global-search-panel" onClick={() => toggleTopPanel('search')}><span aria-hidden="true">⌕</span> 搜索项目、内容或客户</button><button type="button" className={topPanel==='agents'?'agent-status active':'agent-status'} aria-expanded={topPanel==='agents'} aria-controls="agent-status-panel" onClick={() => toggleTopPanel('agents')}><i aria-hidden="true"/>AI · {6-pausedAgents.length} 位运行中</button><button type="button" className={topPanel==='notifications'?'notice active':'notice'} aria-label={`${unread} 条未读通知`} aria-expanded={topPanel==='notifications'} aria-controls="notification-panel" onClick={() => toggleTopPanel('notifications')}><span aria-hidden="true">通</span>{unread > 0 && <b>{unread}</b>}</button></div>
        {topPanel && <button className="topbar-backdrop" aria-label="关闭顶部面板" onClick={() => setTopPanel(null)}/>}
        {topPanel==='organization' && <section id="organization-panel" className="topbar-popover org-switch-popover" aria-label="组织切换"><header><strong>切换组织</strong><small>决定页面默认数据范围</small></header>{['黔山国际产业集团','茶与食品事业部','国际增长中心','黔绿方舟品牌'].map(item=><button type="button" key={item} className={organization===item?'selected':''} onClick={()=>{setOrganization(item);setTopPanel(null);}}><span>{item.slice(0,1)}</span><div><strong>{item}</strong><small>{item===organization?'当前组织':'点击切换数据范围'}</small></div><em>{item===organization?'✓':'›'}</em></button>)}</section>}
        {topPanel==='search' && <section id="global-search-panel" className="topbar-popover global-search-popover" aria-label="全局搜索"><label><span aria-hidden="true">⌕</span><input autoFocus aria-label="搜索项目、客户或平台配置" value={searchQuery} onChange={event=>setSearchQuery(event.target.value)} placeholder="搜索项目、客户或平台配置…"/>{searchQuery && <button type="button" aria-label="清空搜索" onClick={()=>setSearchQuery('')}>×</button>}</label><div>{visibleSearchItems.map(item=><button type="button" key={item[0]} onClick={()=>go(item[2])}><span>{item[0]}</span><small>{item[1]}</small><em>打开 →</em></button>)}{visibleSearchItems.length===0&&<p>没有找到匹配内容，请尝试“权限”或“客户”。</p>}</div></section>}
        {topPanel==='agents' && <section id="agent-status-panel" className="topbar-popover agent-popover" aria-label="数字员工运行状态"><header><strong>数字员工运行状态</strong><small>可在 Demo 中暂停和恢复</small></header>{runtimeAgents.map(agent=>{const paused=pausedAgents.includes(agent[0]);return <div className="agent-runtime-row" key={agent[0]}><i className={paused?'paused':''}/><span><strong>{agent[0]}</strong><small>{paused?'已暂停':agent[1]}</small></span><button type="button" onClick={()=>setPausedAgents(current=>paused?current.filter(name=>name!==agent[0]):[...current,agent[0]])}>{paused?'恢复':'暂停'}</button></div>})}<footer><button type="button" onClick={()=>go('agents')}>打开数字员工中心 →</button></footer></section>}
        {topPanel==='notifications' && <section id="notification-panel" className="topbar-popover notification-popover" aria-label="通知与异常"><header><span><strong>通知与异常</strong><small>{unread > 0 ? `${unread} 条待处理` : '已全部阅读'}</small></span><button type="button" disabled={unread===0} onClick={()=>setUnread(0)}>全部标为已读</button></header>{[['Meta 授权将在 3 天后过期','账号连接','permissions'],['2 条渠道数据同步异常','数据管理','data'],['1 个预算申请等待审批','审批与异常','approvals']].map((item,index)=><button type="button" key={item[0]} onClick={()=>{setUnread(current=>Math.max(0,current-1));go(item[2] as View)}}><i className={index===0?'warn':''}/><span><strong>{item[0]}</strong><small>{item[1]} · {index+8}:2{index}</small></span><em>›</em></button>)}</section>}
      </header>
      <div className="page" data-view={view}>{view==='home'?<HomePage go={go}/>:view==='projects'?<ProjectsPage/>:view==='agents'?<AgentsPage/>:view==='approvals'?<ApprovalsPage/>:view==='content'?<ContentPage/>:view==='schedule'?<SchedulePage/>:view==='distribution'?<DistributionPage/>:view==='traffic'?<TrafficPage/>:view==='inquiries'?<InquiriesPage go={go}/>:view==='customers'?<CustomersPage go={go}/>:view==='revenue'?<RevenuePage/>:<PlatformManagementPage key={view} view={view as PlatformView}/>}</div>
    </section>
  </main>;
}
