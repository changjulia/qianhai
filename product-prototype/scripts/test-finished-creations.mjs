import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const pageSource = readFileSync(join(root, 'app/page.tsx'), 'utf8');
const videoDir = join(root, 'public/demo/generated-videos');
const videos = ['v1-en-concept-preview.mp4', 'v2-ar-concept-preview.mp4', 'v3-es-concept-preview.mp4'];

for (const file of videos) {
  const path = join(videoDir, file);
  assert.ok(existsSync(path), `missing finished creation video: ${file}`);
  assert.ok(statSync(path).size > 1_000_000, `finished creation video is unexpectedly small: ${file}`);
  assert.ok(pageSource.includes(`/demo/generated-videos/${file}`), `page does not reference ${file}`);
}

for (const marker of ['我的创作 · 成片', 'MyFinishedCreations', '下载成片', '概念样片 · 开放许可行业素材']) {
  assert.ok(pageSource.includes(marker), `missing finished creation UI marker: ${marker}`);
}

console.log(`finished creations checks passed: ${videos.length} videos and page integration`);
