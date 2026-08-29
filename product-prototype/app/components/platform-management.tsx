'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Metric, PageHeader, Tabs } from './shared-ui';
import './platform-management.css';

export type PlatformView = 'structure' | 'permissions' | 'accounts' | 'data' | 'security';

type DemoAction = {
  title: string;
  desc: string;
  kind?: 'detail' | 'form' | 'connection' | 'permission' | 'quality' | 'audit' | 'organization' | 'import' | 'security';
  fields?: string[];
  confirm?: string;
  context?: string[];
};

type DemoContextValue = {
  open: (action: DemoAction) => void;
  notify: (message: string) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('Demo controls must be used inside DemoShell');
  return context;
}

function DemoShell({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<DemoAction | null>(null);
  const [notice, setNotice] = useState('');
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState('');
  const [switches, setSwitches] = useState<Record<string, boolean>>({
    '查看': true, '编辑': true, '导出': false, '自动执行': false,
    '敏感字段脱敏': true, '异常自动拦截': true, '强制人工审批': true,
  });
  const open = (nextAction: DemoAction) => {
    setAction(nextAction);
    setStep(0);
    setChoice('');
  };
  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2200);
  };
  const complete = (message?: string) => {
    if (!action) return;
    notify(message ?? `${action.title}已完成（演示数据）`);
    setAction(null);
  };
  const toggle = (name: string) => setSwitches(current => ({ ...current, [name]: !current[name] }));
  const kind = action?.kind ?? (action?.fields ? 'form' : 'detail');
  const connectionSteps = ['选择连接方式', '测试连接', '设置同步范围'];
  const renderActionBody = () => {
    if (!action) return null;
    if (kind === 'connection') return <div className="demo-special-body">
      <div className="demo-steps">{connectionSteps.map((name, index) => <span className={index <= step ? 'active' : ''} key={name}><i>{index + 1}</i>{name}</span>)}</div>
      {step === 0 && <div className="connection-methods">{[
        ['OAuth 授权', '跳转平台登录并授权，适合广告与沟通平台'],
        ['API 密钥', '填写企业已有接口凭证，适合 ERP／CRM'],
        ['文件交换', '通过 SFTP 或定时文件同步，适合旧系统'],
      ].map(item => <button className={choice === item[0] ? 'selected' : ''} key={item[0]} onClick={() => setChoice(item[0])}><strong>{item[0]}</strong><small>{item[1]}</small></button>)}</div>}
      {step === 1 && <div className="connection-test"><label><span>测试地址</span><input defaultValue="https://demo-api.example.com/v1"/></label><div className="test-result"><span>✓</span><div><strong>演示连接可用</strong><small>响应 186 ms · 已识别 12 个业务对象 · 未写入数据</small></div></div></div>}
      {step === 2 && <div className="sync-scope"><p>选择本连接允许同步的业务对象：</p>{['产品与库存', '客户与联系人', '商机与订单', '内容与 Campaign'].map((item, index) => <label key={item}><input type="checkbox" defaultChecked={index < 2}/><span><strong>{item}</strong><small>{index < 2 ? '读取并建立字段映射' : '暂不接入，可稍后开启'}</small></span></label>)}</div>}
    </div>;
    if (kind === 'permission') return <div className="demo-special-body permission-editor">
      <div className="permission-scope-choice"><span>数据范围</span>{['本人负责', '本项目', '本节点及下级', '自定义'].map(item => <button className={choice === item ? 'selected' : ''} key={item} onClick={() => setChoice(item)}>{item}</button>)}</div>
      <div className="permission-switches"><h3>允许的操作</h3>{['查看', '编辑', '导出', '自动执行'].map(item => <label key={item}><span><strong>{item}</strong><small>{item === '导出' || item === '自动执行' ? '高风险能力，变更将进入审计' : '适用于已授权的数据范围'}</small></span><button className={switches[item] ? 'on' : ''} role="switch" aria-checked={switches[item]} onClick={() => toggle(item)}><i/></button></label>)}</div>
      <div className="field-visibility"><strong>敏感字段</strong><span>联系人：部分脱敏</span><span>价格底表：不可见</span><span>收入：仅汇总</span></div>
    </div>;
    if (kind === 'quality') return <div className="demo-special-body quality-workbench">
      <div className="issue-summary"><b>{action.context?.[0] ?? '14'}</b><span>条待处理记录</span><small>系统建议不会自动执行，需人工确认</small></div>
      <h3>选择处理动作</h3><div className="issue-actions">{['接受建议', '分配负责人', '忽略并说明'].map(item => <button className={choice === item ? 'selected' : ''} key={item} onClick={() => setChoice(item)}><strong>{item}</strong><small>{item === '接受建议' ? '按规则批量修复' : item === '分配负责人' ? '进入人工核对队列' : '保留原始数据并记录原因'}</small></button>)}</div>
      <div className="issue-samples"><span>示例记录</span><p>QH-2026-0829 · 字段来源不一致</p><p>QH-2026-0817 · 缺少负责人</p></div>
    </div>;
    if (kind === 'audit') return <div className="demo-special-body audit-detail">
      <div className="event-facts">{(action.context ?? ['策略自动识别', '风险动作已暂停', '等待负责人确认']).map((item, index) => <div key={item}><span>{['触发原因', '系统动作', '当前状态'][index] ?? '事件信息'}</span><strong>{item}</strong></div>)}</div>
      <div className="event-timeline"><h3>处置时间线</h3><ol><li><i/>14:31 系统检测到异常请求</li><li><i/>14:31 自动拦截并保存证据</li><li className="current"><i/>现在 · 等待负责人选择处置方式</li></ol></div>
      <div className="disposition-actions">{['确认拦截', '转交审批', '标记误报'].map(item => <button className={choice === item ? 'selected' : ''} key={item} onClick={() => setChoice(item)}>{item}</button>)}</div>
    </div>;
    if (kind === 'import') return <div className="demo-special-body import-workbench">
      <div className="import-drop"><span>⇧</span><strong>上传通讯录文件</strong><small>支持 CSV／XLSX，或选择企业微信、飞书同步</small><button onClick={() => setChoice('已选择演示文件')}>选择演示文件</button>{choice && <em>✓ {choice} · 84 位成员待预览</em>}</div>
      <div className="import-options"><label><input type="checkbox" defaultChecked/>自动匹配部门与岗位</label><label><input type="checkbox" defaultChecked/>停用离职成员账号</label><label><input type="checkbox"/>导入后立即发送邀请</label></div>
    </div>;
    if (kind === 'organization') return <div className="demo-special-body organization-form">
      <div className="org-type-picker"><span>节点类型</span>{['事业部', '品牌', '项目组', '外部协作方'].map(item => <button className={choice === item ? 'selected' : ''} key={item} onClick={() => setChoice(item)}>{item}</button>)}</div>
      <div className="demo-form"><label><span>组织名称</span><input defaultValue={action.context?.[0] ?? ''}/></label><label><span>上级节点</span><select defaultValue="黔山国际产业集团"><option>黔山国际产业集团</option><option>茶与食品事业部</option></select></label><label><span>负责人</span><input placeholder="选择成员"/></label><label><span>默认数据边界</span><select defaultValue="本节点及下级"><option>仅本节点</option><option>本节点及下级</option><option>指定项目</option></select></label></div>
    </div>;
    if (kind === 'security') return <div className="demo-special-body security-policy-editor">
      <div className="policy-status"><span>策略状态</span><strong>当前生效</strong><small>最后更新：今天 10:20 · 集团安全管理员</small></div>
      <div className="permission-switches">{['敏感字段脱敏', '异常自动拦截', '强制人工审批'].map(item => <label key={item}><span><strong>{item}</strong><small>{item === '强制人工审批' ? '价格、预算与外发动作必须人工确认' : '对当前组织及下级生效'}</small></span><button className={switches[item] ? 'on' : ''} role="switch" aria-checked={switches[item]} onClick={() => toggle(item)}><i/></button></label>)}</div>
      <div className="policy-boundary"><span>适用边界</span><strong>{action.context?.[0] ?? '集团范围 · 所有数字员工'}</strong></div>
    </div>;
    return action.fields ? <div className="demo-form">{action.fields.map((field, index) => <label key={field}><span>{field}</span>{index === action.fields!.length - 1 && action.fields!.length > 2 ? <textarea defaultValue="演示环境中的示例配置"/> : <input defaultValue={index === 0 ? '演示方案' : ''}/>}</label>)}</div> : <div className="detail-callout"><strong>详情已加载</strong><p>{action.desc}</p></div>;
  };
  const nextOrComplete = () => {
    if (!action) return;
    if (kind === 'connection' && step < 2) {
      if (step === 0 && !choice) { notify('请先选择一种连接方式'); return; }
      setStep(current => current + 1);
      return;
    }
    complete();
  };
  return <DemoContext.Provider value={{ open, notify }}>
    {children}
    {action && <div className={`demo-overlay${kind === 'permission' ? ' drawer-mode' : ''}`} role="presentation" onMouseDown={() => setAction(null)}>
      <section className={`demo-dialog demo-${kind}${kind === 'permission' ? ' demo-drawer' : ''}`} role="dialog" aria-modal="true" aria-labelledby="demo-dialog-title" onMouseDown={event => event.stopPropagation()}>
        <header><div><span>{kind === 'connection' ? '连接向导' : kind === 'permission' ? '权限配置' : kind === 'quality' ? '问题处理' : kind === 'audit' ? '事件处置' : kind === 'import' ? '通讯录导入' : kind === 'organization' ? '组织配置' : kind === 'security' ? '安全策略' : '可交互 Demo'}</span><h2 id="demo-dialog-title">{action.title}</h2><p>{action.desc}</p></div><button aria-label="关闭" onClick={() => setAction(null)}>×</button></header>
        {renderActionBody()}
        <div className="demo-dialog-note"><strong>演示模式</strong><p>操作只改变当前浏览器里的演示状态，不会写入真实账号、客户或业务系统。</p></div>
        <footer><button className="secondary" onClick={() => kind === 'connection' && step > 0 ? setStep(current => current - 1) : setAction(null)}>{kind === 'connection' && step > 0 ? '上一步' : '取消'}</button><button className="primary" onClick={nextOrComplete}>{kind === 'connection' && step < 2 ? (step === 0 ? '下一步：测试连接' : '下一步：同步范围') : action.confirm ?? '确认并保存'}</button></footer>
      </section>
    </div>}
    {notice && <div className="demo-toast" role="status"><span>✓</span>{notice}</div>}
  </DemoContext.Provider>;
}

const platformNames: Record<PlatformView, string> = {
  structure: '组织架构',
  permissions: '权限管理',
  accounts: '账号管理',
  data: '数据管理',
  security: '系统与安全',
};

export function PlatformManagementPage({ view }: { view: PlatformView }) {
  return <DemoShell><PlatformManagementContent key={view} view={view}/></DemoShell>;
}

function PlatformManagementContent({ view }: { view: PlatformView }) {
  const mergedPermissionPage = view === 'permissions' || view === 'accounts';
  const [permissionTab, setPermissionTab] = useState(view === 'accounts' ? '账号连接' : '角色权限');
  const { open } = useDemo();
  const configs: Record<PlatformView, { desc: string; metrics: string[][]; action?: string; secondary?: string }> = {
    structure: { desc: '配置集团、事业部、品牌、项目组与外部协作边界。', metrics: [['组织节点', '12'], ['事业部', '3'], ['品牌／项目', '14'], ['跨组织协作', '4']], action: '新建组织节点', secondary: '导入通讯录' },
    permissions: { desc: '同时管理岗位能做什么、能看什么，以及数字员工能行动到哪一步。', metrics: [['角色模板', '8'], ['数据策略', '24'], ['审批链', '9'], ['越权拦截', '3']], action: '新建角色', secondary: '权限体检' },
    accounts: { desc: '统一管理成员账号、业务平台账号及其组织和项目归属。', metrics: [['成员账号', '84'], ['平台账号', '31'], ['即将过期', '2'], ['待验证', '1']], action: '连接账号', secondary: '账号体检' },
    data: { desc: '兼容现有 ERP、CRM、客服、销售订单与流量系统，统一口径但不强行搬走原始数据。', metrics: [['已连接系统', '7 / 10'], ['同步成功率', '99.2%'], ['统一业务对象', '12'], ['待处理异常', '2']], action: '连接数据源', secondary: '下载接入清单' },
    security: { desc: '定义部署方式、数据驻留、AI 可用范围、审计与异常处置。', metrics: [['安全基线', '92'], ['敏感数据本地', '100%'], ['MFA 覆盖', '86%'], ['高风险动作', '0']], action: '导出安全报告', secondary: '查看审计日志' },
  };
  const config = configs[view];
  const title = mergedPermissionPage ? '权限与账号' : platformNames[view];
  return <>
    <PageHeader title={title} desc={config.desc} action={config.action} secondary={config.secondary} onAction={() => open({
      title: config.action ?? '新建配置',
      desc: `在${title}中创建一条新的演示配置。`,
      kind: view === 'structure' ? 'organization' : view === 'permissions' ? 'permission' : view === 'accounts' || view === 'data' ? 'connection' : 'detail',
      fields: view === 'security' ? undefined : ['名称', '所属组织', '说明'],
    })} onSecondary={() => open({
      title: config.secondary ?? '查看详情',
      desc: `查看${title}的检查结果和建议。`,
      kind: view === 'structure' ? 'import' : view === 'permissions' ? 'permission' : view === 'security' ? 'audit' : 'detail',
      confirm: '标记为已查看',
    })}/>
    <div className="stat-grid four">{config.metrics.map(metric => <Metric key={metric[0]} label={metric[0]} value={metric[1]} change={metric[2]}/>)}</div>
    {view === 'structure' ? <OrganizationManagement/> : mergedPermissionPage ? <PermissionCenter active={permissionTab} setActive={setPermissionTab}/> : view === 'data' ? <DataManagement/> : <SecurityPage/>}
  </>;
}

function SectionIntro({ title, desc, action }: { title: string; desc: string; action?: string }) {
  const { open } = useDemo();
  const kind: DemoAction['kind'] = title.includes('组织') ? 'organization' : title.includes('权限') ? 'audit' : title.includes('数据连接') ? 'connection' : title.includes('安全') ? 'security' : 'form';
  return <div className="panel-title platform-title"><div><h2>{title}</h2><p>{desc}</p></div>{action && <button onClick={() => open({ title: action, desc: `调整“${title}”的演示规则，保存后会显示操作反馈。`, kind, fields: kind === 'form' ? ['规则名称', '适用范围', '规则说明'] : undefined })}>{action}</button>}</div>;
}

function OrganizationManagement() {
  const [tab, setTab] = useState('组织视图');
  const [selected, setSelected] = useState('tea');
  const { open } = useDemo();
  const nodes = [
    { id: 'group', name: '黔山国际产业集团', type: '集团', members: '84 人', level: 0 },
    { id: 'growth', name: '国际增长中心', type: '共享中心', members: '18 人', level: 1 },
    { id: 'tea', name: '茶与食品事业部', type: '事业部', members: '32 人', level: 1 },
    { id: 'matcha', name: '黔绿方舟品牌', type: '品牌', members: '16 人', level: 2 },
    { id: 'fruit', name: '山王果品牌', type: '品牌', members: '11 人', level: 2 },
    { id: 'industry', name: '工业品事业部', type: '事业部', members: '21 人', level: 1 },
    { id: 'partner', name: '海外渠道服务商', type: '外部协作组织', members: '7 人', level: 1 },
  ];
  const current = nodes.find(node => node.id === selected) ?? nodes[2];
  return <section className="panel org-panel platform-panel">
    <SectionIntro title="组织与协作模型" desc="组织层级可选；单一品牌可直接建项目，外部伙伴只获得被授权的数据和动作。" action="编辑组织规则"/>
    <Tabs items={['组织视图', '协作边界', '组织规则']} active={tab} setActive={setTab}/>
    {tab === '组织视图' ? <div className="org-layout enhanced-org">
      <aside className="org-tree">
        <div className="tree-caption"><strong>组织目录</strong><small>同步自企业通讯录 · 3 分钟前</small></div>
        {nodes.map(node => <button style={{ paddingLeft: `${10 + node.level * 18}px` }} className={selected === node.id ? 'active' : ''} key={node.id} onClick={() => setSelected(node.id)}><span><i className={`node-dot level-${node.level}`}/>{node.name}<small>{node.type}</small></span><em>{node.members}</em></button>)}
      </aside>
      <div className="org-detail org-detail-rich">
        <div className="detail-toolbar"><div><span>{current.type}</span><h2>{current.name}</h2><p>负责所属品牌和经营任务的目标配置、预算治理、内容增长与客户结果。</p></div><button className="secondary" onClick={() => open({ title: `编辑${current.name}`, desc: '修改组织名称、负责人和数据边界。', kind: 'organization', context: [current.name] })}>编辑节点</button></div>
        <div className="mini-metrics"><div><span>负责人</span><b>{selected === 'partner' ? 'Nur Aisyah' : '陈妍'}</b><small>{selected === 'partner' ? '外部协作负责人' : '事业部总经理'}</small></div><div><span>经营任务</span><b>{selected === 'tea' ? '5' : '3'}</b><small>3 个运行中</small></div><div><span>数据边界</span><b>{selected === 'partner' ? '项目级' : '本节点及下级'}</b><small>默认不跨事业部</small></div></div>
        <div className="boundary-grid"><div><span>可管理对象</span><strong>品牌、经营任务、成员与审批人</strong><small>继承集团安全基线，可向下收紧</small></div><div><span>可见业务数据</span><strong>内容、流量、客户、商机与收入</strong><small>财务成本仅负责人和集团管理员可见</small></div><div><span>已连接系统</span><strong>企业通讯录、ERP、CRM、Meta</strong><small>外部伙伴仅使用平台授权账号</small></div><div><span>数字员工边界</span><strong>内容自动 · 预算审批 · 商务禁止</strong><small>项目可在此基础上进一步限制</small></div></div>
      </div>
    </div> : tab === '协作边界' ? <CollaborationBoundaries/> : <OrganizationRules/>}
  </section>;
}

function CollaborationBoundaries() {
  const { open } = useDemo();
  const rows = [
    ['茶与食品事业部 ↔ 国际增长中心', '内容、流量、询盘', '共同运营', '收入仅汇总可见', '正常'],
    ['黔绿方舟 ↔ 海外渠道服务商', '已批准素材、指定客户', '项目协作', '价格底表不可见', '90 天后到期'],
    ['工业品事业部 ↔ 外部技术顾问', '产品参数、技术询盘', '只读＋评论', '客户联系方式脱敏', '等待确认'],
  ];
  return <div className="platform-table"><div className="platform-row head"><span>协作关系</span><span>共享对象</span><span>协作方式</span><span>明确边界</span><span>状态</span></div>{rows.map(row => <button className="platform-row" key={row[0]} onClick={() => open({ title: row[0], desc: `当前共享：${row[1]}；数据边界：${row[3]}。`, kind: 'permission', context: [row[1], row[3]] })}>{row.map((cell, index) => <span key={cell} className={index === 0 ? 'strong-cell' : index === 4 ? (cell === '正常' ? 'status-good' : 'status-warn') : ''}>{cell}</span>)}</button>)}</div>;
}

function OrganizationRules() {
  const { notify } = useDemo();
  return <div className="rule-grid">{[
    ['层级不是必填链条', '集团可以使用事业部和品牌层；单一企业可直接创建经营任务。', '已启用'],
    ['数据默认不跨边界', '成员默认只能看所属节点与被授权项目，跨部门共享必须留痕。', '强制'],
    ['外部协作最小授权', '服务商只获得项目期内必要数据，客户、价格与收入字段可单独屏蔽。', '强制'],
    ['离岗与项目结束回收', '通讯录停用或项目结束后自动冻结账号并撤销令牌。', '24 小时内'],
  ].map(rule => <button className="rule-card" key={rule[0]} onClick={() => notify(`“${rule[0]}”规则已启用（演示）`)}><span className="rule-icon">规</span><div><strong>{rule[0]}</strong><p>{rule[1]}</p></div><em>{rule[2]}</em></button>)}</div>;
}

function PermissionCenter({ active, setActive }: { active: string; setActive: (value: string) => void }) {
  return <section className="panel org-panel platform-panel">
    <SectionIntro title="统一权限中心" desc="功能权限、数据范围、平台账号和审批链共同决定一个人或数字员工能看到什么、能执行什么。" action="权限变更记录"/>
    <Tabs items={['角色权限', '数据权限', '账号连接', '审批链']} active={active} setActive={setActive}/>
    {active === '角色权限' ? <PermissionMatrix/> : active === '数据权限' ? <DataScopeMatrix/> : active === '账号连接' ? <AccountGrid/> : <ApprovalChains/>}
  </section>;
}

function PermissionMatrix() {
  const { open } = useDemo();
  const rows = [
    ['集团管理员', '管理', '管理', '审批', '查看', '查看', '本组织全部'],
    ['事业部负责人', '管理', '审批', '审批', '管理', '查看', '本节点及下级'],
    ['项目负责人', '管理', '管理', '申请', '管理', '查看', '指定项目'],
    ['内容运营', '查看', '编辑', '—', '脱敏', '—', '指定品牌／项目'],
    ['投流人员', '查看', '查看', '编辑', '脱敏', '汇总', '指定广告账户'],
    ['海外销售', '查看', '查看', '—', '管理', '查看', '分配客户／商机'],
    ['外部协作者', '—', '协作', '—', '脱敏', '—', '限时共享对象'],
  ];
  return <div className="permission-wrap"><div className="permission-note"><span>最小权限原则</span><strong>角色模板定义上限，组织、项目和字段策略继续收紧；越权访问自动拦截并写入审计。</strong></div><div className="permission-table permission-table-wide"><div className="ptr head"><span>角色</span>{['经营任务', '内容', '投流', '客户', '收入', '数据范围'].map(item => <span key={item}>{item}</span>)}</div>{rows.map(row => <button className="ptr" key={row[0]} onClick={() => open({ title: `配置${row[0]}`, desc: `当前数据范围：${row[6]}。可以在演示中调整功能权限和字段可见性。`, kind: 'permission', context: [row[6]] })}>{row.map((cell, index) => <span key={`${row[0]}-${index}`} className={index === 0 ? 'role-name' : cell === '—' ? 'permission-none' : cell === '审批' || cell === '申请' || cell === '脱敏' ? 'limited' : ''}>{cell}</span>)}</button>)}</div></div>;
}

function DataScopeMatrix() {
  const { open } = useDemo();
  const domains = [
    ['内容与素材', '产品事实、素材、审核记录', '内容运营可编辑；外部伙伴仅看已批准版本', '项目／品牌'],
    ['流量与广告', '受众、消耗、Campaign、转化', '投流人员可编辑；负责人看汇总与预算', '广告账户／项目'],
    ['客服与询盘', '会话、联系人、意向、跟进', '销售看分配客户；运营默认脱敏', '客户／商机'],
    ['销售与订单', '报价、订单、回款、履约', '销售与负责人可见；内容团队不可见', '事业部／项目'],
    ['财务与收入', '成本、毛利、归因收入', '集团和事业部负责人可见，其他角色仅汇总', '字段级'],
  ];
  return <div className="scope-list">{domains.map((domain, index) => <article key={domain[0]}><span className={`scope-icon s${index}`}>{index + 1}</span><div><strong>{domain[0]}</strong><small>{domain[1]}</small></div><p>{domain[2]}</p><em>{domain[3]}</em><button onClick={() => open({ title: `配置${domain[0]}权限`, desc: domain[2], kind: 'permission', context: [domain[3]] })}>配置</button></article>)}</div>;
}

function AccountGrid() {
  const { open } = useDemo();
  const accounts = [
    ['企业身份与 SSO', '84 个成员账号', '集团全域', '正常', '身'],
    ['LinkedIn', '4 个主页／广告账户', '3 个经营任务', '正常', 'in'],
    ['Meta', '6 个主页／广告账户', '茶与食品事业部', '1 个即将过期', 'M'],
    ['Google Ads', '2 个广告账户', '国际增长中心', '正常', 'G'],
    ['WhatsApp Business', '4 个号码', '客户经营团队', '正常', 'W'],
    ['企业邮箱', '12 个邮箱', '按成员分配', '2 个待验证', '@'],
  ];
  return <div><div className="account-summary"><span>账号使用规则</span><strong>个人身份、平台账号与数据范围分开授权；数字员工只能使用绑定到经营任务的账号。</strong><button onClick={() => open({ title: '连接新账号', desc: '选择平台并完成授权范围确认。', kind: 'connection', confirm: '完成连接' })}>连接新账号</button></div><div className="account-grid enhanced-accounts">{accounts.map((account, index) => <button key={account[0]} onClick={() => open({ title: `管理${account[0]}`, desc: `${account[1]}；当前范围：${account[2]}；状态：${account[3]}。`, kind: 'connection', confirm: '保存连接设置' })}><span className={`platform-icon p${index}`}>{account[4]}</span><span><strong>{account[0]}</strong><small>{account[1]}</small><i>{account[2]}</i></span><em className={account[3] === '正常' ? 'good' : 'warn'}>{account[3]}</em></button>)}</div></div>;
}

function ApprovalChains() {
  const { open } = useDemo();
  const chains = [
    ['内容事实与认证', '内容运营 → 品牌审核人 → 质量负责人', '产品参数、认证、对比性表述', '4 小时'],
    ['投流与预算', '项目负责人 → 事业部负责人', '超单次限额、跨渠道调配、新市场首投', '2 小时'],
    ['价格与商务承诺', '海外销售 → 销售总监 → 法务', '报价、折扣、独家代理、交期', '必须人工'],
    ['数据导出与外部共享', '数据负责人 → 系统管理员', '客户明细、报价、收入与个人信息', '一次一批'],
  ];
  return <div className="approval-chain-list">{chains.map(chain => <article key={chain[0]}><span className="chain-number">审</span><div><strong>{chain[0]}</strong><small>{chain[1]}</small></div><p>{chain[2]}</p><em>{chain[3]}</em><button onClick={() => open({ title: `编辑${chain[0]}审批链`, desc: `当前流程：${chain[1]}。`, kind: 'permission', context: [chain[2]] })}>编辑</button></article>)}</div>;
}

function DataManagement() {
  const [tab, setTab] = useState('系统连接');
  return <section className="panel org-panel platform-panel">
    <SectionIntro title="数据连接与治理" desc="连接现有系统，建立客户、内容、流量、商机和收入的统一业务对象；源系统仍保留主数据责任。" action="运行连接诊断"/>
    <Tabs items={['系统连接', '字段与主数据', '数据质量', '访问记录']} active={tab} setActive={setTab}/>
    {tab === '系统连接' ? <IntegrationMatrix/> : tab === '字段与主数据' ? <MasterData/> : tab === '数据质量' ? <DataQuality/> : <DataAccessLog/>}
  </section>;
}

function IntegrationMatrix() {
  const { open } = useDemo();
  const systems = [
    ['现有 ERP', '产品、库存、报价、订单、回款', 'API／只读数据库／SFTP', '双向受控', '待配置'],
    ['现有 CRM', '公司、联系人、商机、跟进', 'REST API＋Webhook', '双向', '已连接'],
    ['广告与流量平台', 'Campaign、消耗、受众、转化', '平台 OAuth／API', '读取＋受控执行', '7 / 9 正常'],
    ['客服与沟通渠道', '邮件、表单、WhatsApp、私信', 'Webhook＋API', '实时接入', '已连接'],
    ['销售订单与履约', '样品、报价、合同、订单状态', 'API／批量文件', '以源系统为准', '待字段确认'],
  ];
  return <><div className="integration-principle"><span>兼容原则</span><strong>不要求替换现有 ERP／CRM；黔海通过连接器、字段映射和事件回传形成增长闭环。</strong><small>涉及写回、预算和商务数据的动作必须单独授权</small></div><div className="integration-table"><div className="integration-row head"><span>系统</span><span>接入数据</span><span>支持方式</span><span>同步方向</span><span>状态</span><span>操作</span></div>{systems.map(system => <div className="integration-row" key={system[0]}><span><i className="system-cube">系</i><strong>{system[0]}</strong></span><span>{system[1]}</span><span>{system[2]}</span><span>{system[3]}</span><span className={system[4] === '已连接' ? 'status-good' : 'status-warn'}>{system[4]}</span><button onClick={() => open({ title: `${system[4] === '已连接' ? '管理' : '配置'}${system[0]}`, desc: `接入数据：${system[1]}；支持方式：${system[2]}。`, kind: 'connection', confirm: system[4] === '已连接' ? '保存设置' : '完成连接' })}>{system[4] === '已连接' ? '管理' : '配置'}</button></div>)}</div></>;
}

function MasterData() {
  const { open } = useDemo();
  const objects = [
    ['组织与成员', '企业通讯录／SSO', '组织 ID、岗位、负责人、状态', '每小时'],
    ['产品与 SKU', 'ERP／企业资料库', '规格、认证、价格权限、库存', '每日＋事件'],
    ['客户与联系人', 'CRM／客服渠道', '公司、角色、国家、同意状态', '实时'],
    ['商机与订单', 'CRM／ERP', '阶段、金额、负责人、回款', '实时＋每日对账'],
    ['内容与 Campaign', '黔海／平台 API', '来源、版本、渠道、预算、结果', '实时'],
  ];
  return <div className="master-layout"><div className="master-flow"><span>源系统</span><i>→</i><span>字段映射</span><i>→</i><span>统一业务对象</span><i>→</i><span>权限与归因</span></div><div className="platform-table master-table"><div className="platform-row head"><span>统一对象</span><span>主数据来源</span><span>关键字段</span><span>更新策略</span><span>状态</span></div>{objects.map(object => <button className="platform-row" key={object[0]} onClick={() => open({ title: `查看${object[0]}映射`, desc: `主数据来源：${object[1]}；更新策略：${object[3]}。`, kind: 'detail', confirm: '关闭详情' })}>{object.map((cell, index) => <span key={cell} className={index === 0 ? 'strong-cell' : ''}>{cell}</span>)}<span className="status-good">已定义</span></button>)}</div></div>;
}

function DataQuality() {
  const { open } = useDemo();
  return <div className="data-quality-layout"><div className="health-score large"><b>96.8%</b><span>整体完整率</span><small>较上周 +1.2%</small></div><div className="quality-cards">{[['重复客户记录', '27', '建议合并', '客户主数据'], ['待匹配询盘', '14', '需要确认', '客服渠道'], ['异常渠道数据', '2', '正在重试', 'Meta'], ['缺少同意状态', '8', '禁止自动外发', '联系人']].map(item => <button key={item[0]} onClick={() => open({ title: `处理${item[0]}`, desc: `${item[3]}发现 ${item[1]} 条问题，系统建议：${item[2]}。`, kind: 'quality', context: [item[1], item[2], item[3]], confirm: '确认处理动作' })}><span>{item[0]}</span><b>{item[1]}</b><small>{item[2]}</small><em>{item[3]}</em></button>)}</div></div>;
}

function DataAccessLog() {
  const { open } = useDemo();
  const logs = [
    ['15:06', '王宁 · 海外销售', '查看 Lumi Ingredients 客户档案', '分配客户', '允许'],
    ['14:52', '分发增长数字员工', '读取 Campaign 表现与预算余额', '经营任务授权', '允许'],
    ['14:31', '外部协作者', '请求导出客户联系方式', '超出项目权限', '已拦截'],
    ['13:48', '陈妍 · 事业部负责人', '导出项目收入汇总', '本节点及下级', '允许'],
  ];
  return <div className="platform-table access-table"><div className="platform-row head"><span>时间</span><span>访问主体</span><span>数据动作</span><span>权限依据</span><span>结果</span></div>{logs.map(log => <button className="platform-row" key={`${log[0]}-${log[1]}`} onClick={() => open({ title: `${log[4]}：${log[2]}`, desc: `访问主体：${log[1]}；权限依据：${log[3]}；发生时间：${log[0]}。`, kind: log[4] === '已拦截' ? 'audit' : 'detail', context: [log[3], log[4], `${log[0]} · ${log[1]}`], confirm: '关闭详情' })}>{log.map((cell, index) => <span key={cell} className={index === 4 ? (cell === '允许' ? 'status-good' : 'status-danger') : ''}>{cell}</span>)}</button>)}</div>;
}

function SecurityPage() {
  const [tab, setTab] = useState('部署与数据驻留');
  return <section className="panel org-panel platform-panel">
    <SectionIntro title="系统、安全与 AI 治理" desc="安全页不只展示开关，还要说明数据在哪里、模型能看到什么、谁批准以及出了问题如何停下。" action="安全策略体检"/>
    <Tabs items={['部署与数据驻留', 'AI 安全', '审计与告警', '系统状态']} active={tab} setActive={setTab}/>
    {tab === '部署与数据驻留' ? <DeploymentSecurity/> : tab === 'AI 安全' ? <AISecurity/> : tab === '审计与告警' ? <AuditAndAlerts/> : <SystemHealth/>}
  </section>;
}

function DeploymentSecurity() {
  const [selected, setSelected] = useState('混合部署');
  const { notify } = useDemo();
  const options = [
    ['混合部署', '推荐方案', '敏感主数据与客户明细留在企业侧；云端处理获批的任务和脱敏数据。', '当前评估中'],
    ['企业私有化部署', '最高隔离', '应用、模型网关、向量检索与审计全部运行在企业专有环境。', '支持'],
    ['云端专属实例', '快速上线', '独立租户与加密存储；敏感字段可不出域或先脱敏。', '支持'],
  ];
  return <><div className="security-recommendation"><span className="agent-spark">AI</span><div><strong>Codex 建议：优先采用混合部署</strong><p>ERP、客户、报价和订单原始数据留在企业侧；黔海只读取完成任务所需的最小字段。模型调用通过统一网关，敏感字段脱敏，所有外发与写回动作可审计、可暂停。</p></div><em>方案需与客户 IT／法务确认</em></div><div className="deployment-grid">{options.map(option => <button className={selected === option[0] ? 'recommended' : ''} aria-pressed={selected === option[0]} key={option[0]} onClick={() => { setSelected(option[0]); notify(`已选择“${option[0]}”方案（演示）`); }}><span>{option[1]}</span><strong>{option[0]}</strong><p>{option[2]}</p><em>{selected === option[0] ? '✓ 已选择' : option[3]}</em></button>)}</div><div className="residency-strip"><div><span>客户与订单原始数据</span><b>企业侧</b></div><div><span>AI 任务上下文</span><b>最小字段＋脱敏</b></div><div><span>行动与审计记录</span><b>双端留痕</b></div><div><span>备份与恢复</span><b>客户定义区域</b></div></div></>;
}

function AISecurity() {
  const { open } = useDemo();
  const policies = [
    ['数据最小化', '模型只收到完成当前动作必需的字段，默认屏蔽价格底表、个人联系方式与合同。', '强制'],
    ['模型路由与驻留', '按项目选择企业本地模型、专属模型网关或获批云模型。', '按项目'],
    ['训练与留存', '企业数据默认禁止用于第三方模型训练；请求与响应按策略脱敏留痕。', '禁止训练'],
    ['检索与知识权限', '数字员工只能检索当前组织、品牌、项目和角色有权访问的资料。', '继承权限'],
    ['高风险动作隔离', '价格、独家代理、预算扩张、合同与个人数据外发不得自动执行。', '人工审批'],
  ];
  return <div className="ai-policy-list">{policies.map((policy, index) => <article key={policy[0]}><span className="policy-index">0{index + 1}</span><div><strong>{policy[0]}</strong><p>{policy[1]}</p></div><em>{policy[2]}</em><button onClick={() => open({ title: policy[0], desc: policy[1], kind: 'security', context: [policy[2]], confirm: '保存策略' })}>查看策略</button></article>)}</div>;
}

function AuditAndAlerts() {
  const { open } = useDemo();
  const events = [
    ['越权访问已拦截', '外部协作者请求导出客户联系方式', '数据权限', '高', '14:31'],
    ['预算调整等待审批', 'LinkedIn Campaign 申请增加 12% 预算', '投流治理', '中', '13:52'],
    ['平台授权即将过期', 'Meta 账号将在 3 天后失效', '账号安全', '中', '11:20'],
    ['敏感字段已脱敏', '客户数据发送至云端模型前移除联系方式', 'AI 网关', '低', '10:48'],
  ];
  return <div className="audit-layout"><div className="audit-summary"><div><b>248</b><span>今日审计事件</span></div><div><b>3</b><span>自动拦截</span></div><div><b>7</b><span>等待审批</span></div><div><b>0</b><span>未处置高危</span></div></div><div className="platform-table audit-table"><div className="platform-row head"><span>事件</span><span>说明</span><span>策略域</span><span>级别</span><span>时间</span></div>{events.map(event => <button className="platform-row" key={event[0]} onClick={() => open({ title: event[0], desc: `${event[1]}。策略域：${event[2]}，风险级别：${event[3]}，时间：${event[4]}。`, kind: 'audit', context: [event[1], event[0].includes('拦截') ? '请求已暂停' : '已记录并通知', `${event[3]}风险 · ${event[4]}`], confirm: '确认处置' })}>{event.map((cell, index) => <span key={cell} className={index === 0 ? 'strong-cell' : index === 3 ? `risk-${cell === '高' ? 'high' : cell === '中' ? 'medium' : 'low'}` : ''}>{cell}</span>)}</button>)}</div></div>;
}

function SystemHealth() {
  const { open } = useDemo();
  const services = [['Web 应用与 API', '99.98%', '正常'], ['数据连接器', '99.2%', '2 个重试中'], ['模型网关', '684 ms', '正常'], ['任务与发布队列', '18 个运行中', '正常'], ['审计与日志', '无丢失', '正常'], ['备份与恢复', '最近 02:00', '已验证']];
  return <div className="health-service-grid">{services.map((service, index) => <article key={service[0]}><span className={`service-icon service-${index}`}>●</span><div><strong>{service[0]}</strong><small>{service[1]}</small></div><em className={service[2] === '正常' || service[2] === '已验证' ? 'status-good' : 'status-warn'}>{service[2]}</em><button onClick={() => open({ title: `${service[0]}运行详情`, desc: `当前指标：${service[1]}；运行状态：${service[2]}。`, confirm: '关闭详情' })}>详情</button></article>)}</div>;
}
