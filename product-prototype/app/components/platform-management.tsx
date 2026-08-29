'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { Metric, PageHeader, Tabs } from './shared-ui';
import './platform-management.css';

export type PlatformView = 'structure' | 'permissions' | 'accounts' | 'data' | 'security';
type Row = Record<string, unknown>;
type Snapshot = { organizationNodes: Row[]; members: Row[]; roles: Row[]; approvalChains: Row[]; integrations: Row[]; dataSources: Row[]; syncRuns: Row[]; qualityIssues: Row[]; securityPolicies: Row[]; auditEvents: Row[]; settings: Record<string, Row>; metrics: Record<string, number>; health: Row[]; generatedAt: string };
type Action = { title: string; desc: string; kind?: 'detail'|'organization'|'permission'|'connection'|'import'|'quality'|'security'|'audit'|'chain'; operation?: string; values?: Record<string, unknown>; context?: string[]; confirm?: string };
type Result = { ok: boolean; status?: string; message?: string; snapshot?: Snapshot; [key: string]: unknown };
type Context = { data: Snapshot|null; loading: boolean; error: string; open: (action: Action) => void; notify: (message: string) => void; mutate: (action: string, payload?: Row) => Promise<Result> };
const PlatformContext = createContext<Context|null>(null);
const usePlatform = () => { const value = useContext(PlatformContext); if (!value) throw new Error('Missing PlatformContext'); return value; };
const str = (value: unknown, fallback = '') => typeof value === 'string' ? value : value == null ? fallback : String(value);
const num = (value: unknown) => Number(value ?? 0);
const strings = (value: unknown): string[] => { if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string'); try { const parsed = JSON.parse(str(value, '[]')); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
const labels: Record<string,string> = {
  active:'启用', inactive:'停用', connected:'已连接', needs_configuration:'待配置', healthy:'正常', review_required:'待审核',
  open:'待处理', assigned:'已分配', success:'成功', failed:'失败', high:'高', medium:'中', low:'低',
  all:'全部数据', enterprise:'企业范围', project:'指定项目', task:'指定任务', node:'仅本节点', node_and_descendants:'本节点及下级', custom:'自定义',
  read_only:'只读', controlled_write:'受控写入', oauth:'OAuth 授权', api_key:'API 密钥', file_exchange:'文件交换',
  regulator:'监管机构', government_web:'政府网站', official_statistics:'官方统计', local_mock:'本地演示数据', public_fact:'公开事实', demo_mock:'演示数据',
  crm:'客户关系管理', advertising:'广告平台', social:'社交平台', messaging:'消息平台', identity:'身份管理', storage:'素材存储', erp:'企业资源管理', account:'业务账号',
};
const label = (value: unknown, fallback = '') => labels[str(value)] ?? str(value, fallback);

function parseCsv(csv: string): Row[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const split = (line: string) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
  const headers = split(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((key, index) => [key, split(line)[index] ?? ''])));
}

function PlatformShell({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [active, setActive] = useState<Action|null>(null);
  const [form, setForm] = useState<Record<string,string>>({});
  const [choice, setChoice] = useState('');
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [importRows, setImportRows] = useState<Row[]>([]);
  const [resultMessage, setResultMessage] = useState('');
  const [switches, setSwitches] = useState({ read: true, write: true, export: false, execute: false, enabled: true });

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/platform', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json() as Snapshot & Result;
        if (!response.ok || !body.ok) throw new Error(body.message || '平台数据加载失败');
        if (!cancelled) { setData(body); setError(''); }
      })
      .catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : '平台数据加载失败'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3200); };
  const mutate = async (action: string, payload: Row = {}) => {
    const response = await fetch('/api/platform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) });
    const body = await response.json() as Result;
    if (!response.ok || !body.ok) throw new Error(body.message || '服务端操作失败');
    if (body.snapshot) setData(body.snapshot);
    return body;
  };
  const open = (action: Action) => {
    setActive(action); setStep(0); setChoice(str(action.values?.choice)); setResultMessage(''); setImportRows([]);
    const initial = Object.fromEntries(Object.entries(action.values ?? {}).map(([key, value]) => [key, str(value)]));
    if (action.kind === 'connection' && !initial.syncScopes) initial.syncScopes = '产品与库存,客户与联系人';
    setForm(initial);
    const permissions = strings(action.values?.permissions);
    setSwitches({ read: permissions.length ? permissions.some((p) => p === '*' || p.includes('read')) : true, write: permissions.some((p) => p === '*' || p.includes('manage') || p.includes('write')), export: permissions.some((p) => p === '*' || p.includes('export')), execute: permissions.some((p) => p === '*' || p.includes('execute')), enabled: action.values?.enabled !== false && num(action.values?.enabled ?? 1) !== 0 });
  };
  const change = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const complete = async () => {
    if (!active?.operation) { setActive(null); return; }
    setSaving(true);
    try {
      let payload: Row = { ...(active.values ?? {}), ...form };
      if (active.kind === 'permission') payload = { ...payload, dataScope: choice || form.dataScope || 'project', permissions: [switches.read && 'resource.read', switches.write && 'resource.manage', switches.export && 'data.export', switches.execute && 'action.execute'].filter(Boolean) };
      if (active.kind === 'connection') payload = { ...payload, syncScopes: (form.syncScopes ?? '').split(',').filter(Boolean) };
      if (active.kind === 'quality' || active.kind === 'audit') { if (!choice) throw new Error('请先选择处置动作'); payload = { ...payload, disposition: choice }; }
      if (active.kind === 'security') payload = { ...payload, enabled: switches.enabled };
      if (active.kind === 'import') { if (!importRows.length) throw new Error('请选择有效的 CSV 通讯录'); payload = { ...payload, entries: importRows }; }
      if (active.kind === 'chain') payload = { ...payload, steps: (form.steps ?? '').split(/[,，]/).map((item) => item.trim()).filter(Boolean) };
      const result = await mutate(active.operation, payload); notify(result.message || '服务端已保存并写入审计'); setActive(null);
    } catch (cause) { notify(cause instanceof Error ? cause.message : '操作失败'); }
    finally { setSaving(false); }
  };
  const connectionNext = async () => {
    if (!active) return;
    if (step === 0) { if (!choice) { notify('请先选择连接方式'); return; } change('authMethod', choice === 'OAuth 授权' ? 'oauth' : choice === 'API 密钥' ? 'api_key' : 'file_exchange'); setStep(1); return; }
    if (step === 1) {
      setSaving(true);
      try { const result = await mutate('integration.test', { ...(active.values ?? {}), ...form, syncScopes: (form.syncScopes ?? '').split(',').filter(Boolean) }); setActive((current) => current ? { ...current, values: { ...(current.values ?? {}), id: result.id ?? current.values?.id } } : current); setResultMessage(result.message || str(result.status)); notify(result.message || '服务端连接测试完成'); setStep(2); }
      catch (cause) { notify(cause instanceof Error ? cause.message : '连接测试失败'); }
      finally { setSaving(false); }
      return;
    }
    await complete();
  };
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!file.name.toLowerCase().endsWith('.csv')) { notify('请提供 CSV 文件'); return; } setImportRows(parseCsv(await file.text())); change('filename', file.name); };

  const kind = active?.kind ?? 'detail';
  const body = !active ? null : kind === 'organization' ? <div className="demo-special-body organization-form"><div className="org-type-picker"><span>节点类型</span>{['事业部','品牌','项目组','外部协作方'].map((item) => <button className={form.nodeType === item ? 'selected' : ''} key={item} onClick={() => change('nodeType', item)}>{item}</button>)}</div><div className="demo-form"><label><span>组织名称</span><input value={form.name ?? ''} onChange={(e) => change('name', e.target.value)}/></label><label><span>上级节点 ID</span><input value={form.parentId ?? ''} placeholder="org-group" onChange={(e) => change('parentId', e.target.value)}/></label><label><span>负责人 ID</span><input value={form.ownerMemberId ?? ''} placeholder="member-owner" onChange={(e) => change('ownerMemberId', e.target.value)}/></label><label><span>数据边界</span><select value={form.dataBoundary ?? 'node_and_descendants'} onChange={(e) => change('dataBoundary', e.target.value)}><option value="node">仅本节点</option><option value="node_and_descendants">本节点及下级</option><option value="project">指定项目</option></select></label></div></div>
  : kind === 'permission' ? <div className="demo-special-body permission-editor"><div className="demo-form"><label><span>角色名称</span><input value={form.name ?? ''} onChange={(e) => change('name', e.target.value)}/></label></div><div className="permission-scope-choice"><span>数据范围</span>{[['assigned','本人负责'],['project','本项目'],['node_and_descendants','本节点及下级'],['custom','自定义']].map(([value,label]) => <button className={choice === value ? 'selected' : ''} key={value} onClick={() => setChoice(value)}>{label}</button>)}</div><div className="permission-switches"><h3>允许操作</h3>{[['read','查看'],['write','编辑'],['export','导出'],['execute','自动执行']].map(([key,label]) => <label key={key}><span><strong>{label}</strong><small>{key === 'export' || key === 'execute' ? '高风险权限变更将进入审计' : '受数据范围继续约束'}</small></span><button className={switches[key as keyof typeof switches] ? 'on' : ''} role="switch" aria-checked={switches[key as keyof typeof switches]} onClick={() => setSwitches((current) => ({ ...current, [key]: !current[key as keyof typeof current] }))}><i/></button></label>)}</div></div>
  : kind === 'connection' ? <div className="demo-special-body"><div className="demo-steps">{['选择连接方式','服务端测试','同步范围'].map((name,index) => <span className={index <= step ? 'active' : ''} key={name}><i>{index+1}</i>{name}</span>)}</div>{step === 0 && <div className="connection-methods">{[['OAuth 授权','使用服务端 OAuth 凭证引用'],['API 密钥','只填写环境变量引用名，不接收明文'],['文件交换','使用服务端文件交换凭证引用']].map(([name,desc]) => <button className={choice === name ? 'selected' : ''} key={name} onClick={() => setChoice(name)}><strong>{name}</strong><small>{desc}</small></button>)}</div>}{step === 1 && <div className="connection-test"><label><span>HTTPS 地址</span><input value={form.endpointUrl ?? ''} placeholder="https://api.example.com/health" onChange={(e) => change('endpointUrl', e.target.value)}/></label><label><span>secret_ref</span><input value={form.secretRef ?? ''} placeholder="CRM_API_TOKEN" onChange={(e) => change('secretRef', e.target.value.toUpperCase())}/></label><div className="test-result"><span>i</span><div><strong>由服务端真实测试</strong><small>环境变量未配置时返回“待配置”，不会模拟成功。</small></div></div></div>}{step === 2 && <div className="sync-scope"><p>{resultMessage || '设置同步范围'}</p>{['产品与库存','客户与联系人','商机与订单','内容与 Campaign'].map((item) => <label key={item}><input type="checkbox" checked={(form.syncScopes ?? '').split(',').includes(item)} onChange={(event) => { const current = (form.syncScopes ?? '').split(',').filter(Boolean); change('syncScopes', event.target.checked ? [...new Set([...current,item])].join(',') : current.filter((value) => value !== item).join(',')); }}/><span><strong>{item}</strong><small>写回能力需单独授权</small></span></label>)}</div>}</div>
  : kind === 'import' ? <div className="demo-special-body import-workbench"><div className="import-drop"><span>⇧</span><strong>上传通讯录 CSV</strong><small>表头：displayName/name、roleId、nodeId、memberType，最多 500 条</small><label className="secondary">选择 CSV<input hidden type="file" accept=".csv,text/csv" onChange={(e) => void onFile(e)}/></label>{form.filename && <em>✓ {form.filename} · {importRows.length} 条</em>}</div></div>
  : kind === 'quality' ? <div className="demo-special-body quality-workbench"><div className="issue-summary"><b>{active.context?.[0] ?? '0'}</b><span>条待处理</span><small>处置会持久化并审计</small></div><div className="issue-actions">{['接受建议','分配负责人','忽略并说明'].map((item) => <button className={choice === item ? 'selected' : ''} key={item} onClick={() => setChoice(item)}><strong>{item}</strong></button>)}</div><div className="demo-form"><label><span>说明</span><textarea value={form.note ?? ''} onChange={(e) => change('note', e.target.value)}/></label></div></div>
  : kind === 'security' ? <div className="demo-special-body security-policy-editor"><div className="policy-status"><span>策略状态</span><strong>{switches.enabled ? '当前生效' : '当前停用'}</strong><small>保存后即时持久化并审计</small></div><div className="permission-switches"><label><span><strong>{str(active.values?.name, active.title)}</strong><small>{active.desc}</small></span><button className={switches.enabled ? 'on' : ''} role="switch" aria-checked={switches.enabled} onClick={() => setSwitches((current) => ({ ...current, enabled: !current.enabled }))}><i/></button></label></div></div>
  : kind === 'audit' ? <div className="demo-special-body audit-detail"><div className="event-facts">{(active.context ?? []).map((item,index) => <div key={`${item}-${index}`}><span>{['触发动作','系统结果','事件时间'][index]}</span><strong>{item}</strong></div>)}</div><div className="disposition-actions">{['确认拦截','转交审批','标记误报'].map((item) => <button className={choice === item ? 'selected' : ''} key={item} onClick={() => setChoice(item)}>{item}</button>)}</div></div>
  : kind === 'chain' ? <div className="demo-form"><label><span>审批链名称</span><input value={form.name ?? ''} onChange={(e) => change('name', e.target.value)}/></label><label><span>适用动作</span><input value={form.appliesTo ?? ''} onChange={(e) => change('appliesTo', e.target.value)}/></label><label><span>审批步骤（逗号分隔）</span><textarea value={form.steps ?? ''} onChange={(e) => change('steps', e.target.value)}/></label></div>
  : <div className="detail-callout"><strong>服务端数据已加载</strong><p>{active.desc}</p></div>;

  return <PlatformContext.Provider value={{ data, loading, error, open, notify, mutate }}>{children}{active && <div className={`demo-overlay${kind === 'permission' ? ' drawer-mode' : ''}`} onMouseDown={() => !saving && setActive(null)}><section className={`demo-dialog demo-${kind}${kind === 'permission' ? ' demo-drawer' : ''}`} role="dialog" onMouseDown={(e) => e.stopPropagation()}><header><div><span>平台治理</span><h2>{active.title}</h2><p>{active.desc}</p></div><button disabled={saving} onClick={() => setActive(null)}>×</button></header>{body}{active.operation && <div className="demo-dialog-note"><strong>服务端持久化</strong><p>本操作会写入 D1 并记录审计；连接凭证只接受环境变量引用。</p></div>}<footer><button className="secondary" disabled={saving} onClick={() => kind === 'connection' && step > 0 ? setStep((current) => current - 1) : setActive(null)}>{kind === 'connection' && step > 0 ? '上一步' : '取消'}</button><button className="primary" disabled={saving} onClick={() => void (kind === 'connection' ? connectionNext() : complete())}>{saving ? '服务端处理中…' : kind === 'connection' && step < 2 ? (step === 0 ? '下一步：测试' : '测试真实连接') : active.confirm ?? '确认并保存'}</button></footer></section></div>}{notice && <div className="demo-toast" role="status"><span>i</span>{notice}</div>}</PlatformContext.Provider>;
}

function download(filename: string, value: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }

export function PlatformManagementPage({ view }: { view: PlatformView }) { return <PlatformShell><PlatformPage view={view}/></PlatformShell>; }

function PlatformPage({ view }: { view: PlatformView }) {
  const { data, loading, error, open, mutate, notify } = usePlatform();
  const [permissionTab, setPermissionTab] = useState(view === 'accounts' ? '账号连接' : '角色权限');
  const m = data?.metrics ?? {};
  const pending = loading && !data;
  const info = {
    structure: ['组织架构','配置集团、事业部、品牌、项目组与外部协作边界。','新建组织节点','导入通讯录', [['组织节点',m.organizationNodes],['成员账号',m.members],['角色模板',m.roles],['服务端',error ? '异常' : loading ? '加载中' : '已连接']]],
    permissions: ['权限与账号','管理岗位权限、数据范围与审批链。','新建角色','权限体检', [['角色模板',m.roles],['成员账号',m.members],['安全策略',m.policiesEnabled],['高危待处置',m.highRiskOpen]]],
    accounts: ['权限与账号','统一管理成员账号和业务平台账号。','连接账号','账号体检', [['成员账号',m.members],['平台连接',`${m.connectedIntegrations ?? 0} / ${m.integrationsTotal ?? 0}`],['待配置',m.needsConfiguration],['服务端',error ? '异常' : '已连接']]],
    data: ['数据管理','连接现有系统并治理统一业务对象。','连接数据源','下载接入清单', [['已连接系统',`${m.connectedIntegrations ?? 0} / ${m.integrationsTotal ?? 0}`],['同步成功率',`${m.syncSuccess ?? 0}%`],['数据源',data?.dataSources.length],['待处理记录',m.openQualityCount]]],
    security: ['系统与安全','定义部署方式、数据驻留、AI 范围、审计与异常处置。','导出安全报告','运行安全体检', [['已启用策略',m.policiesEnabled],['高危待处置',m.highRiskOpen],['待配置连接',m.needsConfiguration],['数据库',error ? '异常' : loading ? '检查中' : '正常']]],
  }[view] as [string,string,string,string,unknown[][]];
  const primary = () => {
    if (view === 'structure') open({ title: '新建组织节点', desc: '创建组织层级与默认数据边界。', kind: 'organization', operation: 'organization.save', values: { parentId: 'org-group', nodeType: '项目组', dataBoundary: 'node_and_descendants' } });
    else if (view === 'permissions') open({ title: '新建角色', desc: '配置功能权限与数据范围。', kind: 'permission', operation: 'role.save', values: { choice: 'project' } });
    else if (view === 'accounts' || view === 'data') open({ title: info[2], desc: '配置服务端连接和同步范围。', kind: 'connection', operation: 'integration.save', values: { integrationType: view === 'data' ? 'custom' : 'account', syncDirection: 'read_only' } });
    else download('security-report.json', { generatedAt: data?.generatedAt, metrics: data?.metrics, policies: data?.securityPolicies, health: data?.health });
  };
  const secondary = async () => {
    if (view === 'structure') open({ title: '导入通讯录', desc: '导入成员并建立组织、角色归属。', kind: 'import', operation: 'members.import' });
    else if (view === 'data') download('integration-checklist.json', { integrations: data?.integrations, sources: data?.dataSources });
    else try { const result = await mutate('platform.diagnose'); notify(result.message || '体检完成'); } catch (cause) { notify(cause instanceof Error ? cause.message : '体检失败'); }
  };
  return <><PageHeader title={info[0]} desc={info[1]} action={info[2]} secondary={info[3]} onAction={primary} onSecondary={() => void secondary()}/>{error && <div className="integration-principle"><span>服务端异常</span><strong>{error}</strong><small>不会使用静态演示数据伪装成功</small></div>}<div className={`stat-grid four${pending ? ' is-loading' : ''}`}>{info[4].map(([metricLabel,value]) => <Metric key={str(metricLabel)} label={str(metricLabel)} value={pending ? '加载中…' : str(value,'—')}/>)}</div>{view === 'structure' ? <Organizations/> : view === 'permissions' || view === 'accounts' ? <Permissions active={permissionTab} setActive={setPermissionTab}/> : view === 'data' ? <DataCenter/> : <Security/>}</>;
}

function Intro({ title, desc }: { title: string; desc: string }) { const { mutate, notify } = usePlatform(); return <div className="panel-title platform-title"><div><h2>{title}</h2><p>{desc}</p></div><button onClick={() => void mutate('platform.diagnose').then((r) => notify(r.message || '诊断完成')).catch((e: Error) => notify(e.message))}>运行体检</button></div>; }

function Organizations() {
  const { data, open, mutate, notify } = usePlatform(); const [tab,setTab] = useState('组织视图'); const [selected,setSelected] = useState('org-tea');
  const nodes = useMemo<Array<Row & { level: number }>>(() => { const raw: Row[] = data?.organizationNodes ?? []; return raw.map((node): Row & { level: number } => { let level = 0; let parent = str(node.parent_id); const seen = new Set<string>(); while (parent && !seen.has(parent)) { seen.add(parent); const found = raw.find((item) => item.id === parent); if (!found) break; level++; parent = str(found.parent_id); } return { ...node, level }; }); }, [data?.organizationNodes]);
  const current = nodes.find((node) => node.id === selected) ?? nodes[0]; const rules = data?.settings.organization_rules ?? {};
  return <section className="panel org-panel platform-panel"><Intro title="组织与协作模型" desc="组织层级、成员归属和边界均由 D1 管理。"/><Tabs items={['组织视图','协作边界','组织规则']} active={tab} setActive={setTab}/>{tab === '组织视图' ? <div className="org-layout enhanced-org"><aside className="org-tree"><div className="tree-caption"><strong>组织目录</strong><small>服务端实时数据</small></div>{nodes.map((node) => <button style={{ paddingLeft: `${10 + num(node.level)*18}px` }} className={selected === node.id ? 'active' : ''} key={str(node.id)} onClick={() => setSelected(str(node.id))}><span><i className={`node-dot level-${node.level}`}/>{str(node.name)}<small>{str(node.node_type)}</small></span><em>{num(node.member_count)} 人</em></button>)}</aside>{current && <div className="org-detail org-detail-rich"><div className="detail-toolbar"><div><span>{str(current.node_type)}</span><h2>{str(current.name)}</h2><p>{str(current.description,'尚未填写说明')}</p></div><button className="secondary" onClick={() => open({ title: `编辑${current.name}`, desc: '修改组织节点并审计。', kind: 'organization', operation: 'organization.save', values: { id: current.id, name: current.name, nodeType: current.node_type, parentId: current.parent_id, ownerMemberId: current.owner_member_id, dataBoundary: current.data_boundary } })}>编辑节点</button></div><div className="mini-metrics"><div><span>成员</span><b>{num(current.member_count)}</b><small>组织归属</small></div><div><span>状态</span><b>{label(current.status)}</b><small>D1 记录</small></div><div><span>数据边界</span><b>{label(current.data_boundary)}</b><small>默认不跨组织</small></div></div></div>}</div> : tab === '协作边界' ? <div className="platform-table"><div className="platform-row head"><span>节点</span><span>类型</span><span>数据边界</span><span>父级</span><span>状态</span></div>{nodes.filter((n) => str(n.node_type).includes('外部') || n.data_boundary === 'project').map((n) => <div className="platform-row" key={str(n.id)}><span className="strong-cell">{str(n.name)}</span><span>{str(n.node_type)}</span><span>{label(n.data_boundary)}</span><span>{str(n.parent_id,'根')}</span><span className="status-good">{label(n.status)}</span></div>)}</div> : <div className="rule-grid">{[['defaultBoundary','数据默认不跨边界'],['externalLeastPrivilege','外部协作最小授权'],['revokeOnExit','离岗与项目结束回收']].map(([key,name]) => <button className="rule-card" key={key} onClick={() => void mutate('organization_rules.save',{ ...rules,[key]: rules[key] === false }).then((r) => notify(r.message || '已保存')).catch((e: Error) => notify(e.message))}><span className="rule-icon">规</span><div><strong>{name}</strong><p>开关由服务端持久化并写入审计。</p></div><em>{rules[key] === false ? '已停用' : '已启用'}</em></button>)}</div>}</section>;
}

function Permissions({ active,setActive }: { active: string; setActive: (value: string) => void }) { return <section className="panel org-panel platform-panel"><Intro title="统一权限中心" desc="角色、数据范围、账号连接和审批链共同控制实际权限。"/><Tabs items={['角色权限','数据权限','账号连接','审批链']} active={active} setActive={setActive}/>{active === '角色权限' ? <RoleMatrix/> : active === '数据权限' ? <Scopes/> : active === '账号连接' ? <Accounts/> : <Chains/>}</section>; }
function RoleMatrix() { const { data,open } = usePlatform(); return <div className="permission-wrap"><div className="permission-note"><span>最小权限</span><strong>变更持久化并记录高风险审计。</strong></div><div className="permission-table permission-table-wide"><div className="ptr head"><span>角色</span><span>权限数</span><span>查看</span><span>编辑</span><span>导出</span><span>执行</span><span>范围</span></div>{(data?.roles ?? []).map((role) => { const p = strings(role.permissions_json); const all = p.includes('*'); return <button className="ptr" key={str(role.id)} onClick={() => open({ title: `配置${role.name}`, desc: `当前范围：${label(role.data_scope)}`, kind: 'permission', operation: 'role.save', values: { id: role.id,name: role.name,dataScope:role.data_scope,choice:role.data_scope,permissions:p } })}><span className="role-name">{str(role.name)}</span><span>{p.length}</span><span>{all || p.some((x) => x.includes('read')) ? '允许' : '—'}</span><span>{all || p.some((x) => x.includes('manage')) ? '允许' : '—'}</span><span>{all || p.some((x) => x.includes('export')) ? '允许' : '—'}</span><span>{all || p.some((x) => x.includes('execute')) ? '允许' : '—'}</span><span>{label(role.data_scope)}</span></button>; })}</div></div>; }
function Scopes() { const { data } = usePlatform(); return <div className="scope-list">{(data?.roles ?? []).map((role,index) => <article key={str(role.id)}><span className={`scope-icon s${index%5}`}>{index+1}</span><div><strong>{str(role.name)}</strong><small>{strings(role.permissions_json).join('、')}</small></div><p>功能权限与组织边界共同收紧实际数据范围。</p><em>{label(role.data_scope)}</em></article>)}</div>; }
function Accounts() {
  const { data,open } = usePlatform();
  return <div><div className="account-summary"><span>安全连接</span><strong>只保存环境变量引用；没有真实凭证就显示待配置。</strong></div><div className="account-grid enhanced-accounts">{(data?.integrations ?? []).map((item,index) => <button key={str(item.id)} aria-label={`配置连接 ${item.name}`} onClick={() => openIntegration(open,item)}><span className={`platform-icon p${index%6}`}>{str(item.name).slice(0,1)}</span><span><strong>{str(item.name)}</strong><small>{label(item.integration_type)}</small><i>配置连接</i></span><em className={item.status === 'connected' ? 'good' : 'warn'}>{label(item.status)}</em></button>)}</div></div>;
}
function Chains() { const { data,open } = usePlatform(); return <div className="approval-chain-list">{(data?.approvalChains ?? []).map((item) => <article key={str(item.id)}><span className="chain-number">审</span><div><strong>{str(item.name)}</strong><small>{strings(item.steps_json).join(' → ')}</small></div><p>{str(item.applies_to)}</p><em>{str(item.sla_text)}</em><button onClick={() => open({ title:`编辑${item.name}`,desc:'调整审批链。',kind:'chain',operation:'approval_chain.save',values:{id:item.id,name:item.name,steps:strings(item.steps_json).join(','),appliesTo:item.applies_to,slaText:item.sla_text} })}>编辑</button></article>)}</div>; }
function openIntegration(open: Context['open'], item: Row) { open({ title:`配置${item.name}`,desc:`当前状态：${item.status}`,kind:'connection',operation:'integration.save',values:{id:item.id,name:item.name,integrationType:item.integration_type,endpointUrl:item.endpoint_url,authMethod:item.auth_method,syncDirection:item.sync_direction,syncScopes:strings(item.sync_scopes_json).join(',')} }); }

function DataCenter() { const [tab,setTab] = useState('系统连接'); return <section className="panel org-panel platform-panel"><Intro title="数据连接与治理" desc="连接、同步、质量处置和访问记录都来自服务端。"/><Tabs items={['系统连接','字段与主数据','数据质量','访问记录']} active={tab} setActive={setTab}/>{tab === '系统连接' ? <Integrations/> : tab === '字段与主数据' ? <Sources/> : tab === '数据质量' ? <Quality/> : <AuditTable/>}</section>; }
function Integrations() { const { data,open,mutate,notify } = usePlatform(); return <><div className="integration-principle"><span>真实连接</span><strong>测试与同步由服务端执行，缺少凭证不返回成功。</strong><small>明文凭证会被 API 拒绝</small></div><div className="integration-table"><div className="integration-row head"><span>系统</span><span>范围</span><span>方式</span><span>方向</span><span>状态</span><span>操作</span></div>{(data?.integrations ?? []).map((item) => <div className="integration-row" key={str(item.id)}><span><i className="system-cube">系</i><strong>{str(item.name)}</strong></span><span>{strings(item.scopes_json).join('、') || '待定义'}</span><span>{label(item.auth_method,'待配置')}</span><span>{label(item.sync_direction,'只读')}</span><span className={item.status === 'connected' ? 'status-good' : 'status-warn'}>{label(item.status)}</span><span><button onClick={() => openIntegration(open,item)}>配置</button><button onClick={() => void mutate('sync.run',{integrationId:item.id}).then((r) => notify(r.message || '同步已提交')).catch((e: Error) => notify(e.message))}>同步</button></span></div>)}</div></>; }
function Sources() { const { data } = usePlatform(); return <div className="master-layout"><div className="master-flow"><span>源系统</span><i>→</i><span>字段映射</span><i>→</i><span>统一对象</span><i>→</i><span>权限与归因</span></div><div className="platform-table master-table"><div className="platform-row head"><span>数据源</span><span>类型</span><span>分类</span><span>最近同步</span><span>状态</span></div>{(data?.dataSources ?? []).map((item) => <div className="platform-row" key={str(item.id)}><span className="strong-cell">{str(item.name)}</span><span>{label(item.source_type)}</span><span>{label(item.classification)}</span><span>{str(item.last_synced_at,'尚未同步')}</span><span className={item.status === 'healthy' ? 'status-good' : 'status-warn'}>{label(item.status)}</span></div>)}</div></div>; }
function Quality() { const { data,open } = usePlatform(); const issues = data?.qualityIssues ?? []; const count = issues.filter((i) => i.status === 'open' || i.status === 'assigned').reduce((sum,i) => sum+num(i.affected_count),0); return <div className="data-quality-layout"><div className="health-score large"><b>{count}</b><span>条待处理</span><small>服务端质量队列</small></div><div className="quality-cards">{issues.map((item) => <button key={str(item.id)} onClick={() => open({title:`处理${item.issue_type}`,desc:`建议：${item.recommendation}`,kind:'quality',operation:'quality.resolve',values:{id:item.id},context:[str(item.affected_count)]})}><span>{str(item.issue_type)}</span><b>{num(item.affected_count)}</b><small>{str(item.recommendation)}</small><em>{label(item.status)}</em></button>)}</div></div>; }
function AuditTable() { const { data,open } = usePlatform(); return <div className="platform-table access-table"><div className="platform-row head"><span>时间</span><span>主体</span><span>动作</span><span>资源</span><span>结果</span></div>{(data?.auditEvents ?? []).map((item) => <button className="platform-row" key={str(item.id)} onClick={() => open({title:str(item.action),desc:`资源：${item.resource_type}`,kind:item.risk_level === 'high' ? 'audit':'detail',operation:item.risk_level === 'high' ? 'audit.resolve':undefined,values:{eventId:item.id},context:[str(item.action),str(item.result),str(item.occurred_at)]})}><span>{str(item.occurred_at).replace('T',' ').slice(0,16)}</span><span>{str(item.actor_id,str(item.actor_type))}</span><span>{str(item.action)}</span><span>{str(item.resource_type)}</span><span className={item.result === 'success' ? 'status-good':'status-danger'}>{label(item.result)}</span></button>)}</div>; }

function Security() { const [tab,setTab] = useState('部署与数据驻留'); return <section className="panel org-panel platform-panel"><Intro title="系统、安全与 AI 治理" desc="部署选择、策略、审计和健康均由服务端支撑。"/><Tabs items={['部署与数据驻留','AI 安全','审计与告警','系统状态']} active={tab} setActive={setTab}/>{tab === '部署与数据驻留' ? <Deployment/> : tab === 'AI 安全' ? <Policies/> : tab === '审计与告警' ? <Alerts/> : <Health/>}</section>; }
function Deployment() { const { data,mutate,notify } = usePlatform(); const selected = str(data?.settings.deployment?.mode,'混合部署'); const options = [['混合部署','推荐方案','敏感数据留在企业侧，云端只处理最小脱敏字段。'],['企业私有化部署','最高隔离','应用、模型网关与审计运行在专有环境。'],['云端专属实例','快速上线','独立租户和加密存储。']]; return <><div className="security-recommendation"><span className="agent-spark">AI</span><div><strong>当前部署治理：{selected}</strong><p>部署选择会写入 D1 并生成安全审计事件。</p></div></div><div className="deployment-grid">{options.map((o) => <button className={selected === o[0] ? 'recommended':''} key={o[0]} onClick={() => void mutate('deployment.save',{mode:o[0],data_residency:o[0] === '云端专属实例' ? 'dedicated_cloud':'enterprise',model_context:'minimum_masked',audit_storage:'dual'}).then((r) => notify(r.message || '已保存')).catch((e: Error) => notify(e.message))}><span>{o[1]}</span><strong>{o[0]}</strong><p>{o[2]}</p><em>{selected === o[0] ? '✓ 已持久化':'选择并保存'}</em></button>)}</div></>; }
function Policies() { const { data,open } = usePlatform(); return <div className="ai-policy-list">{(data?.securityPolicies ?? []).map((item,index) => <article key={str(item.id)}><span className="policy-index">{String(index+1).padStart(2,'0')}</span><div><strong>{str(item.name)}</strong><p>{str(item.description)}</p></div><em>{num(item.enabled) ? str(item.enforcement_level):'已停用'}</em><button onClick={() => open({title:str(item.name),desc:str(item.description),kind:'security',operation:'security_policy.save',values:{id:item.id,name:item.name,description:item.description,policyDomain:item.policy_domain,enforcementLevel:item.enforcement_level,scope:item.scope,enabled:item.enabled}})}>配置</button></article>)}</div>; }
function Alerts() { const { data,open } = usePlatform(); const events = data?.auditEvents ?? []; return <div className="audit-layout"><div className="audit-summary"><div><b>{events.length}</b><span>最近事件</span></div><div><b>{events.filter((e) => e.result !== 'success').length}</b><span>非成功</span></div><div><b>{events.filter((e) => e.risk_level === 'high').length}</b><span>高风险</span></div><div><b>{events.filter((e) => e.risk_level === 'high' && !e.disposition).length}</b><span>未处置高危</span></div></div><div className="platform-table audit-table"><div className="platform-row head"><span>事件</span><span>主体</span><span>资源</span><span>级别</span><span>时间</span></div>{events.map((e) => <button className="platform-row" key={str(e.id)} onClick={() => open({title:str(e.action),desc:`结果：${label(e.result)}`,kind:'audit',operation:'audit.resolve',values:{eventId:e.id},context:[str(e.action),str(e.result),str(e.occurred_at)]})}><span className="strong-cell">{str(e.action)}</span><span>{str(e.actor_id,str(e.actor_type))}</span><span>{str(e.resource_type)}</span><span className={`risk-${e.risk_level}`}>{label(e.risk_level)}</span><span>{str(e.occurred_at).replace('T',' ').slice(0,16)}</span></button>)}</div></div>; }
function Health() { const { data } = usePlatform(); return <div className="health-service-grid">{(data?.health ?? []).map((item,index) => <article key={str(item.id)}><span className={`service-icon service-${index}`}>●</span><div><strong>{str(item.name)}</strong><small>{str(item.metric)}</small></div><em className={item.status === 'healthy' ? 'status-good':'status-warn'}>{str(item.label)}</em></article>)}</div>; }
