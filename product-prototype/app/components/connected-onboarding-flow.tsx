'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  BusinessApiError,
  claimFirstLoginOnboarding,
  completeOnboarding,
  getOnboarding,
  loginWithCredentials,
  registerWithCredentials,
  saveOnboardingConfig,
  skipOnboarding,
  type CompleteOnboardingResponse,
  type OnboardingConfig,
  type OnboardingState,
} from '../../lib/business-api-client';

type Phase = 'checking' | 'auth' | 'setup' | 'hidden';
type AuthMode = 'login' | 'register';

export interface ConnectedOnboardingFlowProps {
  /** Increment or otherwise change this value to reopen an incomplete onboarding flow. */
  reopenSignal?: string | number;
  onComplete?: (result: CompleteOnboardingResponse) => void;
  onSkip?: (state: OnboardingState) => void;
  onStateChange?: (state: OnboardingState) => void;
  onVisibilityChange?: (visible: boolean) => void;
}

const emptyConfig: OnboardingConfig = {
  company: '',
  industry: '茶与特色食品',
  product: '',
  market: '马来西亚',
  autonomy: '审批后执行',
};

export function ConnectedOnboardingFlow({
  reopenSignal = 0,
  onComplete,
  onSkip,
  onStateChange,
  onVisibilityChange,
}: ConnectedOnboardingFlowProps) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<OnboardingConfig>(emptyConfig);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const visibilityCallback = useRef(onVisibilityChange);
  const stateCallback = useRef(onStateChange);
  const initialReplaySignal = useRef(reopenSignal);

  useEffect(() => {
    visibilityCallback.current = onVisibilityChange;
  }, [onVisibilityChange]);

  useEffect(() => {
    stateCallback.current = onStateChange;
  }, [onStateChange]);

  const showPhase = useCallback((next: Phase) => {
    setPhase(next);
    visibilityCallback.current?.(next === 'auth' || next === 'setup');
  }, []);

  const loadState = useCallback((state: OnboardingState, forceOpen = false) => {
    stateCallback.current?.(state);
    setVersion(state.version);
    setConfig({ ...emptyConfig, ...pickConfig(state.config) });
    setError('');
    if (state.status === 'completed' || state.status === 'skipped') {
      showPhase('hidden');
      return;
    }
    if (forceOpen) {
      setStep(nextStep(state.config));
      showPhase('setup');
      return;
    }
    showPhase('hidden');
  }, [showPhase]);

  const claim = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    setError('');
    try {
      const result = await claimFirstLoginOnboarding(signal);
      loadState(result.onboarding, result.shouldStartOnboarding);
    } catch (cause) {
      if (isAbort(cause)) return;
      if (isUnauthorized(cause)) {
        showPhase('auth');
        setError('请先完成企业登录。可使用企业 SSO，或在此使用真实账号登录/注册。');
      } else {
        showPhase('auth');
        setError(messageFor(cause));
      }
    } finally {
      setBusy(false);
    }
  }, [loadState, showPhase]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => claim(controller.signal));
    return () => controller.abort();
  }, [claim]);

  useEffect(() => {
    if (initialReplaySignal.current === reopenSignal) return;
    initialReplaySignal.current = reopenSignal;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      setBusy(true);
      setError('');
      try {
        const result = await getOnboarding(controller.signal);
        loadState(result.onboarding, true);
      } catch (cause) {
        if (isAbort(cause)) return;
        if (isUnauthorized(cause)) showPhase('auth');
        else showPhase('setup');
        setError(messageFor(cause));
      } finally {
        setBusy(false);
      }
    });
    return () => controller.abort();
  }, [loadState, reopenSignal, showPhase]);

  const update = (key: keyof OnboardingConfig, value: string) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const submitAuthentication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (authMode === 'register') {
        await registerWithCredentials({ name: name.trim(), email: email.trim(), password });
      } else {
        await loginWithCredentials({ email: email.trim(), password });
      }
      setPassword('');
      const result = await claimFirstLoginOnboarding();
      loadState(result.onboarding, result.shouldStartOnboarding);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  };

  const continueSetup = async () => {
    const validation = validateStep(step, config);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (step < 3) {
        const patch = step === 1
          ? { company: config.company, industry: config.industry }
          : { product: config.product, market: config.market };
        const result = await saveOnboardingConfig(patch, version);
        stateCallback.current?.(result.onboarding);
        setVersion(result.onboarding.version);
        setConfig((current) => ({ ...current, ...pickConfig(result.onboarding.config) }));
        setStep((current) => current + 1);
      } else {
        const result = await completeOnboarding(config, version);
        stateCallback.current?.(result.onboarding);
        setVersion(result.onboarding.version);
        showPhase('hidden');
        onComplete?.(result);
      }
    } catch (cause) {
      if (isUnauthorized(cause)) showPhase('auth');
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  };

  const performSkip = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await skipOnboarding();
      stateCallback.current?.(result.onboarding);
      showPhase('hidden');
      onSkip?.(result.onboarding);
    } catch (cause) {
      if (isUnauthorized(cause)) showPhase('auth');
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'checking' || phase === 'hidden') return null;

  return <div className="onboarding-backdrop" role="presentation">
    <section
      className={`onboarding-card ${phase === 'setup' ? 'setup-card' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={phase === 'auth' ? '企业账号登录或注册' : '首次使用引导'}
    >
      <div className="onboarding-brand"><span>黔</span><p><strong>黔海</strong><small>Global Growth OS</small></p></div>
      {phase === 'auth' ? <>
        <div className="auth-welcome">
          <span className="onboarding-kicker">企业身份验证</span>
          <h1>请先完成企业登录</h1>
          <p>身份由企业 SSO 或本系统真实账号验证。本页面不会预填、展示或保存你的密码。</p>
        </div>
        <div className="auth-tabs" role="tablist">
          <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setError(''); }}>登录</button>
          <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); setError(''); }}>注册</button>
        </div>
        <form className="auth-form" onSubmit={(event) => void submitAuthentication(event)}>
          {authMode === 'register' && <label><span>姓名</span><input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="请输入真实姓名" /></label>}
          <label><span>工作邮箱</span><input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="name@company.com" /></label>
          <label><span>密码</span><input required type="password" minLength={authMode === 'register' ? 8 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} placeholder={authMode === 'register' ? '至少 8 位' : '请输入密码'} /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="onboarding-primary" type="submit" disabled={busy}>{busy ? '正在验证…' : authMode === 'register' ? '注册并开始配置' : '登录并继续'} <b>→</b></button>
        </form>
        {authMode === 'register' && <p className="permission-note">自助注册仅在“单客户、独立数据库”的本地试用入口开放；生产环境强制关闭。</p>}
        <div className="auth-trust"><span>✓ 真实服务端验证</span><span>✓ HttpOnly 会话</span><span>✓ 不在页面保存密码</span></div>
        <button className="onboarding-skip" type="button" disabled={busy} onClick={() => void claim()}>{busy ? '正在检查…' : '已完成企业 SSO，重新检查'}</button>
      </> : <>
        <header className="setup-head">
          <div>
            <span className="onboarding-kicker">首次使用引导 · 配置实时保存</span>
            <h1>{step === 1 ? '先让我们了解你的企业' : step === 2 ? '建立第一个出海目标' : '设定数字员工的边界'}</h1>
            <p>{step === 1 ? '企业和行业信息会保存到当前组织的引导状态。' : step === 2 ? '完成后，服务端会真实创建首个经营任务。' : '价格、交期和商务承诺仍由人工把关。'}</p>
          </div>
          <button className="setup-close" type="button" disabled={busy} onClick={() => void performSkip()} aria-label="跳过引导">×</button>
        </header>
        <div className="setup-progress">
          {[1, 2, 3].map((item) => <div key={item} className={item === step ? 'active' : item < step ? 'done' : ''}><i>{item < step ? '✓' : item}</i><span>{item === 1 ? '企业信息' : item === 2 ? '产品与市场' : '执行权限'}</span></div>)}
        </div>
        <div className="setup-body">
          {step === 1 && <div className="setup-fields">
            <label><span>企业名称</span><input required value={config.company} onChange={(event) => update('company', event.target.value)} placeholder="请输入真实企业名称" /></label>
            <label><span>所属产业</span><select value={config.industry} onChange={(event) => update('industry', event.target.value)}><option>茶与特色食品</option><option>先进制造</option><option>文旅与服务</option><option>生物医药</option></select></label>
            <aside><b>AI</b><p><strong>会用到哪里？</strong><small>用于匹配行业市场、采购角色和合规要求。</small></p></aside>
          </div>}
          {step === 2 && <div className="setup-fields">
            <label><span>首个出海产品</span><input required value={config.product} onChange={(event) => update('product', event.target.value)} placeholder="请输入真实产品名称" /></label>
            <label><span>优先目标市场</span><select value={config.market} onChange={(event) => update('market', event.target.value)}><option>马来西亚</option><option>新加坡</option><option>泰国</option><option>阿联酋</option><option>欧盟</option></select></label>
            <div className="setup-preview"><span>完成后将真实创建</span><strong>{config.product || '待填写产品'} · {config.market}市场获客任务</strong><small>任务 ID、状态和时间范围由服务端返回，不在前端伪造。</small></div>
          </div>}
          {step === 3 && <div className="autonomy-options">
            {([['建议模式', 'AI 只生成建议，所有动作由人工执行'], ['审批后执行', 'AI 完成草案，经你确认后对外执行'], ['边界内自主', '低风险动作自动执行，重要事项仍需审批']] as const).map((option, index) => <button type="button" key={option[0]} className={config.autonomy === option[0] ? 'active' : ''} onClick={() => update('autonomy', option[0])}><i>{index === 0 ? '○' : index === 1 ? '✓' : '✦'}</i><span><strong>{option[0]}{index === 1 && <em>推荐</em>}</strong><small>{option[1]}</small></span><b>{config.autonomy === option[0] ? '●' : '○'}</b></button>)}
            <p className="permission-note">价格、交期、认证与独家合作默认始终需要人工确认。</p>
          </div>}
          {error && <p className="setup-error" role="alert">{error}</p>}
        </div>
        <footer className="setup-actions">
          <button className="onboarding-skip" type="button" disabled={busy} onClick={() => void performSkip()}>稍后再说</button>
          <div>
            {step > 1 && <button className="onboarding-secondary" type="button" disabled={busy} onClick={() => { setError(''); setStep((current) => current - 1); }}>上一步</button>}
            <button className="onboarding-primary" type="button" disabled={busy || Boolean(validateStep(step, config))} onClick={() => void continueSetup()}>{busy ? '正在保存…' : step === 3 ? '创建第一个经营任务' : '保存并继续'} <b>→</b></button>
          </div>
        </footer>
      </>}
    </section>
  </div>;
}

function pickConfig(value: Partial<OnboardingConfig>): Partial<OnboardingConfig> {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [keyof OnboardingConfig, string] =>
      typeof entry[1] === 'string'),
  );
}

function nextStep(config: Partial<OnboardingConfig>): number {
  if (!config.company || !config.industry) return 1;
  if (!config.product || !config.market) return 2;
  return 3;
}

function validateStep(step: number, config: OnboardingConfig): string {
  if (step === 1 && (!config.company.trim() || !config.industry.trim())) return '请填写企业名称并选择所属产业。';
  if (step === 2 && (!config.product.trim() || !config.market.trim())) return '请填写首个出海产品并选择目标市场。';
  if (step === 3 && !config.autonomy.trim()) return '请选择数字员工的执行权限。';
  return '';
}

function isUnauthorized(cause: unknown): boolean {
  return cause instanceof BusinessApiError && cause.isUnauthorized;
}

function isAbort(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError';
}

function messageFor(cause: unknown): string {
  if (cause instanceof BusinessApiError) {
    const request = cause.requestId ? `（请求 ${cause.requestId}）` : '';
    if (cause.code === 'version_conflict') return `配置已在另一个窗口更新，请重新打开引导后继续。${request}`;
    if (cause.code === 'enterprise_context_required') return `当前组织尚未关联企业，请先由管理员完成企业配置。${request}`;
    if (cause.isUnauthorized) return `请先完成企业登录或 SSO 验证。${request}`;
    return `${cause.message}${request}`;
  }
  return cause instanceof Error ? cause.message : '操作失败，请稍后重试。';
}
