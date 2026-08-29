import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(await readFile(join(root, 'public', 'demo', 'tea-media', 'manifest.json'), 'utf8'));
const sqlString = (value) => value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;

const mockItems = [
  ['mock-enterprise-profile','enterprise','贵州茶产业演示企业','企业主体','贵州','用于演示企业资料、团队、权限和增长任务，不对应真实企业。',92,{ fields:['企业名称','产业定位','目标市场','团队角色','权限边界'] }],
  ['mock-industry-profile','industry','贵州茶行业经营画像','产业画像','贵州','覆盖种植、初制、精制、品牌和出口场景；规模、份额和经营指标不得当作真实统计。',90,{ chain:['茶园','初制','精制','品牌','渠道'] }],
  ['mock-product-green-tea','product','都匀毛尖出口装 Demo','绿茶产品','贵州', '模拟规格、包装与报价参数，产品名称仅用于行业演示。',88,{ grade:'特级/一级 Demo',package:'100g/250g/1kg Demo' }],
  ['mock-product-matcha-food','product','贵州食品级抹茶 M-01','抹茶产品','贵州','模拟产品与交易参数，不代表任何企业真实产能或认证。',90,{ application:['烘焙','巧克力'],moq:'Demo 800kg' }],
  ['mock-product-matcha-drink','product','贵州饮品级抹茶 M-02','抹茶产品','贵州','模拟产品与交易参数，不代表任何企业真实产能或认证。',90,{ application:['奶茶','咖啡'],moq:'Demo 1000kg' }],
  ['mock-product-tea-bag','product','贵州绿茶袋泡茶 Demo','消费茶产品','贵州','模拟零售产品、包装和渠道定位。',84,{ package:'20袋/盒 Demo',market:'新加坡 Demo' }],
  ['mock-product-cold-brew','product','贵州冷泡茶原料 Demo','茶饮原料','贵州','模拟配方应用和买家沟通场景。',84,{ application:['冷泡茶','即饮茶'],sample:'100g Demo' }],
  ['mock-buyer-importer','buyer_persona','食品原料进口商','采购角色','东南亚','模拟买家画像，用于资格判断和内容选题。',86,{ needs:['稳定供货','批次检测','合规资料'] }],
  ['mock-buyer-cafe-chain','buyer_persona','咖啡与新茶饮连锁','采购角色','东南亚','模拟买家画像，用于菜单测试和样品流程。',86,{ needs:['颜色','口感','单杯成本'] }],
  ['mock-buyer-distributor','buyer_persona','区域茶叶经销商','渠道角色','东南亚','模拟买家画像，不代表真实客户。',84,{ needs:['渠道利润','包装','非独家试销'] }],
  ['mock-content-origin','content_brief','贵州茶产地故事图文','内容任务','贵州','引用开放图片时必须按许可署名；不得把行业素材说成企业自有茶园。',91,{ format:'carousel',channel:'LinkedIn' }],
  ['mock-content-harvest','content_brief','一芽一叶采摘流程短视频','内容任务','行业通用','用开放行业视频解释流程，必须显示“行业参考画面”。',91,{ format:'short_video',channel:'Instagram' }],
  ['mock-content-processing','content_brief','绿茶加工节点知识卡','内容任务','行业通用','依据开放加工流程图制作，不宣称具体企业采用相同工艺。',90,{ format:'knowledge_card',channel:'Website' }],
  ['mock-content-quality','content_brief','海外买家验厂五项清单','内容任务','东南亚','质量、认证和产能字段均需企业人工确认。',93,{ format:'checklist',channel:'LinkedIn' }],
  ['mock-campaign-sea','campaign','贵州茶东南亚市场验证','增长任务','马来西亚/新加坡','预算、流量、询盘和成交指标全部为 Demo。',88,{ budget_cny:30000,qualified_inquiries:6 }],
];

const lines = [`PRAGMA foreign_keys = ON;`, ``, `CREATE TABLE IF NOT EXISTS tea_industry_catalog (` ,
`  id TEXT PRIMARY KEY,`,
`  organization_id TEXT NOT NULL REFERENCES organizations(id),`,
`  enterprise_id TEXT NOT NULL REFERENCES enterprises(id),`,
`  item_type TEXT NOT NULL,`,
`  title TEXT NOT NULL,`,
`  category TEXT NOT NULL,`,
`  classification TEXT NOT NULL CHECK(classification IN ('open_media','mock')),`,
`  geography_scope TEXT NOT NULL,`,
`  source_name TEXT NOT NULL,`,
`  source_url TEXT,`,
`  local_path TEXT,`,
`  license_name TEXT,`,
`  license_url TEXT,`,
`  author TEXT,`,
`  mime_type TEXT,`,
`  bytes INTEGER,`,
`  sha256 TEXT,`,
`  quality_score INTEGER NOT NULL CHECK(quality_score BETWEEN 0 AND 100),`,
`  verification_status TEXT NOT NULL,`,
`  truth_notice TEXT NOT NULL,`,
`  metadata_json TEXT NOT NULL DEFAULT '{}',`,
`  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`,
`);`,
`CREATE INDEX IF NOT EXISTS idx_tea_catalog_type_class ON tea_industry_catalog(item_type, classification);`,
`CREATE INDEX IF NOT EXISTS idx_tea_catalog_geography ON tea_industry_catalog(geography_scope);`,
``,
`DELETE FROM tea_industry_catalog WHERE organization_id = 'org-demo-guikesong';`,
``,
];

for (const item of manifest.items) {
  const quality = item.scope === 'guizhou_location' ? 96 : 90;
  const metadata = JSON.stringify({ commonsTitle:item.commonsTitle, originalUrl:item.originalUrl, capturedAt:item.capturedAt, width:item.width, height:item.height, downloadedAt:item.downloadedAt, attributionRequired:item.attributionRequired });
  lines.push(`INSERT INTO tea_industry_catalog (id,organization_id,enterprise_id,item_type,title,category,classification,geography_scope,source_name,source_url,local_path,license_name,license_url,author,mime_type,bytes,sha256,quality_score,verification_status,truth_notice,metadata_json) VALUES (${[
    item.id,'org-demo-guikesong','ent-demo-matcha',item.kind,item.commonsTitle.replace(/^File:/,''),item.category,'open_media',item.scope === 'guizhou_location' ? '贵州都匀实拍' : '茶行业通用参考','Wikimedia Commons',item.sourcePage,item.localPath,item.license,item.licenseUrl,item.author,item.mimeType,item.downloadedBytes,item.sha256,quality,item.verificationStatus,item.truthNotice,metadata,
  ].map(sqlString).join(',')});`);
}

for (const [id,type,title,category,geography,notice,quality,metadata] of mockItems) {
  lines.push(`INSERT INTO tea_industry_catalog (id,organization_id,enterprise_id,item_type,title,category,classification,geography_scope,source_name,quality_score,verification_status,truth_notice,metadata_json) VALUES (${[
    id,'org-demo-guikesong','ent-demo-matcha',type,title,category,'mock',geography,'Qianhai Demo generator',quality,'schema_validated_mock',`Mock：${notice}`,JSON.stringify(metadata),
  ].map(sqlString).join(',')});`);
}

lines.push(``, `PRAGMA optimize;`, ``);
const target = join(root, 'migrations', '0013_guizhou_tea_catalog.sql');
await writeFile(target, lines.join('\n'), 'utf8');
process.stdout.write(`${target}\nmedia=${manifest.items.length} mock=${mockItems.length}\n`);
