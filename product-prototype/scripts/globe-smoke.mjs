import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const endpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9334';
const targetUrl = process.env.GLOBE_URL ?? 'http://localhost:3110/?qa=globe#home';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function pageTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`${endpoint}/json`).then(response => response.json());
      const page = targets.find(target => target.type === 'page' && target.url.includes('localhost:3110'))
        ?? targets.find(target => target.type === 'page' && target.url.startsWith('http'));
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error('Browser DevTools endpoint did not become ready');
}

const target = await pageTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const browserErrors = [];
let id = 0;

socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text);
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    const entry = message.params.entry;
    if (!entry.url?.endsWith('/favicon.ico')) browserErrors.push(`${entry.text}${entry.url ? ` (${entry.url})` : ''}`);
  }
  if (!message.id || !pending.has(message.id)) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
};

await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

function send(method, params = {}) {
  const requestId = ++id;
  socket.send(JSON.stringify({ id: requestId, method, params }));
  return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await evaluate(`location.href = ${JSON.stringify(targetUrl)}`);
await sleep(8000);

const results = [];
const check = (name, passed, detail = '') => results.push({ name, passed: Boolean(passed), detail });
const desktop = await evaluate(`(() => {
  const hero = document.querySelector('[data-testid="home-globe-showcase"]');
  const canvas = hero?.querySelector('canvas');
  const heading = hero?.querySelector('h1')?.textContent;
  const railButton = [...(hero?.querySelectorAll('button') ?? [])].find(button => button.textContent.includes('吉隆坡'));
  railButton?.click();
  return {
    hero: Boolean(hero), canvas: Boolean(canvas), heading,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    background: hero ? getComputedStyle(hero).backgroundColor : null,
  };
})()`);
await sleep(250);
const panelVisible = await evaluate(`Boolean(document.querySelector('[data-testid="home-globe-showcase"] article'))`);
check('首页首屏存在', desktop.hero, JSON.stringify(desktop));
check('WebGL canvas 已渲染', desktop.canvas, JSON.stringify(desktop));
check('主标题正确', desktop.heading?.includes('让数字员工持续经营海外社媒'), desktop.heading);
check('桌面无横向溢出', desktop.overflow <= 1, String(desktop.overflow));
check('节点信息面板可打开', panelVisible);
const primaryRoute = await evaluate(`(async () => {
  const button = [...document.querySelectorAll('[data-testid="home-globe-showcase"] button')]
    .find(item => item.textContent.includes('进入增长控制塔'));
  button?.click();
  await new Promise(resolve => setTimeout(resolve, 250));
  const view = document.querySelector('.page')?.dataset.view;
  location.hash = 'home';
  await new Promise(resolve => setTimeout(resolve, 250));
  return view;
})()`);
check('主按钮接入经营任务', primaryRoute === 'projects', primaryRoute);

const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile(process.env.QA_SCREENSHOT ?? join(tmpdir(), 'qianhai-globe-qa-desktop.png'), Buffer.from(capture.data, 'base64'));

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(1000);
const mobile = await evaluate(`(() => ({
  canvas: Boolean(document.querySelector('[data-testid="home-globe-showcase"] canvas')),
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  navVisible: Boolean(document.querySelector('.mobile-nav')) && getComputedStyle(document.querySelector('.mobile-nav')).display !== 'none',
  primaryClickable: Boolean(document.querySelector('[data-testid="home-globe-showcase"] button')),
}))()`);
check('手机端 WebGL 保留', mobile.canvas, JSON.stringify(mobile));
check('手机端无横向溢出', mobile.overflow <= 1, JSON.stringify(mobile));
check('手机导航未遮蔽/未丢失', mobile.navVisible, JSON.stringify(mobile));
check('手机端按钮可用', mobile.primaryClickable, JSON.stringify(mobile));
check('无浏览器运行错误', browserErrors.length === 0, browserErrors.join(' | '));

socket.close();
const failures = results.filter(result => !result.passed);
console.log(JSON.stringify({ total: results.length, passed: results.length - failures.length, failures, results }, null, 2));
if (failures.length) process.exitCode = 1;
