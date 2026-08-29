'use client';

import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { BUSINESS_NODES, type BusinessNode } from './home-globe-business';
import type { GlobeSceneProps } from './globe-scene';
import styles from './home-globe-showcase.module.css';

const GlobeScene = dynamic<GlobeSceneProps>(() => import('./globe-scene'), {
  ssr: false,
  loading: () => <GlobeLoading />,
});

export type HomeTodoDestination = 'projects' | 'agents';
type RenderMode = 'checking' | 'webgl' | 'fallback';

class GlobeErrorBoundary extends Component<{
  children: ReactNode;
  onError: () => void;
}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The interactive globe could not be rendered.', error, info);
    this.props.onError();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

function GlobeLoading() {
  return <div className={styles.loading} role="status"><i /><strong>正在载入实时地球</strong><small>读取本地夜景纹理与业务线路…</small></div>;
}

function StaticGlobe() {
  return (
    <div className={styles.staticGlobe} role="img" aria-label="亚洲与东南亚静态地球备用画面">
      <div className={styles.staticSphere} />
      <div className={styles.staticRoute} />
      <span className={styles.staticOrigin}>贵州</span>
      <span className={styles.staticMarket}>马来西亚</span>
      <p>当前设备未启用 WebGL，已显示轻量备用画面。</p>
    </div>
  );
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reducedMotion;
}

function canUseWebGl() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
      ?? canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export default function HomeGlobeShowcase({ onOpenTodo }: { onOpenTodo: (destination: HomeTodoDestination) => void }) {
  const reducedMotion = useReducedMotion();
  const [renderMode, setRenderMode] = useState<RenderMode>('checking');
  const [selectedNode, setSelectedNode] = useState<BusinessNode | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setRenderMode(canUseWebGl() ? 'webgl' : 'fallback'));
    return () => cancelAnimationFrame(frame);
  }, []);

  const useFallback = useCallback(() => setRenderMode('fallback'), []);

  return (
    <section className={styles.hero} data-testid="home-globe-showcase">
      <div className={styles.stars} aria-hidden="true" />
      <div className={styles.copy}>
        <span className={styles.eyebrow}><i />AI × 广电｜产业出海社媒数字员工</span>
        <h1>让数字员工持续<br />经营海外社媒</h1>
        <p>从贵州出发，让每一次内容传播都能追溯到客户结果。</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => onOpenTodo('projects')}>进入增长控制塔 <span>→</span></button>
          <button type="button" className={styles.secondary} onClick={() => onOpenTodo('agents')}>查看运行链路</button>
        </div>
        <div className={styles.disclosure}>
          <b>模拟运行</b>
          <span>当前节点、客户信号与线路均为贵州抹茶出海演示，不代表真实经营成果。</span>
        </div>
        <div className={styles.legend} aria-label="线路颜色说明">
          <span><i className={styles.blue} />内容传播</span>
          <span><i className={styles.white} />客户信号回传</span>
          <span><i className={styles.orange} />人工接管</span>
        </div>
      </div>

      <div className={styles.visual}>
        <div className={styles.visualHeader}>
          <span>LIVE BUSINESS PATH</span>
          <small>拖拽旋转 · 滚轮缩放 · 点击节点聚焦</small>
        </div>
        <div className={styles.globeFrame}>
          {renderMode === 'webgl' ? (
            <GlobeErrorBoundary onError={useFallback}>
              <GlobeScene
                reducedMotion={reducedMotion}
                selectedNodeId={selectedNode?.id ?? null}
                onNodeSelect={setSelectedNode}
                onFatalError={useFallback}
              />
            </GlobeErrorBoundary>
          ) : renderMode === 'fallback' ? <StaticGlobe /> : <GlobeLoading />}
        </div>

        <div className={styles.nodeRail} aria-label="业务节点快捷入口">
          {BUSINESS_NODES.filter((node) => ['guizhou', 'linkedin', 'kuala-lumpur', 'importer-signal', 'human-handoff'].includes(node.id)).map((node) => (
            <button key={node.id} type="button" className={selectedNode?.id === node.id ? styles.activeNode : undefined} onClick={() => setSelectedNode(node)}>
              <i data-tone={node.tone} />{node.shortName}
            </button>
          ))}
        </div>

        {selectedNode && (
          <article className={styles.infoPanel} aria-live="polite">
            <button type="button" aria-label="关闭节点说明" onClick={() => setSelectedNode(null)}>×</button>
            <span>{selectedNode.stage}</span>
            <h2>{selectedNode.name}</h2>
            <strong>{selectedNode.status}</strong>
            <p>{selectedNode.description}</p>
            <small>演示说明：该节点仅用于说明黔海的业务链路和人工边界。</small>
          </article>
        )}
      </div>
    </section>
  );
}
