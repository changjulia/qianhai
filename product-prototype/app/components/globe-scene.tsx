'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import {
  BUSINESS_ARCS,
  BUSINESS_NODE_BY_ID,
  BUSINESS_NODES,
  type BusinessArc,
  type BusinessNode,
} from './home-globe-business';
import { isGlobeFeature, type GlobeFeature } from './home-globe-data';

export type GlobeSceneProps = {
  reducedMotion: boolean;
  selectedNodeId: string | null;
  onNodeSelect: (node: BusinessNode) => void;
  onFatalError: () => void;
};

type SceneArc = BusinessArc & { startLat: number; startLng: number; endLat: number; endLng: number };
type Size = { width: number; height: number };

function parseWorldData(value: unknown): GlobeFeature[] {
  if (!value || typeof value !== 'object' || !('features' in value)) return [];
  const features = (value as { features?: unknown }).features;
  return Array.isArray(features) ? features.filter(isGlobeFeature) : [];
}

function nodeColor(node: BusinessNode) {
  if (node.tone === 'orange') return '#ff9b54';
  if (node.tone === 'white') return '#fff4d6';
  return '#52b8ff';
}

function arcColor(arc: SceneArc) {
  if (arc.type === 'handoff') return ['rgba(255,122,55,.12)', '#ff8b47', '#ffd0a8'];
  if (arc.type === 'signal') return ['rgba(255,245,220,.08)', '#fff0ca', '#ffffff'];
  return ['rgba(36,128,255,.08)', '#238cff', '#8bd9ff'];
}

export default function GlobeScene({ reducedMotion, selectedNodeId, onNodeSelect, onFatalError }: GlobeSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [size, setSize] = useState<Size>({ width: 760, height: 620 });
  const [features, setFeatures] = useState<GlobeFeature[]>([]);
  const [ready, setReady] = useState(false);
  const [introStep, setIntroStep] = useState(reducedMotion ? 5 : 0);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [inViewport, setInViewport] = useState(true);
  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const compact = size.width < 620;
  const sceneActive = visible && inViewport;

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
  }, []);

  const resumeLater = useCallback(() => {
    clearResumeTimer();
    if (reducedMotion) return;
    resumeTimerRef.current = setTimeout(() => setAutoRotate(true), 5200);
  }, [clearResumeTimer, reducedMotion]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/world.geojson', { cache: 'force-cache', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`world.geojson returned ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const parsed = parseWorldData(value);
        if (!parsed.length) throw new Error('world.geojson contains no polygon features');
        setFeatures(parsed);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Unable to load local country boundaries.', error);
        onFatalError();
      });
    return () => controller.abort();
  }, [onFatalError]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const rect = host.getBoundingClientRect();
      setSize({ width: Math.max(300, Math.round(rect.width)), height: Math.max(400, Math.round(rect.height)) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry.isIntersecting), { threshold: 0.02 });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      const frame = requestAnimationFrame(() => setIntroStep(5));
      return () => cancelAnimationFrame(frame);
    }
    const frame = requestAnimationFrame(() => {
      setIntroStep(0);
      introTimerRef.current = setInterval(() => {
        setIntroStep((step) => {
          if (step >= 5) {
            if (introTimerRef.current) clearInterval(introTimerRef.current);
            introTimerRef.current = null;
            return 5;
          }
          return step + 1;
        });
      }, 1050);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (introTimerRef.current) clearInterval(introTimerRef.current);
      introTimerRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => () => clearResumeTimer(), [clearResumeTimer]);

  useEffect(() => {
    if (!ready || !globeRef.current) return;
    const globe = globeRef.current;
    const controls = globe.controls();
    controls.autoRotate = sceneActive && autoRotate && !reducedMotion;
    if (sceneActive) globe.resumeAnimation();
    else globe.pauseAnimation();
  }, [autoRotate, ready, reducedMotion, sceneActive]);

  useEffect(() => {
    if (!ready || !globeRef.current) return;
    const controls = globeRef.current.controls();
    const start = () => {
      clearResumeTimer();
      setAutoRotate(false);
      controls.autoRotate = false;
    };
    const end = () => resumeLater();
    controls.addEventListener('start', start);
    controls.addEventListener('end', end);
    return () => {
      controls.removeEventListener('start', start);
      controls.removeEventListener('end', end);
    };
  }, [clearResumeTimer, ready, resumeLater]);

  useEffect(() => {
    const node = selectedNodeId ? BUSINESS_NODE_BY_ID.get(selectedNodeId) : null;
    const focus = () => globeRef.current?.pointOfView(
      node
        ? { lat: node.lat, lng: node.lng, altitude: compact ? 1.85 : 1.55 }
        : { lat: 18, lng: 105, altitude: compact ? 2.18 : 1.95 },
      node && !reducedMotion ? 950 : 0,
    );
    const frame = requestAnimationFrame(focus);
    const retry = setTimeout(focus, 650);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(retry);
    };
  }, [compact, reducedMotion, selectedNodeId]);

  const visibleNodes = useMemo(
    () => BUSINESS_NODES.filter((node) => reducedMotion || node.introStep <= introStep),
    [introStep, reducedMotion],
  );

  const visibleArcs = useMemo<SceneArc[]>(() => BUSINESS_ARCS
    .filter((arc) => reducedMotion || arc.introStep <= introStep)
    .flatMap((arc) => {
      const from = BUSINESS_NODE_BY_ID.get(arc.from);
      const to = BUSINESS_NODE_BY_ID.get(arc.to);
      return from && to ? [{ ...arc, startLat: from.lat, startLng: from.lng, endLat: to.lat, endLng: to.lng }] : [];
    }), [introStep, reducedMotion]);

  const labels = useMemo(() => visibleNodes.filter((node) => {
    if (node.id === selectedNodeId || node.id === hoveredNodeId) return true;
    if (compact) return node.id === 'guizhou' || node.id === 'kuala-lumpur' || node.id === 'human-handoff';
    return node.alwaysLabel;
  }), [compact, hoveredNodeId, selectedNodeId, visibleNodes]);

  const focusNode = useCallback((node: BusinessNode) => {
    setAutoRotate(false);
    onNodeSelect(node);
    globeRef.current?.pointOfView({ lat: node.lat, lng: node.lng, altitude: compact ? 1.85 : 1.55 }, reducedMotion ? 0 : 1050);
    resumeLater();
  }, [compact, onNodeSelect, reducedMotion, resumeLater]);

  const handleReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.28;
    controls.zoomSpeed = 0.52;
    controls.autoRotateSpeed = 0.16;
    controls.minDistance = 122;
    controls.maxDistance = 410;
    const renderer = globe.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.15 : 1.55));
    renderer.setClearColor('#02060d', 0);
    globe.pointOfView({ lat: 18, lng: 105, altitude: compact ? 2.18 : 1.95 }, 0);
    setReady(true);
  }, [compact]);

  return (
    <div ref={hostRef} data-ready={ready} data-scene-step={introStep}>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        rendererConfig={{ alpha: true, antialias: !compact, powerPreference: 'high-performance' }}
        globeImageUrl="/earth-at-night-2048.png"
        showGlobe
        showAtmosphere
        atmosphereColor="#2d91ff"
        atmosphereAltitude={0.18}
        showGraticules={!compact}
        animateIn={false}
        polygonsData={features}
        polygonAltitude={0.003}
        polygonCapColor={() => 'rgba(4,12,24,.07)'}
        polygonSideColor={() => 'rgba(8,24,48,.14)'}
        polygonStrokeColor={() => 'rgba(140,184,225,.28)'}
        polygonsTransitionDuration={0}
        pointsData={visibleNodes}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={(value) => (value as BusinessNode).id === selectedNodeId ? 0.075 : 0.035}
        pointRadius={(value) => (value as BusinessNode).id === selectedNodeId ? 0.34 : 0.2}
        pointColor={(value) => nodeColor(value as BusinessNode)}
        pointLabel={(value) => {
          const node = value as BusinessNode;
          return `<div style="background:rgba(2,7,14,.9);border:1px solid rgba(139,193,255,.28);border-radius:8px;padding:8px 10px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.36)"><strong>${node.name}</strong><br/><span style="color:#9db1c8;font-size:11px">${node.status}</span></div>`;
        }}
        pointsTransitionDuration={reducedMotion ? 0 : 500}
        onPointHover={(value) => setHoveredNodeId(value ? (value as BusinessNode).id : null)}
        onPointClick={(value) => focusNode(value as BusinessNode)}
        ringsData={visibleNodes.filter((node) => node.id === selectedNodeId || node.introStep === introStep)}
        ringLat="lat"
        ringLng="lng"
        ringAltitude={0.04}
        ringColor={(value: object) => {
          const color = nodeColor(value as BusinessNode);
          return [`${color}bb`, `${color}00`];
        }}
        ringMaxRadius={compact ? 1.4 : 1.9}
        ringPropagationSpeed={reducedMotion ? 0 : 1.45}
        ringRepeatPeriod={reducedMotion ? 0 : 1500}
        arcsData={visibleArcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={(value: object) => arcColor(value as SceneArc)}
        arcAltitudeAutoScale={0.32}
        arcStroke={(value) => (value as SceneArc).type === 'handoff' ? 0.62 : 0.42}
        arcDashLength={reducedMotion ? 1 : 0.52}
        arcDashGap={reducedMotion ? 0 : 0.14}
        arcDashInitialGap={() => Math.random()}
        arcDashAnimateTime={reducedMotion ? 0 : 3100}
        arcsTransitionDuration={reducedMotion ? 0 : 650}
        labelsData={labels}
        labelLat="lat"
        labelLng="lng"
        labelText="shortName"
        labelColor={(value) => nodeColor(value as BusinessNode)}
        labelAltitude={0.055}
        labelSize={(value) => (value as BusinessNode).id === selectedNodeId ? 0.64 : 0.43}
        labelDotRadius={0.12}
        labelIncludeDot
        labelsTransitionDuration={reducedMotion ? 0 : 350}
        onLabelHover={(value) => setHoveredNodeId(value ? (value as BusinessNode).id : null)}
        onLabelClick={(value) => focusNode(value as BusinessNode)}
        enablePointerInteraction
        showPointerCursor
        onGlobeReady={handleReady}
      />
      {features.length === 0 && <div role="status">正在载入实时地球…</div>}
    </div>
  );
}
