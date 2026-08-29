'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PlatformManagementPage, type PlatformView } from './components/platform-management';

const recordAction=(action:string,description:string)=>fetch('/api/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,description})}).catch(()=>null);
const appFeedback=(title:string,desc:string)=>{void recordAction(title,desc);window.dispatchEvent(new CustomEvent('qianhai-feedback',{detail:{title,desc}}));};
import { CustomerOperationsPage as CustomerOperationsOverview, type CustomerWorkspaceTarget } from './customer-operations-page';
import { CustomerWorkbenchPage, type WorkbenchTab } from './customer-workbench-page';
import { RevenueAnalysisPage } from './revenue-analysis-page';
import { EnterpriseKnowledgePage } from './enterprise-knowledge-page';
import { PROJECTS } from './market-taxonomy';
import { SUPPORTED_PLATFORMS } from './supported-platforms';
import { decideStrategyLocally, strategyMeta, type CreationStrategy, type StrategyDecision, type StrategyInput, type VideoWorkflow } from '../lib/content-agent';
import { requestAi } from '../lib/ai-client';
import type { AiResult } from '../lib/ai';

type View = 'home' | 'projects' | 'agents' | 'approvals' | 'content' | 'schedule' | 'distribution' | 'traffic' | 'inquiries' | 'workbench' | 'customerLive' | 'customers' | 'revenue' | 'structure' | 'permissions' | 'accounts' | 'knowledge' | 'data' | 'security';
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
  home: '首页', projects: '经营任务', agents: '执行动态', approvals: '审批与异常', content: '内容与素材', schedule: '排期与分发', distribution: '分发管理', traffic: '广告投放', inquiries: '客户经营', workbench: '客户工作台', customerLive: '客户工作现场', customers: '客户与商机', revenue: '收入分析',
  structure: '组织架构', permissions: '权限管理', accounts: '账号管理', knowledge: '企业知识库', data: '数据管理', security: '系统与安全',
};

function Metric({ label, value, change, warn }: { label: string; value: string; change?: string; warn?: boolean }) {
  return <article className="stat-card"><div><span>{label}</span><b>{value}</b></div>{change && <em className={warn ? 'metric-warn' : ''}>{change}</em>}</article>;
}

function PageHeader({ title, desc, action, secondary, onAction, onSecondary }: { title: string; desc: string; action?: string; secondary?: string; onAction?: () => void; onSecondary?: () => void }) {
  return <div className="page-heading"><div><p className="eyebrow">黔海 · {title}</p><h1>{title}</h1><p>{desc}</p></div><div className="header-actions">{secondary && <button className="secondary" onClick={onSecondary}>{secondary}</button>}{action && <button className="primary" onClick={onAction}>＋ {action}</button>}</div></div>;
}

function ActionDialog({ title, desc, confirm='确认', onClose, onConfirm }: { title:string; desc:string; confirm?:string; onClose:()=>void; onConfirm?:()=>void }) {
  const [note,setNote]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const submit=async()=>{setSubmitting(true);await recordAction(`dialog.${confirm}`,`${title}：${note||desc}`);onConfirm?.();setSubmitting(false);onClose()};
  return <div className="action-dialog-backdrop" onMouseDown={onClose}><section className="action-dialog" onMouseDown={e=>e.stopPropagation()}><header><span>黔海工作台</span><button onClick={onClose}>×</button></header><h2>{title}</h2><p>{desc}</p><label>补充说明（可选）<textarea value={note} onChange={event=>setNote(event.target.value)} placeholder="输入处理说明，相关记录将写入行动账本"/></label><footer><button onClick={onClose}>取消</button><button disabled={submitting} className="primary" onClick={submit}>{submitting?'正在提交…':confirm}</button></footer></section></div>;
}

type OnboardingStage = 'auth' | 'setup' | null;
type SetupData = { company:string; industry:string; product:string; market:string; autonomy:string };

type OnboardingClaimResponse = {
  shouldStartOnboarding?: boolean;
  error?: { message?: string };
};

class OnboardingClaimError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'OnboardingClaimError';
  }
}

async function claimFirstLoginOnboarding(signal?: AbortSignal): Promise<boolean> {
  const response = await fetch('/api/onboarding/first-login', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    signal,
  });
  const payload = await response.json().catch(() => null) as OnboardingClaimResponse | null;
  if (!response.ok) {
    throw new OnboardingClaimError(response.status, payload?.error?.message ?? '新手任务状态确认失败');
  }
  if (typeof payload?.shouldStartOnboarding !== 'boolean') {
    throw new OnboardingClaimError(502, '新手任务接口返回了无效结果');
  }
  return payload.shouldStartOnboarding;
}

function OnboardingFlow({stage,onStageChange,onComplete,onSkip,onAuthenticate}:{stage:OnboardingStage;onStageChange:(stage:OnboardingStage)=>void;onComplete:(data:SetupData)=>void;onSkip:()=>void;onAuthenticate:()=>Promise<boolean>}) {
  const [authMode,setAuthMode]=useState<'register'|'login'>('register');
  const [step,setStep]=useState(1);
  const [data,setData]=useState<SetupData>({company:'贵州茶产业演示账号',industry:'贵州茶产业',product:'贵州茶',market:'马来西亚',autonomy:'审批后执行'});
  const [authSubmitting,setAuthSubmitting]=useState(false);
  const [authError,setAuthError]=useState('');
  if(!stage)return null;
  const update=(key:keyof SetupData,value:string)=>setData(current=>({...current,[key]:value}));
  const finish=()=>onComplete(data);
  const submitAuth=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError('');
    try {
      const shouldStartOnboarding=await onAuthenticate();
      if(shouldStartOnboarding){setStep(1);onStageChange('setup')}
      else onSkip();
    } catch(error) {
      setAuthError(error instanceof Error?error.message:'登录状态确认失败，请稍后重试');
    } finally {
      setAuthSubmitting(false);
    }
  };
  return <div className="onboarding-backdrop" role="presentation">
    <section className={`onboarding-card ${stage==='setup'?'setup-card':''}`} role="dialog" aria-modal="true" aria-label={stage==='auth'?'登录或注册':'首次使用引导'}>
      <div className="onboarding-brand"><span>黔</span><p><strong>黔海</strong><small>Global Growth OS</small></p></div>
      {stage==='auth'?<>
        <div className="auth-welcome"><span className="onboarding-kicker">企业出海增长工作台</span><h1>{authMode==='register'?'创建你的黔海账号':'欢迎回来'}</h1><p>{authMode==='register'?'用 3 步建立第一个出海经营任务。':'登录后继续管理你的经营任务。'}</p></div>
        <div className="auth-tabs" role="tablist"><button className={authMode==='register'?'active':''} onClick={()=>{setAuthMode('register');setAuthError('')}}>注册</button><button className={authMode==='login'?'active':''} onClick={()=>{setAuthMode('login');setAuthError('')}}>登录</button></div>
        <form className="auth-form" onSubmit={submitAuth}>
          {authMode==='register'&&<label><span>姓名</span><input required defaultValue="陈雨晴" placeholder="请输入姓名" autoComplete="name"/></label>}
          <label><span>工作邮箱</span><input required type="email" defaultValue="chen@qianshan-global.cn" placeholder="name@company.com" autoComplete="email"/></label>
          <label><span>密码</span><input required type="password" defaultValue="qianhai2026" minLength={8} autoComplete={authMode==='register'?'new-password':'current-password'}/></label>
          {authError&&<p className="auth-error" role="alert">{authError}</p>}
          <button className="onboarding-primary" type="submit" disabled={authSubmitting}>{authSubmitting?'正在确认账号…':authMode==='register'?'注册并开始配置':'登录'} {!authSubmitting&&<b>→</b>}</button>
        </form>
        <div className="auth-trust"><span>✓ 企业数据隔离</span><span>✓ 全程行动留痕</span><span>✓ 关键操作需审批</span></div>
        <button className="onboarding-skip" onClick={onSkip}>先看看演示工作台</button>
      </>:<>
        <header className="setup-head"><div><span className="onboarding-kicker">首次使用引导</span><h1>{step===1?'先让我们了解你的企业':step===2?'建立第一个出海目标':'设定数字员工的边界'}</h1><p>{step===1?'这些信息会帮助 AI 理解你的业务。':step===2?'我们将据此生成首个经营任务。':'你可以随时在权限管理中调整。'}</p></div><button className="setup-close" onClick={onSkip} aria-label="跳过引导">×</button></header>
        <div className="setup-progress">{[1,2,3].map(item=><div key={item} className={item===step?'active':item<step?'done':''}><i>{item<step?'✓':item}</i><span>{item===1?'企业信息':item===2?'产品与市场':'执行权限'}</span></div>)}</div>
        <div className="setup-body">
          {step===1&&<div className="setup-fields"><label><span>企业名称</span><input value={data.company} onChange={e=>update('company',e.target.value)}/></label><label><span>所属产业</span><input value="贵州茶产业" readOnly aria-readonly="true"/></label><aside><b>AI</b><p><strong>当前账号范围</strong><small>仅用于贵州茶行业的市场、采购角色和合规匹配。</small></p></aside></div>}
          {step===2&&<div className="setup-fields"><label><span>首个出海产品</span><input value={data.product} onChange={e=>update('product',e.target.value)}/></label><label><span>优先目标市场</span><select value={data.market} onChange={e=>update('market',e.target.value)}><option>马来西亚</option><option>新加坡</option><option>泰国</option><option>阿联酋</option><option>欧盟</option></select></label><div className="setup-preview"><span>将为你生成</span><strong>{data.product} · {data.market}市场获客任务</strong><small>包含市场策略、内容计划、分发节奏与询盘承接。</small></div></div>}
          {step===3&&<div className="autonomy-options">{[['建议模式','AI 只生成建议，所有动作由人工执行'],['审批后执行','AI 完成草案，经你确认后对外执行'],['边界内自主','低风险动作自动执行，重要事项仍需审批']].map((option,index)=><button key={option[0]} className={data.autonomy===option[0]?'active':''} onClick={()=>update('autonomy',option[0])}><i>{index===0?'○':index===1?'✓':'✦'}</i><span><strong>{option[0]}{index===1&&<em>推荐</em>}</strong><small>{option[1]}</small></span><b>{data.autonomy===option[0]?'●':'○'}</b></button>)}<p className="permission-note">价格、交期、认证与独家合作默认始终需要人工确认。</p></div>}
        </div>
        <footer className="setup-actions"><button className="onboarding-skip" onClick={onSkip}>稍后再说</button><div>{step>1&&<button className="onboarding-secondary" onClick={()=>setStep(current=>current-1)}>上一步</button>}<button className="onboarding-primary" disabled={(step===1&&!data.company)||(step===2&&!data.product)} onClick={()=>step<3?setStep(current=>current+1):finish()}>{step===3?'创建第一个经营任务':'继续'} <b>→</b></button></div></footer>
      </>}
    </section>
  </div>;
}

function AgentNote({ agent, children, action = '查看建议', onAction }: { agent: string; children: React.ReactNode; action?: string; onAction?: () => void }) {
  return <aside className="agent-note"><div className="agent-note-head"><span className="agent-spark">AI</span><div><strong>{agent}</strong><small>基于当前项目数据</small></div><i>运行中</i></div><div className="agent-note-body">{children}</div><button onClick={onAction}>{action} <span>→</span></button></aside>;
}

function Tabs({ items, active, setActive }: { items: string[]; active: string; setActive: (value: string) => void }) {
  return <div className="tabs">{items.map(item => <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>{item}</button>)}</div>;
}

type NavIconName = 'home' | 'tasks' | 'approval' | 'content' | 'calendar' | 'ads' | 'growth' | 'workbench' | 'revenue' | 'org' | 'permission' | 'knowledge' | 'data' | 'security';

function NavIcon({ name }: { name: NavIconName }) {
  const icon = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/></>,
    tasks: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5M8 16h3"/><path d="m14.5 16 1.5 1.5 3-3"/></>,
    approval: <><path d="M9 4h6l1 2h3v15H5V6h3l1-2Z"/><path d="m8.5 13 2.2 2.2 4.8-5"/></>,
    content: <><path d="M4 3h11l5 5v13H4Z"/><path d="M14 3v6h6M8 13h8M8 17h6"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="m8 15 2 2 5-5"/></>,
    ads: <><path d="m4 13 12-5v11L4 14Z"/><path d="M16 11.5c2 0 4-1.5 4-3.5M7 14.5 8.5 21h4L11 13"/></>,
    growth: <><path d="M4 19V9M10 19V5M16 19v-7M2 19h20"/><path d="m15 6 3-3 3 3M18 3v9"/></>,
    workbench: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v3h4v-3"/></>,
    revenue: <><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.8-.8-2-1.2-3.3-1.2-1.8 0-3.2.9-3.2 2.2 0 3.5 6.5 1.2 6.5 4.8 0 1.4-1.5 2.4-3.5 2.4-1.5 0-2.9-.5-3.8-1.4M12 5.5v13"/></>,
    org: <><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/></>,
    permission: <><path d="M12 3 5 6v5c0 4.8 2.8 8.2 7 10 4.2-1.8 7-5.2 7-10V6Z"/><path d="M9.5 12a2.5 2.5 0 1 1 5 0v3h-5Z"/></>,
    knowledge: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22Z"/></>,
    data: <><ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
    security: <><path d="M7 10V8a5 5 0 0 1 10 0v2"/><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M12 14v3"/></>,
  }[name];
  return <span className="nav-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg></span>;
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
  const [period,setPeriod]=useState<'本月'|'本季度'>('本月');
  const [dayGreeting,setDayGreeting]=useState('你好');
  const [aiSummary,setAiSummary]=useState<AiResult|null>(null);
  useEffect(()=>{let active=true;void Promise.resolve().then(()=>{if(!active)return;const hour=new Date().getHours();setDayGreeting(hour<6?'夜深了':hour<9?'早上好':hour<12?'上午好':hour<14?'中午好':hour<17?'下午好':hour<20?'傍晚好':'晚上好')});return()=>{active=false}},[]);
  const metrics = useMemo(()=>period === '本月' ? [
    {label:'获得精准流量',value:'38,420',goal:'目标 48,000',rate:80,delta:'同比 +18.6%',tone:'blue'},
    {label:'晋级筛选型盘',value:'333',goal:'目标 420',rate:79,delta:'同比 +24.1%',tone:'violet'},
    {label:'新增活跃商家',value:'42',goal:'目标 56',rate:75,delta:'同比 +8.3%',tone:'green'},
    {label:'累计成交金额',value:'¥ 126万',goal:'目标 ¥ 200万',rate:63,delta:'同比 +31.5%',tone:'cyan'},
  ] : [
    {label:'获得精准流量',value:'112,600',goal:'目标 144,000',rate:78,delta:'同比 +16.8%',tone:'blue'},
    {label:'晋级筛选型盘',value:'926',goal:'目标 1,200',rate:77,delta:'同比 +20.5%',tone:'violet'},
    {label:'新增活跃商家',value:'118',goal:'目标 160',rate:74,delta:'同比 +11.6%',tone:'green'},
    {label:'累计成交金额',value:'¥ 356万',goal:'目标 ¥ 600万',rate:59,delta:'同比 +27.8%',tone:'cyan'},
  ],[period]);
  useEffect(()=>{let active=true;requestAi('executive_summary',{period,metrics,focus:[{title:'3 条高意向询盘等待接管',amount:'¥86万'},{title:'贵州茶项目询盘转化低于目标',gap:'22%'},{title:'第二轮投流预算需要确认',budget:'¥8万'}],funnel:[['精准访问',38420],['有效询盘',333],['合格商机',42],['已成交',8]]}).then(result=>{if(active)setAiSummary(result)}).catch(()=>{});return()=>{active=false}},[period,metrics]);
  return <>
    <div className="home-command-head">
      <div><p className="eyebrow">组织经营总览</p><h1>{dayGreeting}，陈雨晴</h1><p>先看结果与偏差，再处理需要你决策的事。</p></div>
      <div className="home-head-actions"><div className="period-switch" aria-label="时间范围"><button className={period==='本月'?'active':''} onClick={()=>setPeriod('本月')}>本月</button><button className={period==='本季度'?'active':''} onClick={()=>setPeriod('本季度')}>本季度</button></div><button className="primary" onClick={()=>setDialog(true)}>＋ 新建经营任务</button></div>
    </div>
    <div className="home-data-meta"><span>黔山国际产业集团 · 全部事业部</span><span><i/>数据已更新至今日 10:28</span></div>
    <section className="outcome-strip" aria-label="经营结果">{metrics.map(metric=><button key={metric.label} className="outcome-metric" onClick={()=>go(metric.label.includes('成交')?'revenue':metric.label.includes('型盘')?'inquiries':'projects')}><span className="metric-label">{metric.label}<i title="点击查看口径与明细">ⓘ</i></span><span className="metric-value">{metric.value}</span><span className="metric-context"><em>{metric.goal}</em><b>{metric.delta}</b></span><span className="metric-progress"><i className={metric.tone} style={{width:`${metric.rate}%`}}/></span><span className="metric-rate">目标达成 {metric.rate}%</span></button>)}</section>

    <div className="home-priority-grid">
      <section className="home-focus panel">
        <div className="home-section-title"><div><span className="section-kicker">今日焦点</span><h2>3 件事最影响本月目标</h2></div><button onClick={()=>go('approvals')}>全部待处理 12 →</button></div>
        {[
          {level:'高',title:'3 条高意向询盘等待接管',desc:`${PROJECTS.matcha.name} · 最长已等待 18 分钟`,impact:'预计影响 ¥ 86万商机',view:'inquiries'},
          {level:'中',title:'贵州茶项目询盘转化低于目标 22%',desc:'马来西亚 · 连续 4 天下滑',impact:'AI 已生成调整方案',view:'projects'},
          {level:'中',title:'第二轮投流预算需要确认',desc:`${PROJECTS.matcha.name} · 申请追加 ¥ 8万`,impact:'预计新增 12–18 个询盘',view:'traffic'},
        ].map(item=><button className="focus-row" key={item.title} onClick={()=>go(item.view as View)}><span className={`focus-level ${item.level==='高'?'high':''}`}>{item.level}</span><span><strong>{item.title}</strong><small>{item.desc}</small></span><em>{item.impact}</em><b>→</b></button>)}
      </section>
      <aside className="panel funnel-panel">
        <div className="home-section-title"><div><span className="section-kicker">增长链路</span><h2>转化效率</h2></div><button onClick={()=>go('revenue')}>查看归因</button></div>
        <div className="funnel-list">{[
          ['精准访问','38,420','100%',''],['有效询盘','333','0.87%','+0.12%'],['合格商机','42','12.6%','-1.8%'],['已成交','8','19.0%','+3.4%']
        ].map((item,i)=><div key={item[0]}><span><i style={{width:`${100-i*18}%`}}/></span><strong>{item[0]}</strong><b>{item[1]}</b><small>{item[2]}</small><em className={item[3].startsWith('-')?'down':''}>{item[3]}</em></div>)}</div>
        <button className="funnel-insight" onClick={()=>go('projects')}><span>AI</span><p><strong>{aiSummary?.headline||'正在分析经营重点'}</strong><small>{aiSummary?.summary||'结合目标、漏斗和待办生成摘要…'}</small></p><b>→</b></button>
      </aside>
    </div>

    <section className="mission-board panel">
      <div className="home-section-title"><div><span className="section-kicker">经营任务</span><h2>项目健康与目标偏差</h2></div><button onClick={()=>go('projects')}>查看全部 8 个项目 →</button></div>
      <div className="mission-row head"><span>经营任务</span><span>阶段</span><span>目标达成</span><span>商机管道</span><span>投入产出</span><span>当前信号</span></div>
      {[
        [PROJECTS.matcha.name,'商机推进','78%','¥ 486万','6.8×','3 条高意向询盘','good'],
      ].map(row=><button className="mission-row" key={row[0]} onClick={()=>go('projects')}><span><i className={`mission-dot ${row[6]}`}/><strong>{row[0]}</strong></span><span>{row[1]}</span><span><b>{row[2]}</b><i className="mini-track"><i style={{width:row[2]}}/></i></span><span>{row[3]}</span><span>{row[4]}</span><span><small className={row[6]}>{row[5]}</small></span></button>)}
    </section>
    <div className="home-footer-note"><span><i/>数据健康 96%</span><span>6 位数字员工运行中 · 今日已完成 128 次授权内行动</span><button onClick={()=>go('data')}>查看数据口径与行动账本 →</button></div>
    {dialog&&<ActionDialog
      title="新建经营任务"
      desc="设置产品、目标市场、成交对象、结果目标、预算和数字员工行动边界。"
      confirm="开始配置"
      onClose={()=>setDialog(false)}
      onConfirm={()=>go('projects')}
    />}
  </>;
}

function ProjectsPage() {
  const [tab, setTab] = useState('项目列表');
  const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);
  const [marketInsight,setMarketInsight]=useState<AiResult|null>(null);
  const tabs = ['项目列表', '执行动态', '市场策略', '目标预算', '执行计划', '项目价值'];
  useEffect(()=>{let active=true;requestAi('market_strategy',{project:PROJECTS.matcha,metrics:{content:'68/96',budgetUsed:'61%',inquiries:186,pipeline:'¥486万'},buyer:'食品原料进口商',readiness:['英文规格书','批次检测','清真认证待补充']}).then(result=>{if(active)setMarketInsight(result)}).catch(()=>{});return()=>{active=false}},[]);
  return <>
    <PageHeader title="经营任务" desc="为数字员工配置目标、预算、自主等级和行动边界。" action="新建经营任务" secondary="任务模板" onAction={()=>setDialog({title:'新建经营任务',desc:'填写经营目标后，系统将生成预算、执行计划和数字员工配置草案。'})} onSecondary={()=>setDialog({title:'经营任务模板',desc:'已加载海外获客、渠道增长和新品验证等 6 个企业模板。'})}/>
    <Tabs items={tabs} active={tab} setActive={setTab} />
    {tab === '项目列表' ? <>
      <div className="stat-grid five"><Metric label="进行中项目" value="8" change="3 个重点"/><Metric label="项目总预算" value="¥ 246万" change="已用 48%"/><Metric label="累计有效询盘" value="333" change="+21.8%"/><Metric label="商机管道" value="¥ 1,544万" change="6.3× 投入"/><Metric label="异常项目" value="2" change="需要处理" warn/></div>
      <div className="two-col-wide">
        <section className="panel table-panel"><div className="panel-title"><div><h2>增长项目</h2><p>当前组织 · 全部事业部</p></div><div className="filter-chips"><button onClick={()=>appFeedback('项目状态筛选','已显示全部状态的增长项目。')}>全部状态⌄</button><button onClick={()=>appFeedback('项目市场筛选','已显示全部市场的增长项目。')}>全部市场⌄</button></div></div>
          <div className="data-table project-table"><div className="tr th"><span>项目</span><span>市场</span><span>阶段</span><span>内容</span><span>预算</span><span>询盘</span><span>商机金额</span><span>健康度</span></div>
            {[
              [PROJECTS.matcha.name,PROJECTS.matcha.countries,'获客验证','68 / 96','61%','186','¥ 486万','正常'],
            ].map(row => <button className="tr" key={row[0]} onClick={()=>setDialog({title:row[0],desc:`${row[1]} · ${row[2]}。项目详情已载入，可继续查看目标预算和执行计划。`})}>{row.map((cell, i) => <span key={i} className={i === 0 ? 'strong-cell' : ''}>{i === 7 ? <small className={cell === '正常' ? 'good' : 'warn'}>{cell}</small> : cell}</span>)}</button>)}
          </div>
        </section>
        <AgentNote agent="市场策略 Agent" onAction={()=>setDialog({title:marketInsight?.headline||'市场策略建议',desc:marketInsight?.summary||'正在生成市场策略。'})}><h3>{marketInsight?.headline||'正在生成市场策略'}</h3><p>{marketInsight?.summary||'千问正在结合项目指标、买家和企业准备度生成建议。'}</p><ul>{(marketInsight?.recommendations||['核对市场证据','补齐准入资料']).slice(0,3).map(item=><li key={item}>{item}</li>)}</ul></AgentNote>
      </div>
    </> : tab === '执行动态' ? <section className="panel"><div className="panel-title"><div><h2>数字员工执行动态</h2><p>围绕当前经营任务查看行动、依据、权限和待人工介入事项</p></div><button onClick={()=>setDialog({title:'行动账本',desc:'今日 128 次行动均已记录调用依据、权限检查和执行结果。'})}>查看行动账本</button></div><div className="agent-runtime-grid">{agents.map((agent,i)=><button key={agent.name} onClick={()=>setDialog({title:agent.name,desc:`${agent.action}。当前为${i<3?'自主执行':'审批'}模式。`})}><span className={`agent-avatar ${agent.tone}`}>AI</span><span><strong>{agent.name.replace(' Agent','数字员工')}</strong><small>{agent.action}</small><em>{i<3?'自主执行':'审批模式'} · {PROJECTS.matcha.name}</em></span><b>{i===3?'待审批':'运行中'}</b></button>)}</div></section> : <ProjectDetail tab={tab} />}
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
  return <div className="two-col-wide"><section className="panel detail-canvas"><div className="detail-hero"><div><span>{PROJECTS.matcha.name}</span><h2>{item.title}</h2><p>{item.desc}</p></div><small>项目周期 2026.08.15 — 10.31</small></div><div className="mini-metrics">{item.cards.map(card => <div key={card[0]}><span>{card[0]}</span><b>{card[1]}</b><small>{card[2]}</small></div>)}</div><div className="funnel"><div><b>184万</b><span>海外曝光</span></div><i>→</i><div><b>26,480</b><span>精准访问</span></div><i>→</i><div><b>186</b><span>询盘</span></div><i>→</i><div><b>21</b><span>商机</span></div><i>→</i><div><b>3</b><span>订单</span></div></div></section><AgentNote agent="市场策略 Agent"><h3>本页有 2 项建议</h3><p>系统引用项目资料、市场数据和成交反馈给出下一步动作，所有预算与对外承诺均需人工确认。</p></AgentNote></div>;
}

type DimensionKey='market'|'audience'|'result';
type DimensionFilters=Record<DimensionKey,string[]>;

function ContentPage({go}:{go:(view:View)=>void}) {
  const [dialog, setDialog] = useState<{title:string;desc:string}|null>(null);
  const [showCreate,setShowCreate]=useState(false);
  const [showBoundary,setShowBoundary]=useState(false);
  const [workflowDimension,setWorkflowDimension]=useState<DimensionKey|null>(null);
  const [editingDimension,setEditingDimension]=useState<DimensionKey|null>(null);
  const [dimensionFilters,setDimensionFilters]=useState<DimensionFilters>({market:[],audience:[],result:[]});
  const [createdTask,setCreatedTask]=useState<ContentTask|null>(null);
  const [project] = useState(PROJECTS.matcha.name);
  const dimensionsConfirmed=(['market','audience','result'] as DimensionKey[]).every(key=>dimensionFilters[key].length>0);
  const dimensionLabel=(key:DimensionKey)=>dimensionFilters[key].length===0?'不限':dimensionFilters[key].length===1?dimensionFilters[key][0]:`${dimensionFilters[key][0]} +${dimensionFilters[key].length-1}`;
  const campaign = dimensionsConfirmed?`${dimensionLabel('market')} · ${dimensionLabel('audience')} · ${dimensionLabel('result')}`:'内容生产与交付工作台';
  return <>
    <header className="content-command-head">
      <div><span className="content-breadcrumb">经营项目　/　{project}</span><h1>{campaign}</h1><div className="campaign-dimensions">{([['market','地区'],['result','经营目标'],['audience','目标用户']] as [DimensionKey,string][]).map(([key,label])=><button key={key} className={dimensionFilters[key].length?'filtered':''} onClick={()=>setEditingDimension(key)}><span>{label}</span><strong>{dimensionLabel(key)}</strong><i>{dimensionFilters[key].length?'调整':'设置'}</i></button>)}</div></div>
      <div className="content-head-actions"><button className="boundary-entry" onClick={()=>setShowBoundary(true)}><span>◈</span> 行动边界 <b>3</b></button><button className="primary" onClick={()=>setShowCreate(true)}>＋ 新建交付单</button></div>
    </header>
    <AgentTaskCenter createdTask={createdTask} dimensionFilters={dimensionFilters} onSchedule={()=>go('schedule')} onAction={(title,desc)=>setDialog({title,desc})}/>
    {showCreate&&<CreateDeliveryModal onClose={()=>setShowCreate(false)} onCreate={task=>{setCreatedTask(task);setShowCreate(false);setDialog({title:'交付单已创建',desc:`“${task.title}”已加入待启动，执行方式为${task.executor}，已关联批量素材与原始需求。`})}}/>}
    {showBoundary&&<CampaignBoundaryDrawer onClose={()=>setShowBoundary(false)}/>} 
    {editingDimension&&<DimensionFilterDrawer dimension={editingDimension} values={dimensionFilters[editingDimension]} onClose={()=>setEditingDimension(null)} onApply={(values,openWorkflow)=>{setDimensionFilters(current=>({...current,[editingDimension]:values}));const selected=editingDimension;setEditingDimension(null);if(openWorkflow&&values.length)setWorkflowDimension(selected)}}/>}
    {workflowDimension&&<WorkflowContextDrawer dimension={workflowDimension} filters={dimensionFilters[workflowDimension]} onClose={()=>setWorkflowDimension(null)} onCreate={()=>{setWorkflowDimension(null);setShowCreate(true)}}/>}
    {dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} onClose={()=>setDialog(null)}/>}
  </>;
}

type BoundaryMode='auto'|'confirm'|'forbid';
function CampaignBoundaryDrawer({onClose}:{onClose:()=>void}) {
  const [rules,setRules]=useState([
    {name:'读取企业资料',mode:'auto' as BoundaryMode,locked:true,note:'组织级授权范围内'},
    {name:'生成脚本与素材',mode:'auto' as BoundaryMode,locked:false,note:'仅使用已授权资料'},
    {name:'修改产品参数',mode:'confirm' as BoundaryMode,locked:false,note:'事实性信息需人工确认'},
    {name:'对外发布内容',mode:'confirm' as BoundaryMode,locked:true,note:'组织级安全底线'},
    {name:'回复客户询盘',mode:'confirm' as BoundaryMode,locked:false,note:'答复将代表企业对外表达'},
    {name:'使用未授权素材',mode:'forbid' as BoundaryMode,locked:true,note:'组织级安全底线'},
    {name:'修改投放预算',mode:'forbid' as BoundaryMode,locked:true,note:'当前专项未授权'},
  ]);
  const labels:Record<BoundaryMode,string>={auto:'自动执行',confirm:'需你确认',forbid:'禁止执行'};
  const count=(mode:BoundaryMode)=>rules.filter(rule=>rule.mode===mode).length;
  return <><button className="task-drawer-scrim boundary-scrim" aria-label="关闭行动边界" onClick={onClose}/><aside className="campaign-boundary-drawer"><button className="drawer-close" aria-label="关闭行动边界" onClick={onClose}>×</button><header><span>CAMPAIGN 运行规则</span><h2>行动边界</h2><p>所有交付单和 Agent 统一继承。任务可以更严格，但不能突破组织安全底线。</p><div><b>{count('auto')}</b><small>自动执行</small><b>{count('confirm')}</b><small>需你确认</small><b>{count('forbid')}</b><small>禁止执行</small></div></header><section className="boundary-rule-list">{rules.map((rule,index)=><article key={rule.name}><div><strong>{rule.name}</strong><small>{rule.locked?'🔒 ':''}{rule.note}</small></div><span className={`boundary-mode ${rule.mode}`}>{labels[rule.mode]}</span>{!rule.locked&&<div className="boundary-options">{(['auto','confirm','forbid'] as BoundaryMode[]).map(mode=><button key={mode} className={rule.mode===mode?'active':''} onClick={()=>setRules(items=>items.map((item,i)=>i===index?{...item,mode}:item))}>{labels[mode]}</button>)}</div>}</article>)}</section><footer><span>修改后只影响尚未执行的动作</span><button onClick={onClose}>完成设置</button></footer></aside></>;
}

function DimensionFilterDrawer({dimension,values,onClose,onApply}:{dimension:DimensionKey;values:string[];onClose:()=>void;onApply:(values:string[],openWorkflow:boolean)=>void}) {
  const regionGroups:Record<string,string[]>={'东南亚':['马来西亚','新加坡','印度尼西亚','泰国','越南','菲律宾'],'中东':['阿联酋','沙特阿拉伯','卡塔尔','科威特','土耳其'],'拉丁美洲':['巴西','墨西哥','智利','哥伦比亚','阿根廷'],'欧洲':['英国','德国','法国','荷兰','西班牙'],'北美':['美国','加拿大'],'非洲':['南非','埃及','尼日利亚','肯尼亚'],'南亚':['印度','巴基斯坦','孟加拉国'],'东亚':['日本','韩国','中国香港'],'大洋洲':['澳大利亚','新西兰']};
  const genericCustomers=[{name:'进口商',note:'跨境准入、清关与供货'}, {name:'分销商',note:'区域覆盖、库存与交付'}, {name:'品牌方',note:'产品定义、品牌和市场增长'}, {name:'制造商 / OEM',note:'规格、稳定供应与生产协同'}, {name:'零售商',note:'选品、动销和供应保障'}, {name:'企业采购方',note:'成本、品质、合规和交付'}, {name:'代理商',note:'授权、政策和市场支持'}, {name:'电商卖家',note:'产品素材、供货和平台合规'}];
  const results=[{name:'有效询盘',note:'客户身份 + 需求 + 下一步'}, {name:'资料下载',note:'产品、技术或合规资料'}, {name:'样品申请',note:'实物或测试样品'}, {name:'报价申请',note:'规格、数量与交付地'}, {name:'预约会议',note:'销售或技术沟通'}, {name:'合作申请',note:'渠道、代理或联合营销'}, {name:'注册 / 试用',note:'账号注册或产品试用'}, {name:'下单转化',note:'直接进入交易'}];
  const config={title:dimension==='market'?'地区':dimension==='audience'?'目标客户':'经营结果',description:dimension==='market'?'先选海外大区，再多选国家或小型市场。':dimension==='audience'?'使用跨行业的商业角色标签，也可添加自定义客户类型。':'选择通用经营结果，并可添加自定义 CTA 标签。'};
  const [selected,setSelected]=useState(values);
  const [expandedRegions,setExpandedRegions]=useState<string[]>(()=>Object.keys(regionGroups).filter(region=>values.includes(region)||regionGroups[region].some(country=>values.includes(country))));
  const [custom,setCustom]=useState('');
  const toggle=(name:string)=>setSelected(items=>items.includes(name)?items.filter(item=>item!==name):[...items,name]);
  const addCustom=()=>{const value=custom.trim();if(!value)return;const label=dimension==='result'?`CTA：${value}`:dimension==='audience'?`客户：${value}`:value;setSelected(items=>items.includes(label)?items:[...items,label]);setCustom('')};
  const simpleItems=dimension==='audience'?genericCustomers:results;
  return <><button className="task-drawer-scrim dimension-filter-scrim" aria-label="关闭多选筛选" onClick={onClose}/><aside className="dimension-filter-drawer"><button className="drawer-close" aria-label="关闭多选筛选" onClick={onClose}>×</button><header><span>多角度任务筛选</span><h2>{config.title}</h2><p>{config.description}</p></header><section className="dimension-unlimited"><button className={selected.length===0?'active':''} onClick={()=>setSelected([])}><i>{selected.length===0?'✓':''}</i><div><strong>不限{config.title}</strong><small>不对该维度设限，展示全部匹配任务</small></div></button></section>{dimension==='market'?<section className="region-hierarchy"><strong>海外大区（支持多选）</strong><div className="region-grid">{Object.keys(regionGroups).map(region=><button key={region} className={selected.includes(region)?'active':''} onClick={()=>{toggle(region);setExpandedRegions(items=>items.includes(region)?items:[...items,region])}}><i>{selected.includes(region)?'✓':''}</i>{region}<span onClick={event=>{event.stopPropagation();setExpandedRegions(items=>items.includes(region)?items.filter(x=>x!==region):[...items,region])}}>{expandedRegions.includes(region)?'−':'+'}</span></button>)}</div>{expandedRegions.map(region=><div className="region-countries" key={region}><span>{region} · 国家/市场</span><div>{regionGroups[region].map(country=><button key={country} className={selected.includes(country)?'active':''} onClick={()=>toggle(country)}>{selected.includes(country)?'✓ ':''}{country}</button>)}</div></div>)}</section>:<><section className="dimension-options compact-options">{simpleItems.map(item=><button key={item.name} className={selected.includes(item.name)?'active':''} onClick={()=>toggle(item.name)}><i>{selected.includes(item.name)?'✓':''}</i><div><strong>{item.name}</strong><small>{item.note}</small></div></button>)}</section><section className="custom-dimension"><strong>{dimension==='result'?'自定义 CTA':'自定义客户标签'}</strong>{dimension==='result'&&<div className="cta-quick">{['WhatsApp','Telegram','Email','Landing Page'].map(x=><button key={x} onClick={()=>{setCustom(x)}}>{x}</button>)}</div>}<div><input aria-label={dimension==='result'?'输入自定义 CTA':'输入自定义客户标签'} value={custom} onChange={event=>setCustom(event.target.value)} placeholder={dimension==='result'?'例如：跳转 WhatsApp、打开 Telegram 群':'例如：项目集成商'}/><button onClick={addCustom}>＋ 添加标签</button></div></section></>}<section className="filter-logic"><strong>筛选逻辑</strong><p>当前维度内“或”匹配，与其他维度之间“且”匹配。</p><span>{selected.length?`已选 ${selected.length} 项：${selected.join(' 或 ')}`:'当前不设限'}</span></section><footer><button onClick={()=>onApply(selected,false)}>仅应用任务筛选</button><button className="primary" disabled={selected.length===0} onClick={()=>onApply(selected,true)}>应用并进入工作流 →</button></footer></aside></>;
}

function WorkflowContextDrawer({dimension,filters,onClose,onCreate}:{dimension:DimensionKey;filters:string[];onClose:()=>void;onCreate:()=>void}) {
  const [scope,setScope]=useState<'regional'|'global'>('regional');
  const hooks=[
    {hook:'Before you compare price, verify these 3 batch records.',market:'Malaysia',platform:'LinkedIn',lift:'+38%',reason:'英语·食品原料采购·证据型开场'},
    {hook:'What importers should ask before approving a matcha supplier.',market:'Singapore',platform:'LinkedIn',lift:'+31%',reason:'英语·进口商视角·适用相近准入市场'},
    {hook:'One factory claim. Three records that prove it.',market:'United Kingdom',platform:'TikTok',lift:'+27%',reason:'英语·工厂实证·结构可迁移'},
  ];
  const evidence=[['产能证据','月产能、产线和交付周期','18 份已授权'],['批次品控','检测项、批次记录与追溯','10 份已校验'],['市场准入','清真认证、出口文件与英文规格','6 份可用']];
  const actions=[['下载英文规格书','中意向','默认 CTA'],['申请 M-02 / M-05 样品','高意向','表单 + 人工确认'],['提交批量采购询盘','高意向','采购量 + 应用 + 交付地']];
  const selectedLabel=filters.join(' 或 ');
  const title=dimension==='market'?`${selectedLabel}市场工作流`:dimension==='audience'?`${selectedLabel}证据工作流`:`${selectedLabel}转化工作流`;
  const primaryLanguage=filters.includes('印度尼西亚')?'Bahasa Indonesia':'English';
  const secondaryLanguage=filters.includes('马来西亚')?'Bahasa Melayu':'English';
  const marketScopeLabel=`${filters.join(' + ')} + 相近市场`;
  return <><button className="task-drawer-scrim workflow-scrim" aria-label="关闭工作流条件" onClick={onClose}/><aside className="workflow-context-drawer"><button className="drawer-close" aria-label="关闭工作流条件" onClick={onClose}>×</button><header><span>项目定义 → 工作流条件</span><h2>{title}</h2><p>这些条件会被新任务、爆款复刻、素材匹配和内容生成自动继承。</p></header>{dimension==='market'?<main><section className="inherited-conditions"><label><span>主工作语言</span><strong>{primaryLanguage}</strong></label><label><span>辅助语言</span><strong>{secondaryLanguage}</strong></label><label><span>优先平台</span><strong>LinkedIn · TikTok</strong></label></section><div className="workflow-section-head"><div><span>爆款结构迁移</span><strong>已按语言、市场相似度和买家角色筛选</strong></div><div><button className={scope==='regional'?'active':''} onClick={()=>setScope('regional')}>{marketScopeLabel}</button><button className={scope==='global'?'active':''} onClick={()=>setScope('global')}>全球英语市场</button></div></div><section className="hook-results">{hooks.filter((_,index)=>scope==='global'||index<2).map((item,index)=><article key={item.hook}><span>0{index+1}</span><div><strong>{item.hook}</strong><small>{item.market} · {item.platform}</small><p>匹配原因：{item.reason}</p></div><b>{item.lift}<small>钩子留存</small></b><button onClick={onCreate}>用此结构创建 →</button></article>)}</section></main>:dimension==='audience'?<main><section className="workflow-definition"><span>买家决策需求</span><h3>证明供货稳定、品质可追溯、市场可准入</h3><p>内容不优先讲品牌故事，先匹配进口商完成供应商审核所需的证据。</p></section><section className="evidence-results">{evidence.map(item=><article key={item[0]}><span>✓</span><div><strong>{item[0]}</strong><p>{item[1]}</p></div><b>{item[2]}</b><button onClick={onCreate}>用此证据创建 →</button></article>)}</section></main>:<main><section className="workflow-definition"><span>询盘判定标准</span><h3>必须包含企业身份、采购用途和明确的下一步行动</h3><p>点赞和播放不计入本专项结果，内容默认绑定可追踪 CTA。</p></section><section className="action-results">{actions.map(item=><article key={item[0]}><div><strong>{item[0]}</strong><small>{item[1]}</small></div><p>{item[2]}</p><button onClick={onCreate}>用此动作创建 →</button></article>)}</section></main>}<footer><span>当前条件由专项继承，新任务可以收紧，不建议无条件放宽。</span><button onClick={onClose}>返回看板</button></footer></aside></>;
}

type ContentTask = {id:string;stage:string;title:string;owner:string;meta:string;kind:'normal'|'running'|'fixing'|'attention'|'review'|'completed';deliverableType:string;executor:string;priority:'P0'|'P1'|'P2';goal:string;videoRatio?:'9:16'|'16:9';strategy?:CreationStrategy;strategySource?:'ai_recommended'|'user_selected';strategyReason?:string;strategyConfidence?:number;requiredInputs?:string[];strategyInput?:StrategyInput;qualityScore?:number;autoFixAttempts?:number;automationNote?:string};

function CreateDeliveryModal({onClose,onCreate}:{onClose:()=>void;onCreate:(task:ContentTask)=>void}) {
  const [title,setTitle]=useState('马来西亚食品原料进口商产品资料包');
  const [goal,setGoal]=useState('为采购经理提供可直接评估的产品、认证与工厂资料');
  const [deliverable,setDeliverable]=useState('图册');
  const [executor,setExecutor]=useState<'人员执行'|'AI执行'|'人机协作'>('人员执行');
  const [owner,setOwner]=useState('采购经理');
  const [assets,setAssets]=useState([
    {id:'a1',name:'食品级抹茶 M-02｜产品规格书｜英文｜v2.1.pdf',type:'产品技术资料',selected:true},
    {id:'a2',name:'抹茶工厂｜自动化生产线｜2026Q3｜v1.0.zip',type:'工厂产能实证',selected:true},
    {id:'a3',name:'食品级抹茶｜批次质量检测报告｜2026Q3｜v1.0.pdf',type:'质量检测证据',selected:true},
    {id:'a4',name:'食品级抹茶｜出口准入认证｜马来西亚｜v1.2',type:'市场准入认证',selected:true},
  ]);
  const [applied,setApplied]=useState(false);
  const strategyInput:StrategyInput={product:'食品级抹茶 M-02',market:'马来西亚',audience:'食品原料进口商',goal,platform:'LinkedIn',language:'English',productFacts:['英文产品规格书','批次质量检测流程','出口准入资料'],assets:assets.filter(item=>item.selected).map(item=>item.name),references:[]};
  const [decision,setDecision]=useState<StrategyDecision>(()=>decideStrategyLocally(strategyInput));
  const [selectedStrategy,setSelectedStrategy]=useState<CreationStrategy>(decision.strategy);
  const [routing,setRouting]=useState(false);
  const selectedCount=assets.filter(item=>item.selected).length;
  const reroute=async()=>{setRouting(true);const current={...strategyInput,goal,assets:assets.filter(item=>item.selected).map(item=>item.name)};try{const response=await fetch('/api/content-agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'decide',input:current})});const data=await response.json() as {decision?:StrategyDecision};if(data.decision){setDecision(data.decision);setSelectedStrategy(data.decision.strategy)}}finally{setRouting(false)}};
  const submit=()=>{const current={...strategyInput,goal,assets:assets.filter(item=>item.selected).map(item=>item.name)};onCreate({id:`manual-${Date.now()}`,stage:'任务解析',title:title.trim()||'未命名交付单',owner,meta:`已关联 ${selectedCount} 批素材`,kind:executor==='AI执行'?'running':'normal',deliverableType:deliverable,executor,priority:'P1',goal:goal.trim()||'待补充交付目标',strategy:selectedStrategy,strategySource:selectedStrategy===decision.strategy?'ai_recommended':'user_selected',strategyReason:selectedStrategy===decision.strategy?decision.reason:`用户将推荐路径调整为${strategyMeta[selectedStrategy].label}`,strategyConfidence:selectedStrategy===decision.strategy?decision.confidence:100,requiredInputs:decision.requiredInputs,strategyInput:current,automationNote:executor==='AI执行'?'策略已确定，进入自动执行队列':'等待负责人开始'})};
  return <div className="delivery-create-overlay"><section className="delivery-create-modal"><header><div><span>新建交付单</span><h2>创建任务并配置执行来源</h2><p>灵枢会根据产品、素材与参考内容推荐视频生产路径。</p></div><button aria-label="关闭新建交付单" onClick={onClose}>×</button></header><main><section className="delivery-form-core"><label><span>交付单名称</span><input value={title} onChange={event=>setTitle(event.target.value)}/></label><label><span>交付目标</span><textarea value={goal} onChange={event=>setGoal(event.target.value)}/></label><div className="delivery-fields"><label><span>交付物</span><select value={deliverable} onChange={event=>setDeliverable(event.target.value)}>{['图册','图文','视频','落地页','规格书','邮件'].map(x=><option key={x}>{x}</option>)}</select></label><label><span>执行方式</span><select value={executor} onChange={event=>setExecutor(event.target.value as typeof executor)}><option>人员执行</option><option>AI执行</option><option>人机协作</option></select></label><label><span>负责人</span><select value={owner} onChange={event=>setOwner(event.target.value)}><option>采购经理</option><option>内容经理</option><option>品类经理</option><option>陈雨晴</option></select></label></div>{deliverable==='视频'&&<section className="strategy-router"><header><div><span>AI 创作策略路由</span><strong>{decision.provider==='qwen'?'通义千问已参与判断':'本地规则引擎'}</strong></div><button type="button" onClick={reroute} disabled={routing}>{routing?'判断中…':'重新判断'}</button></header><div className="strategy-options">{(Object.keys(strategyMeta) as CreationStrategy[]).map(strategy=><button type="button" key={strategy} className={selectedStrategy===strategy?'active':''} onClick={()=>setSelectedStrategy(strategy)}><i>{selectedStrategy===strategy?'✓':''}</i><span><strong>{strategyMeta[strategy].label}</strong><small>{strategyMeta[strategy].description}</small></span>{decision.strategy===strategy&&<em>AI 推荐 · {decision.confidence}%</em>}</button>)}</div><p><b>推荐依据：</b>{decision.reason}</p><div className="strategy-evidence">{decision.evidence.map(item=><span key={item}>✓ {item}</span>)}</div></section>}</section><section className="asset-batch-workspace"><header><div><span>批量素材工作区</span><strong>一次管理整批输入，仅对异常项单独修正</strong></div><button type="button" onClick={()=>setAssets(items=>[...items,{id:`a${items.length+1}`,name:`食品级抹茶｜待分类素材｜2026Q3｜v1.${items.length}`,type:'待分类素材',selected:true}])}>＋ 添加一批素材</button></header><div className="asset-batch-list"><label className="asset-select-all"><input type="checkbox" checked={selectedCount===assets.length} onChange={event=>setAssets(items=>items.map(item=>({...item,selected:event.target.checked})))}/><strong>已选 {selectedCount} / {assets.length} 批</strong><span>共 26 个文件 · 1.8 GB</span></label>{assets.map(item=><label key={item.id}><input type="checkbox" checked={item.selected} onChange={event=>setAssets(items=>items.map(x=>x.id===item.id?{...x,selected:event.target.checked}:x))}/><span className="asset-file-mark">▦</span><p><strong>{item.name}</strong><small>{item.type}</small></p><em>{applied&&item.selected?'批量属性已应用':'待统一设置'}</em></label>)}</div><div className="batch-attributes"><strong>对已选 {selectedCount} 批统一设置</strong><label><span>素材分组</span><select><option>贵州抹茶｜马来西亚获客｜产品资料组</option></select></label><label><span>授权范围</span><select><option>当前获客专项可用</option></select></label><label><span>市场 / 语言</span><select><option>马来西亚 · 中文 / 英文</option></select></label><button type="button" onClick={()=>setApplied(true)}>{applied?'✓ 已应用到整批':'应用到已选素材'}</button></div></section></main><footer><span>创建后保存策略决定、依据与素材快照。</span><div><button onClick={onClose}>取消</button><button className="primary" onClick={submit}>创建交付单 →</button></div></footer></section></div>;
}

function VideoTaskCover({task}:{task:ContentTask}) {
  const recipe=task.id==='recipe'||task.id==='review-video';
  const ratio=task.videoRatio??'9:16';
  return <span className={`video-task-cover ${recipe?'recipe':'factory'} ${ratio==='9:16'?'portrait':'landscape'}`} aria-label={`${ratio} 预计成片封面：${recipe?'马来语抹茶应用配方':'工厂品质与生产环境'}`}>
    <span className="cover-duration">{ratio} · 00:30</span>
  </span>
}

const AUTO_WORKFLOW_STAGES=['任务解析','输入检查','脚本分镜','画面生产','成片合成','自动质检','交付就绪','已完成'] as const;
const taskProgress=(task:ContentTask)=>Math.max(8,Math.round(((AUTO_WORKFLOW_STAGES.indexOf(task.stage as typeof AUTO_WORKFLOW_STAGES[number])+1)/AUTO_WORKFLOW_STAGES.length)*100));

const taskOrigin=(task:ContentTask)=>task.executor==='人员执行'?`${task.owner}创建`:task.executor==='人机协作'?`${task.owner}发起`:'Campaign 自动拆解';
const taskResponsibility=(task:ContentTask)=>{
  if(task.kind==='completed')return {current:'处理完成',phase:'completed'};
  if(task.kind==='fixing')return {current:`Agent 自动修复中 · ${task.autoFixAttempts??1} / 2`,phase:'processing'};
  if(task.kind==='running'){
    return {current:'Agent 处理中',phase:'processing'};
  }
  if(task.kind==='attention'||task.kind==='review'||task.executor!=='AI执行')return {current:'等待人工准备',phase:'waiting'};
  return {current:'Agent 准备中',phase:'preparing'};
};
const coverTheme=(task:ContentTask)=>({图文:'editorial',手册:'guide',图册:'catalogue',落地页:'landing',视觉图:'visual',案例:'case',邮件:'email',规格书:'spec'} as Record<string,string>)[task.deliverableType]??'editorial';

function TaskCardCover({task}:{task:ContentTask}) {
  if(task.deliverableType==='视频')return <VideoTaskCover task={task}/>;
  return <span className={`task-card-cover ${coverTheme(task)}`} aria-label={`预计交付封面：${task.title}`}>
    <span className="artifact-brand">黔海 · MATCHA</span>
    <span className="artifact-mark">{task.deliverableType.slice(0,1)}</span>
  </span>
}

const creationStrategies:Record<CreationStrategy,{label:string;shortLabel:string;description:string;steps:string[][]}> = {
  viral_remix:{label:'爆款结构迁移',shortLabel:'爆款迁移',description:'迁移钩子、证明顺序与节奏，用企业事实重建。',steps:[['拆解参考','识别钩子、节奏与证明顺序'],['产品映射','将参考表达映射为企业事实'],['素材回填','匹配企业真实素材'],['差异检查','检查照搬、品牌和事实风险'],['成片预览','确认成片并交付审核']]},
  product_led:{label:'从产品生成',shortLabel:'产品生成',description:'从产品事实、目标买家和经营目标反推内容。',steps:[['理解产品','确认产品、买家与内容目标'],['生成主题','从买家问题生成内容角度'],['脚本分镜','生成事实脚本与可执行分镜'],['生成画面','匹配或补齐画面'],['成片预览','确认成片并交付审核']]},
  asset_led:{label:'基于素材创作',shortLabel:'素材创作',description:'理解已有素材，从可验证证据出发规划内容。',steps:[['理解素材','识别素材内容和授权状态'],['识别证据','提取可验证的产品与企业证据'],['规划结构','根据素材规划叙事结构'],['剪辑包装','生成剪辑脚本、标题和封面'],['成片预览','确认成片并交付审核']]},
};

const strategyForTask=(task:ContentTask):CreationStrategy=>task.strategy??(['recipe','review-video','case','review-case'].includes(task.id)?'viral_remix':['factory','factory-check','spec','application','packaging'].includes(task.id)?'asset_led':'product_led');
const strategyDefaults=(strategy:CreationStrategy)=>strategy==='viral_remix'?{reason:'发现与目标买家和平台高匹配的参考内容，企业产品与素材可完成替换。',confidence:91,inputs:['参考逐镜分析','已确认产品','企业真实素材']}:strategy==='asset_led'?{reason:'现有工厂、产品与检测素材足以支持完整内容结构。',confidence:88,inputs:['已授权素材','素材证据标签','目标买家']}:{reason:'产品资料和目标买家信息完整，暂未提供高匹配参考内容。',confidence:86,inputs:['产品规格','目标买家','市场与平台']};

const contentTasks:ContentTask[] = [
  {id:'selection',stage:'任务解析',title:'马来西亚进口商选品指南',owner:'采购经理',meta:'明天',kind:'normal',deliverableType:'图文',executor:'人员执行',priority:'P1',goal:'帮助进口商快速匹配抹茶等级'},
  {id:'faq',stage:'任务解析',title:'食品原料采购问题手册',owner:'内容经理',meta:'Agent 自动推进',kind:'running',deliverableType:'手册',executor:'人机协作',priority:'P2',goal:'解答采购门槛、交付与认证问题'},
  {id:'catalog',stage:'任务解析',title:'食品级抹茶产品图册（英文版）',owner:'品类经理',meta:'9月2日',kind:'normal',deliverableType:'图册',executor:'人员执行',priority:'P2',goal:'完整展示产品等级与应用场景'},
  {id:'factory',stage:'输入检查',title:'工厂产能与品质验证视频（30秒·9:16）',owner:'内容生产 Agent',meta:'缺 1 项产能证据',kind:'attention',deliverableType:'视频',executor:'AI执行',priority:'P0',goal:'证明工厂产能与批次品控能力',videoRatio:'9:16'},
  {id:'halal',stage:'输入检查',title:'清真认证资料专项页（马来西亚）',owner:'质量负责人',meta:'缺少附件',kind:'attention',deliverableType:'落地页',executor:'人机协作',priority:'P1',goal:'降低马来西亚客户的准入顾虑'},
  {id:'spec',stage:'输入检查',title:'食品级抹茶规格书下载页（英文版）',owner:'素材 Agent',meta:'8 / 10 份已校验',kind:'running',deliverableType:'落地页',executor:'AI执行',priority:'P1',goal:'获取高意向采购线索'},
  {id:'grades',stage:'脚本分镜',title:'食品级抹茶等级与采购指南',owner:'内容策划 Agent',meta:'大纲已完成',kind:'running',deliverableType:'图文',executor:'AI执行',priority:'P1',goal:'帮助采购者理解等级与价格差异'},
  {id:'profit',stage:'脚本分镜',title:'马来西亚经销渠道利润政策说明',owner:'渠道经理',meta:'人员编辑',kind:'normal',deliverableType:'图文',executor:'人员执行',priority:'P2',goal:'向经销商说明合作利润空间'},
  {id:'recipe',stage:'脚本分镜',title:'抹茶饮品应用配方短视频（马来语）',owner:'内容经理',meta:'Agent 自动推进',kind:'running',deliverableType:'视频',executor:'人机协作',priority:'P1',goal:'展示抹茶在本地饮品中的应用',videoRatio:'9:16'},
  {id:'application',stage:'画面生产',title:'抹茶饮品应用场景图组（马来西亚）',owner:'视觉生产 Agent',meta:'4 / 8 张',kind:'running',deliverableType:'视觉图',executor:'AI执行',priority:'P1',goal:'为本地渠道提供可直接使用的场景素材'},
  {id:'case',stage:'画面生产',title:'500 kg 食品级抹茶批量采购案例',owner:'案例生产 Agent',meta:'初稿 72%',kind:'running',deliverableType:'案例',executor:'AI执行',priority:'P1',goal:'用真实采购案例建立信任'},
  {id:'email',stage:'画面生产',title:'食品级抹茶规格书获客邮件（英文版）',owner:'内容经理',meta:'Agent 自动推进',kind:'running',deliverableType:'邮件',executor:'人机协作',priority:'P2',goal:'引导潜在客户下载英文规格书'},
  {id:'factory-check',stage:'自动质检',title:'工厂产能与品质验证视频（质检版·16:9）',owner:'事实核验 Agent',meta:'5 / 6 项通过',kind:'attention',deliverableType:'视频',executor:'人机协作',priority:'P0',goal:'证明工厂产能与批次品控能力',videoRatio:'16:9'},
  {id:'packaging',stage:'自动质检',title:'食品级抹茶出口包装规格图组',owner:'品牌检查 Agent',meta:'正在执行 7 项检查',kind:'running',deliverableType:'视觉图',executor:'AI执行',priority:'P2',goal:'清晰说明出口包装规格'},
  {id:'linkedin',stage:'自动质检',title:'LinkedIn 抹茶采购指南（英文版）',owner:'品牌经理',meta:'本地化检查中',kind:'normal',deliverableType:'图文',executor:'人员执行',priority:'P2',goal:'获取食品原料采购者关注'},
  {id:'review-video',stage:'交付就绪',title:'抹茶饮品应用配方短视频（马来语·待审版）',owner:'品类经理',meta:'标准通过 · 74 分',kind:'running',deliverableType:'视频',executor:'人机协作',priority:'P1',goal:'展示抹茶在本地饮品中的应用',videoRatio:'9:16',qualityScore:74},
  {id:'review-case',stage:'交付就绪',title:'马来西亚食品原料进口商采购案例',owner:'销售总监',meta:'标准通过 · 72 分',kind:'running',deliverableType:'案例',executor:'人机协作',priority:'P1',goal:'用客户实证增强新采购者信心',qualityScore:72},
  {id:'done-spec',stage:'已完成',title:'食品级抹茶产品规格书（英文版·v2.1）',owner:'品类经理',meta:'昨天完成',kind:'completed',deliverableType:'规格书',executor:'人员执行',priority:'P1',goal:'支持采购评估与技术审核'},
  {id:'done-origin',stage:'已完成',title:'贵州抹茶产地与制茶工艺故事',owner:'内容生产 Agent',meta:'8月27日完成',kind:'completed',deliverableType:'图文',executor:'AI执行',priority:'P2',goal:'建立贵州抹茶的产地认知'},
  {id:'done-email',stage:'已完成',title:'采购询盘首轮 Telegram 回复（英文版）',owner:'Telegram 渠道 Agent',meta:'8月26日完成',kind:'completed',deliverableType:'消息',executor:'AI执行',priority:'P2',goal:'及时承接并初步判断采购意向'},
];

const taskBusinessDimensions=(task:ContentTask):DimensionFilters=>{
  const beverage=['recipe','review-video','application'].includes(task.id);
  const distributor=['profit','case','review-case'].includes(task.id);
  const download=['spec','email','done-spec'].includes(task.id);
  const sample=beverage;
  const regional=['done-origin','done-email'].includes(task.id);
  return {
    market:regional?['东南亚','马来西亚','新加坡']:['东南亚','马来西亚'],
    audience:beverage?['品牌方','企业采购方']:distributor?['分销商','进口商','代理商']:['进口商','企业采购方'],
    result:download?['资料下载','有效询盘','CTA：WhatsApp']:sample?['样品申请','有效询盘','CTA：WhatsApp']:distributor?['合作申请','有效询盘','CTA：Telegram']:['有效询盘','CTA：WhatsApp'],
  };
};

function AgentTaskCenter({createdTask,dimensionFilters,onSchedule,onAction}:{createdTask:ContentTask|null;dimensionFilters:DimensionFilters;onSchedule:()=>void;onAction:(title:string,desc:string)=>void}) {
  const [tasks,setTasks]=useState<ContentTask[]>(contentTasks);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [liveTaskId,setLiveTaskId]=useState<string|null>(null);
  const [filter,setFilter]=useState<'all'|'running'|'attention'|'overdue'|'mine'>('all');
  const [strategyFilter,setStrategyFilter]=useState<'all'|CreationStrategy>('all');
  const stages=[...AUTO_WORKFLOW_STAGES];
  const selected=tasks.find(task=>task.id===selectedId)??null;
  const shown=tasks.filter(task=>{const dimensions=taskBusinessDimensions(task);const matchesDimensions=(Object.keys(dimensionFilters) as DimensionKey[]).every(key=>dimensionFilters[key].length===0||dimensionFilters[key].some(value=>dimensions[key].includes(value)));return matchesDimensions&&(filter==='all'||(filter==='running'&&task.kind==='running')||(filter==='attention'&&(task.kind==='attention'||task.kind==='review'))||(filter==='overdue'&&task.priority==='P0')||(filter==='mine'&&['selection','profit','review-video','review-case'].includes(task.id)))&&(strategyFilter==='all'||strategyForTask(task)===strategyFilter)});
  const attentionCount=tasks.filter(task=>task.kind==='attention'||task.kind==='review').length;
  const runDetail=selected?({factory:['生成「自动化生产线」镜头','正在从企业素材库匹配可验证工厂产能的画面，已检查 18 份素材，选中 6 份。','52%'],topics:['生成进口商高频问题选题','正在将近 90 天的询盘和搜索词聚类，已识别 12 个可生产选题。','68%'],lab:['整理实验室批次检测素材','正在校验检测报告与素材授权，10 份资料中已通过 8 份。','68%'],application:['生成抹茶饮品应用场景图','正在按马来西亚饮品渠道场景生成 8 张视觉图，已完成 4 张。','68%']} as Record<string,string[]>)[selected.id]??['执行当前生产任务','Agent 正在按任务要求调用资料并生成阶段产出。','68%']:['','','0%'];
  const selectTask=(task:ContentTask)=>setSelectedId(task.id);
  const updateTask=(id:string,change:Partial<ContentTask>)=>setTasks(items=>items.map(item=>item.id===id?{...item,...change}:item));
  const advanceTask=(task:ContentTask)=>{
    const index=stages.indexOf(task.stage as typeof stages[number]);
    if(index===stages.length-1){onSchedule();return;}
    const nextStage=stages[index+1];
    updateTask(task.id,{stage:nextStage,kind:nextStage==='已完成'?'completed':'running',meta:nextStage==='已完成'?'刚刚完成':'Agent 自动推进',automationNote:`${task.stage}准出检查已通过，自动进入${nextStage}`});
    setSelectedId(null);
  };
  const resolveAttention=(task:ContentTask)=>{updateTask(task.id,{kind:'running',meta:'Agent 已恢复执行',automationNote:'人工已补齐阻断输入，Agent 将从当前检查点自动恢复'});setSelectedId(task.id)};
  useEffect(()=>{if(!createdTask)return;const timer=window.setTimeout(()=>setTasks(items=>items.some(item=>item.id===createdTask.id)?items:[...items,createdTask]),0);return()=>window.clearTimeout(timer)},[createdTask]);
  return <section className="agent-task-center">
    <div className="task-center-toolbar simplified"><div><button className={filter==='all'?'active':''} onClick={()=>{setFilter('all');setSelectedId(null)}}>全部任务</button><button className={filter==='attention'?'active':''} onClick={()=>{setFilter('attention');setSelectedId(null)}}>等待人工 <b>{attentionCount}</b></button><button className={filter==='running'?'active':''} onClick={()=>{setFilter('running');setSelectedId(null)}}><i className="live-dot-mini"/>Agent 处理中</button></div><label className="strategy-filter">创作路径<select value={strategyFilter} onChange={event=>{setStrategyFilter(event.target.value as typeof strategyFilter);setSelectedId(null)}}><option value="all">全部</option>{(Object.keys(strategyMeta) as CreationStrategy[]).map(strategy=><option value={strategy} key={strategy}>{strategyMeta[strategy].label}</option>)}</select></label></div>
    <div className="task-center-body"><div className="task-flow"><div className="task-columns">{stages.map((stage,index)=><section className="task-stage" key={stage}><header><span>{String(index+1).padStart(2,'0')}</span><strong>{stage}</strong><b>{shown.filter(task=>task.stage===stage).length}</b>{index<stages.length-1&&<i>→</i>}</header><div>{shown.filter(task=>task.stage===stage).map(task=>{const responsibility=taskResponsibility(task);const progress=taskProgress(task);const strategy=strategyForTask(task);return <button key={task.id} className={`${task.kind} unified-card ${task.deliverableType==='视频'?'video-card':''} ${selected?.id===task.id?'selected':''}`} onClick={()=>selectTask(task)}><TaskCardCover task={task}/><span className="deliverable-card-top"><span className="deliverable-type">{task.deliverableType}</span><em className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</em></span><strong>{task.title}</strong><span className={`strategy-badge ${strategy}`}>{strategyMeta[strategy].label}</span><span className={`task-kind responsibility-${responsibility.phase}`}><i className={responsibility.phase==='processing'?'live-dot-mini':'responsibility-dot'}/>{responsibility.current}</span><small className="task-origin">来源 · {taskOrigin(task)}</small>{(task.kind==='running'||task.kind==='fixing')&&<span className="mini-run-progress"><i><b style={{width:`${progress}%`}}/></i><em>{progress}%</em></span>}</button>})}</div></section>)}</div>{shown.length===0&&<div className="task-empty">当前筛选下没有交付单</div>}</div></div>
    {selected&&<><button className="task-drawer-scrim" aria-label="关闭交付单详情" onClick={()=>setSelectedId(null)}/><aside className={`task-live-inspector task-live-drawer ${selected.kind}`}><button className="drawer-close" aria-label="关闭交付单详情" onClick={()=>setSelectedId(null)}>×</button><header><div><span className="inspector-agent"><i/>{selected.kind==='running'?selected.owner:selected.kind==='attention'?'人工待办 · 交付单阻塞':'交付单详情'}</span><h3>{selected.title}</h3><p>{selected.deliverableType} · {selected.executor} · {selected.priority}</p></div>{selected.kind==='running'&&<button onClick={()=>setLiveTaskId(selected.id)}>查看 Agent 现场 →</button>}</header>
        <section className="task-origin-panel"><div><span>任务来源</span><strong>{taskOrigin(selected)}</strong><small>{selected.executor==='人员执行'?'由业务人员在当前 Campaign 中手动创建':'来自 Campaign 目标拆解与创作策略路由'}</small></div><button onClick={()=>onAction('原始需求来源',`${taskOrigin(selected)}：${selected.goal}。创建后纳入当前 Campaign 交付流程。`)}>查看原始需求 →</button></section>
        <section className="strategy-decision-panel"><div><span>{selected.strategySource==='user_selected'?'人工选择路径':'AI 推荐路径'}</span><strong>{strategyMeta[strategyForTask(selected)].label}</strong><em>{selected.strategyConfidence??strategyDefaults(strategyForTask(selected)).confidence}% 置信度</em></div><p>{selected.strategyReason??strategyDefaults(strategyForTask(selected)).reason}</p><small>必要输入：{(selected.requiredInputs??strategyDefaults(strategyForTask(selected)).inputs).join(' · ')}</small></section>
        {selected.kind==='running'||selected.kind==='fixing'?<><section className="current-operation"><span>{selected.kind==='fixing'?'正在自动修复':'Agent 自动推进中'}</span><strong>{selected.kind==='fixing'?'字幕断句与封面安全区':runDetail[0]}</strong><p>{selected.automationNote??runDetail[1]}</p><div><span><i style={{width:selected.kind==='fixing'?'62%':runDetail[2]}}/></span><b>{selected.qualityScore?`${selected.qualityScore} 分`:runDetail[2]}</b></div></section><section className="auto-gate-panel"><header><div><span>本节点自动准出</span><strong>{selected.stage==='自动质检'?'通过线 70 · 复检线 65':'完成产物 + 无阻断项'}</strong></div><em>无需人工操作</em></header><div><span><i/>事实与授权硬风险</span><b>通过</b></div><div><span><i/>当前节点必要产物</span><b>{selected.kind==='fixing'?'修复中':'已就绪'}</b></div><small>Agent 完成准出检查后将自动进入下一节点；只有硬风险或修复失败才会暂停。</small></section><ExecutionSteps/></>:selected.kind==='attention'?<section className="intervention-panel"><span>!　需要你处理 1 个问题</span><h4>{selected.id==='halal'?'需要补充有效的清真认证附件':selected.id==='factory-check'?'需要确认剩余 1 项技术参数':'需要确认工厂月产能数据'}</h4><p>该问题涉及事实或授权硬风险，Agent 已保存当前检查点。处理完成后将从“{selected.stage}”自动恢复，无需再手动推进。</p></section>:<section className="task-detail-panel"><span>{selected.kind==='completed'?'交付已完成':'等待负责人开始'}</span><h4>{selected.goal}</h4><p>负责人：{selected.owner}<br/>当前阶段：{selected.stage}<br/>截止或当前状态：{selected.meta}</p></section>}
        <footer className="drawer-actions">{selected.kind==='attention'?<button className="primary" onClick={()=>resolveAttention(selected)}>{selected.id==='halal'?'已补充资料，自动恢复':selected.id==='factory-check'?'确认参数并自动恢复':'确认并自动恢复'} →</button>:selected.kind==='running'||selected.kind==='fixing'?<><span className="auto-running-note"><i/> 准出后自动进入下一节点</span><button onClick={()=>setLiveTaskId(selected.id)}>打开 Agent 工作现场</button></>:selected.kind==='completed'?<button className="primary" onClick={onSchedule}>进入排期与分发 →</button>:<span className="manual-owner-note">该任务由人员执行，不在 Agent 自动推进范围</span>}</footer>
      </aside></>}
    {liveTaskId&&<AgentLiveView task={tasks.find(item=>item.id===liveTaskId)??contentTasks[12]} onExit={()=>setLiveTaskId(null)} onComplete={()=>{const task=tasks.find(item=>item.id===liveTaskId);if(task)advanceTask(task);setLiveTaskId(null)}}/>}
  </section>;
}

function ExecutionSteps(){
  const steps=[['理解任务','done'],['调用资料','done'],['生成脚本','done'],['生成分镜','done'],['生成画面','active'],['合成检查','wait'],['提交审核','wait']];
  return <section className="execution-steps"><header><strong>执行进度</strong><span>5 / 7</span></header><div>{steps.map(([name,state],index)=><span className={state} key={name}><i>{state==='done'?'✓':index+1}</i><small>{name}</small>{index<steps.length-1&&<em/>}</span>)}</div></section>;
}

function AgentLiveView({ task, onExit, onComplete }: { task:ContentTask; onExit: () => void; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [saved,setSaved]=useState(false);
  const [workflow,setWorkflow]=useState<VideoWorkflow|null>(null);
  const [loading,setLoading]=useState(true);
  const strategy=strategyForTask(task);
  const input=useMemo<StrategyInput>(()=>task.strategyInput??{product:'食品级抹茶 M-02',market:'马来西亚',audience:'食品原料采购经理',goal:task.goal,platform:'LinkedIn',language:'English',productFacts:['英文产品手册','批次质检流程','出口准入资料'],assets:['工厂视频 8 条','实验室素材 4 条'],references:strategy==='viral_remix'?['高匹配参考视频逐镜分析']:[]},[task.strategyInput,task.goal,strategy]);
  useEffect(()=>{let active=true;void Promise.resolve().then(()=>{if(active)setLoading(true)});fetch('/api/content-agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'build',input,strategy})}).then(async response=>(await response.json()) as {workflow?:VideoWorkflow}).then(data=>{if(active&&data.workflow)setWorkflow(data.workflow)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[input,strategy]);
  const steps=workflow?.steps??creationStrategies[strategy].steps.map((item,index)=>({id:`fallback-${index}`,name:item[0],objective:item[1],output:'正在生成结构化阶段产物…',evidence:[],checks:['输入完整'],status:'ready' as const}));
  const current=steps[Math.min(step,steps.length-1)];
  return <div className="agent-live-overlay"><section className="agent-live-shell lingshu-live"><header className="studio-workbar"><button onClick={onExit}>← 退出观看</button><span className="work-file">▤</span><div><strong>{task.title}</strong><small>{saved?'刚刚已保存':'已自动保存'}</small></div><span className="live-running"><i/> {task.owner} · {strategyMeta[strategy].label}</span><button onClick={()=>setSaved(true)}>{saved?'已保存':'保存草稿'}</button><button className="work-primary" onClick={onExit}>打开任务详情</button></header><div className="studio-layout"><aside className="studio-steps"><header><small>{workflow?.provider==='qwen'?'通义千问编排':'规则引擎编排'}</small><strong>{task.title}</strong></header>{steps.map((x,i)=><button key={x.id} className={i<step?'done':i===step?'active':''} onClick={()=>setStep(i)}><i>{i<step?'✓':i+1}</i><span><strong>{x.name}</strong><small>{x.objective}</small></span>{i===step&&<em/>}</button>)}</aside><main className="studio-operation"><div className="operation-head"><div><span>步骤 {step+1} / {steps.length} · {strategyMeta[strategy].label}</span><h2>{current.name}</h2><p>{current.objective}</p></div><span className="agent-follow"><i/> {loading?'Agent 正在编排':'阶段产物已就绪'}</span></div><StrategyStepCanvas strategy={strategy} step={step} current={current} input={input}/><div className="studio-bottom"><button disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>← 上一步</button><div>{steps.map((_,i)=><i key={i} className={i<=step?'active':''}/>)}</div><button disabled={loading||current.status==='blocked'} onClick={()=>step<steps.length-1?setStep(s=>Math.min(steps.length-1,s+1)):onComplete()}>{current.status==='blocked'?'补齐输入后继续':step===steps.length-1?'完成制作并进入合成检查':'确认产物并继续 →'}</button></div></main><aside className="studio-context"><header><strong>本次生成依据</strong><small>只显示当前步骤使用的上下文</small></header><section className="selected-product"><span>{input.product.slice(0,1)}</span><p><strong>{input.product}</strong><small>企业中心 · 已确认产品</small></p></section><dl><dt>目标买家</dt><dd>{input.audience}</dd><dt>市场</dt><dd>{input.market}</dd><dt>平台</dt><dd>{input.platform}</dd><dt>目标</dt><dd>{input.goal}</dd></dl><section className="context-evidence"><strong>当前引用</strong>{current.evidence.map(x=><p key={x}><i>✓</i>{x}</p>)}</section><section className="live-boundary"><strong>共用准出门</strong>{(workflow?.sharedGates??['事实核验','品牌与版权检查','发布前人工审核']).map(x=><p key={x}><span>✓</span> {x}</p>)}</section></aside></div></section></div>;
}

function StrategyStepCanvas({strategy,step,current,input}:{strategy:CreationStrategy;step:number;current:VideoWorkflow['steps'][number];input:StrategyInput}){
  const lanes=strategy==='product_led'?['产品事实','买家问题','事实脚本','素材匹配','成片审核']:strategy==='asset_led'?['素材理解','可见证据','剪辑结构','包装合成','落地检查']:['参考拆解','产品映射','素材回填','差异检查','独立成片'];
  return <div className={`strategy-step-canvas ${strategy}`}><header><span>{strategyMeta[strategy].label}</span><strong>{lanes[step]}</strong><em>{current.status==='blocked'?'输入阻断':'产物已生成'}</em></header><section className="strategy-output"><small>本步骤产物</small><h3>{current.output}</h3><p>{strategyMeta[strategy].description}</p></section><div className="strategy-flow-strip">{lanes.map((lane,index)=><span className={index<step?'done':index===step?'active':''} key={lane}><i>{index<step?'✓':index+1}</i><b>{lane}</b></span>)}</div><section className="strategy-proof-grid"><div><small>输入范围</small><strong>{strategy==='viral_remix'?`${input.references.length} 条参考 · ${input.assets.length} 项自有素材`:strategy==='asset_led'?`${input.assets.length} 项已授权素材`:`${input.productFacts.length} 项产品事实`}</strong></div><div><small>本步检查</small><strong>{current.checks.join(' · ')}</strong></div><div><small>事实原则</small><strong>{strategy==='viral_remix'?'迁移结构，不复制竞品内容':strategy==='asset_led'?'话术不得超出画面证据':'所有主张必须绑定产品证据'}</strong></div></section></div>;
}

// Retained as the alternative guided editor used by the next content workflow iteration.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LingshuStepCanvas({ step, onSubmit }: { step: number; onSubmit: () => void }) {
  const [mode,setMode]=useState('产品实证视频');
  const [voice,setVoice]=useState('英文专业旁白');
  const [cover,setCover]=useState('质量实证');
  if(step===0)return <div className="mode-canvas"><div className="selected-mode"><span>✓ 已选择表现形式</span><strong>{mode}</strong><p>创作策略已由 Agent 在交付单中确定；此处只调整内容表现。</p></div><div className="mode-options">{['真人口播','应用场景','渠道合作'].map(x=><button className={mode===x?'active':''} key={x} onClick={()=>setMode(x)}><span>表现形式</span><strong>{x}</strong><small>点击切换内容表现方式</small></button>)}</div></div>;
  if(step===1)return <div className="script-canvas"><section><header><strong>英文口播脚本</strong><span>已生成 · 68 词</span></header><h3>Built for consistency at scale</h3><p>From Guizhou&apos;s highlands to your next beverage line. Controlled sourcing, batch-level quality records and export-ready specifications...</p><div><span>00:00—00:05　产地与原料</span><span>00:05—00:12　生产与批次稳定性</span><span>00:12—00:22　检测与认证</span><span>00:22—00:30　规格书 CTA</span></div></section><aside><strong>声音策略</strong>{['英文专业旁白','仅字幕，无配音','真人口播'].map(x=><button key={x} className={voice===x?'active':''} onClick={()=>setVoice(x)}>{x}{x==='英文专业旁白'&&<span>▶ 试听</span>}</button>)}</aside></div>;
  if(step===2)return <VideoWorkflowCanvas step={2}/>;
  if(step===3)return <div className="cover-canvas"><section className="cover-preview"><span>GUIZHOU MATCHA</span><strong>Consistency<br/>you can verify.</strong><small>{cover} · Export-ready specifications</small></section><aside><strong>封面候选</strong>{['质量实证','工厂实力','采购规格'].map((x,i)=><button key={x} className={cover===x?'active':''} onClick={()=>setCover(x)}><span>0{i+1}</span><p><strong>{x}</strong><small>{i===0?'Agent 推荐':'备选方案'}</small></p></button>)}</aside></div>;
  return <div className="final-preview"><section><div className="final-video"><span className="preview-play">▶</span><span>00:30</span><strong>Consistency you can verify.</strong></div><div className="final-track"><i/><i/><i/><i/><i/><i/></div></section><aside><span>成片已生成</span><h3>工厂品质 30 秒视频</h3><dl><dt>画幅</dt><dd>1080 × 1920</dd><dt>语言</dt><dd>English</dd><dt>字幕</dt><dd>已烧录</dd><dt>事实检查</dt><dd>5 / 6 通过</dd></dl><p>成片已完成，提交后将进入合成检查节点。</p><button onClick={onSubmit}>完成制作并进入合成检查</button></aside></div>;
}

type TeaMediaItem = {
  id:string;
  title:string;
  category:string;
  local_path:string;
  source_url:string;
  license_name:string;
  truth_notice:string;
};

function VideoWorkflowCanvas({ step }: { step: number }) {
  const scenes = [['01','贵州高山茶园','航拍建立产地可信感'],['02','鲜叶与原料筛选','展示源头质量控制'],['03','自动化生产线','强调稳定规模供应'],['04','实验室批次检测','呈现可验证的质量记录'],['05','食品级抹茶包装','展示出口就绪状态'],['06','英文规格书 CTA','引导采购经理获取资料']];
  const [media,setMedia]=useState<TeaMediaItem[]>([]);
  const [mediaError,setMediaError]=useState(false);
  useEffect(()=>{let active=true;fetch('/api/tea-catalog?type=video').then(async response=>{
    if(!response.ok)throw new Error(`tea catalog ${response.status}`);
    return (await response.json()) as {items?:TeaMediaItem[]};
  }).then(payload=>{if(active)setMedia(payload.items??[])}).catch(()=>{if(active)setMediaError(true)});return()=>{active=false}},[]);
  const selected=media.length?media[Math.min(step,media.length-1)]:null;
  return <div className="video-workflow-canvas"><section className="video-preview"><div className={`preview-frame phase-${step} real-media`}><span>SCENE {Math.min(step+1,6)} / 6</span>{selected?<video key={selected.local_path} src={selected.local_path} controls muted playsInline preload="metadata" aria-label={`${selected.category}：${selected.title}`}/>:<div className="preview-visual"><i/><i/><i/></div>}<strong>{selected?.category??scenes[Math.min(step,5)][1]}</strong><small>{selected?.truth_notice??(mediaError?'素材接口暂不可用，保留分镜占位。':scenes[Math.min(step,5)][2])}</small>{!selected&&<span className="preview-play">▶</span>}</div><div className="preview-track"><i style={{width:`${Math.max(18,(step+1)*16)}%`}}/></div><div className="preview-meta"><span>{selected?`素材 ${Math.min(step+1,media.length)} / ${media.length}`:`00:${String(Math.min(30,(step+1)*5)).padStart(2,'0')} / 00:30`}</span><span>{selected?`${selected.license_name} · 来源可追溯`:'1080 × 1920 · 英文'}</span></div>{selected&&<a className="media-source-link" href={selected.source_url} target="_blank" rel="noreferrer">查看来源与授权 ↗</a>}</section><section className="scene-panel"><header><strong>视频分镜</strong><span>{media.length?`${media.length} 条开放素材已入库`:'6 个镜头 · 30 秒'}</span></header>{scenes.map((s,i)=><div key={s[0]} className={i<step?'ready':i===step?'generating':''}><span>{i<step?'✓':s[0]}</span><p><strong>{s[1]}</strong><small>{s[2]}</small></p><em>{i<step?'已生成':i===step?'生成中…':'等待'}</em></div>)}</section></div>;
}

function SchedulePage() {
  const [tab, setTab] = useState('排期编排');
  const [calendarView,setCalendarView]=useState<'week'|'month'>('week');
  const [source,setSource]=useState<'全部来源'|'人员创建'|'数字员工'>('全部来源');
  const [platform,setPlatform]=useState('全部渠道');
  const [weekOffset,setWeekOffset]=useState(0);
  const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);
  const scheduleItems=[
    {day:0,date:'24',time:'09:30',title:'工厂品质实证视频',platform:'LinkedIn',source:'数字员工',status:'已发布',tone:'blue'},
    {day:0,date:'24',time:'14:00',title:'经销商利润计算卡',platform:'Facebook',source:'人员创建',status:'已就绪',tone:'violet'},
    {day:1,date:'25',time:'10:30',title:'抹茶应用场景图文',platform:'Instagram',source:'数字员工',status:'已发布',tone:'violet'},
    {day:2,date:'26',time:'11:30',title:'30 秒品质短片',platform:'YouTube',source:'数字员工',status:'待审核',tone:'red'},
    {day:2,date:'26',time:'16:30',title:'采购规格下载提醒',platform:'Telegram',source:'人员创建',status:'已就绪',tone:'green'},
    {day:3,date:'27',time:'12:30',title:'渠道合作政策',platform:'LinkedIn',source:'数字员工',status:'已排期',tone:'blue'},
    {day:4,date:'28',time:'13:30',title:'高意向访客再营销',platform:'TikTok',source:'数字员工',status:'已排期',tone:'violet'},
    {day:5,date:'29',time:'10:00',title:'买家常见问题合集',platform:'LinkedIn',source:'人员创建',status:'草稿',tone:'amber'},
  ];
  const filteredItems=scheduleItems.filter(item=>(source==='全部来源'||item.source===source)&&(platform==='全部渠道'||item.platform===platform));
  const cycleSource=()=>setSource(value=>value==='全部来源'?'数字员工':value==='数字员工'?'人员创建':'全部来源');
  const cyclePlatform=()=>setPlatform(value=>{const values=['全部渠道',...SUPPORTED_PLATFORMS];return values[(values.indexOf(value)+1)%values.length]});
  const exportSchedule=()=>{
    const rows=[['日期','时间','内容','渠道','来源','状态'],...filteredItems.map(item=>[`2026-08-${item.date}`,item.time,item.title,item.platform,item.source,item.status])];
    const blob=new Blob(['\ufeff'+rows.map(row=>row.map(cell=>`"${cell.replaceAll('"','""')}"`).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='黔海-发布排期.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <>
    <PageHeader title="内容排期" desc="统一编排自然分发、邮件触达与投流素材，让每一次发布都在最佳时间发生。" action={tab==='排期编排'?'新建排期':'批量重试'} secondary="导出排期" onAction={()=>setDialog({title:tab==='排期编排'?'新建排期':'批量重试',desc:tab==='排期编排'?'从已审核内容中选择素材，设置发布渠道、账号、时间和追踪参数。':'将重试 3 条发布异常任务。'})} onSecondary={exportSchedule}/>
    <div className="schedule-overview">
      <div className="schedule-kpis"><article><span>本周计划</span><strong>26</strong><small>较上周 +18%</small></article><article><span>已就绪</span><strong>21</strong><small>80.8% 准备完成</small></article><article><span>今日待发</span><strong>3</strong><small>下一条 14:00</small></article><article className="alert"><span>需要处理</span><strong>3</strong><small>1 项阻塞发布</small></article></div>
      <nav className="schedule-tabs" aria-label="排期工作台"><button className={tab==='排期编排'?'active':''} onClick={()=>setTab('排期编排')}><span>发布日历</span><small>排期、调期与渠道冲突</small></button><button className={tab==='发布处理'?'active':''} onClick={()=>setTab('发布处理')}><span>发布处理</span><small>检查失败与授权异常</small><b>3</b></button></nav>
    </div>
    {tab==='排期编排'?<section className="schedule-board">
      <header className="schedule-toolbar"><div className="date-navigator"><button aria-label="上一周" onClick={()=>setWeekOffset(value=>value-1)}>‹</button><button className="today" onClick={()=>setWeekOffset(0)}>今天</button><button aria-label="下一周" onClick={()=>setWeekOffset(value=>value+1)}>›</button><strong>{weekOffset===0?'2026 年 8 月 24 日 — 30 日':weekOffset<0?'上一周':'下一周'}</strong><span>Asia/Shanghai</span></div><div className="calendar-controls"><button onClick={cyclePlatform}>{platform} ⌄</button><button onClick={cycleSource}>{source} ⌄</button><div><button className={calendarView==='week'?'active':''} onClick={()=>setCalendarView('week')}>周</button><button className={calendarView==='month'?'active':''} onClick={()=>setCalendarView('month')}>月</button></div></div></header>
      <div className="schedule-body"><aside className="content-queue"><header><div><strong>待排内容</strong><small>已通过审核，可直接编排</small></div><span>5</span></header>{[['渠道利润政策','LinkedIn','建议周四 12:30','blue'],['采购规格清单','Telegram','受众活跃 16:00','green'],['应用配方短片','YouTube','待选发布账号','red'],['买家 FAQ 轮播','Instagram','建议周五 14:00','violet']].map(item=><button key={item[0]} onClick={()=>setDialog({title:`编排：${item[0]}`,desc:`建议发布到 ${item[1]}，${item[2]}。确认后将加入日历并执行冲突检查。`})}><i className={`queue-platform ${item[3]}`}>{item[1].slice(0,1)}</i><span><strong>{item[0]}</strong><small>{item[1]}</small><em>{item[2]}</em></span><b>+</b></button>)}<footer><span><i/>最佳发布时间由 AI 标注</span><button onClick={()=>setDialog({title:'查看全部待排内容',desc:'已打开已审核内容库，可继续按项目、渠道和素材类型筛选。'})}>查看全部</button></footer></aside>
      <div className={`publishing-calendar ${calendarView}`}><div className="calendar-weekdays">{['周一','周二','周三','周四','周五','周六','周日'].map((day,index)=><div key={day} className={index===0?'today':''}><span>{day}</span><strong>{24+index}</strong>{index===0&&<small>今天</small>}</div>)}</div><div className="calendar-grid">{Array.from({length:calendarView==='week'?7:35},(_,index)=>{const day=index%7;const items=calendarView==='week'?filteredItems.filter(item=>item.day===day):(index>=7&&index<14?filteredItems.filter(item=>item.day===day):[]);return <div className={`calendar-day ${calendarView==='week'&&day===0?'today':''}`} key={index}>{calendarView==='month'&&<span className="month-date">{index<7?17+index:index<14?24+day:31+index-14}</span>}{items.map(item=><button key={`${item.time}-${item.title}`} className={`calendar-event ${item.tone}`} onClick={()=>setDialog({title:item.title,desc:`${item.date} 日 ${item.time} 发布至 ${item.platform}，由${item.source}创建，当前状态：${item.status}。可继续调整时间、账号或取消排期。`})}><span><time>{item.time}</time><em>{item.status}</em></span><strong>{item.title}</strong><small><i/>{item.platform}</small></button>)}{calendarView==='week'&&items.length===0&&<button className="empty-slot" onClick={()=>setDialog({title:'添加排期',desc:`为周${['一','二','三','四','五','六','日'][day]}选择已审核内容和发布时间。`})}>＋ 添加</button>}</div>})}</div></div>
      </div><footer className="schedule-legend"><span><i className="published"/>已发布</span><span><i className="ready"/>已就绪 / 已排期</span><span><i className="review"/>待审核</span><p><b>AI 建议</b> 周二 10:00—11:30 是采购人群活跃高峰，尚有 1 个可用窗口。</p></footer>
    </section>:<PublishExceptionWorkbench onAction={(title,desc)=>setDialog({title,desc})}/>}
    {dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} onClose={()=>setDialog(null)}/>} 
  </>;
}

function TrafficTideTable({onSchedule}:{onSchedule:(channel:string,time:string)=>void}){
  const [market,setMarket]=useState('马来西亚');
  const [channel,setChannel]=useState('LinkedIn');
  const hours=Array.from({length:24},(_,index)=>`${String(index).padStart(2,'0')}:00`);
  const tideByChannel:Record<string,number[]>={
    'LinkedIn':[18,14,11,9,10,15,24,38,57,76,91,96,89,77,66,61,65,73,84,90,81,64,43,27],
    'Facebook':[29,23,18,14,13,17,26,39,53,62,69,73,79,84,90,96,92,87,93,98,89,72,54,38],
  };
  const values=tideByChannel[channel];
  const points=values.map((value,index)=>`${(index/(values.length-1))*100},${100-value}`).join(' ');
  const areaPoints=`0,100 ${points} 100,100`;
  const cycleMarket=()=>setMarket(value=>value==='马来西亚'?'新加坡':value==='新加坡'?'印度尼西亚':'马来西亚');
  const cycleChannel=()=>setChannel(value=>value==='LinkedIn'?'Facebook':'LinkedIn');
  const isLinkedIn=channel==='LinkedIn';
  const isGoogle=isLinkedIn;
  return <section className="tide-panel"><header><div><span>今日流量预测</span><h2>流量潮汐表</h2><p>根据近 30 天竞价流量拟合的 24 小时走势，数值越高代表当前可获取流量越充足。</p></div><div><button onClick={cycleMarket}>{market} ⌄</button><button onClick={cycleChannel}>{channel} ⌄</button></div></header><div className="tide-summary"><article><span>当日流量峰值</span><strong>{isGoogle?'11:00':'19:00'}</strong><small>流量指数 {Math.max(...values)} / 100</small></article><article><span>建议放量窗口</span><strong>{isGoogle?'09:00—12:00':'14:00—20:00'}</strong><small>比日均流量高 {isGoogle?'29%':'31%'}</small></article><article><span>建议日预算</span><strong>{isGoogle?'$1,800':'$2,200'}</strong><small>70% 集中在放量窗口</small></article></div><div className="tide-graph"><div className="tide-y-axis"><b>100</b><b>75</b><b>50</b><b>25</b><b>0</b></div><div className="tide-plot"><div className="tide-grid"/><div className={`tide-window ${isGoogle?'google':'meta'}`}><span>建议放量</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`${channel} 24 小时流量潮汐曲线`}><polygon points={areaPoints}/><polyline points={points}/></svg><div className="tide-points">{values.map((value,index)=><button key={hours[index]} className={value===Math.max(...values)?'peak':''} style={{left:`${(index/(values.length-1))*100}%`,top:`${100-value}%`}} aria-label={`${hours[index]} 流量指数 ${value}`} onClick={()=>onSchedule(channel,hours[index])}><i/><span>{value===Math.max(...values)?`${hours[index]} · ${value}`:''}</span></button>)}</div></div></div><div className="tide-x-axis">{['00:00','03:00','06:00','09:00','12:00','15:00','18:00','21:00','24:00'].map(hour=><b key={hour}>{hour}</b>)}</div><footer><div><span><i className="forecast"/>预测流量</span><span><i className="window"/>建议放量窗口</span></div><p>点击曲线节点，可将该时段带入投流计划。</p></footer></section>;
}

function PublishExceptionWorkbench({onAction}:{onAction:(title:string,desc:string)=>void}){
  const rows=[['渠道政策更新','Telegram','内容审核未通过','补充渠道授权依据','高'],['应用场景获客','Instagram','账号授权 3 天后过期','重新授权账号','中'],['应用配方短片','YouTube','平台处理超时','立即重试','中']];
  return <section className="panel publish-exceptions"><div className="panel-title"><div><h2>发布异常处理</h2><p>只展示阻塞发布或需要人工确认的事项</p></div><div className="filter-chips"><button onClick={()=>onAction('平台筛选',`可按 ${SUPPORTED_PLATFORMS.join('、')} 筛选发布异常。`)}>全部平台⌄</button><button onClick={()=>onAction('来源筛选','可按人员或数字员工执行来源筛选。')}>全部来源⌄</button></div></div><div className="exception-table"><div className="exception-row head"><span>内容</span><span>平台</span><span>阻塞原因</span><span>建议动作</span><span>操作</span></div>{rows.map(r=><div className="exception-row" key={r[0]}><span><strong>{r[0]}</strong><small>{r[4]}优先级</small></span><span>{r[1]}</span><span>{r[2]}</span><span>{r[3]}</span><span><button onClick={()=>onAction(`异常详情：${r[0]}`,`${r[1]}：${r[2]}。建议${r[3]}。`)}>查看</button><button className="primary" onClick={()=>onAction(`处理：${r[0]}`,`将执行“${r[3]}”并记录处理结果。`)}>处理</button></span></div>)}</div><aside className="publish-check-summary"><div><strong>发布前自动检查</strong><small>内容审核、账号授权、链接追踪和频次冲突</small></div>{[['内容审核','24 / 26'],['平台授权','7 / 7'],['链接追踪','26 / 26'],['频次冲突','1 项']].map((x,i)=><span key={x[0]} className={i===0||i===3?'warn':''}>{x[0]} <b>{x[1]}</b></span>)}</aside></section>;
}

function AgentsPage() {
  return <>
    <PageHeader title="员工团队" desc="查看数字员工正在为哪些目标工作、采取了什么行动。" action="配置员工团队"/>
    <div className="stat-grid four"><Metric label="运行中员工" value="6"/><Metric label="今日自主动作" value="128" change="92% 自动完成"/><Metric label="等待审批" value="7" change="需要处理" warn/><Metric label="Agent 主导商机" value="21" change="¥486万"/></div>
    <section className="panel"><div className="panel-title"><div><h2>数字员工运行状态</h2><p>内容 40% · 信号 30% · 客户承接 30%</p></div><button onClick={()=>appFeedback('数字员工行动账本','已汇总本项目数字员工的执行动作、依据和人工审批记录。')}>查看行动账本</button></div><div className="agent-runtime-grid">{agents.map((agent,i)=><button key={agent.name} onClick={()=>appFeedback(agent.name,`${agent.action}；当前为${i<3?'自主执行':'审批模式'}。`)}><span className={`agent-avatar ${agent.tone}`}>AI</span><span><strong>{agent.name.replace(' Agent','数字员工')}</strong><small>{agent.action}</small><em>{i<3?'自主执行':'审批模式'} · {PROJECTS.matcha.name}</em></span><b>{i===3?'待审批':'运行中'}</b></button>)}</div></section>
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
    <section className="panel table-panel"><div className="panel-title"><div><h2>{tab}</h2><p>当前项目 · {PROJECTS.matcha.name}</p></div><button onClick={()=>appFeedback('排期筛选','筛选面板已就绪，可按渠道、来源和状态组合筛选。')}>筛选⌄</button></div>{tab === '分发计划' ? <TrafficVisual tab="分发计划"/> : <div className="data-table traffic-table"><div className="tr th"><span>内容／账号</span><span>平台</span><span>来源</span><span>计划时间</span><span>状态</span><span>结果</span><span>操作</span></div>{[['工厂品质验证','LinkedIn','数字员工','今天 09:30','已发布','访问 6,800','查看'],['应用场景获客','Facebook','人员创建','今天 11:00','已发布','访问 12,400','查看'],['渠道利润政策','Instagram','数字员工','今天 16:30','待审核','—','处理'],['应用配方视频','YouTube','数字员工','明天 10:00','已排期','—','调整']].map(r=><button className="tr" key={r[0]} onClick={()=>appFeedback(r[0],`${r[1]} · ${r[3]} · ${r[4]}。`)}>{r.map((x,i)=><span key={i} className={i===0?'strong-cell':''}>{x}</span>)}</button>)}</div>}</section>
  </>;
}

function TrafficPage() {
  const [tab, setTab] = useState('流量分析');
  const [platform,setPlatform]=useState('全部平台');
  const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);
  const [adInsight,setAdInsight]=useState<AiResult|null>(null);
  const tabs = ['流量分析', '投流管理', '受众', '优化建议'];
  const diagnose=async()=>{const result=await requestAi('ad_diagnosis',{spend:{actual:3080,budget:4000},leads:{actual:14,target:12},costPerLead:220,campaigns:[['LinkedIn',176,5],['Facebook',193,3],['Instagram',240,4],['TikTok',330,2]]});setAdInsight(result);setDialog({title:result.headline,desc:`${result.summary} 下一步：${result.recommendations.join('；')}`})};
  return <>
    <PageHeader title="广告投放" desc="管理付费流量，并监督数字员工的预算、受众和素材动作。" secondary="导出视图" onSecondary={()=>setDialog({title:'导出投流视图',desc:'将导出当前项目的预算、访问、询盘与成本数据。'})}/>
    <Tabs items={tabs} active={tab} setActive={setTab} />
    <div className="traffic-command"><div className="command-primary"><span>今日实际消耗</span><strong>$3,080 <small>/ $4,000</small></strong><i><em style={{width:'77%'}}/></i><div className="platform-spend"><span><b>F</b>Facebook <strong>$1,460</strong></span><span><b>I</b>Instagram <strong>$1,620</strong></span></div><p>节奏正常，预计 22:40 完成今日预算</p></div><div><span>新增有效询盘</span><strong>14</strong><small>目标 12 · 已超 16%</small></div><div><span>单询盘成本</span><strong>$220</strong><small className="positive">较目标低 11%</small></div><div className="command-alert"><span>待决策动作</span><strong>2</strong><small>预计影响 4 条询盘</small></div></div>
    {tab==='流量分析'?<TrafficTideTable onSchedule={(channel,time)=>setDialog({title:'使用高活跃时段',desc:`已选择 ${channel} 的 ${time} 高活跃窗口，可创建投流计划或调整现有 Campaign 的投放时段。`})}/>:<div className="two-col-wide"><section className="panel table-panel"><div className="panel-title"><div><h2>{tab === '投流管理' ? 'Campaign 操作台' : tab}</h2><p>当前项目 · {PROJECTS.matcha.name} · 2026.08.15 — 08.28 · USD</p></div><div className="filter-chips"><button onClick={()=>setPlatform(current=>{const values=['全部平台','Facebook','Instagram','TikTok','LinkedIn'];return values[(values.indexOf(current)+1)%values.length]})}>{platform}⌄</button><button onClick={()=>setDialog({title:'批量操作 Campaign',desc:'已选择当前筛选范围，可批量调整预算、暂停或更换素材。'})}>批量操作</button></div></div>
      {tab === '投流管理' || tab === '优化建议' ? <div className="data-table traffic-table ops-table"><div className="tr th"><span>Campaign／状态</span><span>平台</span><span>实际消耗／日预算</span><span>访问</span><span>询盘</span><span>单询盘成本</span><span>下一动作</span></div>{[
        ['● 采购需求触达','LinkedIn','$880 / $1,050 · 84%','4,900','5','$176','扩展受众'],['● 规格书再营销','Facebook','$580 / $750 · 77%','3,260','3','$193','维持'],['● 食品原料进口商','Instagram','$960 / $1,250 · 77%','8,600','4','$240','扩量 10%'],['● 应用场景获客','TikTok','$660 / $950 · 69%','5,180','2','$330','更换素材'],
      ].filter(r=>platform==='全部平台'||r[1]===platform).map(r=><button className="tr" key={r[0]} onClick={()=>setDialog({title:r[0].replace(/^[●Ⅱ]\s*/,''),desc:`${r[1]} Campaign：预算节奏 ${r[2]}，当前建议“${r[6]}”。`})}>{r.map((x,i)=><span key={i} className={i===0?'strong-cell':i===6?'row-action':''}>{x}</span>)}</button>)}</div> : <TrafficVisual tab={tab}/>}
    </section><AgentNote agent="分发增长数字员工" action="运行AI诊断" onAction={()=>void diagnose()}><h3>{adInsight?.headline||'基于确定性指标生成优化建议'}</h3><p>{adInsight?.summary||'点击运行AI诊断；预算和成本计算仍由规则层负责。'}</p><div className="impact"><span><b>14</b> 有效询盘</span><span><b>$220</b> 单询盘成本</span><span><b>4</b> Campaign</span></div></AgentNote></div>}
    {dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} onClose={()=>setDialog(null)}/>}
  </>;
}

function TrafficVisual({ tab, onSelect }: { tab: string; onSelect?: (item:string)=>void }) {
  if (tab === '分发计划') return <div className="week-grid">{['周一','周二','周三','周四','周五'].map((d,i)=>{const item=['LinkedIn 工厂视频','Instagram 应用图文','YouTube 品质片','Telegram 渠道政策','Facebook 再营销案例'][i];return <div key={d}><strong>{d}</strong><button onClick={()=>onSelect?.(item)}><small>{9+i}:30</small><span>{item}</span><em>{i<3?'已发布':'已排期'}</em></button></div>})}</div>;
  if (tab === '受众') return <div className="audience-grid">{[['食品原料进口商','18,400'],['饮品经销商','26,800'],['连锁茶饮采购','9,600'],['网站高意向访问者','4,280'],['再营销受众','12,700'],['目标账户名单','312 家']].map(a=><div key={a[0]}><span>{a[0]}</span><b>{a[1]}</b><small>已同步 · 可使用</small></div>)}</div>;
  return <div className="chart-box"><div className="bars">{[42,58,49,76,68,88,82,96,90,112,105,126].map((h,i)=><i key={i} style={{height:`${h}px`}}/>)}</div><div className="chart-labels"><span>8月15日</span><span>精准访问持续增长</span><span>8月28日</span></div><div className="channel-split">{[['LinkedIn','24%'],['Facebook','19%'],['Instagram','18%'],['TikTok','14%'],['YouTube','11%'],['WhatsApp','8%'],['Telegram','6%']].map(c=><div key={c[0]}><span>{c[0]}</span><b>{c[1]}</b></div>)}</div></div>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            ['询盘接待 Agent','自动识别并回复新询盘','WhatsApp · LinkedIn · Telegram','42','平均首响 1分36秒','运行中','blue'],
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
    <div className="inquiry-toolbar"><div><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} className="active">待首次响应 <b>12</b></button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>跟进中 <b>16</b></button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>待人工接管 <b>3</b></button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>已关闭</button></div><p><span/> 3 条高意向询盘将在 30 分钟内超时</p></div>
    <div className="conversation-workbench">
      <aside className="inquiry-list"><div className="list-search">搜索会话、企业或采购需求</div><div className="queue-filter"><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} className="active">优先级</button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>最新</button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>负责人⌄</button></div>{inquiries.map((item,i)=><button key={item[0]} className={selected===i?'active':''} onClick={()=>setSelected(i)}><span className="contact-avatar">{item[0].slice(0,1)}</span><span><strong>{item[0]} <em>{item[4]}</em></strong><small>{item[1]} · {item[2]}</small><p>{item[3]}</p><span className={`conversation-state s${i}`}>{item[5]} · {item[6]}</span></span></button>)}</aside>
      <section className="conversation"><header><div><strong>{q[0]} <em className="channel-tag">WA</em></strong><small>{q[1]} · {q[2]}</small></div><div className="conversation-actions"><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>历史记录</button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>查看来源内容</button></div></header><div className="messages"><p className="system-msg">来自 LinkedIn · 工厂品质视频 · 今天 10:42</p><div className="action-event"><span>AI</span><p><strong>已识别企业和采购意图</strong><small>食品原料进口商 · 500kg 测试采购 · 置信度 91%</small></p><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>查看依据</button></div><div className="bubble inbound">Hi, we are looking for a stable matcha supplier for our beverage clients. Could you share the specifications, sample options and a quote for 500kg?</div><div className="translation"><span>译</span><p>我们正在为饮品客户寻找稳定的抹茶供应商，希望获取规格、样品方案以及 500kg 报价。</p><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>显示原文</button></div><div className="action-event knowledge"><span>知</span><p><strong>已调用企业知识库</strong><small>英文产品规格书 · 样品政策 · 出口认证资料</small></p><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>3 个来源</button></div><div className="bubble outbound draft"><span>AI 回复草稿 · 尚未发送</span>Hi Adrian, thank you for reaching out. I can share our export specification and sample options. Before preparing the right quote, may I confirm your required grade and target application?<div className="draft-actions"><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>重新生成</button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>编辑</button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>批准发送</button></div></div></div><footer><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} className="attach">＋</button><input aria-label="回复询盘" placeholder="输入回复，或采用 AI 草稿…"/><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>发送</button></footer></section>
      <aside className="customer-intelligence"><header><div><strong>客户洞察</strong><small>AI 提取 · 2 分钟前更新</small></div><span>91 高意向</span></header><div className="intelligence-tabs">{['资格判断','证据与记忆','接管与权限'].map(x=><button key={x} className={detailTab===x?'active':''} onClick={()=>setDetailTab(x)}>{x}</button>)}</div>{detailTab==='资格判断'?<QualificationPanel go={go}/>:detailTab==='证据与记忆'?<EvidenceMemory/>:<HandoffPanel/>}</aside>
    </div>
  </>;
}

function QualificationPanel({ go }: { go: (view: View) => void }) {
  return <div className="intelligence-body"><section className="company-match"><div><span>LI</span><p><strong>Lumi Ingredients</strong><small>食品原料进口商 · 马来西亚</small></p></div><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>企业档案 ›</button></section><div className="intent-tags"><span>500kg 测试采购</span><span>索取样品</span><span>需要报价</span></div><section className="score-card"><header><strong>BANT / SPIN 资格评分</strong><b>78 / 100</b></header>{[['需求 Need','明确','100%'],['时间 Timeline','30 天内','82%'],['决策 Authority','采购经理','75%'],['预算 Budget','待确认','40%']].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong><i><em style={{width:x[2]}}/></i></div>)}</section><section className="evidence-quote"><header><strong>关键判断依据</strong><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>查看全部 4 条</button></header><blockquote>“Could you share the specifications, sample options and a quote for <b>500kg</b>?”</blockquote><small>支持判断：采购量明确 · 报价意图 · 样品需求</small></section><section className="missing-fields"><strong>还需确认</strong><span>目标等级</span><span>预算范围</span><span>认证要求</span></section><button className="create-opportunity" onClick={()=>go('customers')}>确认合格并创建商机</button></div>;
}

function EvidenceMemory() {
  return <div className="intelligence-body"><section className="memory-summary"><strong>客户记忆摘要</strong><p>该客户服务马来西亚连锁饮品品牌，关注批次稳定性与清真认证。此前下载英文规格书 3 次，尚未提供目标价。</p></section><section className="evidence-list"><strong>知识与证据</strong>{[['产品规格书 v3.2','支持等级与检测参数','已引用'],['样品政策 2026','支持标准样品流程','已引用'],['渠道授权政策','涉及区域承诺','禁止自动发送']].map(x=><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} key={x[0]}><span><strong>{x[0]}</strong><small>{x[1]}</small></span><em>{x[2]}</em></button>)}</section><section className="history-strip"><strong>历史互动</strong><p><i/> 今天 · 询问 500kg 报价</p><p><i/> 8月27日 · 查看英文规格书</p><p><i/> 8月24日 · 来自 LinkedIn 内容互动</p></section></div>;
}

function HandoffPanel() {
  return <div className="intelligence-body"><section className="boundary-card"><header><strong>自动回复边界</strong><span>已触发</span></header>{[['产品规格与认证','可自动回复','safe'],['标准样品政策','可自动发送','safe'],['价格与交期','必须人工确认','risk'],['区域独家代理','禁止自动承诺','risk']].map(x=><div key={x[0]}><span>{x[0]}</span><em className={x[2]}>{x[1]}</em></div>)}</section><section className="handoff-package"><strong>人工接管包已就绪</strong><p>已包含客户摘要、原始证据、AI 已执行动作、缺失信息、知识来源与推荐回复。</p><dl><dt>升级原因</dt><dd>客户提出正式报价</dd><dt>建议负责人</dt><dd>海外业务部 · 王宁</dd><dt>响应时限</dt><dd>剩余 18 分钟</dd></dl></section><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} className="handoff-primary">接管并继续回复</button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} className="handoff-secondary">批准本次 AI 回复</button><small className="handoff-note">接管后 AI 将停止对外发送，仍可协助生成草稿。</small></div>;
}

function CustomersPage({ go }: { go: (view: View) => void }) {
  const [tab, setTab] = useState('客户列表');
  const tabs = ['客户列表','商机看板','跟进任务','报价订单','转化归因'];
  return <>
    <div className="live-page-header"><button onClick={()=>go('inquiries')}>← 返回客户经营总览</button><div><span className="live-entry-dot"/><strong>客户工作现场</strong><small>查看 Agent 如何推进线索、商机与成交</small></div><Tabs items={['询盘回复','商机跟进']} active="商机跟进" setActive={(next)=>{if(next==='询盘回复') go('customerLive')}}/></div>
    <Tabs items={tabs} active={tab} setActive={setTab}/>
    <CustomerJourney active={tab === '客户列表' ? '资格确认' : tab === '商机看板' || tab === '跟进任务' ? '商机推进' : tab === '报价订单' ? '报价协同' : '成交复盘'}/>
    <div className="two-col-wide"><section className="panel table-panel"><div className="panel-title"><div><h2>{tab}</h2><p>当前项目 · {PROJECTS.matcha.name}</p></div><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>筛选⌄</button></div>
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
  return <div className="qualification"><div className="qualification-list">{[['Lumi Ingredients','91','报价准备','资料完整'],['Maya Food Distribution','86','资格确认','缺采购预算'],['Pacific Beverage SG','82','会议准备','缺决策链'],['GreenCup Distribution','76','样品测试','待签收']].map((x,i)=><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} key={x[0]} className={i===0?'active':''}><span className="contact-avatar">{x[0][0]}</span><span><strong>{x[0]}</strong><small>{x[2]} · {x[3]}</small></span><b>{x[1]}</b></button>)}</div><article><header><div><small>马来西亚 · 食品原料进口商</small><h3>Lumi Ingredients</h3></div><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>查看完整档案</button></header><div className="qualification-grid">{[['采购需求','500kg 首批测试'],['应用场景','连锁饮品客户'],['目标时间','9 月完成样品'],['决策角色','采购经理＋创始人'],['认证要求','Halal / SGS'],['负责人','王宁']].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</div><div className="qualification-check"><strong>资格确认清单</strong><label><input type="checkbox" defaultChecked/> 企业与联系人真实性已确认</label><label><input type="checkbox" defaultChecked/> 需求和应用场景明确</label><label><input type="checkbox"/> 预算范围待确认</label><label><input type="checkbox"/> 决策流程待补充</label></div><footer><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>标记无效</button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} className="primary">确认合格并创建商机</button></footer></article></div>;
}

function FollowupWorkbench() {
  return <div className="followup-workbench"><div className="today-agenda"><header><strong>今天 · 8月29日</strong><span>5 项</span></header>{[['14:00','Lumi Ingredients','确认认证与区域政策','高'],['16:30','GreenCup Distribution','跟进样品签收','中'],['17:30','Pacific Beverage SG','发送会议议程','高']].map((x,i)=><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} key={x[1]} className={i===0?'active':''}><time>{x[0]}</time><span><strong>{x[1]}</strong><small>{x[2]}</small></span><em>{x[3]}</em></button>)}</div><article><header><div><small>Lumi Ingredients · 报价阶段</small><h3>确认认证与区域政策</h3></div><span>今天 14:00</span></header><div className="activity-timeline"><p><i/> <strong>8月28日</strong> 客户确认首批采购量为 500kg</p><p><i/> <strong>8月26日</strong> 英文规格书已查看 3 次</p><p><i/> <strong>8月24日</strong> 样品已签收</p></div><textarea aria-label="跟进记录" placeholder="记录沟通结果、客户异议或下一步承诺…"/><footer><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>稍后提醒</button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>标记完成并创建下一步</button></footer></article></div>;
}

function QuoteWorkbench() {
  return <div className="quote-workbench"><aside>{[['QT-202608-014','Pacific Beverage','待审批'],['QT-202608-012','GreenCup','已发送'],['SO-202608-003','Lumi Ingredients','已确认']].map((x,i)=><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} key={x[0]} className={i===0?'active':''}><span><strong>{x[0]}</strong><small>{x[1]}</small></span><em>{x[2]}</em></button>)}</aside><article><header><div><small>报价草稿 · Pacific Beverage SG</small><h3>2,000kg 食品级抹茶年度框架报价</h3></div><span>待销售总监审批</span></header><div className="quote-lines"><div className="head"><span>产品</span><span>数量</span><span>单价</span><span>小计</span></div><div><strong>食品级抹茶 M-02</strong><span>2,000kg</span><span>¥ 510/kg</span><b>¥ 102万</b></div><div><strong>出口包装与文件</strong><span>1 项</span><span>¥ 8万</span><b>¥ 8万</b></div></div><div className="quote-total"><span>报价总额</span><strong>¥ 110万</strong><small>毛利率 31.6% · 有效期 15 天</small></div><footer><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>退回修改</button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} className="primary">批准并发送</button></footer></article></div>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

function DealBoard(){const columns: Array<[string,string[]]>=[['合格线索',['Maya Food','Nusa Ingredients']],['样品／会议',['GreenCup','Pacific Beverage']],['报价',['Lumi Ingredients','TeaWorks MY']],['商务谈判',['Golden Leaf']],['成交',['Lumi Ingredients · SO-003']]];return <div className="deal-board">{columns.map(([stage,customers])=><div key={stage}><strong>{stage} <em>{customers.length}</em></strong>{customers.map(customer=><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} key={customer}><span>{customer}</span><small>¥ 42—110万</small></button>)}</div>)}</div>}

function Attribution(){return <div className="attribution"><div><span>首次触点</span><b>LinkedIn 工厂品质视频</b><small>8月18日 · 自然触达</small></div><i>→</i><div><span>内容承接</span><b>英文规格书落地页</b><small>访问 3 次 · 下载 1 次</small></div><i>→</i><div><span>询盘</span><b>WhatsApp 样品咨询</b><small>8月20日 · 高意向</small></div><i>→</i><div><span>订单</span><b>SO-202608-003</b><small>成交 ¥68万</small></div></div>}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function OrganizationPage({ view }: { view: View }) {
  const [permissionTab, setPermissionTab] = useState(view === 'accounts' ? '账号连接' : '权限管理');
  const [dialog,setDialog]=useState<{title:string;desc:string}|null>(null);
  const configs: Partial<Record<View, {desc:string; metrics:string[][]}>> = {
    structure:{desc:'管理组织归属、跨部门项目团队、外部协作与责任权限。',metrics:[['运行中项目','8'],['跨部门项目','5'],['外部协作团队','3'],['待补责任岗位','2']]},
    permissions:{desc:'管理角色、数据范围、审批流程与 Agent 行动边界。',metrics:[['预置角色','8'],['权限策略','36'],['审批流程','9'],['异常权限','1']]},
    accounts:{desc:'统一管理登录账号、社媒账号、广告账户和沟通渠道。',metrics:[['平台连接','31'],['正常','28'],['即将过期','2'],['待验证','1']]},
    data:{desc:'管理数据源、字段映射、质量、导入导出和保留策略。',metrics:[['数据完整率','96.8%'],['数据源','18'],['待匹配询盘','14'],['同步异常','2']]},
    security:{desc:'配置登录安全、自动化边界、审计日志和 API。',metrics:[['安全评分','92'],['MFA 覆盖','86%'],['今日审计事件','248'],['高风险动作','0']]},
    home:{desc:'',metrics:[]},projects:{desc:'',metrics:[]},content:{desc:'',metrics:[]},traffic:{desc:'',metrics:[]},inquiries:{desc:'',metrics:[]},customerLive:{desc:'',metrics:[]},customers:{desc:'',metrics:[]},
  };
  const item=configs[view]??{desc:'',metrics:[]};
  const mergedPermissionPage = view === 'permissions' || view === 'accounts';
  return <><PageHeader title={mergedPermissionPage ? '权限与账号' : viewNames[view]} desc={mergedPermissionPage ? '统一管理成员权限、数字员工行动边界和平台账号连接。' : item.desc} action={view==='structure'?'新建组织节点':undefined} onAction={()=>setDialog({title:'新建组织节点',desc:'创建事业部、品牌或职能团队，并设置负责人、成员和默认项目权限。'})}/>{mergedPermissionPage && <Tabs items={['权限管理','账号连接']} active={permissionTab} setActive={setPermissionTab}/>}<div className="stat-grid four">{item.metrics.map(m=><Metric key={m[0]} label={m[0]} value={m[1]}/>)}</div><section className="panel org-panel">{view==='structure'?<OrgTree/>:mergedPermissionPage?(permissionTab === '权限管理'?<PermissionMatrix/>:<AccountGrid/>):view==='data'?<DataManagement/>:<SecurityPage/>}</section>{dialog&&<ActionDialog title={dialog.title} desc={dialog.desc} confirm="创建" onClose={()=>setDialog(null)}/>}</>;
}

type OrgView = '组织结构' | '项目团队' | '外部协作' | '权限影响';

const orgViewData: Record<OrgView, { title:string; subtitle:string; items:Array<{name:string; meta:string; tag:string; tone?:string}> }> = {
  组织结构:{title:'黔山国际产业集团',subtitle:'稳定的行政与品牌归属',items:[
    {name:'贵州茶国际增长中心',meta:'18 人 · 1 个项目',tag:'中心'},
    {name:'贵州茶事业部',meta:'32 人 · 1 个项目',tag:'事业部'},
    {name:'黔绿方舟',meta:'16 人 · 1 个项目',tag:'品牌'},
  ]},
  项目团队:{title:'跨部门增长项目',subtitle:'围绕经营任务动态组队',items:[
    {name:PROJECTS.matcha.name,meta:'8 人 · 审批模式',tag:'进行中'},
  ]},
  外部协作:{title:'合作机构与服务团队',subtitle:'按项目授权，默认数据隔离',items:[
    {name:'贵州广电国际传播中心',meta:'内容制作 · 海外分发',tag:'合作中'},
    {name:'SEA Growth Partners',meta:'马来西亚 · 渠道顾问',tag:'合作中'},
    {name:'LinguaBridge 本地化',meta:'翻译 · 文化审核',tag:'7天到期',tone:'warn'},
  ]},
  权限影响:{title:'成员与责任岗位',subtitle:'检查实际可见范围与动作边界',items:[
    {name:'陈妍',meta:'事业部负责人 · 5 个项目',tag:'组织角色'},
    {name:'王宁',meta:`项目负责人 · ${PROJECTS.matcha.region}`,tag:'项目角色'},
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
        <div className="org-tree-heading"><div><h3>{current.title}</h3><p>{current.subtitle}</p></div><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} aria-label="更多操作">•••</button></div>
        <div className="org-search">⌕　搜索组织、项目或成员</div>
        <div className="org-tree-list">{current.items.map((item,i)=><button className={`${selected===i?'active':''} ${i>1&&activeView==='组织结构'?'child':''}`} onClick={()=>setSelected(i)} key={item.name}><span><i>{item.tag.slice(0,1)}</i><span><strong>{item.name}</strong><small>{item.meta}</small></span></span><em className={item.tone}>{item.tag}</em></button>)}</div>
        <button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} className="org-add">＋ 新建{activeView==='组织结构'?'组织节点':activeView==='项目团队'?'项目团队':activeView==='外部协作'?'合作关系':'成员授权'}</button>
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

function DetailHeader({tag,title,desc,actions=true}:{tag:string;title:string;desc:string;actions?:boolean}){return <div className="org-detail-header"><div><span>{tag}</span><h2>{title}</h2><p>{desc}</p></div>{actions&&<div><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>查看审计记录</button><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')} className="primary-lite">编辑配置</button></div>}</div>}

function BusinessUnitDetail({brand}:{brand:boolean}){return <main className="org-detail"><DetailHeader tag={brand?'品牌':'事业部'} title={brand?'黔绿方舟':'贵州茶事业部'} desc={brand?'面向东南亚市场的贵州茶品牌，归属贵州茶事业部。':'负责贵州茶品牌的国内外增长项目。'}/><div className="org-summary-grid"><Summary label="负责人" value={brand?'刘蓁':'陈妍'} note={brand?'品牌负责人':'事业部总经理'}/><Summary label="成员" value={brand?'16 人':'32 人'} note="跨 4 个职能"/><Summary label="运行项目" value="1" note="贵州茶专项"/><Summary label="待处理" value="2" note="缺少业务接管人" warn/></div><section className="org-section"><SectionTitle title="经营范围与项目" note="行政归属不等于项目权限，具体范围由项目配置" action="查看全部项目"/><div className="project-cards"><ProjectCard title={PROJECTS.matcha.name} market={`${PROJECTS.matcha.countries} · 渠道型 B2B`} status="正常运行" people="8 人协作"/></div></section><section className="org-section"><SectionTitle title="默认责任与权限" note="新项目可继承，项目负责人可申请覆盖"/><div className="responsibility-row"><span><i>任</i><b>项目负责人</b><small>经营目标、预算和异常接管</small></span><strong>王宁</strong><em>已配置</em></div><div className="responsibility-row"><span><i>审</i><b>品牌审核人</b><small>产品事实、认证与品牌表达</small></span><strong>刘蓁</strong><em>已配置</em></div><div className="responsibility-row attention"><span><i>销</i><b>高价值商机接管</b><small>报价、独家代理与商务承诺</small></span><strong>未指定</strong><em>需补充</em></div></section></main>}

function ProjectTeamDetail({compact:_compact}:{compact:boolean}){return <main className="org-detail"><DetailHeader tag="跨部门项目团队" title={PROJECTS.matcha.name} desc="团队随经营任务组建，成员权限仅在本项目与授权周期内有效。"/><div className="team-context"><span><small>所属组织</small><strong>贵州茶事业部 / 黔绿方舟</strong></span><span><small>运行模式</small><strong>审批模式</strong></span><span><small>授权周期</small><strong>2026.08.01—11.30</strong></span><span><small>数字员工</small><strong>6 位运行中</strong></span></div><section className="org-section"><SectionTitle title="项目责任链" note="关键岗位缺失时，相关动作不会自动执行" action="调整团队"/><div className="team-role-grid">{[['王宁','项目负责人','目标、预算与异常'],['刘蓁','品牌审核','事实、认证与表达'],['周岚','海外销售','询盘、报价与谈判'],['何嘉','技术质量','规格与检测文件'],['贵州广电项目组','外部内容协作','制作、译制与分发'],['待指定','销售总监','折扣与独家代理']].map((x,i)=><div className={i===5?'missing':''} key={x[1]}><i>{x[0].slice(0,1)}</i><span><strong>{x[0]}</strong><b>{x[1]}</b><small>{x[2]}</small></span>{i===5&&<em>缺口</em>}</div>)}</div></section><section className="org-section"><SectionTitle title="协作与审批链" note="普通动作自动流转，越界动作准确交给责任人"/><div className="approval-flow"><span><i>AI</i><b>内容生产</b><small>数字员工</small></span><em>→</em><span><i>品</i><b>事实与品牌审核</b><small>刘蓁</small></span><em>→</em><span><i>发</i><b>发布与小额投流</b><small>自动执行</small></span><em>→</em><span className="risk"><i>商</i><b>报价／代理承诺</b><small>人工接管</small></span></div></section></main>}

function PartnerDetail({expiring}:{expiring:boolean}){return <main className="org-detail"><DetailHeader tag="外部合作机构" title={expiring?'LinguaBridge 本地化':'贵州广电国际传播中心'} desc="外部协作按项目授权，不进入企业行政组织，默认隔离客户与商业数据。"/><div className="boundary-banner"><span>隔离边界</span><strong>仅可访问指定项目的内容、素材与排期；不可查看客户报价、毛利及其他品牌数据。</strong><button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>调整边界</button></div><section className="org-section"><SectionTitle title="合作范围" note="权限来自项目合同与临时授权"/><div className="scope-grid"><Summary label="合作项目" value="1 个" note={PROJECTS.matcha.name}/><Summary label="外部成员" value="5 人" note="均已开启 MFA"/><Summary label="授权有效期" value={expiring?'剩余 7 天':'92 天'} note="到期自动回收" warn={expiring}/></div></section><section className="org-section"><SectionTitle title="可执行动作" note="字段级数据脱敏已开启"/><div className="action-chips"><span className="allowed">✓ 创建与编辑内容</span><span className="allowed">✓ 提交品牌审核</span><span className="allowed">✓ 管理指定海外账号排期</span><span className="review">审批　正式发布</span><span className="denied">— 客户与询盘</span><span className="denied">— 报价、成本与毛利</span></div></section></main>}

function PermissionImpact({external}:{external:boolean}){return <main className="org-detail"><DetailHeader tag={external?'外部协作者':'成员权限画像'} title={external?'贵州广电项目组':'陈妍'} desc="汇总组织角色、项目角色与临时授权产生的实际权限。"/><div className="permission-formula"><span>实际权限</span><b>角色权限</b><i>×</i><b>数据范围</b><i>×</i><b>动作风险</b><i>×</i><b>项目上下文</b></div><section className="org-section"><SectionTitle title="权限来源" note="冲突时执行更严格的限制"/><div className="permission-source"><span><i>组</i><b>事业部负责人</b><small>贵州茶事业部 · 长期</small></span><em>组织角色</em><strong>管理事业部品牌与项目</strong></div><div className="permission-source"><span><i>项</i><b>项目经营审批人</b><small>贵州茶东南亚项目 · 至 11月30日</small></span><em>项目角色</em><strong>目标、预算和异常审批</strong></div><div className="permission-source muted"><span><i>临</i><b>贵州茶市场观察者</b><small>仅看汇总数据 · 至 9月15日</small></span><em>临时授权</em><strong>只读</strong></div></section><section className="org-section"><SectionTitle title="高风险动作影响" note="数字员工越界后将按此责任链路由"/><div className="impact-table"><div><span>预算单次上调 ＞10%</span><b>需要本人审批</b><em>2 项待处理</em></div><div><span>产品事实／认证变更</span><b>品牌审核人审批</b><em>正常</em></div><div><span>报价、折扣与独家代理</span><b>销售总监审批</b><em className="danger">责任人缺失</em></div></div></section></main>}

function Summary({label,value,note,warn}:{label:string;value:string;note:string;warn?:boolean}){return <div className={warn?'summary-warn':''}><span>{label}</span><b>{value}</b><small>{note}</small></div>}
function SectionTitle({title,note,action}:{title:string;note:string;action?:string}){return <div className="org-section-title"><div><h3>{title}</h3><p>{note}</p></div>{action&&<button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}>{action} →</button>}</div>}
function ProjectCard({title,market,status,people,warn}:{title:string;market:string;status:string;people:string;warn?:boolean}){return <button onClick={()=>appFeedback('操作已响应','该操作已完成，页面状态已更新。')}><span><i className={warn?'amber':''}>项</i><span><strong>{title}</strong><small>{market}</small></span></span><span><b>{people}</b><em className={warn?'warn':''}>{status}</em></span></button>}

function PermissionMatrix(){const roles=['集团管理员','事业部负责人','项目负责人','内容运营','内容审核','投流人员','海外销售','外部协作者']; const [open,setOpen]=useState(false); return <div><div className="panel-title"><div><h2>角色与权限矩阵</h2><p>同时控制功能动作和组织／品牌／项目数据范围</p></div><button onClick={()=>setOpen(true)}>编辑权限</button></div><div className="permission-table"><div className="ptr head"><span>角色</span>{['项目','内容','投流','询盘','报价订单','Agent'].map(x=><span key={x}>{x}</span>)}</div>{roles.map((r,i)=><div className="ptr" key={r}><strong>{r}</strong>{[0,1,2,3,4,5].map(j=><span key={j} className={(i+j)%4===0?'limited':''}>{(i+j)%4===0?'审批':i===7&&j>2?'—':'✓'}</span>)}</div>)}</div>{open&&<ActionDialog title="编辑角色权限" desc="调整功能动作、数据范围和 Agent 行动边界。高风险权限变更提交后需要管理员复核。" confirm="保存草稿" onClose={()=>setOpen(false)}/>}</div>}

const platformAccountMeta: Record<(typeof SUPPORTED_PLATFORMS)[number],{icon:string;count:string;status:string}> = {
  Facebook:{icon:'f',count:'4',status:'正常'}, Instagram:{icon:'IG',count:'5',status:'1 个即将过期'}, TikTok:{icon:'TK',count:'4',status:'正常'},
  LinkedIn:{icon:'in',count:'2',status:'正常'}, YouTube:{icon:'YT',count:'3',status:'正常'}, WhatsApp:{icon:'WA',count:'2',status:'正常'}, Telegram:{icon:'TG',count:'1',status:'1 个待验证'},
};
const accountGroups = [{title:'支持平台',desc:'统一管理内容发布、互动、客户沟通与转化追踪',tone:'blue',accounts:SUPPORTED_PLATFORMS.map(name=>({name,...platformAccountMeta[name]}))}];

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workbenchTarget, setWorkbenchTarget] = useState<{tab:WorkbenchTab;filter?:string;customerId?:string}>({tab:'待处理',filter:'全部'});
  const [showGlobalRuns, setShowGlobalRuns] = useState(false);
  const [topDialog,setTopDialog]=useState<{title:string;desc:string}|null>(null);
  const [onboardingStage,setOnboardingStage]=useState<OnboardingStage>(null);
  const initialOnboardingClaim=useRef<Promise<boolean>|null>(null);
  useEffect(()=>{const handler=(event:Event)=>{const detail=(event as CustomEvent<{title:string;desc:string}>).detail;setTopDialog(detail)};window.addEventListener('qianhai-feedback',handler);return()=>window.removeEventListener('qianhai-feedback',handler)},[]);
  useEffect(() => {
    const syncViewFromHash = () => {
      const candidate = window.location.hash.slice(1) as View;
      if (candidate && candidate in viewNames) setView(candidate);
    };
    const frame = window.requestAnimationFrame(syncViewFromHash);
    window.addEventListener('hashchange', syncViewFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', syncViewFromHash);
    };
  }, []);
  useEffect(() => {
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      setSidebarCollapsed(window.localStorage.getItem('qianhai-sidebar-collapsed') === 'true');
      initialOnboardingClaim.current ??= claimFirstLoginOnboarding();
      void initialOnboardingClaim.current
        .then(shouldStartOnboarding=>{if(active&&shouldStartOnboarding)setOnboardingStage('setup')})
        .catch(error=>{
          if(!active)return;
          if(error instanceof OnboardingClaimError&&error.status===401){setOnboardingStage('auth');return}
          setTopDialog({title:'暂时无法确认新手任务',desc:'账号状态未被改写，请刷新后重试。系统不会因此重复发放新手任务。'});
        });
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, []);
  const toggleSidebar = () => {
    setSidebarCollapsed(current => {
      const next = !current;
      window.localStorage.setItem('qianhai-sidebar-collapsed', String(next));
      return next;
    });
  };
  const closeOnboarding=(destination:View='home')=>{
    setOnboardingStage(null);
    setView(destination);
  };
  const go = (next: View) => {
    setView(next);
    window.history.replaceState(null, '', `#${next}`);
  };
  const openWorkbench = (target: CustomerWorkspaceTarget) => {
    const tab: WorkbenchTab = target.tab === 'customers' ? '客户' : target.tab === 'opportunities' ? '商机' : '待处理';
    const customerAliases: Record<string,string> = {
      'adrian-tan':'adrian', 'maya-food':'maya', 'lumi-ingredients':'adrian', lumi:'adrian', adrian:'adrian', maya:'maya',
    };
    const filterAliases: Record<string,string> = {
      'needs-attention':'全部', 'high-intent':'高意向', 'new-inquiry':'询盘接待', 'in-progress':'商机推进', quotation:'报价协同', won:'成交', today:'全部',
    };
    setWorkbenchTarget({tab,filter:target.filter ? (filterAliases[target.filter] ?? target.filter) : '全部',customerId:target.customerId ? (customerAliases[target.customerId] ?? target.customerId) : undefined});
    go('workbench');
  };
  const openCustomerInWorkbench = (customerId:string) => openWorkbench({tab:'customers',customerId});
  const canEnterProduction = view === 'content' || view === 'workbench' || view === 'customerLive';
  return <main className={sidebarCollapsed ? 'app-shell sidebar-is-collapsed' : 'app-shell'}>
    <aside className="sidebar">
      <button
        className="sidebar-toggle"
        type="button"
        aria-label={sidebarCollapsed ? '展开左侧导航' : '收起左侧导航'}
        aria-expanded={!sidebarCollapsed}
        onClick={toggleSidebar}
      ><span aria-hidden="true">{sidebarCollapsed ? '›' : '‹'}</span></button>
      <div className="brand"><span className="brand-logo">黔</span><div><strong>黔海</strong><small>Global Growth OS</small></div></div>
      <nav className="main-nav" aria-label="主导航">
        <button aria-label="首页" className={view==='home'?'nav-item active':'nav-item'} onClick={()=>go('home')}><NavIcon name="home"/><span>首页</span></button>
        <p className="nav-section nav-section-first">增长任务</p>
        <button aria-label="经营任务" className={view==='projects'||view==='agents'?'nav-item active':'nav-item'} onClick={()=>go('projects')}><NavIcon name="tasks"/><span>经营任务</span></button>
        <button aria-label="审批与异常，7 项待处理" className={view==='approvals'?'nav-item active':'nav-item'} onClick={()=>go('approvals')}><NavIcon name="approval"/><span>审批与异常</span><b className="nav-badge">7</b></button>
        <p className="nav-section">内容与流量</p>
        <button aria-label="内容与素材" className={view==='content'?'nav-item active':'nav-item'} onClick={()=>go('content')}><NavIcon name="content"/><span>内容与素材</span></button>
        <button aria-label="排期与分发" className={view==='schedule'||view==='distribution'?'nav-item active':'nav-item'} onClick={()=>go('schedule')}><NavIcon name="calendar"/><span>排期与分发</span></button>
        <button aria-label="广告投放" className={view==='traffic'?'nav-item active':'nav-item'} onClick={()=>go('traffic')}><NavIcon name="ads"/><span>广告投放</span></button>
        <p className="nav-section">客户管理</p>
        <button aria-label="客户经营" className={view==='inquiries'?'nav-item active':'nav-item'} onClick={()=>go('inquiries')}><NavIcon name="growth"/><span>客户经营</span></button>
        <button aria-label="客户工作台，3 项待处理" className={view==='workbench'||view==='customerLive'||view==='customers'?'nav-item active':'nav-item'} onClick={()=>openWorkbench({tab:'tasks'})}><NavIcon name="workbench"/><span>客户工作台</span><b className="nav-badge">3</b></button>
        <button aria-label="收入分析" className={view==='revenue'?'nav-item active':'nav-item'} onClick={()=>go('revenue')}><NavIcon name="revenue"/><span>收入分析</span></button>
        <p className="nav-section">平台管理</p>
        {([['knowledge','企业知识库','knowledge'],['structure','组织架构','org'],['permissions','权限管理','permission'],['data','数据管理','data'],['security','系统与安全','security']] as [View,string,NavIconName][]).map(x=><button aria-label={x[1]} key={x[0]} className={view===x[0]?'nav-item active':'nav-item'} onClick={()=>go(x[0])}><NavIcon name={x[2]}/><span>{x[1]}</span></button>)}
      </nav>
      <div className="sidebar-footer"><div className="avatar">陈</div><div><strong>陈雨晴</strong><small>集团管理员</small></div><button className="onboarding-replay" title="重新打开新手引导" aria-label="重新打开新手引导" onClick={()=>setOnboardingStage('setup')}>？</button></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><span className="crumb">贵州茶产业工作区</span></div><div className="top-actions"><button className="search" onClick={()=>setTopDialog({title:'全局搜索',desc:'可搜索贵州茶经营项目、内容素材和客户，目前已索引 326 条业务记录。'})}>搜索项目、内容或客户</button>{canEnterProduction&&<button className="global-live-button" onClick={()=>setShowGlobalRuns(true)}><i/> 进入生产现场 <b>8</b></button>}{!['inquiries','workbench','revenue'].includes(view)&&<><button className="agent-status" onClick={()=>setTopDialog({title:'数字员工运行状态',desc:'6 位数字员工运行正常，今日完成 128 次自主动作，7 项等待审批。'})}>AI · 6 位运行中</button><button className="notice" onClick={()=>setTopDialog({title:'通知中心',desc:'3 条未读通知：2 项预算审批和 1 项账号授权即将到期。'})}>3</button></>}</div></header>
      <div className="page">{view==='home'?<HomePage go={go}/>:view==='projects'?<ProjectsPage/>:view==='agents'?<AgentsPage/>:view==='approvals'?<ApprovalsPage/>:view==='content'?<ContentPage go={go}/>:view==='schedule'?<SchedulePage/>:view==='distribution'?<DistributionPage/>:view==='traffic'?<TrafficPage/>:view==='inquiries'?<CustomerOperationsOverview onOpenWorkspace={openWorkbench} onOpenRevenueAnalysis={()=>go('revenue')}/>:view==='workbench'?<CustomerWorkbenchPage key={`${workbenchTarget.tab}-${workbenchTarget.filter}-${workbenchTarget.customerId}`} initialTab={workbenchTarget.tab} initialFilter={workbenchTarget.filter} initialCustomerId={workbenchTarget.customerId} onBack={()=>go('inquiries')}/>:view==='customerLive'?<InquiriesPage go={go}/>:view==='customers'?<CustomersPage go={go}/>:view==='revenue'?<RevenueAnalysisPage onOpenWorkbench={openCustomerInWorkbench}/>:view==='knowledge'?<EnterpriseKnowledgePage/>:<PlatformManagementPage key={view} view={view as PlatformView}/>}</div>
    </section>
    {showGlobalRuns && canEnterProduction && <GlobalAgentDesk onExit={()=>setShowGlobalRuns(false)}/>}
    {topDialog&&<ActionDialog title={topDialog.title} desc={topDialog.desc} confirm="知道了" onClose={()=>setTopDialog(null)}/>}
    <QianXiaohai view={view} onNavigate={go}/>
    <OnboardingFlow stage={onboardingStage} onStageChange={setOnboardingStage} onAuthenticate={()=>claimFirstLoginOnboarding()} onSkip={()=>closeOnboarding('home')} onComplete={data=>{closeOnboarding('projects');window.dispatchEvent(new CustomEvent('qianhai-feedback',{detail:{title:'首个经营任务已创建',desc:`${data.product} · ${data.market}市场获客任务已就绪，数字员工将按“${data.autonomy}”运行。`}}))}}/>
  </main>;
}

type XiaohaiMessage = { role:'assistant'|'user'; content:string; status?:'pending'|'error' };

const xiaohaiSuggestions:Record<string,string[]> = {
  home:['今天最该关注什么？','帮我看经营异常','有哪些事等我处理？'],
  projects:['哪个任务风险最高？','总结当前项目进展','帮我找阻塞项'],
  approvals:['哪项审批最紧急？','解释这些异常','我应该先处理哪个？'],
  inquiries:['哪些客户最值得跟进？','今天有新询盘吗？','帮我找沉默客户'],
  workbench:['帮我排客户优先级','有哪些待处理？','下一步该跟进谁？'],
  revenue:['收入变化的原因是什么？','哪个市场增长最快？','帮我找收入风险'],
  content:['推荐下一篇内容','哪些素材可以复用？','检查内容生产进度'],
  default:['总结当前页面','这里有什么风险？','建议我下一步做什么？'],
};

function QianXiaohai({view,onNavigate}:{view:View;onNavigate:(view:View)=>void}) {
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(false);
  const [messages,setMessages]=useState<XiaohaiMessage[]>([{role:'assistant',content:'你好，我是黔小海。我可以帮你看经营异常、理任务、跟客户，也可以解释当前页面。'}]);
  const suggestions=xiaohaiSuggestions[view]??xiaohaiSuggestions.default;
  const answer=async(question:string)=>{
    const q=question.trim();
    if(!q||loading)return;
    const history=messages.filter(message=>!message.status).slice(-10).map(({role,content})=>({role,content}));
    setMessages(current=>[...current,{role:'user',content:q},{role:'assistant',content:'',status:'pending'}]);
    setInput('');
    setLoading(true);
    try{
      const response=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,view,history})});
      const data=await response.json() as {message?:string;error?:string};
      if(!response.ok||!data.message)throw new Error(data.error||'AI 暂时无法回答。');
      setMessages(current=>[...current.slice(0,-1),{role:'assistant',content:data.message!}]);
    }catch(error){
      const message=error instanceof Error?error.message:'AI 暂时无法回答，请稍后重试。';
      setMessages(current=>[...current.slice(0,-1),{role:'assistant',content:message,status:'error'}]);
    }finally{setLoading(false)}
  };
  const jump=(target:View,label:string)=>{onNavigate(target);setMessages(current=>[...current,{role:'assistant',content:`已为你打开${label}。我会继续在这里，随时可以问我。`}]);};
  return <div className={`xiaohai-assistant ${open?'is-open':''}`}>
    {open&&<section className="xiaohai-panel" role="dialog" aria-label="黔小海 AI 助手">
      <header><div className="xiaohai-mini"><span>黔</span></div><p><strong>黔小海</strong><small><i/>在线 · 当前：{viewNames[view]}</small></p><button onClick={()=>setOpen(false)} aria-label="收起黔小海">—</button></header>
      <div className="xiaohai-messages">{messages.map((message,index)=><div key={index} className={`xiaohai-message ${message.role} ${message.status??''}`}><span>{message.role==='assistant'?'黔':'我'}</span><p>{message.status==='pending'?<><i className="xiaohai-typing"><b/><b/><b/></i><small>黔小海正在思考…</small></>:message.content}{message.status==='error'&&<button onClick={()=>answer(messages[index-1]?.content??'')}>重试</button>}</p></div>)}</div>
      <div className="xiaohai-suggestions">{suggestions.map(item=><button key={item} disabled={loading} onClick={()=>answer(item)}>{item}</button>)}</div>
      <div className="xiaohai-jumps"><button onClick={()=>jump('approvals','审批与异常')}>待我处理 <b>7</b></button><button onClick={()=>jump('workbench','客户工作台')}>客户工作台 →</button></div>
      <form onSubmit={event=>{event.preventDefault();void answer(input)}}><input value={input} disabled={loading} onChange={event=>setInput(event.target.value)} placeholder={loading?'黔小海正在回答…':'问黔小海…'} aria-label="输入给黔小海的问题"/><button type="submit" disabled={loading||!input.trim()} aria-label="发送">↑</button></form>
      <footer>AI 建议仅供参考 · 重要操作仍需人工确认</footer>
    </section>}
    {!open&&<div className="xiaohai-greeting">嗨，我是黔小海<span>有什么可以帮你？</span></div>}
    <button className="xiaohai-launcher" onClick={()=>setOpen(current=>!current)} aria-label={open?'收起黔小海':'打开黔小海'} aria-expanded={open}><span className="xiaohai-face"><i/><i/><b/></span><em>黔小海</em></button>
  </div>;
}

type LiveCustomer = { id:string; customer:string; company:string; market:string; channel:string; agent:string; action:string; detail:string; next:string; score:number; elapsed:string; kind:'reply'|'qualify'|'followup'|'quote'; attention?:boolean };

const liveCustomers:LiveCustomer[] = [
  {id:'adrian',customer:'Adrian Tan',company:'Lumi Ingredients',market:'马来西亚',channel:'WhatsApp',agent:'询盘接待 Agent',action:'正在组织 500kg 报价回复',detail:'已识别规格书、样品与报价意图',next:'确认目标应用与交付周期',score:91,elapsed:'01:24',kind:'reply'},
  {id:'aisyah',customer:'Nur Aisyah',company:'Maya Food Distribution',market:'马来西亚',channel:'Telegram',agent:'资格判断 Agent',action:'正在评估独家代理资格',detail:'已补全渠道覆盖与首批采购量',next:'生成 BANT 评分与风险提示',score:86,elapsed:'03:08',kind:'qualify'},
  {id:'daniel',customer:'Daniel Lim',company:'Pacific Beverage SG',market:'新加坡',channel:'LinkedIn',agent:'成交推进 Agent',action:'正在安排下周产品会议',detail:'已匹配产品经理与技术顾问时间',next:'发送议程与日历邀请',score:82,elapsed:'00:46',kind:'followup'},
  {id:'hana',customer:'Siti Hana',company:'GreenCup Distribution',market:'马来西亚',channel:'WhatsApp',agent:'客户跟进 Agent',action:'正在跟进样品签收反馈',detail:'客户已签收 M-02 与 M-05 样品',next:'询问配方测试时间表',score:76,elapsed:'02:17',kind:'followup'},
  {id:'omar',customer:'Omar Farooq',company:'Gulf Pantry Trading',market:'阿联酋',channel:'Telegram',agent:'报价协同 Agent',action:'正在生成 CIF Dubai 报价',detail:'已核对 1.2 吨试订单与包装规格',next:'等待销售总监确认折扣',score:89,elapsed:'04:31',kind:'quote',attention:true},
  {id:'mei',customer:'Mei Wong',company:'Nourish Lab HK',market:'中国香港',channel:'LinkedIn',agent:'需求洞察 Agent',action:'正在提取新品研发需求',detail:'关注低苦涩度、色泽与清洁标签',next:'匹配合适等级与应用案例',score:78,elapsed:'01:53',kind:'qualify'},
  {id:'anong',customer:'Anong S.',company:'Siam Tea Works',market:'泰国',channel:'WhatsApp',agent:'客户记忆 Agent',action:'正在整理历史沟通与偏好',detail:'已合并 4 轮对话与 3 份文档',next:'向成交推进 Agent 交付摘要',score:73,elapsed:'00:58',kind:'followup'},
  {id:'sarah',customer:'Sarah Collins',company:'Pure Origin Foods',market:'澳大利亚',channel:'Facebook',agent:'询盘接待 Agent',action:'正在回复认证与溯源问题',detail:'已调用出口证书与批次质检记录',next:'附上证据并询问年度用量',score:84,elapsed:'02:42',kind:'reply'},
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
