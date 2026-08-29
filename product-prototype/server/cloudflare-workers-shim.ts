/**
 * Minimal `cloudflare:workers` runtime shim for the Tencent Cloud Node build.
 *
 * Vite aliases `cloudflare:workers` to this module in the backend-only bundle.
 * Existing route handlers can therefore keep reading `env.DB` and string
 * bindings without carrying a Cloudflare runtime into production.
 */
const runtimeBindings: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

export const env = new Proxy(runtimeBindings, {
  get(target, property) {
    if (typeof property !== 'string') return Reflect.get(target, property);
    if (Object.prototype.hasOwnProperty.call(target, property)) return target[property];
    return process.env[property];
  },
  has(target, property) {
    if (Reflect.has(target, property)) return true;
    return typeof property === 'string' && process.env[property] !== undefined;
  },
});

export function installRuntimeBindings(bindings: Record<string, unknown>): void {
  Object.assign(runtimeBindings, bindings);
}

