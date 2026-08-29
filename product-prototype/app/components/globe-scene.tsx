'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { MeshBasicMaterial } from 'three';
import {
  GUIZHOU_ORIGIN,
  MARKET_REGIONS,
  marketForCountry,
  type GlobeFeature,
  type MarketRegion,
  isGlobeFeature,
} from './home-globe-data';

export type GlobeSceneProps = {
  focusedMarket: MarketRegion | null;
  activeMarket: MarketRegion | null;
  reducedMotion: boolean;
  onCountryFocus: (countryName: string, market: MarketRegion | null) => void;
  onMarketEnter: (countryName: string, market: MarketRegion | null) => void;
  onFatalError: () => void;
};

type Size = {
  width: number;
  height: number;
};

type ArcDatum = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};

type PointDatum = MarketRegion & {
  active: boolean;
};

type LabelDatum = {
  lat: number;
  lng: number;
  text: string;
  active: boolean;
};

function getCountryName(value: object | null): string | null {
  if (!value || !('properties' in value)) return null;

  const properties = (value as { properties?: unknown }).properties;
  if (!properties || typeof properties !== 'object' || !('name' in properties)) return null;

  const name = (properties as { name?: unknown }).name;
  return typeof name === 'string' ? name : null;
}

function parseWorldData(value: unknown): GlobeFeature[] {
  if (!value || typeof value !== 'object' || !('features' in value)) return [];

  const features = (value as { features?: unknown }).features;
  return Array.isArray(features) ? features.filter(isGlobeFeature) : [];
}

export default function GlobeScene({
  focusedMarket,
  activeMarket,
  reducedMotion,
  onCountryFocus,
  onMarketEnter,
  onFatalError,
}: GlobeSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCountryClickRef = useRef<{ countryName: string; at: number } | null>(null);
  const previousMarketIdRef = useRef<string | null>(null);
  const [size, setSize] = useState<Size>({ width: 720, height: 430 });
  const [features, setFeatures] = useState<GlobeFeature[]>([]);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [autoRotateAllowed, setAutoRotateAllowed] = useState(true);

  const oceanMaterial = useMemo(() => new MeshBasicMaterial({
    color: '#10294c',
    transparent: false,
  }), []);

  const clearResumeTimer = useCallback(() => {
    if (!resumeTimerRef.current) return;
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
  }, []);

  const queueAutoRotate = useCallback(() => {
    clearResumeTimer();
    if (reducedMotion) return;
    resumeTimerRef.current = setTimeout(() => {
      setAutoRotateAllowed(true);
      resumeTimerRef.current = null;
    }, 5000);
  }, [clearResumeTimer, reducedMotion]);

  useEffect(() => () => {
    clearResumeTimer();
    oceanMaterial.dispose();
  }, [clearResumeTimer, oceanMaterial]);

  useEffect(() => {
    const controller = new AbortController();

    void fetch('/world.geojson', {
      cache: 'force-cache',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`world.geojson returned ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        const parsedFeatures = parseWorldData(data);
        if (parsedFeatures.length === 0) throw new Error('world.geojson contains no valid polygon features');
        setFeatures(parsedFeatures);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Unable to load the local globe geometry.', error);
        onFatalError();
      });

    return () => controller.abort();
  }, [onFatalError]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const bounds = host.getBoundingClientRect();
      const nextSize = {
        width: Math.max(280, Math.round(bounds.width)),
        height: Math.max(320, Math.round(bounds.height)),
      };
      setSize((current) => current.width === nextSize.width && current.height === nextSize.height
        ? current
        : nextSize);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting && entry.intersectionRatio > 0),
      { threshold: [0, 0.02] },
    );
    observer.observe(host);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(document.visibilityState !== 'hidden');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  const sceneActive = isIntersecting && documentVisible;
  const visibleSelectedCountry = focusedMarket || activeMarket ? selectedCountry : null;

  useEffect(() => {
    if (!globeReady || !globeRef.current) return;

    const globe = globeRef.current;
    const controls = globe.controls();
    controls.autoRotate = sceneActive && autoRotateAllowed && !reducedMotion;

    if (sceneActive) globe.resumeAnimation();
    else globe.pauseAnimation();
  }, [autoRotateAllowed, globeReady, reducedMotion, sceneActive]);

  useEffect(() => {
    if (!globeReady || !globeRef.current) return;

    const controls = globeRef.current.controls();
    const handleStart = () => {
      clearResumeTimer();
      setAutoRotateAllowed(false);
      controls.autoRotate = false;
    };
    const handleEnd = () => queueAutoRotate();

    controls.addEventListener('start', handleStart);
    controls.addEventListener('end', handleEnd);

    return () => {
      controls.removeEventListener('start', handleStart);
      controls.removeEventListener('end', handleEnd);
    };
  }, [clearResumeTimer, globeReady, queueAutoRotate]);

  useEffect(() => {
    if (!globeReady || !globeRef.current) return;

    const previousMarketId = previousMarketIdRef.current;
    previousMarketIdRef.current = activeMarket?.id ?? null;
    if (!activeMarket) {
      if (previousMarketId) {
        globeRef.current.pointOfView(
          { lat: 18, lng: 84, altitude: 2.32 },
          reducedMotion ? 0 : 720,
        );
        queueAutoRotate();
      }
      return;
    }

    const frame = window.requestAnimationFrame(() => setAutoRotateAllowed(false));
    globeRef.current.pointOfView(
      { lat: activeMarket.lat, lng: activeMarket.lng, altitude: 1.48 },
      reducedMotion ? 0 : 1120,
    );
    queueAutoRotate();
    return () => window.cancelAnimationFrame(frame);
  }, [activeMarket, globeReady, queueAutoRotate, reducedMotion]);

  const pointsData = useMemo<PointDatum[]>(() => MARKET_REGIONS.map((item) => ({
    ...item,
    active: item.id === activeMarket?.id,
  })), [activeMarket?.id]);

  const labelsData = useMemo<LabelDatum[]>(() => {
    const labels: LabelDatum[] = [{
      lat: GUIZHOU_ORIGIN.lat,
      lng: GUIZHOU_ORIGIN.lng,
      text: '贵州 · 增长起点',
      active: false,
    }];

    if (activeMarket) {
      labels.push({
        lat: activeMarket.lat,
        lng: activeMarket.lng,
        text: activeMarket.nameZh,
        active: true,
      });
    }

    return labels;
  }, [activeMarket]);

  const arcsData = useMemo<ArcDatum[]>(() => activeMarket ? [{
    startLat: GUIZHOU_ORIGIN.lat,
    startLng: GUIZHOU_ORIGIN.lng,
    endLat: activeMarket.lat,
    endLng: activeMarket.lng,
  }] : [], [activeMarket]);

  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls();
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.rotateSpeed = 0.38;
    controls.zoomSpeed = 0.58;
    controls.autoRotateSpeed = 0.24;
    controls.minDistance = 125;
    controls.maxDistance = 430;
    const renderer = globe.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setClearColor('#071b3b', 1);
    globe.pointOfView({ lat: 18, lng: 84, altitude: 2.32 }, 0);
    setGlobeReady(true);
  }, []);

  const handlePolygonClick = useCallback((
    polygon: object,
    event: MouseEvent,
    coords: { lat: number; lng: number },
  ) => {
    const countryName = getCountryName(polygon);
    if (!countryName) return;
    const market = marketForCountry(countryName);
    const clickedAt = Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now();
    const clickTarget = market?.id ?? countryName;
    const previousClick = lastCountryClickRef.current;
    const isDoubleClick = event.detail >= 2 || (
      previousClick?.countryName === clickTarget
      && clickedAt - previousClick.at < 520
    );

    clearResumeTimer();
    setAutoRotateAllowed(false);
    setHoveredCountry(null);

    if (isDoubleClick) {
      lastCountryClickRef.current = null;
      setSelectedCountry(countryName);
      onMarketEnter(market?.nameZh ?? countryName, market);
      globeRef.current?.pointOfView(
        {
          lat: market?.lat ?? coords.lat,
          lng: market?.lng ?? coords.lng,
          altitude: market ? 1.48 : 1.62,
        },
        reducedMotion ? 0 : 1200,
      );
      queueAutoRotate();
      return;
    }

    lastCountryClickRef.current = { countryName: clickTarget, at: clickedAt };
    setSelectedCountry(countryName);
    // Keep the country under the pointer after the first click. Moving the
    // camera here makes the second click miss and turns a double-click into
    // an accidental orbit. This mirrors the source map's select-then-enter
    // interaction.
    onCountryFocus(market?.nameZh ?? countryName, market);
    queueAutoRotate();
  }, [clearResumeTimer, onCountryFocus, onMarketEnter, queueAutoRotate, reducedMotion]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-hovered-country={hoveredCountry ?? ''}
      data-selected-country={visibleSelectedCountry ?? ''}
      style={{ cursor: hoveredCountry ? 'pointer' : 'grab' }}
    >
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="#071b3b"
        rendererConfig={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        globeMaterial={oceanMaterial}
        showGlobe
        showGraticules
        showAtmosphere={false}
        animateIn={!reducedMotion}
        polygonsData={features}
        polygonAltitude={(polygon) => {
          const countryName = getCountryName(polygon);
          const market = countryName ? marketForCountry(countryName) : null;
          if (countryName === hoveredCountry) return 0.009;
          if (countryName === visibleSelectedCountry) return 0.018;
          if (market?.id === activeMarket?.id) return 0.009;
          if (market?.id === focusedMarket?.id) return 0.006;
          return 0.002;
        }}
        polygonCapColor={(polygon) => {
          const countryName = getCountryName(polygon);
          const market = countryName ? marketForCountry(countryName) : null;
          if (countryName === hoveredCountry) return '#78f0d8';
          if (countryName === visibleSelectedCountry && market?.id === activeMarket?.id) return '#5de3e5';
          if (countryName === visibleSelectedCountry) return '#39d8b4';
          if (market?.id === activeMarket?.id) return 'rgba(23, 105, 224, 0.82)';
          if (market?.id === focusedMarket?.id) return 'rgba(44, 201, 165, 0.58)';
          if (market) return 'rgba(40, 199, 222, 0.66)';
          return 'rgba(78, 127, 181, 0.54)';
        }}
        polygonSideColor={(polygon) => {
          const countryName = getCountryName(polygon);
          const market = countryName ? marketForCountry(countryName) : null;
          if (countryName === hoveredCountry) return '#0a8f86';
          if (countryName === visibleSelectedCountry) return '#087f8f';
          if (market?.id === activeMarket?.id) return '#0a3f8a';
          if (market?.id === focusedMarket?.id) return '#086c72';
          return 'rgba(7, 35, 72, 0.92)';
        }}
        polygonStrokeColor={() => 'rgba(180, 224, 255, 0.42)'}
        polygonLabel={(polygon) => {
          const countryName = getCountryName(polygon);
          if (!countryName) return '';
          const market = marketForCountry(countryName);
          return market
            ? `<strong>${market.nameZh}</strong><br/><span>${market.countriesZh}</span><br/><span>单击选中板块 · 双击展开板块数据</span>`
            : `<strong>${countryName}</strong><br/><span>该国家暂未配置市场数据</span>`;
        }}
        polygonsTransitionDuration={reducedMotion ? 0 : 450}
        onPolygonHover={(polygon) => setHoveredCountry(getCountryName(polygon))}
        onPolygonClick={(polygon, event, coords) => handlePolygonClick(polygon, event, coords)}
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={(point) => (point as PointDatum).active ? 0.09 : 0.025}
        pointRadius={(point) => (point as PointDatum).active ? 0.45 : 0.24}
        pointColor={(point) => (point as PointDatum).active ? '#ffffff' : '#5de3e5'}
        pointLabel={(point) => (point as PointDatum).nameZh}
        pointsTransitionDuration={reducedMotion ? 0 : 450}
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={() => ['rgba(93, 227, 229, 0.2)', '#5de3e5', '#ffffff']}
        arcAltitudeAutoScale={0.32}
        arcStroke={0.7}
        arcDashLength={reducedMotion ? 1 : 0.42}
        arcDashGap={reducedMotion ? 0 : 1.15}
        arcDashAnimateTime={reducedMotion ? 0 : 2600}
        arcsTransitionDuration={reducedMotion ? 0 : 600}
        ringsData={activeMarket ? [activeMarket] : []}
        ringLat="lat"
        ringLng="lng"
        ringAltitude={0.07}
        ringColor={() => ['rgba(93,227,229,0.65)', 'rgba(93,227,229,0)']}
        ringMaxRadius={2.2}
        ringPropagationSpeed={reducedMotion ? 0 : 2.2}
        ringRepeatPeriod={reducedMotion ? 0 : 1150}
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelColor={(label) => (label as LabelDatum).active ? '#ffffff' : '#84dfe6'}
        labelAltitude={(label) => (label as LabelDatum).active ? 0.105 : 0.035}
        labelSize={(label) => (label as LabelDatum).active ? 0.72 : 0.48}
        labelDotRadius={0.18}
        labelIncludeDot
        labelsTransitionDuration={reducedMotion ? 0 : 450}
        enablePointerInteraction
        showPointerCursor
        onGlobeReady={handleGlobeReady}
      />
      {(!globeReady || features.length === 0) && (
        <div role="status">正在构建可交互地球…</div>
      )}
    </div>
  );
}
