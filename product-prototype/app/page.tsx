'use client';

import { useState } from 'react';

type View = 'home' | 'projects' | 'content' | 'traffic' | 'inquiries' | 'customers' | 'structure' | 'permissions' | 'accounts' | 'data' | 'security';

const agents = [
  { name: '市场策略 Agent', action: '完成马来西亚市场路径建议', unit: '项目管理', view: 'projects' as View, tone: 'blue' },
  { name: '内容策划 Agent', action: '生成首轮 36 个内容任务', unit: '内容创作', view: 'content' as View, tone: 'amber' },
  { name: '内容生产 Agent', action: '完成 18 个多平台版本', unit: '内容创作', view: 'content' as View, tone: 'violet' },
  { name: '分发增长 Agent', action: '发现 1 项预算优化机会', unit: '流量分发', view: 'traffic' as View, tone: 'green' },
  { name: '询盘接待 Agent', action: '识别 3 条高意向询盘', unit: '询盘中心', view: 'inquiries' as View, tone: 'cyan' },
  { name: '成交推进 Agent', action: '发现 2 个超期商机', unit: '客户管理', view: 'customers' as View, tone: 'red' },
];

const viewNames: Record<View, string> = {
  home: '首页', projects: '项目管理', content: '内容创作', traffic: '流量分发', inquiries: '询盘中心', customers: '客户管理',
  structure: '组织架构', permissions: '权限管理', accounts: '账号管理', data: '数据管理', security: '系统与安全',
};

function Metric({ label, value, change, warn }: { label: string; value: string; change?: string; warn?: boolean }) {
  return <article className="stat-card"><div><span>{label}</span><b>{value}</b></div>{change && <em className={warn ? 'metric-warn' : ''}>{change}</em>}</article>;
}

function PageHeader({ title, desc, action, secondary }: { title: string; desc: string; action?: string; secondary?: string }) {
  return <div className="page-heading"><div><p className="eyebrow">黔海 · {title}</p><h1>{title}</h1><p>{desc}</p></div><div className="header-actions">{secondary && <button className="secondary">{secondary}</button>}{action && <button className="primary">＋ {action}</button>}</div></div>;
}

function AgentNote({ agent, children, action = '查看建议' }: { agent: string; children: React.ReactNode; action?: string }) {
  return <aside className="agent-note"><div className="agent-note-head"><span className="agent-spark">AI</span><div><strong>{agent}</strong><small>基于当前项目数据</small></div><i>运行中</i></div><div className="agent-note-body">{children}</div><button>{action} <span>→</span></button></aside>;
}

function Tabs({ items, active, setActive }: { items: string[]; active: string; setActive: (value: string) => void }) {
  return <div className="tabs">{items.map(item => <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>{item}</button>)}</div>;
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
  const tabs = ['项目列表', '市场策略', '目标预算', '执行计划', '项目价值'];
  return <>
    <PageHeader title="项目管理" desc="用项目组织市场、内容、流量与成交目标。" action="新建项目" secondary="AI 生成项目方案" />
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
    </> : <ProjectDetail tab={tab} />}
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
  const tabs = ['内容计划', '创作工作台', '素材库', '内容审核', '内容库'];
  return <>
    <PageHeader title="内容创作" desc="把项目策略转化为可审核、可分发、可转化的证据型内容。" action="创建内容" />
    <div className="context-strip"><span>当前项目</span><strong>贵州抹茶东南亚渠道增长</strong><i>／</i><span>Campaign</span><strong>马来西亚食品原料商获客</strong><button>切换⌄</button></div>
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

function TrafficPage() {
  const [tab, setTab] = useState('投流管理');
  const tabs = ['分发计划', '投流管理', '受众', '流量分析', '优化建议'];
  return <>
    <PageHeader title="流量分发" desc="统一管理自然分发、定向投流和海外流量质量。" action="创建分发计划" secondary="创建投流计划" />
    <Tabs items={tabs} active={tab} setActive={setTab} />
    <div className="stat-grid five"><Metric label="海外曝光" value="184万" change="+22.4%"/><Metric label="目标市场触达" value="132万"/><Metric label="精准访问" value="26,480" change="+18.6%"/><Metric label="有效询盘" value="186" change="+24.1%"/><Metric label="单条询盘成本" value="¥ 1,172" change="-14.3%"/></div>
    <div className="two-col-wide"><section className="panel table-panel"><div className="panel-title"><div><h2>{tab}</h2><p>当前项目 · 2026.08.15 — 08.28</p></div><button>导出报告</button></div>
      {tab === '投流管理' || tab === '优化建议' ? <div className="data-table traffic-table"><div className="tr th"><span>Campaign</span><span>平台</span><span>预算／消耗</span><span>访问</span><span>询盘</span><span>合格客户</span><span>商机贡献</span></div>{[
        ['工厂品质验证','LinkedIn','¥72K / ¥61K','6,800','63','31','¥142万'],['应用场景获客','Meta','¥88K / ¥79K','12,400','71','19','¥98万'],['采购需求搜索','Google','¥54K / ¥48K','4,900','38','12','¥116万'],['品牌认知视频','YouTube','¥36K / ¥30K','2,380','14','5','¥36万'],
      ].map(r=><button className="tr" key={r[0]}>{r.map((x,i)=><span key={i} className={i===0?'strong-cell':''}>{x}</span>)}</button>)}</div> : <TrafficVisual tab={tab}/>} 
    </section><AgentNote agent="分发增长 Agent" action="审批预算调整"><h3>建议重新分配 20% 预算</h3><p>“渠道利润与合作政策”内容的合格询盘率高出消费场景短片 38%。</p><div className="impact"><span><b>+12</b> 有效询盘</span><span><b>+4</b> 合格客户</span><span><b>¥3,200</b> 预计节省</span></div></AgentNote></div>
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
    <PageHeader title="询盘中心" desc="统一承接评论、私信、邮件、表单与 WhatsApp。" />
    <div className="stat-grid five"><Metric label="今日新增" value="18" change="+6"/><Metric label="待处理" value="32" change="需要响应" warn/><Metric label="高意向" value="11"/><Metric label="平均首次响应" value="16 分钟" change="-21%"/><Metric label="本月转客户率" value="36%" change="+4.8%"/></div>
    <div className="inquiry-layout">
      <aside className="inquiry-list"><div className="list-search">搜索询盘或企业</div>{inquiries.map((item,i)=><button key={item[0]} className={selected===i?'active':''} onClick={()=>setSelected(i)}><span className="contact-avatar">{item[0].slice(0,1)}</span><span><strong>{item[0]} <em>{item[4]}</em></strong><small>{item[1]} · {item[2]}</small><p>{item[3]}</p></span></button>)}</aside>
      <section className="conversation"><header><div><strong>{q[0]}</strong><small>{q[1]} · {q[2]}</small></div><button>查看来源内容</button></header><div className="messages"><p className="system-msg">来自 LinkedIn · 工厂品质视频 · 今天 10:42</p><div className="bubble inbound">Hi, we are looking for a stable matcha supplier for our beverage clients. Could you share the specifications, sample options and a quote for 500kg?</div><div className="translation">AI 翻译：我们正在为饮品客户寻找稳定的抹茶供应商，希望获取规格、样品方案以及 500kg 报价。</div><div className="bubble outbound draft"><span>AI 回复草稿</span>Hi Adrian, thank you for reaching out. I can share our export specification and sample options. Before preparing the right quote, may I confirm your required grade and target application?</div></div><footer><input aria-label="回复询盘" placeholder="输入回复，或采用 AI 草稿…"/><button>发送</button></footer></section>
      <AgentNote agent="询盘接待 Agent" action="转为客户并创建商机"><h3>高意向渠道商询盘</h3><dl className="agent-facts"><dt>企业类型</dt><dd>食品原料进口商</dd><dt>渠道匹配度</dt><dd>高</dd><dt>采购需求</dt><dd>500kg 首批测试</dd><dt>建议负责人</dt><dd>海外业务部 · 王宁</dd></dl><p>建议先发送英文规格书，确认认证要求，再安排样品和阶梯报价。</p><button className="link-button" onClick={()=>go('customers')}>查看客户档案 →</button></AgentNote>
    </div>
  </>;
}

function CustomersPage() {
  const [tab, setTab] = useState('客户列表');
  const tabs = ['客户列表','商机看板','跟进任务','报价订单','转化归因'];
  return <>
    <PageHeader title="客户管理" desc="把合格询盘持续推进到样品、报价和订单。" action="新建客户" />
    <Tabs items={tabs} active={tab} setActive={setTab}/>
    <div className="stat-grid five"><Metric label="合格客户" value="67" change="+12"/><Metric label="活跃商机" value="21"/><Metric label="报价中" value="8"/><Metric label="成交订单" value="3"/><Metric label="成交金额" value="¥126万" change="3.8× 投入"/></div>
    <div className="two-col-wide"><section className="panel table-panel"><div className="panel-title"><div><h2>{tab}</h2><p>当前项目 · 贵州抹茶东南亚渠道增长</p></div><button>筛选⌄</button></div>
      {tab === '商机看板' ? <DealBoard/> : tab === '转化归因' ? <Attribution/> : <CustomerTable mode={tab}/>} 
    </section><AgentNote agent="成交推进 Agent" action="生成跟进任务"><h3>Lumi Ingredients · 报价阶段</h3><div className="impact"><span><b>¥68万</b> 商机金额</span><span><b>65%</b> 成交概率</span></div><p>对方已确认首批采购量，但尚未确认区域授权条件。建议今天发送阶梯报价、区域说明和市场支持计划。</p><small className="risk-note">风险：清真认证文件仍待补充</small></AgentNote></div>
  </>;
}

function CustomerTable({ mode }: { mode: string }) {
  const rows = mode === '报价订单' ? [['SO-202608-003','Lumi Ingredients','1,200kg','¥68万','已确认'],['QT-202608-014','Pacific Beverage SG','2,000kg','¥110万','待审批'],['QT-202608-012','GreenCup Distribution','800kg','¥42万','已发送']] : mode === '跟进任务' ? [['今天 14:00','Lumi Ingredients','确认认证与区域政策','王宁','高'],['今天 16:30','GreenCup Distribution','跟进样品签收','林悦','中'],['明天 10:00','Pacific Beverage SG','准备采购会议','王宁','高']] : [['Lumi Ingredients','马来西亚','原料进口商','报价','¥68万','王宁'],['GreenCup Distribution','马来西亚','饮品经销商','样品','¥42万','林悦'],['Pacific Beverage SG','新加坡','连锁渠道','商务会议','¥110万','王宁']];
  return <div className="data-table customer-table"><div className="tr th">{(mode==='报价订单'?['单号','客户','数量','金额','状态']:mode==='跟进任务'?['时间','客户','任务','负责人','优先级']:['企业','国家','类型','阶段','商机金额','负责人']).map(h=><span key={h}>{h}</span>)}</div>{rows.map(r=><button className="tr" key={r[0]}>{r.map((x,i)=><span key={i} className={i===0?'strong-cell':''}>{x}</span>)}</button>)}</div>;
}

function DealBoard(){const columns: Array<[string,string[]]>=[['合格线索',['Maya Food','Nusa Ingredients']],['样品／会议',['GreenCup','Pacific Beverage']],['报价',['Lumi Ingredients','TeaWorks MY']],['商务谈判',['Golden Leaf']],['成交',['Lumi Ingredients · SO-003']]];return <div className="deal-board">{columns.map(([stage,customers])=><div key={stage}><strong>{stage} <em>{customers.length}</em></strong>{customers.map(customer=><button key={customer}><span>{customer}</span><small>¥ 42—110万</small></button>)}</div>)}</div>}

function Attribution(){return <div className="attribution"><div><span>首次触点</span><b>LinkedIn 工厂品质视频</b><small>8月18日 · 自然触达</small></div><i>→</i><div><span>内容承接</span><b>英文规格书落地页</b><small>访问 3 次 · 下载 1 次</small></div><i>→</i><div><span>询盘</span><b>WhatsApp 样品咨询</b><small>8月20日 · 高意向</small></div><i>→</i><div><span>订单</span><b>SO-202608-003</b><small>成交 ¥68万</small></div></div>}

function OrganizationPage({ view }: { view: View }) {
  const configs: Record<View, {desc:string; metrics:string[][]}> = {
    structure:{desc:'配置事业部、品牌、项目组及外部协作关系。',metrics:[['组织节点','12'],['事业部','3'],['品牌','6'],['成员','84']]},
    permissions:{desc:'管理角色、数据范围、审批流程与 Agent 行动边界。',metrics:[['预置角色','8'],['权限策略','36'],['审批流程','9'],['异常权限','1']]},
    accounts:{desc:'统一管理登录账号、社媒账号、广告账户和沟通渠道。',metrics:[['平台连接','31'],['正常','28'],['即将过期','2'],['待验证','1']]},
    data:{desc:'管理数据源、字段映射、质量、导入导出和保留策略。',metrics:[['数据完整率','96.8%'],['数据源','18'],['待匹配询盘','14'],['同步异常','2']]},
    security:{desc:'配置登录安全、自动化边界、审计日志和 API。',metrics:[['安全评分','92'],['MFA 覆盖','86%'],['今日审计事件','248'],['高风险动作','0']]},
    home:{desc:'',metrics:[]},projects:{desc:'',metrics:[]},content:{desc:'',metrics:[]},traffic:{desc:'',metrics:[]},inquiries:{desc:'',metrics:[]},customers:{desc:'',metrics:[]},
  };
  const item=configs[view];
  return <><PageHeader title={viewNames[view]} desc={item.desc} action={view==='structure'?'新建组织节点':undefined}/><div className="stat-grid four">{item.metrics.map(m=><Metric key={m[0]} label={m[0]} value={m[1]}/>)}</div><section className="panel org-panel">{view==='structure'?<OrgTree/>:view==='permissions'?<PermissionMatrix/>:view==='accounts'?<AccountGrid/>:view==='data'?<DataManagement/>:<SecurityPage/>}</section></>;
}

function OrgTree(){return <div className="org-layout"><div className="org-tree"><h3>黔山国际产业集团</h3>{['国际增长中心','茶与食品事业部','　├ 黔绿方舟品牌','　└ 山王果品牌','工业品事业部','　└ 黔轮制造品牌','外部合作团队'].map((x,i)=><button className={i===1?'active':''} key={x}>{x}<small>{[18,32,16,11,21,13,13][i]} 人</small></button>)}</div><div className="org-detail"><span>事业部</span><h2>茶与食品事业部</h2><p>负责茶、刺梨与特色食品品牌的国内外增长项目。</p><div className="mini-metrics"><div><span>负责人</span><b>陈妍</b><small>事业部总经理</small></div><div><span>品牌</span><b>2</b><small>黔绿方舟、山王果</small></div><div><span>增长项目</span><b>5</b><small>3 个进行中</small></div></div></div></div>}

function PermissionMatrix(){const roles=['集团管理员','事业部负责人','项目负责人','内容运营','内容审核','投流人员','海外销售','外部协作者']; return <div><div className="panel-title"><div><h2>角色与权限矩阵</h2><p>同时控制功能动作和组织／品牌／项目数据范围</p></div><button>编辑权限</button></div><div className="permission-table"><div className="ptr head"><span>角色</span>{['项目','内容','投流','询盘','报价订单','Agent'].map(x=><span key={x}>{x}</span>)}</div>{roles.map((r,i)=><div className="ptr" key={r}><strong>{r}</strong>{[0,1,2,3,4,5].map(j=><span key={j} className={(i+j)%4===0?'limited':''}>{(i+j)%4===0?'审批':i===7&&j>2?'—':'✓'}</span>)}</div>)}</div></div>}

function AccountGrid(){return <div><div className="panel-title"><div><h2>平台与账号连接</h2><p>账号归属、可用项目、授权范围和连接状态</p></div><button>连接新账号</button></div><div className="account-grid">{[['LinkedIn','4','正常'],['Meta','6','1 个即将过期'],['Google Ads','2','正常'],['YouTube','3','正常'],['WhatsApp Business','4','正常'],['企业邮箱','12','2 个待验证']].map((a,i)=><button key={a[0]}><span className={`platform-icon p${i}`}>{a[0][0]}</span><span><strong>{a[0]}</strong><small>{a[1]} 个账号</small></span><em className={a[2]==='正常'?'good':'warn'}>{a[2]}</em></button>)}</div></div>}

function DataManagement(){return <div><div className="panel-title"><div><h2>数据质量</h2><p>数据源、字段映射、导入导出和保留策略</p></div><button>立即同步</button></div><div className="data-health"><div className="health-score"><b>96.8%</b><span>整体完整率</span></div>{[['客户重复记录','27','建议合并'],['待匹配询盘','14','需要确认'],['异常渠道数据','2','正在重试'],['最近同步','3 分钟前','全部数据源']].map(x=><button key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></button>)}</div></div>}

function SecurityPage(){return <div><div className="panel-title"><div><h2>Agent 与系统安全边界</h2><p>高风险动作必须经过人工确认</p></div><button>查看审计日志</button></div><div className="security-list">{[['市场策略 Agent','可读取项目与市场数据','不可修改预算'],['内容生产 Agent','可生成内容','发布前必须人工审核'],['分发增长 Agent','可生成投流方案','预算调整必须审批'],['询盘接待 Agent','可生成回复','价格与代理承诺禁止自动发送'],['成交推进 Agent','可创建跟进任务','不可自动报价或确认订单']].map(x=><div key={x[0]}><span className="agent-spark">AI</span><span><strong>{x[0]}</strong><small>{x[1]}</small></span><em>{x[2]}</em><button>配置</button></div>)}</div></div>}

export default function Home() {
  const [view, setView] = useState<View>('home');
  const go = (next: View) => setView(next);
  const dealOpen = view === 'inquiries' || view === 'customers';
  const orgOpen = ['structure','permissions','accounts','data','security'].includes(view);
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-logo">黔</span><div><strong>黔海</strong><small>Global Growth OS</small></div></div>
      <nav className="main-nav" aria-label="主导航">
        <button className={view==='home'?'nav-item active':'nav-item'} onClick={()=>go('home')}><span className="nav-mark">⌂</span><span>首页</span></button>
        <p className="nav-section">功能单元</p>
        <button className={view==='projects'?'nav-item active':'nav-item'} onClick={()=>go('projects')}><span className="nav-mark">项</span><span>项目管理</span></button>
        <button className={view==='content'?'nav-item active':'nav-item'} onClick={()=>go('content')}><span className="nav-mark">创</span><span>内容创作</span></button>
        <button className={view==='traffic'?'nav-item active':'nav-item'} onClick={()=>go('traffic')}><span className="nav-mark">流</span><span>流量分发</span></button>
        <button className={dealOpen?'nav-item active-parent':'nav-item'} onClick={()=>go('inquiries')}><span className="nav-mark">成</span><span>成交管理</span><b>⌄</b></button>
        <div className="subnav"><button className={view==='inquiries'?'active':''} onClick={()=>go('inquiries')}>询盘中心</button><button className={view==='customers'?'active':''} onClick={()=>go('customers')}>客户管理</button></div>
        <button className={orgOpen?'nav-item active-parent':'nav-item'} onClick={()=>go('structure')}><span className="nav-mark">组</span><span>组织管理</span><b>⌄</b></button>
        <div className="subnav org-sub">{([['structure','组织架构'],['permissions','权限管理'],['accounts','账号管理'],['data','数据管理'],['security','系统与安全']] as [View,string][]).map(x=><button key={x[0]} className={view===x[0]?'active':''} onClick={()=>go(x[0])}>{x[1]}</button>)}</div>
      </nav>
      <div className="sidebar-footer"><div className="avatar">陈</div><div><strong>陈雨晴</strong><small>集团管理员</small></div><span>···</span></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><span className="crumb">黔山国际产业集团</span><button className="switcher">切换组织⌄</button></div><div className="top-actions"><button className="search">搜索项目、内容或客户</button><button className="agent-status">AI · 6 位运行中</button><button className="notice">3</button></div></header>
      <div className="page">{view==='home'?<HomePage go={go}/>:view==='projects'?<ProjectsPage/>:view==='content'?<ContentPage/>:view==='traffic'?<TrafficPage/>:view==='inquiries'?<InquiriesPage go={go}/>:view==='customers'?<CustomersPage/>:<OrganizationPage view={view}/>}</div>
    </section>
  </main>;
}
