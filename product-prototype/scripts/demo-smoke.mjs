const endpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9333';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function findPage() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`${endpoint}/json`).then(response => response.json());
      const page = targets.find(target => target.type === 'page' && target.url.includes('localhost:3000'))
        ?? targets.find(target => target.type === 'page');
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error('Edge DevTools endpoint did not become ready');
}

const page = await findPage();
const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let sequence = 0;

socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
};

await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

await send('Runtime.enable');
await evaluate(`location.href = 'http://localhost:3000/#structure'`);
await sleep(700);
const results = await evaluate(`(async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const result = [];
  const assert = (name, passed, detail = '') => result.push({ name, passed: Boolean(passed), detail });
  const button = text => [...document.querySelectorAll('button')].find(item => item.textContent.trim().includes(text));
  const go = async view => { location.hash = view; await sleep(450); };
  const closeDialog = async () => {
    const confirm = document.querySelector('.demo-dialog footer .primary');
    if (confirm) { confirm.click(); await sleep(180); }
  };

  await go('structure');
  assert('组织架构路由', document.querySelector('.page')?.dataset.view === 'structure');
  button('协作边界')?.click(); await sleep(180);
  assert('组织子标签切换', button('协作边界')?.classList.contains('active'));
  document.querySelector('.platform-table .platform-row:not(.head)')?.click(); await sleep(180);
  assert('组织详情弹窗', Boolean(document.querySelector('.demo-dialog')));
  await closeDialog();
  assert('保存反馈提示', Boolean(document.querySelector('.demo-toast')));

  await go('permissions');
  assert('权限默认子页', button('角色权限')?.classList.contains('active'));
  button('账号连接')?.click(); await sleep(180);
  assert('账号子页切换', Boolean(document.querySelector('.enhanced-accounts')));
  document.querySelector('.enhanced-accounts button')?.click(); await sleep(180);
  assert('账号管理弹窗', Boolean(document.querySelector('.demo-dialog')));
  await closeDialog();

  await go('data');
  button('数据质量')?.click(); await sleep(180);
  document.querySelector('.quality-cards button')?.click(); await sleep(180);
  assert('数据质量处理弹窗', Boolean(document.querySelector('.demo-dialog')));
  await closeDialog();

  await go('security');
  const deployment = document.querySelectorAll('.deployment-grid button')[1];
  deployment?.click(); await sleep(180);
  assert('部署方案选中态', deployment?.getAttribute('aria-pressed') === 'true');
  button('AI 安全')?.click(); await sleep(180);
  document.querySelector('.ai-policy-list button')?.click(); await sleep(180);
  assert('AI 策略弹窗', Boolean(document.querySelector('.demo-dialog')));
  await closeDialog();

  const heading = document.querySelector('.page-heading')?.getBoundingClientRect();
  const stats = document.querySelector('.stat-grid')?.getBoundingClientRect();
  const panel = document.querySelector('.platform-panel')?.getBoundingClientRect();
  assert('主区块不重合', heading && stats && panel && heading.bottom <= stats.top + 1 && stats.bottom <= panel.top + 1,
    heading && stats && panel ? [heading.bottom, stats.top, stats.bottom, panel.top].join(',') : 'missing blocks');
  return result;
})()`);

for (const viewport of [{ width: 980, height: 900, name: '平板宽度' }, { width: 390, height: 844, name: '手机宽度' }]) {
  await send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false });
  await sleep(350);
  const responsive = await evaluate(`(() => {
    const heading = document.querySelector('.page-heading')?.getBoundingClientRect();
    const stats = document.querySelector('.stat-grid')?.getBoundingClientRect();
    const panel = document.querySelector('.platform-panel')?.getBoundingClientRect();
    const ordered = heading && stats && panel && heading.bottom <= stats.top + 1 && stats.bottom <= panel.top + 1;
    const contained = document.documentElement.scrollWidth <= window.innerWidth + 1;
    return { ordered: Boolean(ordered), contained, width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth };
  })()`);
  results.push({ name: `${viewport.name}主区块不重合`, passed: responsive.ordered, detail: JSON.stringify(responsive) });
  results.push({ name: `${viewport.name}页面不横向溢出`, passed: responsive.contained, detail: JSON.stringify(responsive) });
}

socket.close();
const failures = results.filter(item => !item.passed);
console.log(JSON.stringify({ total: results.length, passed: results.length - failures.length, failures, results }, null, 2));
if (failures.length) process.exitCode = 1;
