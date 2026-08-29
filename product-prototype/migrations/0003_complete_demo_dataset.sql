PRAGMA foreign_keys = ON;

CREATE TABLE dataset_manifest (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  as_of_date TEXT NOT NULL,
  classification TEXT NOT NULL,
  disclosure TEXT NOT NULL,
  public_fact_count INTEGER NOT NULL,
  mock_customer_count INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES growth_tasks(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  amount_cny REAL NOT NULL,
  contribution_type TEXT NOT NULL,
  evidence_completeness INTEGER NOT NULL,
  status TEXT NOT NULL,
  ordered_at TEXT NOT NULL,
  mock_notice TEXT NOT NULL
);

CREATE TABLE data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  classification TEXT NOT NULL,
  status TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  last_synced_at TEXT,
  source_url TEXT,
  usage_note TEXT
);

CREATE TABLE sync_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES data_sources(id),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  details_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_orders_task_date ON orders(task_id, ordered_at);
CREATE INDEX idx_sync_runs_source_time ON sync_runs(source_id, started_at);

INSERT INTO dataset_manifest VALUES
('dataset-demo-20260829','贵州抹茶×马来西亚食品B2B现场Demo数据集','2026-08-29','mixed_public_and_mock','产业与法规为公开事实；企业参数、客户、对话、广告、商机和收入均为Demo模拟，不代表任何真实企业或个人。',20,8,'2026-08-29T18:00:00+08:00');

DELETE FROM industry_facts;
INSERT INTO industry_facts VALUES
('GZ-M-001','产业规模','贵州','2024年贵州抹茶销量','1200','吨','2024','贵州省农业农村厅','https://nynct.guizhou.gov.cn/ztzl/jytagkzl/jy/202507/t20250706_88239357.html','public',0.99,'2026-08-29','["首页","市场洞察"]'),
('GZ-M-002','产业规模','贵州','2024年贵州抹茶出口量','210','吨','2024','贵州省农业农村厅','https://nynct.guizhou.gov.cn/ztzl/jytagkzl/jy/202507/t20250706_88239357.html','public',0.99,'2026-08-29','["首页","市场洞察"]'),
('GZ-M-003','产业规模','贵州','2024年贵州抹茶综合产值','10.02','亿元','2024','贵州省农业农村厅','https://nynct.guizhou.gov.cn/ztzl/jytagkzl/jy/202507/t20250706_88239357.html','public',0.99,'2026-08-29','["首页","产业概览"]'),
('GZ-M-004','产业地位','贵州','2024年产销规模','全国第一、全球第二',NULL,'2024','贵州省农业农村厅','https://nynct.guizhou.gov.cn/ztzl/jytagkzl/jy/202507/t20250706_88239357.html','public',0.98,'2026-08-29','["产业概览"]'),
('GZ-M-005','出口覆盖','贵州','公开披露出口覆盖','44个国家和地区',NULL,'2025-07-06','贵州省农业农村厅','https://nynct.guizhou.gov.cn/ztzl/jytagkzl/jy/202507/t20250706_88239357.html','public',0.98,'2026-08-29','["市场地图","经营任务"]'),
('GZ-M-006','国际物流','贵州','贵阳至杜伊斯堡通道案例冷链运输时间','12','天','2025-07-06','贵州省农业农村厅','https://nynct.guizhou.gov.cn/ztzl/jytagkzl/jy/202507/t20250706_88239357.html','public',0.95,'2026-08-29','["知识库","供应链"]'),
('GZ-M-007','国内渠道','贵州','省内茶叶交易市场','16','个','2025-07-06','贵州省农业农村厅','https://nynct.guizhou.gov.cn/ztzl/jytagkzl/jy/202507/t20250706_88239357.html','public',0.98,'2026-08-29','["产业生态"]'),
('TR-M-001','产业基础','铜仁','抹茶原料基地','8.5','万亩','2026-01-05','铜仁市政府/铜仁日报','https://szb.tongren.gov.cn/trrb/content/202601/05/content_71861.html','public',0.98,'2026-08-29','["产业地图","素材说明"]'),
('TR-M-002','产业基础','铜仁','碾茶生产线','52','条','2026-01-05','铜仁市政府/铜仁日报','https://szb.tongren.gov.cn/trrb/content/202601/05/content_71861.html','public',0.98,'2026-08-29','["灵感大屏","产业概览"]'),
('TR-M-003','产业覆盖','铜仁','带动碾茶企业','40余家',NULL,'2026-01-05','铜仁市政府/铜仁日报','https://szb.tongren.gov.cn/trrb/content/202601/05/content_71861.html','public',0.97,'2026-08-29','["产业链地图"]'),
('TR-M-004','标准体系','铜仁','抹茶与碾茶团体标准','2','项','2025-07-10','铜仁市政府','https://www.tongren.gov.cn/2025/0710/336976.shtml','public',0.96,'2026-08-29','["知识库","质量证据"]'),
('TR-M-005','研发能力','铜仁','抹茶相关专利','67','项','2025-07-10','铜仁市政府','https://www.tongren.gov.cn/2025/0710/336976.shtml','public',0.96,'2026-08-29','["产业洞察"]'),
('MY-FB-001','市场容量','马来西亚','食品与饮料服务机构','136453','家','2022','马来西亚统计局DOSM','https://www.dosm.gov.my/portal-main/release-content/economic-census-2023-food-and-beverage-services-sector','public',0.99,'2026-08-29','["市场容量","账户池"]'),
('MY-FB-002','市场容量','马来西亚','食品与饮料服务总产出','99.0','十亿林吉特','2022','马来西亚统计局DOSM','https://www.dosm.gov.my/site/downloadrelease?id=economic-census-2023-food-and-beverage-services-sector&lang=English','public',0.99,'2026-08-29','["市场洞察"]'),
('MY-FB-003','市场容量','马来西亚','食品与饮料服务增加值','43.8','十亿林吉特','2022','马来西亚统计局DOSM','https://www.dosm.gov.my/site/downloadrelease?id=economic-census-2023-food-and-beverage-services-sector&lang=English','public',0.99,'2026-08-29','["市场洞察"]'),
('MY-FB-004','就业规模','马来西亚','食品与饮料服务业从业人数','1079843','人','2022','马来西亚统计局DOSM','https://www.dosm.gov.my/uploads/release-content/file_20260713104345.pdf','public',0.99,'2026-08-29','["客户画像"]'),
('MY-FB-005','区域集中','马来西亚','Selangor食品饮料服务机构','24625','家','2022','马来西亚统计局DOSM','https://www.dosm.gov.my/portal-main/release-content/economic-census-2023-food-and-beverage-services-sector','public',0.99,'2026-08-29','["广告投放","地域定向"]'),
('MY-HALAL-001','市场准入','马来西亚','Halal宣称需由JAKIM或其认可境外机构认证','需实时核验',NULL,'current','JAKIM Halal Malaysia','https://www.halal.gov.my/','public',0.99,'2026-08-29','["知识库","审批异常"]'),
('MY-REG-001','食品法规','马来西亚','食品适用Food Regulations 1985','官方法规入口',NULL,'current','马来西亚卫生部','https://hq.moh.gov.my/fsq/peraturanperaturan-makanan-1985','public',0.99,'2026-08-29','["知识库","合规中心"]'),
('MY-INS-001','AI推演','马来西亚','首轮账户发现优先地域','Selangor、Kuala Lumpur、Johor',NULL,'2026-08-29','基于DOSM机构数推演',NULL,'inference',0.78,'2026-08-29','["经营任务","广告投放"]');

INSERT INTO enterprise_documents VALUES
('doc-quote-template','ent-demo-matcha',NULL,'quotation','报价单草稿模板','en','demo_only','mock',NULL,'/demo/quotation-template-en.pdf','1.0',NULL,'{}','贵客松Demo模拟文件，不作为实际交易依据'),
('doc-distributor','ent-demo-matcha',NULL,'distributor_policy','经销商合作说明','en','demo_only','mock',NULL,'/demo/distributor-policy-en.pdf','1.0',NULL,'{}','贵客松Demo模拟文件，不作为实际交易依据');

INSERT INTO assets VALUES
('asset-garden-02','ent-demo-matcha','image','遮阴茶园近景（场景示意）','产地','遮阴管理','原料管理方式','["马来西亚"]','["食品原料进口商"]','["LinkedIn"]','mock',NULL,'/demo/assets/garden-shade.jpg','demo_only',1,'["茶园","遮阴"]'),
('asset-picking-01','ent-demo-matcha','video','鲜叶采摘（场景示意）','原料','鲜叶采摘过程','原料可追溯','["马来西亚"]','["食品原料进口商"]','["Facebook"]','mock',NULL,'/demo/assets/picking.mp4','demo_only',1,'["采摘","原料"]'),
('asset-tencha-01','ent-demo-matcha','video','碾茶加工（场景示意）','生产','蒸青与干燥流程','加工流程','["马来西亚"]','["食品制造商"]','["LinkedIn"]','mock',NULL,'/demo/assets/tencha.mp4','demo_only',1,'["碾茶","生产"]'),
('asset-grinding-01','ent-demo-matcha','video','精制研磨（场景示意）','生产','研磨和筛分','粉体控制','["马来西亚"]','["食品制造商"]','["LinkedIn"]','mock',NULL,'/demo/assets/grinding.mp4','demo_only',1,'["研磨","细度"]'),
('asset-powder-01','ent-demo-matcha','image','M-01粉体特写（场景示意）','产品','烘焙级粉体','颜色与细度','["马来西亚"]','["烘焙食品制造商"]','["Facebook"]','mock',NULL,'/demo/assets/m01-powder.jpg','demo_only',1,'["M-01","粉体"]'),
('asset-powder-02','ent-demo-matcha','image','M-02粉体特写（场景示意）','产品','饮品级粉体','颜色与溶解应用','["马来西亚"]','["咖啡与新茶饮连锁"]','["Instagram"]','mock',NULL,'/demo/assets/m02-powder.jpg','demo_only',1,'["M-02","粉体"]'),
('asset-pack-01','ent-demo-matcha','image','铝箔袋包装（场景示意）','包装','标准包装规格','包装能力','["马来西亚"]','["食品原料进口商"]','["销售资料"]','mock',NULL,'/demo/assets/package.jpg','demo_only',1,'["包装"]'),
('asset-carton-01','ent-demo-matcha','video','装箱流程（场景示意）','履约','出口装箱','交付准备','["马来西亚"]','["食品原料进口商"]','["LinkedIn"]','mock',NULL,'/demo/assets/carton.mp4','demo_only',1,'["装箱","出口"]'),
('asset-bakery-01','ent-demo-matcha','image','抹茶烘焙应用（场景示意）','应用','蛋糕应用','烘焙适配','["马来西亚"]','["烘焙食品制造商"]','["Facebook"]','mock',NULL,'/demo/assets/bakery.jpg','demo_only',1,'["烘焙","应用"]'),
('asset-icecream-01','ent-demo-matcha','image','抹茶冰淇淋应用（场景示意）','应用','冷饮应用','多场景适配','["马来西亚"]','["食品制造商"]','["Instagram"]','mock',NULL,'/demo/assets/icecream.jpg','demo_only',1,'["冰淇淋","应用"]'),
('asset-meeting-01','ent-demo-matcha','image','海外渠道洽谈（场景示意）','商务','渠道会议','B2B合作场景','["马来西亚"]','["区域经销商"]','["LinkedIn"]','mock',NULL,'/demo/assets/meeting.jpg','demo_only',1,'["商务","渠道"]'),
('asset-public-tr','ent-demo-matcha','reference','铜仁抹茶产业官方报道','公开来源','产业图片与事实检索入口','仅链接和署名引用','["全球"]','["行业研究"]','["灵感大屏"]','public','https://www.tongren.gov.cn/2025/0710/336976.shtml',NULL,'link_only',0,'["政府来源","版权需确认"]'),
('asset-public-dosm','ent-demo-matcha','reference','马来西亚F&B官方统计图表','公开来源','可按数据重绘','市场规模证据','["马来西亚"]','["行业研究"]','["市场洞察"]','public','https://www.dosm.gov.my/portal-main/release-content/economic-census-2023-food-and-beverage-services-sector',NULL,'redraw_with_attribution',0,'["官方统计"]');

INSERT INTO inspirations VALUES
('ins-origin','马来西亚','LinkedIn','https://www.tongren.gov.cn/2025/0710/336976.shtml','carousel','From Guizhou tea gardens to a controlled ingredient','原料如何追溯','产地→过程→规格证据','不暗示虚构企业拥有产业总量','Download the origin brief',82,0.78,'selected'),
('ins-batch','马来西亚','LinkedIn',NULL,'short_video','What batch consistency looks like','如何保证批次一致','生产节点→检测→留样','不伪造检测结论','Request a batch sample',90,0.84,'selected'),
('ins-moq','马来西亚','LinkedIn',NULL,'carousel','MOQ, sample and lead time in one page','采购启动成本是多少','MOQ→样品→交期流程','不自动承诺交期','Get the buyer checklist',86,0.83,'selected'),
('ins-halal','马来西亚','LinkedIn','https://www.halal.gov.my/','knowledge_card','Before making a Halal claim','认证状态如何核验','规则→当前状态→人工确认','不使用未获授权标识','Ask for compliance status',94,0.92,'selected'),
('ins-cost','马来西亚','Instagram',NULL,'short_video','Estimate matcha cost per cup','单杯成本如何测试','用量→成本区间→样品测试','不承诺客户实际成本','Request a menu test sample',87,0.80,'selected'),
('ins-color','马来西亚','Facebook',NULL,'comparison','Color stability under different processes','加工后颜色为何变化','变量说明→对比→测试建议','不作绝对效果保证','Get the application guide',85,0.81,'selected'),
('ins-pack','马来西亚','LinkedIn',NULL,'short_video','How ingredient packaging protects freshness','运输储存怎么做','包装→装箱→储存说明','不虚构物流时效','Download packaging options',79,0.75,'selected'),
('ins-distributor','马来西亚','LinkedIn',NULL,'carousel','What distributors need before a market trial','如何启动渠道试销','资格→样品→非独家测试','不自动承诺区域独家','Book a channel review',89,0.85,'selected'),
('ins-faq','马来西亚','Facebook',NULL,'faq','Five questions importers ask first','首轮沟通需要什么','问题→标准答案→红线','不回答未核实认证','Send your requirement',83,0.82,'selected');

INSERT INTO contents VALUES
('cnt-quality-ms','task-my-30d','ins-quality','prd-m02','5 semakan pembekal matcha','carousel','ms','食品原料进口商','LinkedIn','Semak konsistensi kelompok, dokumen keselamatan makanan, kesesuaian aplikasi, kapasiti dan proses sampel.','Muat turun spesifikasi Demo.','["doc-spec-m02"]','["asset-line","asset-lab"]','approved','Kandungan Demo; semua terma transaksi adalah simulasi.'),
('cnt-moq-en','task-my-30d','ins-moq','prd-m02','MOQ, sample and lead-time workflow','carousel','en','食品原料进口商','LinkedIn','Start with the approved MOQ and sample workflow. Final delivery commitments require human confirmation.','Download the Demo buyer checklist.','["doc-spec-m02","rule-delivery"]','["asset-pack-01"]','scheduled','Demo content; transaction terms are simulated.'),
('cnt-halal-en','task-my-30d','ins-halal','prd-m02','How we handle Halal status questions','knowledge_card','en','食品原料进口商','LinkedIn','Halal status is under document confirmation. The digital employee will not present the Demo product as certified.','Ask for current compliance documents.','["MY-HALAL-001","appr-halal"]','["asset-public-dosm"]','draft','Demo compliance workflow; not legal advice.');

INSERT INTO content_schedule VALUES
('sch-04','task-my-30d','cnt-quality-ms','2026-09-01T10:00:00+08:00','LinkedIn','scheduled',NULL,NULL,'{}',0),
('sch-05','task-my-30d','cnt-moq-en','2026-09-03T10:30:00+08:00','LinkedIn','scheduled',NULL,NULL,'{}',0),
('sch-06','task-my-30d','cnt-halal-en','2026-09-04T10:30:00+08:00','LinkedIn','draft',NULL,NULL,'{}',0),
('sch-07','task-my-30d','cnt-latte-en','2026-09-05T19:30:00+08:00','Facebook','scheduled',NULL,NULL,'{}',0);

INSERT INTO approvals VALUES
('appr-sample','task-my-30d',NULL,'sample_request','客户B首次寄样审批','首次2kg菜单测试样品超出标准100g样品政策','medium','{"customer_id":"cust-b","quantity":"2kg"}','2026-08-30T13:12:00+08:00','pending','海外销售',NULL,NULL),
('appr-budget','task-my-30d',NULL,'budget_change','咖啡连锁广告首次投放','新客群首次付费投放需审批','medium','{"campaign_id":"ad-cafes","budget_cny":8000}','2026-08-30T15:00:00+08:00','pending','财务审批',NULL,NULL);

INSERT INTO customers VALUES
('cust-d','客户D（Mock）','D','马来西亚','烘焙食品制造商','原料采购经理','Facebook','["prd-m01"]','季度3吨','["耐热颜色稳定","工业包装"]','["烘焙后变色"]',71,'nurturing','海外销售','发送M-01规格书','Demo模拟客户，不代表真实企业或个人'),
('cust-e','客户E（Mock）','E','马来西亚','精品咖啡连锁','产品研发经理','Instagram','["prd-m03"]','测试500g','["口感","零售小包装"]','["单杯成本"]',67,'new_inquiry','海外销售','确认测试门店数量','Demo模拟客户，不代表真实企业或个人'),
('cust-f','客户F（Mock）','F','马来西亚','食品原料贸易商','采购专员','LinkedIn','["prd-m01","prd-m02"]','月度500kg','["价格带","稳定供货"]','["供应商切换风险"]',64,'nurturing','海外销售','补全年度采购计划','Demo模拟客户，不代表真实企业或个人'),
('cust-g','客户G（Mock）','G','马来西亚','餐饮集团','采购负责人','Website','["prd-m02"]','待确认','["Halal状态","应用方案"]','["合规资料不完整"]',58,'new_inquiry','海外销售','发送合规状态说明','Demo模拟客户，不代表真实企业或个人'),
('cust-h','客户H（Mock）','H','马来西亚','区域批发商','渠道负责人','Trade Show','["prd-m01"]','年度5吨','["包装","渠道支持"]','["利润空间"]',55,'new_inquiry','海外销售','确认渠道覆盖区域','Demo模拟客户，不代表真实企业或个人');

INSERT INTO orders VALUES
('ord-demo-001','task-my-30d','cust-a','opp-a',680000,'人工+AI协同增长',96,'won','2026-09-26T11:22:00+08:00','Demo模拟成交，不代表真实收入或订单');

INSERT INTO attribution_events VALUES
('attr-06','cust-a','opp-a','2026-09-05T09:00:00+08:00','sample_approved','approval','appr-sample',NULL,'cnt-quality-en','{}'),
('attr-07','cust-a','opp-a','2026-09-12T15:08:00+08:00','quote_confirmed','human','role-sales',NULL,'cnt-quality-en','{"quote_id":"quote-demo-001"}'),
('attr-08','cust-a','opp-a','2026-09-26T11:22:00+08:00','order_won','order','ord-demo-001',NULL,'cnt-quality-en','{"amount_cny":680000,"classification":"demo_mock"}');

INSERT INTO data_sources VALUES
('src-gz-agri','贵州省农业农村厅公开资料','government_web','public_fact','healthy',7,'2026-08-29T17:10:00+08:00','https://nynct.guizhou.gov.cn/ztzl/jytagkzl/jy/202507/t20250706_88239357.html','仅用于带来源的事实卡'),
('src-tr-gov','铜仁市政府公开资料','government_web','public_fact','healthy',5,'2026-08-29T17:12:00+08:00','https://www.tongren.gov.cn/2025/0710/336976.shtml','产业级数据不得归到虚构企业'),
('src-dosm','马来西亚统计局DOSM','official_statistics','public_fact','healthy',5,'2026-08-29T17:15:00+08:00','https://www.dosm.gov.my/portal-main/release-content/economic-census-2023-food-and-beverage-services-sector','机构数数据期为2022'),
('src-jakim','JAKIM Halal Malaysia','regulator','public_fact','review_required',1,'2026-08-29T17:18:00+08:00','https://www.halal.gov.my/','认证机构名单需实时核验'),
('src-demo-crm','本地Demo CRM','local_mock','demo_mock','healthy',8,'2026-08-29T17:30:00+08:00',NULL,'全部客户和商机均为Mock'),
('src-demo-assets','本地Demo素材目录','local_mock','demo_mock','healthy',17,'2026-08-29T17:35:00+08:00',NULL,'场景示意和公开来源链接分开标记');

INSERT INTO sync_runs VALUES
('sync-001','src-gz-agri','2026-08-29T17:09:00+08:00','2026-08-29T17:10:00+08:00','success',7,0,0,'{}'),
('sync-002','src-tr-gov','2026-08-29T17:11:00+08:00','2026-08-29T17:12:00+08:00','success',5,0,0,'{}'),
('sync-003','src-dosm','2026-08-29T17:14:00+08:00','2026-08-29T17:15:00+08:00','success',5,0,0,'{}'),
('sync-004','src-demo-crm','2026-08-29T17:29:00+08:00','2026-08-29T17:30:00+08:00','success',8,0,0,'{"classification":"demo_mock"}');

PRAGMA optimize;
