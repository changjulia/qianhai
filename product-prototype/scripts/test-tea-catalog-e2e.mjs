import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const baseUrl = process.env.TEA_CATALOG_BASE_URL || 'http://localhost:3103';
const root = process.cwd();
const manifest = JSON.parse(await readFile(join(root, 'public', 'demo', 'tea-media', 'manifest.json'), 'utf8'));

const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(manifest.items.length === 20, `expected 20 media, got ${manifest.items.length}`);
assert(new Set(manifest.items.map((item) => item.id)).size === 20, 'media ids must be unique');
assert(manifest.items.filter((item) => item.kind === 'video').length === 10, 'expected 10 videos');
assert(manifest.items.filter((item) => item.kind === 'image').length === 10, 'expected 10 images');

for (const item of manifest.items) {
  const localFile = join(root, 'public', ...item.localPath.split('/').filter(Boolean));
  const body = await readFile(localFile);
  const hash = createHash('sha256').update(body).digest('hex');
  assert(hash === item.sha256, `sha256 mismatch: ${item.id}`);
  assert(item.sourcePage.startsWith('https://commons.wikimedia.org/wiki/'), `invalid source: ${item.id}`);
  assert(Boolean(item.license), `missing license: ${item.id}`);
}

const catalogResponse = await fetch(`${baseUrl}/api/tea-catalog`);
assert(catalogResponse.ok, `catalog status ${catalogResponse.status}`);
const catalog = await catalogResponse.json();
assert(catalog.summary.total === 35, `catalog total ${catalog.summary.total}`);
assert(catalog.items.length === 35, `catalog returned ${catalog.items.length}`);
assert(catalog.items.every((item) => item.truth_notice), 'every item needs truth_notice');
assert(catalog.items.filter((item) => item.classification === 'open_media').every((item) => item.source_url && item.license_name && item.sha256), 'open media provenance incomplete');
assert(catalog.items.filter((item) => item.classification === 'mock').every((item) => item.truth_notice.startsWith('Mock：')), 'mock disclosure incomplete');

for (const type of ['video', 'image']) {
  const response = await fetch(`${baseUrl}/api/tea-catalog?type=${type}`);
  assert(response.ok, `${type} filter status ${response.status}`);
  const payload = await response.json();
  assert(payload.items.length === 10, `${type} filter count ${payload.items.length}`);
  assert(payload.items.every((item) => item.item_type === type), `${type} filter leaked another type`);
}

const invalid = await fetch(`${baseUrl}/api/tea-catalog?type=tyre`);
assert(invalid.status === 400, `invalid filter status ${invalid.status}`);

for (const item of manifest.items) {
  const response = await fetch(`${baseUrl}${item.localPath}`, { method: 'HEAD' });
  assert(response.ok, `media HTTP ${response.status}: ${item.id}`);
  assert((response.headers.get('content-type') || '').startsWith(`${item.kind}/`), `media content type: ${item.id}`);
  assert(Number(response.headers.get('content-length')) === item.downloadedBytes, `media length: ${item.id}`);
}

process.stdout.write(JSON.stringify({
  ok: true,
  catalogItems: catalog.items.length,
  videos: 10,
  images: 10,
  mockItems: 15,
  mediaHashesVerified: 20,
  mediaHttpVerified: 20,
}, null, 2));
