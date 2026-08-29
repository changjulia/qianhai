/// <reference types="vite/client" />

const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
type SupportedMethod = (typeof SUPPORTED_METHODS)[number];
type RouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) => Response | Promise<Response>;
type RouteModule = Partial<Record<SupportedMethod, RouteHandler>>;

interface CompiledRoute {
  pathname: string;
  pattern: RegExp;
  parameterNames: Array<{ name: string; catchAll: boolean }>;
  module: RouteModule;
  methods: SupportedMethod[];
  staticSegments: number;
}

const routeModules = import.meta.glob('../app/api/**/route.ts', { eager: true }) as unknown as Record<
  string,
  RouteModule
>;

export function createRoutes(): CompiledRoute[] {
  return Object.entries(routeModules)
    .map(([filename, module]) => compileRoute(filename, module))
    .sort(
      (left, right) =>
        right.staticSegments - left.staticSegments || right.pathname.length - left.pathname.length,
    );
}

export function matchRoute(routes: CompiledRoute[], pathname: string) {
  for (const route of routes) {
    const match = route.pattern.exec(pathname);
    if (!match) continue;
    const params: Record<string, string | string[] | undefined> = {};
    for (const parameter of route.parameterNames) {
      const raw = match.groups?.[parameter.name];
      params[parameter.name] =
        raw === undefined
          ? undefined
          : parameter.catchAll
            ? raw.split('/').map(decodePathPart)
            : decodePathPart(raw);
    }
    return { route, params };
  }
  return null;
}

export function routeHandler(route: CompiledRoute, method: string): RouteHandler | undefined {
  const normalized = method.toUpperCase() as SupportedMethod;
  if (normalized === 'HEAD' && !route.module.HEAD) return route.module.GET;
  return route.module[normalized];
}

export function allowedMethods(route: CompiledRoute): string[] {
  const methods = new Set<string>(route.methods);
  if (methods.has('GET')) methods.add('HEAD');
  methods.add('OPTIONS');
  return [...methods].sort();
}

export function routeSummary(routes: CompiledRoute[]): Array<{ path: string; methods: string[] }> {
  return routes.map((route) => ({ path: route.pathname, methods: allowedMethods(route) }));
}

function compileRoute(filename: string, module: RouteModule): CompiledRoute {
  const normalized = filename.replaceAll('\\', '/');
  const marker = '/app/api/';
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex < 0 || !normalized.endsWith('/route.ts')) {
    throw new Error(`Unexpected route module path: ${filename}`);
  }
  const relative = normalized.slice(markerIndex + marker.length, -'/route.ts'.length);
  const pathname = `/api/${relative}`.replace(/\/$/u, '');
  const segments = pathname.split('/').filter(Boolean);
  const parameterNames: Array<{ name: string; catchAll: boolean }> = [];
  let staticSegments = 0;
  let source = '^';

  for (const segment of segments) {
    const optionalCatchAll = /^\[\[\.\.\.([A-Za-z0-9_]+)\]\]$/u.exec(segment);
    if (optionalCatchAll) {
      parameterNames.push({ name: optionalCatchAll[1], catchAll: true });
      source += `(?:/(?<${optionalCatchAll[1]}>.+))?`;
      continue;
    }
    const catchAll = /^\[\.\.\.([A-Za-z0-9_]+)\]$/u.exec(segment);
    if (catchAll) {
      parameterNames.push({ name: catchAll[1], catchAll: true });
      source += `/(?<${catchAll[1]}>.+)`;
      continue;
    }
    const dynamic = /^\[([A-Za-z0-9_]+)\]$/u.exec(segment);
    if (dynamic) {
      parameterNames.push({ name: dynamic[1], catchAll: false });
      source += `/(?<${dynamic[1]}>[^/]+)`;
      continue;
    }
    staticSegments += 1;
    source += `/${escapeRegExp(segment)}`;
  }
  source += '/?$';

  const methods = SUPPORTED_METHODS.filter((method) => typeof module[method] === 'function');
  return {
    pathname: pathname || '/api',
    pattern: new RegExp(source, 'u'),
    parameterNames,
    module,
    methods,
    staticSegments,
  };
}

function decodePathPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
