import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const baseUrl = process.env.TEA_CATALOG_BASE_URL || 'http://localhost:3103';
const response = await fetch(`${baseUrl}/api/tea-catalog`);
if (!response.ok) throw new Error(`catalog API ${response.status}`);
const catalog = await response.json();
const generatedAt = new Date().toISOString();
const outputDir = join(process.cwd(), 'reports', 'guizhou-tea-mock-catalog');
await mkdir(outputDir, { recursive: true });

const media = catalog.items.filter((item) => item.classification === 'open_media').map((item) => ({
  id:item.id,
  type:item.item_type === 'video' ? '视频' : '图片',
  title:item.title,
  category:item.category,
  geography:item.geography_scope,
  license:item.license_name,
  author:item.author,
  quality:item.quality_score,
  source:item.source_url,
  local_path:item.local_path,
  sha256:item.sha256,
  notice:item.truth_notice,
}));
const mocks = catalog.items.filter((item) => item.classification === 'mock').map((item) => ({
  id:item.id,
  type:item.item_type,
  title:item.title,
  category:item.category,
  geography:item.geography_scope,
  quality:item.quality_score,
  status:item.verification_status,
  notice:item.truth_notice,
}));
const coverage = catalog.summary.byTypeAndClassification.map((row) => ({
  classification:row.classification === 'open_media' ? '开放许可真实媒体' : 'Mock经营数据',
  type:row.item_type,
  label:`${row.classification === 'open_media' ? '真实媒体' : 'Mock'} / ${row.item_type}`,
  count:Number(row.count),
}));
const checks = [
  { check:'目录总量', result:'通过', evidence:'35 条，API 与数据库汇总一致' },
  { check:'真实视频数量', result:'通过', evidence:'10 条，全部下载、哈希和 HTTP 验证' },
  { check:'真实图片数量', result:'通过', evidence:'10 张，全部下载、哈希和 HTTP 验证' },
  { check:'开放媒体来源完整性', result:'通过', evidence:'20/20 有来源页、许可、本地路径和 SHA-256' },
  { check:'Mock 显式标识', result:'通过', evidence:'15/15 truth_notice 以 Mock 开头' },
  { check:'地域真实性', result:'通过', evidence:'3 张贵州都匀实拍；其余明确标记茶行业通用参考' },
  { check:'API 筛选', result:'通过', evidence:'video/image 各返回 10；非法 tyre 返回 400' },
  { check:'远程生产状态', result:'未执行', evidence:'仅本地 D1 与 localhost 联调，未推送、未远程迁移' },
];

const dbSource = {
  id:'tea_catalog_db',
  query:{
    engine:'sqlite', language:'sql',
    sql:"SELECT * FROM tea_industry_catalog WHERE organization_id = 'org-demo-guikesong' ORDER BY classification, item_type, quality_score DESC, id",
    description:'贵州茶目录表的本地 D1 审核快照。',
    tables_used:['tea_industry_catalog'],
    filters:{ organization_id:'org-demo-guikesong' },
    executed_at:generatedAt,
  },
};
const manifestSource = {
  id:'open_media_manifest',
  query:{
    engine:'filesystem', language:'json',
    description:'Wikimedia Commons 开放媒体下载清单，含许可、作者、本地路径和 SHA-256。',
    tables_used:['public/demo/tea-media/manifest.json'],
    executed_at:generatedAt,
  },
};
const testSource = {
  id:'catalog_e2e',
  query:{
    engine:'node', language:'javascript',
    description:'目录 API、筛选、文件哈希、媒体 HTTP 响应与 Mock 标签联调。',
    tables_used:['scripts/test-tea-catalog-e2e.mjs'],
    executed_at:generatedAt,
  },
};

const artifact = {
  surface:'report',
  manifest:{
    version:1,
    surface:'report',
    title:'贵州茶行业 Mock 与开放素材清单',
    description:'贵州茶演示账号的企业、行业、产品、买家、内容与开放媒体目录。',
    generatedAt,
    filters:[],
    cards:[],
    charts:[
      { id:'coverage_chart',title:'目录条目构成',subtitle:'按真实性分类和条目类型统计，共35条',type:'bar',dataset:'coverage',sourceId:'tea_catalog_db',valueFormat:'number',encodings:{x:{field:'label',type:'nominal',label:'目录类型'},y:{field:'count',type:'quantitative',label:'条目数量'}} },
    ],
    tables:[
      { id:'coverage_table',title:'目录覆盖',subtitle:'按真实性分类和条目类型统计，共35条',dataset:'coverage',sourceId:'tea_catalog_db',defaultSort:{field:'classification',direction:'asc'},columns:[{field:'classification',label:'真实性分类',type:'text'},{field:'type',label:'条目类型',type:'text'},{field:'count',label:'数量',format:'number'}] },
      { id:'media_table',title:'开放许可真实媒体',subtitle:'10条视频与10张图片；仅3张都匀图片标记为贵州实拍',dataset:'media',sourceId:'tea_catalog_db',defaultSort:{field:'type',direction:'desc'},columns:[{field:'type',label:'类型',type:'text'},{field:'title',label:'标题',type:'text'},{field:'category',label:'场景',type:'text'},{field:'geography',label:'地域范围',type:'text'},{field:'license',label:'许可',type:'text'},{field:'quality',label:'质量分',format:'number'},{field:'local_path',label:'本地路径',type:'text'},{field:'source',label:'来源页',type:'text'}] },
      { id:'mock_table',title:'贵州茶 Mock 经营条目',subtitle:'企业、行业、产品、买家、内容和投放数据，全部显式标记 Mock',dataset:'mocks',sourceId:'tea_catalog_db',defaultSort:{field:'type',direction:'asc'},columns:[{field:'type',label:'类型',type:'text'},{field:'title',label:'名称',type:'text'},{field:'category',label:'分类',type:'text'},{field:'geography',label:'地域',type:'text'},{field:'quality',label:'质量分',format:'number'},{field:'notice',label:'真实性说明',type:'text'}] },
    ],
    sources:[
      { id:'tea_catalog_db',label:'本地 D1 贵州茶目录',path:'migrations/0013_guizhou_tea_catalog.sql' },
      { id:'open_media_manifest',label:'开放媒体来源与哈希清单',path:'public/demo/tea-media/manifest.json' },
      { id:'catalog_e2e',label:'贵州茶目录全链路测试',path:'scripts/test-tea-catalog-e2e.mjs' },
    ],
    blocks:[
      { id:'title',type:'markdown',body:'# 贵州茶行业 Mock 与开放素材清单' },
      { id:'executive_summary',type:'markdown',body:'## Executive Summary\n\n- **目录已形成可用闭环。** 当前共 35 条：20 条开放许可真实媒体和 15 条明确标记的 Mock 经营数据。\n- **媒体不混淆地域。** 3 张图片为贵州都匀实拍；其余视频和图片仅标记为茶行业通用参考，不代表贵州本地或当前企业。\n- **联调结果可信。** 20 个文件已逐一核对 SHA-256、来源和许可，数据库、API、筛选与静态媒体 URL 均通过本地自动测试。\n- **尚未证明远程生产可用。** 本次没有推送仓库或执行远程 D1 迁移。' },
      { id:'coverage_heading',type:'markdown',body:'## 目录已经覆盖演示所需的核心对象\n\n企业、行业、产品、买家、内容任务和投放项目由 Mock 数据补齐；真实媒体单独使用 `open_media` 分类。这样前端可以组合演示，但不会把模拟经营数据当成现实事实。' },
      { id:'coverage_chart_block',type:'chart',chartId:'coverage_chart' },
      { id:'coverage',type:'table',tableId:'coverage_table' },
      { id:'media_heading',type:'markdown',body:'## 20 条真实媒体都有可追溯许可\n\n每条媒体都保存 Commons 来源页、作者、许可、本地路径与 SHA-256。使用时必须保留署名，并根据地域字段展示“贵州都匀实拍”或“茶行业通用参考”。' },
      { id:'media',type:'table',tableId:'media_table' },
      { id:'mock_heading',type:'markdown',body:'## 15 条 Mock 数据补足经营演示而不冒充事实\n\nMock 条目覆盖企业、产业链、五类产品、三类买家、四项内容任务和一个东南亚市场验证项目。交易参数、预算、询盘和认证状态均不得对外当作真实承诺。' },
      { id:'mocks',type:'table',tableId:'mock_table' },
      { id:'quality_heading',type:'markdown',body:'## 本地全链路已经通过，远程环境仍需单独验收\n\n自动测试覆盖目录数量、真实性标签、来源完整性、哈希、API 筛选、错误输入和 20 个媒体 HTTP 响应。该证据只适用于当前本地工作区。' },
      { id:'next_steps',type:'markdown',body:'## 推荐下一步\n\n1. 在内容生成与素材选择界面强制显示地域标签和许可署名。\n2. 将质量分低于 85 的 Mock 条目拦截在发布审批前。\n3. 推送后在同一提交 SHA 上执行远程 D1 迁移与预览环境回归，再决定是否用于明天的演示。' },
      { id:'questions',type:'markdown',body:'## Further Questions\n\n- 明天演示是否需要把视频转码为 MP4，以兼容不支持 WebM 的浏览器？\n- 是否需要继续补采贵州本地加工、包装和茶艺视频，以减少行业通用素材占比？' },
      { id:'caveats',type:'markdown',body:'## Caveats and Assumptions\n\n- 开放许可允许复用不等于无需署名，具体使用仍受每条文件许可约束。\n- “真实媒体”只表示文件及其来源真实，不证明 Demo 企业拥有画面中的茶园、工厂、人员或产能。\n- Mock 质量分用于目录完整度排序，不代表市场效果或真实转化率。' },
    ],
  },
  snapshot:{ version:1,generatedAt,status:'ready',datasets:{ coverage,media,mocks,checks },accessIssues:[] },
  sources:[dbSource,manifestSource,testSource],
};

const target = join(outputDir, 'artifact.json');
await writeFile(target, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
process.stdout.write(`${target}\n`);
