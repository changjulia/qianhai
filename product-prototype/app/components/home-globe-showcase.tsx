'use client';

import dynamic from 'next/dynamic';
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import styles from './home-globe-showcase.module.css';
import {
  MARKET_REGIONS,
  type MarketDashboardResponse,
  type MarketRegion,
  type MarketSnapshot,
} from './home-globe-data';
import type { GlobeSceneProps } from './globe-scene';

const GlobeScene = dynamic<GlobeSceneProps>(() => import('./globe-scene'), {
  ssr: false,
  loading: () => <GlobeLoading />,
});

type RenderMode = 'checking' | 'webgl' | 'fallback';
type DashboardStatus = 'loading' | 'ready' | 'error';
export type HomeTodoDestination = 'content' | 'approvals' | 'inquiries' | 'revenue';

type GlobeErrorBoundaryProps = {
  children: ReactNode;
  onError: () => void;
};

type GlobeErrorBoundaryState = {
  failed: boolean;
};

class GlobeErrorBoundary extends Component<GlobeErrorBoundaryProps, GlobeErrorBoundaryState> {
  state: GlobeErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): GlobeErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The interactive globe could not be rendered.', error, info);
    this.props.onError();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function GlobeLoading() {
  return (
    <div className={styles.loading} role="status">
      <span aria-hidden="true" />
      <strong>正在构建立体地球</strong>
      <small>载入本地国家边界与交互图层…</small>
    </div>
  );
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return reducedMotion;
}

function canUseWebGl2() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      failIfMajorPerformanceCaveat: true,
    });
    if (!context) return false;

    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function isDashboardResponse(value: unknown): value is MarketDashboardResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MarketDashboardResponse>;
  return typeof candidate.generatedAt === 'string'
    && typeof candidate.windowLabel === 'string'
    && candidate.source?.databaseStatus === 'connected'
    && candidate.source.system === 'D1'
    && Array.isArray(candidate.markets);
}

function getApiError(value: unknown, status: number) {
  if (value && typeof value === 'object') {
    const candidate = value as {
      error?: { message?: unknown };
      message?: unknown;
    };
    if (typeof candidate.error?.message === 'string') return candidate.error.message;
    if (typeof candidate.message === 'string') return candidate.message;
  }
  return `市场数据接口返回 ${status}`;
}

function StaticMap({ activeMarket }: { activeMarket: MarketRegion | null }) {
  const marker = activeMarket ? {
    x: ((activeMarket.lng + 180) / 360) * 720,
    y: ((90 - activeMarket.lat) / 180) * 360,
  } : null;

  return (
    <div className={styles.staticMap} role="img" aria-label="静态世界地图降级视图">
      <svg viewBox="0 0 720 360" aria-hidden="true">
        <defs>
          <linearGradient id="qh-map-ocean" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#071b3b" />
            <stop offset="1" stopColor="#0b3262" />
          </linearGradient>
          <linearGradient id="qh-map-land" x1="0" x2="1">
            <stop offset="0" stopColor="#1b6fbe" />
            <stop offset="1" stopColor="#28c7de" />
          </linearGradient>
        </defs>
        <rect width="720" height="360" rx="24" fill="url(#qh-map-ocean)" />
        <g className={styles.graticules}>
          <path d="M0 90H720M0 180H720M0 270H720" />
          <path d="M120 0V360M240 0V360M360 0V360M480 0V360M600 0V360" />
        </g>
        <g className={styles.continents}>
          <path d="M70 92 114 55l83 15 43 42-25 33-42 8-14 41-45 8-34-49Z" />
          <path d="m196 205 44 18 22 45-18 65-29-29-18-53Z" />
          <path d="m319 99 45-35 119 1 43 25 87 15 34 50-42 30-52-5-28 26-52-11-37-34-62 11-43-24Z" />
          <path d="m384 176 54 12 36 47-22 76-39-16-29-67Z" />
          <path d="m582 247 58-17 43 27-15 40-60 4Z" />
        </g>
        {marker && (
          <g transform={`translate(${marker.x} ${marker.y})`} className={styles.mapMarker}>
            <circle r="18" />
            <circle r="6" />
          </g>
        )}
      </svg>
      <div className={styles.fallbackNote}>
        <strong>已切换轻量地图</strong>
        <span>当前设备未启用 WebGL2；仍可用右侧市场按钮进入数据看板。</span>
      </div>
    </div>
  );
}

function MarketSelector({
  activeMarket,
  onEnter,
}: {
  activeMarket: MarketRegion | null;
  onEnter: (market: MarketRegion) => void;
}) {
  return (
    <div className={styles.caseSelector} aria-label="选择并进入市场区域">
      {MARKET_REGIONS.map((market) => {
        const selected = market.id === activeMarket?.id;
        return (
          <button
            type="button"
            key={market.id}
            aria-pressed={selected}
            className={selected ? styles.countryButtonActive : styles.countryButton}
            onClick={() => onEnter(market)}
          >
            <span>{market.nameZh}</span>
            <small>{market.countriesZh}</small>
          </button>
        );
      })}
    </div>
  );
}

const HOME_TODOS: Array<{
  id: string;
  icon: string;
  title: string;
  description: string;
  destination: HomeTodoDestination;
}> = [
  { id: 'content-review', icon: '审', title: '内容审核', description: '检查待发布内容与事实依据', destination: 'content' },
  { id: 'budget-approval', icon: '投', title: '投流预算审批', description: '处理新增或调整中的投放预算', destination: 'approvals' },
  { id: 'lead-handoff', icon: '客', title: '高意向询盘接管', description: '进入客户经营工作区跟进', destination: 'inquiries' },
  { id: 'quote-order', icon: '商', title: '报价与订单确认', description: '核对报价、成交与回款链路', destination: 'revenue' },
];

function TodoPanel({
  onOpenTodo,
  onEnterMarket,
}: {
  onOpenTodo: (destination: HomeTodoDestination) => void;
  onEnterMarket: (market: MarketRegion) => void;
}) {
  return (
    <>
      <div className={styles.todoHeading}>
        <div>
          <span>MY WORK QUEUE</span>
          <h2>我的待办</h2>
          <p>跨部门统一处理</p>
        </div>
        <b>待处理</b>
      </div>

      <div className={styles.todoList}>
        {HOME_TODOS.map((item) => (
          <button type="button" key={item.id} onClick={() => onOpenTodo(item.destination)}>
            <i aria-hidden="true">{item.icon}</i>
            <span><strong>{item.title}</strong><small>{item.description}</small></span>
            <b aria-hidden="true">›</b>
          </button>
        ))}
      </div>

      <div className={styles.todoMapHint}>
        <span aria-hidden="true">◎</span>
        <p><strong>双击地图进入市场</strong><small>右侧将切换为该区域的经营数据看板。</small></p>
      </div>

      <details className={styles.keyboardMarketEntry}>
        <summary>键盘进入海外市场</summary>
        <MarketSelector activeMarket={null} onEnter={onEnterMarket} />
      </details>
    </>
  );
}

function formatInteger(value: number | null) {
  return value === null ? '—' : new Intl.NumberFormat('zh-CN').format(value);
}

function formatCny(value: number | null) {
  if (value === null) return '—';
  if (Math.abs(value) >= 10_000) {
    return `¥${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(value / 10_000)}万`;
  }
  return `¥${new Intl.NumberFormat('zh-CN').format(value)}`;
}

function formatSyncTime(value: string | null) {
  if (!value) return '暂无同步时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function MetricTile({
  label,
  value,
  note,
  unavailable,
}: {
  label: string;
  value: string;
  note: string;
  unavailable: boolean;
}) {
  return (
    <div className={unavailable ? styles.metricUnavailable : undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      <small>{unavailable ? '数据源未提供该市场值' : note}</small>
    </div>
  );
}

function DataSourceStatus({
  status,
  dashboard,
}: {
  status: DashboardStatus;
  dashboard: MarketDashboardResponse | null;
}) {
  if (status === 'loading') {
    return (
      <div className={`${styles.sourceStatus} ${styles.sourceLoading}`} role="status">
        <i aria-hidden="true" />
        <span><strong>正在连接市场数据接口</strong><small>读取已授权的经营数据源…</small></span>
      </div>
    );
  }

  if (status === 'error' || !dashboard) {
    return (
      <div className={`${styles.sourceStatus} ${styles.sourceError}`}>
        <i aria-hidden="true" />
        <span><strong>市场数据接口不可用</strong><small>不会用演示数字填补空缺</small></span>
      </div>
    );
  }

  const isEligible = dashboard.source.metricsEligible;
  const hasPendingIntegrations = dashboard.source.requiredProviders.length > 0;

  return (
    <div className={`${styles.sourceStatus} ${isEligible ? styles.sourceConnected : styles.sourceWarning}`}>
      <i aria-hidden="true" />
      <span>
        <strong>
          市场数据接口已建立
          {isEligible ? ' · 业务数据已通过生产校验' : ' · 业务数据暂不可展示'}
        </strong>
        <small>
          {dashboard.source.activeBusinessConnections} 个生产连接器已验证
          {hasPendingIntegrations ? ` · 待配置：${dashboard.source.requiredProviders.join('、')}` : ''}
        </small>
      </span>
    </div>
  );
}

function MarketDashboardCard({
  activeCountryName,
  activeMarket,
  snapshot,
  dashboard,
  status,
  error,
  onRetry,
  onReset,
}: {
  activeCountryName: string | null;
  activeMarket: MarketRegion | null;
  snapshot: MarketSnapshot | null;
  dashboard: MarketDashboardResponse | null;
  status: DashboardStatus;
  error: string | null;
  onRetry: () => void;
  onReset: () => void;
}) {
  if (!activeMarket) {
    return (
      <article className={`${styles.caseCard} ${styles.emptyState}`} data-testid="market-dashboard-card">
        <div className={styles.emptyCaseIcon} aria-hidden="true">◎</div>
        <p className={styles.cardEyebrow}>{activeCountryName ? '尚未配置市场映射' : '等待进入市场'}</p>
        <h3>{activeCountryName ?? '双击地图中的市场板块'}</h3>
        <p className={styles.cardSummary}>
          {activeCountryName
            ? '该地点尚未归入已配置市场板块。可从市场入口进入已配置板块。'
            : '单击选中整个市场板块，双击即可展开该板块汇总数据；键盘用户可直接使用市场入口。'}
        </p>
        <div className={styles.truthNote}>数据缺失显示“—”，不会把未知值写成 0</div>
      </article>
    );
  }

  if (status === 'error') {
    return (
      <article className={`${styles.caseCard} ${styles.errorState}`} data-testid="market-dashboard-card">
        <p className={styles.cardEyebrow}>{activeMarket.nameEn}</p>
        <h3>{activeMarket.nameZh}数据暂不可用</h3>
        <p className={styles.cardSummary}>{error ?? '无法读取市场数据接口。'}</p>
        <div className={styles.truthNote}>数据库未连接或数据表未初始化时，不展示伪造指标。</div>
        <div className={styles.cardActions}>
          <button type="button" className={styles.retryButton} onClick={onRetry}>重新连接</button>
          <button type="button" className={styles.resetButton} onClick={onReset}>返回全球视角</button>
        </div>
      </article>
    );
  }

  if (status === 'loading' || !dashboard) {
    return (
      <article className={`${styles.caseCard} ${styles.dashboardLoading}`} data-testid="market-dashboard-card" role="status">
        <p className={styles.cardEyebrow}>{activeMarket.nameEn}</p>
        <h3>正在读取{activeMarket.nameZh}</h3>
        <p className={styles.cardSummary}>从组织范围内的曝光、归因、客户活动与订单事实表聚合数据…</p>
        <div className={styles.metricSkeletons} aria-hidden="true"><i /><i /><i /><i /></div>
      </article>
    );
  }

  const metricSnapshot = snapshot ?? {
    marketId: activeMarket.id,
    exposure: null,
    validInquiries: null,
    activeLeads: null,
    cumulativeDealsCny: null,
    dealCount: null,
    matchedSourceMarkets: [],
  };
  const metricsEligible = dashboard.source.metricsEligible;
  const sourceBadge = metricsEligible
    ? '已验证生产数据'
    : dashboard.source.businessDataStatus === 'mixed_unverified'
      ? '混合 / 演示数据已屏蔽'
      : dashboard.source.businessDataStatus === 'needs_configuration'
        ? '生产连接器待配置'
        : '业务数据待验证';

  return (
    <article className={styles.caseCard} data-testid="market-dashboard-card">
      <div className={styles.cardHeader}>
        <div>
          <span className={metricsEligible ? styles.benchmarkBadge : styles.pocBadge}>
            {sourceBadge}
          </span>
          <p className={styles.cardEyebrow}>{activeMarket.nameEn}</p>
          <h3>{activeMarket.nameZh}</h3>
          <strong>{activeMarket.countriesZh}</strong>
        </div>
        <button type="button" className={styles.resetButton} onClick={onReset}>全球视角</button>
      </div>

      <p className={styles.cardSummary}>{dashboard.windowLabel}</p>

      <dl className={styles.metrics}>
        <MetricTile
          label="近期曝光"
          value={formatInteger(metricSnapshot.exposure)}
          note="次 impressions"
          unavailable={metricSnapshot.exposure === null}
        />
        <MetricTile
          label="有效询盘"
          value={formatInteger(metricSnapshot.validInquiries)}
          note="位去重客户"
          unavailable={metricSnapshot.validInquiries === null}
        />
        <MetricTile
          label="活跃客资"
          value={formatInteger(metricSnapshot.activeLeads)}
          note="位近期有活动客户"
          unavailable={metricSnapshot.activeLeads === null}
        />
        <MetricTile
          label="累计成交"
          value={formatCny(metricSnapshot.cumulativeDealsCny)}
          note={`${formatInteger(metricSnapshot.dealCount)} 笔已成交订单`}
          unavailable={metricSnapshot.cumulativeDealsCny === null}
        />
      </dl>

      <div className={styles.sourceSummary}>
        <span>匹配源市场</span>
        <strong>{metricSnapshot.matchedSourceMarkets.join('、') || '尚无匹配记录'}</strong>
        <small>连接最近验证：{formatSyncTime(dashboard.source.lastVerifiedAt)}</small>
      </div>

      <details className={styles.definitionList}>
        <summary>查看指标口径与数据说明</summary>
        <dl>
          <div><dt>近期曝光</dt><dd>{dashboard.definitions.exposure}</dd></div>
          <div><dt>有效询盘</dt><dd>{dashboard.definitions.validInquiries}</dd></div>
          <div><dt>活跃客资</dt><dd>{dashboard.definitions.activeLeads}</dd></div>
          <div><dt>累计成交</dt><dd>{dashboard.definitions.cumulativeDeals}</dd></div>
        </dl>
      </details>

      <div className={styles.dataDisclosure}>{dashboard.source.disclosure}</div>
    </article>
  );
}

export default function HomeGlobeShowcase({
  onOpenTodo,
}: {
  onOpenTodo: (destination: HomeTodoDestination) => void;
}) {
  const [renderMode, setRenderMode] = useState<RenderMode>('checking');
  const [focusedCountryName, setFocusedCountryName] = useState<string | null>(null);
  const [focusedMarket, setFocusedMarket] = useState<MarketRegion | null>(null);
  const [activeCountryName, setActiveCountryName] = useState<string | null>(null);
  const [activeMarket, setActiveMarket] = useState<MarketRegion | null>(null);
  const [dashboard, setDashboard] = useState<MarketDashboardResponse | null>(null);
  const [dashboardStatus, setDashboardStatus] = useState<DashboardStatus>('loading');
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [requestNonce, setRequestNonce] = useState(0);
  const reducedMotion = useReducedMotion();

  const snapshot = useMemo(
    () => activeMarket
      ? dashboard?.markets.find((item) => item.marketId === activeMarket.id) ?? null
      : null,
    [activeMarket, dashboard],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setRenderMode(canUseWebGl2() ? 'webgl' : 'fallback');
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void fetch('/api/market-dashboard?days=30', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(getApiError(payload, response.status));
        if (!isDashboardResponse(payload)) throw new Error('市场数据接口返回格式无效');
        return payload;
      })
      .then((payload) => {
        setDashboard(payload);
        setDashboardStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDashboard(null);
        setDashboardStatus('error');
        setDashboardError(error instanceof Error ? error.message : '无法连接市场数据接口');
      });

    return () => controller.abort();
  }, [requestNonce]);

  const useFallback = useCallback(() => setRenderMode('fallback'), []);

  const handleCountryFocus = useCallback((countryName: string, market: MarketRegion | null) => {
    setFocusedCountryName(countryName);
    setFocusedMarket(market);
  }, []);

  const handleMarketEnter = useCallback((countryName: string, market: MarketRegion | null) => {
    setFocusedCountryName(countryName);
    setFocusedMarket(market);
    setActiveCountryName(null);
    setActiveMarket(market);
  }, []);

  const handleSelectorEnter = useCallback((market: MarketRegion) => {
    setFocusedCountryName(market.nameZh);
    setFocusedMarket(market);
    setActiveCountryName(null);
    setActiveMarket(market);
  }, []);

  const handleReset = useCallback(() => {
    setFocusedCountryName(null);
    setFocusedMarket(null);
    setActiveCountryName(null);
    setActiveMarket(null);
  }, []);

  const handleRetry = useCallback(() => {
    setDashboardStatus('loading');
    setDashboardError(null);
    setRequestNonce((value) => value + 1);
  }, []);

  const liveMessage = activeMarket
    ? `已进入${activeMarket.nameZh}，右侧数据看板已更新`
    : focusedCountryName
      ? `已选中${focusedMarket?.nameZh ?? focusedCountryName}${focusedMarket ? '，双击可展开板块数据' : '，该地区尚未配置市场板块'}`
      : '全球市场视角';

  return (
    <section
      className={styles.showcase}
      data-testid="home-globe-showcase"
      data-focused-country={focusedCountryName ?? ''}
      data-active-market={activeMarket?.id ?? ''}
      aria-labelledby="globe-showcase-title"
    >
      <div className={`${styles.content} ${activeMarket ? styles.marketOpen : ''}`}>
        <div className={styles.mapPanel}>
          <div className={styles.mapHeading}>
            <div>
              <p>GLOBAL MARKET RADAR</p>
              <h2 id="globe-showcase-title">全球市场分布</h2>
            </div>
            <span>拖拽旋转 · 滚轮缩放 · 双击进入</span>
          </div>

          <div className={styles.sceneShell} data-testid="globe-stage">
            {renderMode === 'checking' && <GlobeLoading />}
            {renderMode === 'webgl' && (
              <GlobeErrorBoundary onError={useFallback}>
                <GlobeScene
                  focusedMarket={focusedMarket}
                  activeMarket={activeMarket}
                  reducedMotion={reducedMotion}
                  onCountryFocus={handleCountryFocus}
                  onMarketEnter={handleMarketEnter}
                  onFatalError={useFallback}
                />
              </GlobeErrorBoundary>
            )}
            {renderMode === 'fallback' && <StaticMap activeMarket={activeMarket} />}
          </div>

          <div className={styles.mapFooter}>
            <span><i className={styles.legendSelected} /> 已进入区域</span>
            <span><i className={styles.legendCase} /> 已配置市场</span>
            <span><i className={styles.legendBase} /> 其他国家</span>
            <small>
              {focusedCountryName && focusedMarket && activeMarket?.id !== focusedMarket.id
                ? `已选中：${focusedMarket.nameZh} · 双击展开板块汇总数据`
                : reducedMotion
                  ? '已遵循系统“减少动态效果”设置'
                  : '停止操作 5 秒后恢复缓慢自转'}
            </small>
          </div>
        </div>

        <aside
          className={`${styles.insightPanel} ${activeMarket ? styles.marketDrawer : ''}`}
          data-mode={activeMarket ? 'market' : 'todos'}
          aria-label={activeMarket ? `${activeMarket.nameZh}经营数据看板` : '我的待办'}
        >
          {activeMarket ? (
            <>
              <div className={styles.marketPanelHeading}>
                <div>
                  <span>MARKET PERFORMANCE</span>
                  <h2>{activeMarket.nameZh}看板</h2>
                  <p>双击进入后显示该区域经营指标。</p>
                </div>
                <button type="button" onClick={handleReset}>← 我的待办</button>
              </div>
              <DataSourceStatus status={dashboardStatus} dashboard={dashboard} />
              <MarketDashboardCard
                activeCountryName={activeCountryName}
                activeMarket={activeMarket}
                snapshot={snapshot}
                dashboard={dashboard}
                status={dashboardStatus}
                error={dashboardError}
                onRetry={handleRetry}
                onReset={handleReset}
              />
            </>
          ) : (
            <TodoPanel onOpenTodo={onOpenTodo} onEnterMarket={handleSelectorEnter} />
          )}
        </aside>
      </div>

      <p className={styles.screenReaderStatus} aria-live="polite" aria-atomic="true">{liveMessage}</p>
    </section>
  );
}
