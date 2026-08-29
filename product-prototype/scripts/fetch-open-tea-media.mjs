import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const API = 'https://commons.wikimedia.org/w/api.php';
const outputDir = join(process.cwd(), 'public', 'demo', 'tea-media');

const curated = [
  { id: 'video-tea-picking-nuwara', kind: 'video', title: 'File:Tea picking in Nuwara Eliya VID-20221103-WA0015.webm', category: '鲜叶采摘', scope: 'industry_reference' },
  { id: 'video-driving-assam-estate', kind: 'video', title: 'File:Driving through tea estate, Kinsukia, Assam, India.webm', category: '茶园环境', scope: 'industry_reference' },
  { id: 'video-dibrugarh-estates', kind: 'video', title: 'File:Tea estates, Dibrugarh district, Assam.webm', category: '茶园环境', scope: 'industry_reference' },
  { id: 'video-assam-garden', kind: 'video', title: 'File:Tea garden Assam India.webm', category: '茶园环境', scope: 'industry_reference' },
  { id: 'video-jalpaiguri-garden', kind: 'video', title: 'File:Tea Garden view near Jalpaiguri, North West Bengal.webm', category: '茶园环境', scope: 'industry_reference' },
  { id: 'video-tea-leaf-process', kind: 'video', title: 'File:Coffee Bean & Tea Leaf Process.webm', category: '加工流程', scope: 'industry_reference' },
  { id: 'video-matcha-latte', kind: 'video', title: 'File:Matcha latte whisking.webm', category: '消费应用', scope: 'industry_reference' },
  { id: 'video-moroccan-tea', kind: 'video', title: 'File:How Nomads prepare Moroccan tea.webm', category: '消费文化', scope: 'industry_reference' },
  { id: 'video-oodaleah-estate', kind: 'video', title: 'File:Oodaleah Tea Estate.webm', category: '茶园环境', scope: 'industry_reference' },
  { id: 'video-uganda-plantation', kind: 'video', title: 'File:A closeup on the tea plantation in Western Uganda.webm', category: '茶树近景', scope: 'industry_reference' },
  { id: 'image-duyun-tea-farm-01', kind: 'image', title: 'File:都匀牛场茶场 - panoramio.jpg', category: '贵州茶园', scope: 'guizhou_location' },
  { id: 'image-duyun-tea-farm-02', kind: 'image', title: 'File:都匀牛场茶场 - panoramio (1).jpg', category: '贵州茶园', scope: 'guizhou_location' },
  { id: 'image-duyun-tea-farm-03', kind: 'image', title: 'File:都匀牛场茶场 - panoramio (2).jpg', category: '贵州茶园', scope: 'guizhou_location' },
  { id: 'image-wuyishan-plantation', kind: 'image', title: 'File:China Wuyishan Tea Plantation.jpg', category: '中国茶园', scope: 'industry_reference' },
  { id: 'image-dragon-well-plantation', kind: 'image', title: 'File:Dragon Well Tea Plantation (25876276577).jpg', category: '中国茶园', scope: 'industry_reference' },
  { id: 'image-tea-fields-buddhist', kind: 'image', title: 'File:Tea fields in front of Buddhist symbols.jpg', category: '茶园景观', scope: 'industry_reference' },
  { id: 'image-china-tea-fields', kind: 'image', title: 'File:Fields of tea.jpg', category: '中国茶园', scope: 'industry_reference' },
  { id: 'image-tea-grower-hangzhou', kind: 'image', title: 'File:Tea-grower-hangzhou.jpg', category: '采茶人物', scope: 'industry_reference' },
  { id: 'image-tea-processing-diagram', kind: 'image', title: 'File:TeaprocessingZh-small.png', category: '加工知识图', scope: 'industry_reference' },
  { id: 'image-bi-luochun', kind: 'image', title: 'File:Bi Luochun.jpg', category: '茶叶产品', scope: 'industry_reference' },
];

const stripHtml = (value = '') => value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function fetchWithRetry(url, options, label) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    let response;
    try {
      response = await fetch(url, { ...options, signal: AbortSignal.timeout(45_000) });
    } catch (error) {
      if (attempt === 5) throw new Error(`${label} network timeout`, { cause: error });
      await wait(attempt * 5000);
      continue;
    }
    if (response.ok) return response;
    if (![429, 502, 503, 504].includes(response.status) || attempt === 5) {
      throw new Error(`${label} ${response.status}`);
    }
    const retryAfter = Number(response.headers.get('retry-after'));
    await wait(Number.isFinite(retryAfter) ? retryAfter * 1000 : attempt * 5000);
  }
  throw new Error(`${label} retry exhausted`);
}
const safeFileName = (id, url, mime) => {
  const urlName = basename(new URL(url).pathname);
  const extension = urlName.includes('.') ? urlName.slice(urlName.lastIndexOf('.')).toLowerCase() : mime === 'video/webm' ? '.webm' : '.jpg';
  return `${id}${extension}`;
};

async function fetchMetadata(item) {
  const params = new URLSearchParams({
    action: 'query', prop: 'imageinfo', titles: item.title, format: 'json', origin: '*',
    iiprop: 'url|mime|size|sha1|extmetadata', iiurlwidth: '1600',
  });
  const response = await fetchWithRetry(`${API}?${params}`, { headers: { 'User-Agent': 'QianhaiTeaDemo/1.0 (local demo dataset)' } }, `metadata: ${item.title}`);
  const payload = await response.json();
  const page = Object.values(payload.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.url) throw new Error(`missing media: ${item.title}`);
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  if (!license || /fair use|copyrighted free use/i.test(license)) throw new Error(`unsupported license ${license}: ${item.title}`);
  return {
    ...item,
    commonsTitle: page.title,
    sourcePage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`,
    downloadUrl: item.kind === 'image' && info.thumburl ? info.thumburl : info.url,
    originalUrl: info.url,
    mimeType: item.kind === 'image' && info.thumbmime ? info.thumbmime : info.mime,
    originalBytes: info.size,
    width: info.width ?? null,
    height: info.height ?? null,
    author: stripHtml(meta.Artist?.value) || 'Wikimedia Commons contributor',
    license,
    licenseUrl: meta.LicenseUrl?.value || 'https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia',
    description: stripHtml(meta.ImageDescription?.value || meta.ObjectName?.value || page.title),
    capturedAt: stripHtml(meta.DateTimeOriginal?.value || meta.DateTime?.value || ''),
    attributionRequired: !/public domain|CC0/i.test(license),
  };
}

async function download(item) {
  const fileName = safeFileName(item.id, item.downloadUrl, item.mimeType);
  const filePath = join(outputDir, fileName);
  let shouldDownload = true;
  try { shouldDownload = (await stat(filePath)).size === 0; } catch {}
  if (shouldDownload) {
    const response = await fetchWithRetry(item.downloadUrl, { headers: { 'User-Agent': 'QianhaiTeaDemo/1.0 (local demo dataset)' } }, `download: ${item.commonsTitle}`);
    if (!response.body) throw new Error(`download body missing: ${item.commonsTitle}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(filePath));
  }
  const body = await readFile(filePath);
  return {
    ...item,
    localPath: `/demo/tea-media/${fileName}`,
    downloadedBytes: body.byteLength,
    sha256: createHash('sha256').update(body).digest('hex'),
    downloadedAt: new Date().toISOString(),
    verificationStatus: 'downloaded_and_hashed',
    truthNotice: item.scope === 'guizhou_location'
      ? '开放许可的贵州都匀实拍，可按署名许可用作地点素材。'
      : '开放许可的茶行业通用参考，不代表贵州本地、当前企业或其生产能力。',
  };
}

await mkdir(outputDir, { recursive: true });
const manifest = [];
for (const [index, item] of curated.entries()) {
  const metadata = await fetchMetadata(item);
  const downloaded = await download(metadata);
  manifest.push(downloaded);
  process.stdout.write(`[${index + 1}/${curated.length}] ${downloaded.id} ${(downloaded.downloadedBytes / 1024 / 1024).toFixed(1)} MB\n`);
}
await writeFile(join(outputDir, 'manifest.json'), `${JSON.stringify({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: 'Wikimedia Commons API',
  disclosure: '媒体文件为开放许可真实素材；除都匀牛场茶场三图外，其余仅为茶行业通用参考，不代表贵州本地或Demo企业。',
  items: manifest,
}, null, 2)}\n`, 'utf8');
process.stdout.write(`manifest: ${join(outputDir, 'manifest.json')}\n`);
