PRAGMA foreign_keys = ON;

INSERT INTO enterprises VALUES
('ent-demo-matcha','贵州某抹茶生产企业（Demo）','贵州某抹茶生产企业（Demo）','mock','抹茶生产与食品原料','贵州省铜仁市','面向食品饮料、咖啡与烘焙客户的工贸一体化抹茶生产企业。所有经营数据均为Demo模拟。',2018,'100–199人',18000,600,'["东南亚","欧盟"]','{"email":"export@example.invalid","whatsapp":"+86 000 0000 0000"}','2026-08-29T09:00:00+08:00','2026-08-29T09:00:00+08:00');

INSERT INTO products VALUES
('prd-m01','ent-demo-matcha','M-01','烘焙级抹茶粉','烘焙级','["蛋糕","饼干","巧克力"]','贵州铜仁','明亮绿色','清新茶香',800,'["1kg铝箔袋","10kg纸箱"]',18,'密封、避光、阴凉干燥处',100,'标准样品100g；首次寄样需审批',25,15,1,'18–28','{"haccp":"已具备（Demo）","iso22000":"已具备（Demo）","halal":"资料确认中"}','Demo模拟产品与交易参数，不作为实际交易依据'),
('prd-m02','ent-demo-matcha','M-02','饮品级抹茶粉','饮品级','["咖啡","奶茶","新茶饮"]','贵州铜仁','鲜绿色','鲜爽茶香',1000,'["500g铝箔袋","1kg铝箔袋"]',18,'密封、避光、阴凉干燥处',50,'标准样品100g；首次寄样需审批',20,12,1,'28–42','{"haccp":"已具备（Demo）","iso22000":"已具备（Demo）","halal":"资料确认中"}','Demo模拟产品与交易参数，不作为实际交易依据'),
('prd-m03','ent-demo-matcha','M-03','高端食品级抹茶粉','高端食品级','["精品饮品","零售小包装"]','贵州铜仁','翠绿色','浓郁海苔香与鲜味',1200,'["100g罐装","500g铝箔袋"]',12,'冷藏、密封、避光',20,'标准样品50g；首次寄样需审批',8,18,1,'55–80','{"haccp":"已具备（Demo）","iso22000":"已具备（Demo）","halal":"资料确认中"}','Demo模拟产品与交易参数，不作为实际交易依据');

INSERT INTO enterprise_documents VALUES
('doc-profile','ent-demo-matcha',NULL,'company_profile','企业英文介绍','en','approved','mock',NULL,'/demo/company-profile-en.pdf','1.0',NULL,'{"pages":8}','贵客松Demo模拟文件，不作为实际交易依据'),
('doc-catalog','ent-demo-matcha',NULL,'catalog','英文产品目录','en','approved','mock',NULL,'/demo/product-catalog-en.pdf','1.0',NULL,'{"pages":12}','贵客松Demo模拟文件，不作为实际交易依据'),
('doc-spec-m01','ent-demo-matcha','prd-m01','specification','M-01产品规格书','en','approved','mock',NULL,'/demo/spec-m01-en.pdf','1.0',NULL,'{}','贵客松Demo模拟文件，不作为实际交易依据'),
('doc-spec-m02','ent-demo-matcha','prd-m02','specification','M-02产品规格书','en','approved','mock',NULL,'/demo/spec-m02-en.pdf','1.0',NULL,'{}','贵客松Demo模拟文件，不作为实际交易依据'),
('doc-test','ent-demo-matcha','prd-m02','test_report','批次检测报告（示意）','en','demo_only','mock',NULL,'/demo/test-report-sample.pdf','1.0','2027-02-28','{"tests":["农残","重金属","微生物"]}','模拟检测报告，不代表任何机构签发'),
('doc-sample','ent-demo-matcha',NULL,'form','样品申请表','en','approved','mock',NULL,'/demo/sample-request.pdf','1.0',NULL,'{}','贵客松Demo模拟文件，不作为实际交易依据');

INSERT INTO business_rules VALUES
('rule-auto-faq','ent-demo-matcha','communication','发送已审核规格书与标准FAQ','auto','{"documents_status":"approved"}','仅引用已审核知识','海外销售',1),
('rule-sample','ent-demo-matcha','fulfillment','首次寄样','approval','{"first_sample":true}','收集用途、数量与地址后申请审批','海外销售',1),
('rule-custom','ent-demo-matcha','product','特殊包装或定制配方','approval','{}','记录需求并交产品经理评估','产品经理',1),
('rule-price','ent-demo-matcha','commercial','最终报价、折扣与账期','human_only','{}','不得作出价格承诺','海外销售',1),
('rule-exclusive','ent-demo-matcha','commercial','独家代理与区域保护','human_only','{}','立即转人工并生成审批卡','项目负责人',1),
('rule-delivery','ent-demo-matcha','fulfillment','交期保证与质量赔偿','human_only','{}','不得保证，需生产与质量负责人确认','质量负责人',1);

INSERT INTO industry_facts VALUES
('fact-gz-cluster','产业基础','贵州','贵州已形成从茶园、碾茶到精制抹茶的产业链','适合用于产地与供应链叙事',NULL,'2025','贵州省公开产业资料',NULL,'public',0.85,'2026-08-29','["首页","市场洞察"]'),
('fact-my-halal','市场准入','马来西亚','食品原料买家通常关注Halal状态与标签合规','采购资格审查重点',NULL,'2026','马来西亚食品进口公开规则汇总',NULL,'public',0.9,'2026-08-29','["市场洞察","客户工作台"]'),
('fact-price-band','竞争价格','马来西亚','食品级抹茶按用途与等级形成明显价格带','低/中/高价格带',NULL,'2026','Demo市场推演',NULL,'inference',0.65,'2026-08-29','["广告投放","客户经营"]');

INSERT INTO buyer_personas VALUES
('persona-importer','马来西亚','食品原料进口商','采购负责人','["稳定供货","MOQ","认证","批次一致性"]','["价格波动","交期风险","合规资料不完整"]','["年采购量","认证要求","采购周期","决策权"]','["LinkedIn","WhatsApp","邮件"]','["en","ms"]'),
('persona-coffee','马来西亚','咖啡与新茶饮连锁','产品研发负责人','["颜色口感","单杯成本","样品测试"]','["门店一致性","配方适配"]','["门店数","测试计划","月用量"]','["Instagram","WhatsApp","邮件"]','["en","ms"]'),
('persona-bakery','马来西亚','烘焙食品制造商','原料采购经理','["耐热颜色稳定","工业包装","批次检测"]','["烘焙后变色","最低起订量"]','["产品类型","产线规模","年度采购量"]','["LinkedIn","邮件"]','["en"]');

INSERT INTO assets VALUES
('asset-tea-garden','ent-demo-matcha','image','贵州茶园航拍（场景示意）','产地','遮阴茶园与山地生态环境','证明原料产地与种植环境','["马来西亚"]','["食品原料进口商"]','["LinkedIn","官网"]','mock',NULL,'/demo/assets/tea-garden.jpg','demo_only',1,'["茶园","产地","航拍"]'),
('asset-line','ent-demo-matcha','video','自动化精制线（场景示意）','工厂','研磨、筛分与包装流程','证明规模化与批次管理能力','["马来西亚"]','["食品原料进口商","烘焙食品制造商"]','["LinkedIn","Facebook"]','mock',NULL,'/demo/assets/production-line.mp4','demo_only',1,'["工厂","生产线","质量"]'),
('asset-lab','ent-demo-matcha','image','实验室检测（场景示意）','质量','批次留样与检测场景','证明质量控制流程','["马来西亚"]','["食品原料进口商"]','["LinkedIn","销售资料"]','mock',NULL,'/demo/assets/lab-test.jpg','demo_only',1,'["实验室","检测"]'),
('asset-latte','ent-demo-matcha','video','抹茶拿铁应用（场景示意）','应用','咖啡门店配方应用','展示饮品适配场景','["马来西亚"]','["咖啡与新茶饮连锁"]','["Instagram","Facebook"]','mock',NULL,'/demo/assets/matcha-latte.mp4','demo_only',1,'["咖啡","饮品","应用"]');

INSERT INTO inspirations VALUES
('ins-quality','马来西亚','LinkedIn',NULL,'carousel','How to qualify a matcha supplier in 5 checks','如何判断供应稳定和合规','问题清单→工厂证据→规格书下载','不照搬他人品牌、数据和画面','Download the specification sheet',91,0.86,'selected'),
('ins-latte','马来西亚','Instagram',NULL,'short_video','One matcha, three café menu applications','如何降低新品测试成本','成品钩子→三种应用→样品CTA','不复制配方和音乐','Request a formulation sample',88,0.82,'selected'),
('ins-bakery','马来西亚','Facebook',NULL,'short_video','Why matcha changes color after baking','如何验证耐热颜色稳定性','失败画面→原因解释→对比测试','不作未经检测的效果保证','Get the baking-grade spec',84,0.79,'selected');

INSERT INTO growth_tasks VALUES
('task-my-30d','ent-demo-matcha','马来西亚食品饮料渠道增长任务','["prd-m01","prd-m02"]','马来西亚','["食品原料进口商","咖啡与新茶饮连锁","烘焙食品制造商"]','["en","ms"]','["LinkedIn","Facebook","Instagram","WhatsApp"]','协同模式','2026-08-29','2026-09-27',30000,'{"target_accounts":30,"qualified_inquiries":6,"sample_opportunities":2}','active','项目负责人');

INSERT INTO task_actions VALUES
('act-01','task-my-30d','2026-08-29T09:10:00+08:00','市场研究数字员工','knowledge_scan','读取企业资料并发现Halal信息缺口','马来西亚买家资格审查需要明确Halal状态','["doc-profile","fact-my-halal"]',0,'{"gap":"halal_status"}','创建知识缺口审批','completed'),
('act-02','task-my-30d','2026-08-29T09:30:00+08:00','内容数字员工','content_generation','生成英文供应商筛选内容','进口商更关注稳定供货与合规证据','["ins-quality","asset-line","asset-lab"]',18,'{"content_id":"cnt-quality-en"}','提交事实审核','completed'),
('act-03','task-my-30d','2026-08-29T14:20:00+08:00','客户经营数字员工','lead_qualification','客户C提出马来西亚独家代理要求','独家代理属于红线动作','["cust-c","conv-c"]',0,'{"intent_score":91,"handoff":true}','转人工处理','blocked_for_human');

INSERT INTO approvals VALUES
('appr-halal','task-my-30d','act-01','knowledge_gap','确认Halal认证状态','公开资料不足，禁止自动宣称','medium','{"field":"halal","current":"资料确认中"}','2026-08-29T09:12:00+08:00','pending','质量负责人',NULL,NULL),
('appr-content','task-my-30d','act-02','product_fact','英文内容产品事实审核','发布前确认产能、MOQ与检测措辞','low','{"content_id":"cnt-quality-en"}','2026-08-29T09:32:00+08:00','approved','产品经理','2026-08-29T10:00:00+08:00','规格与证据引用准确'),
('appr-exclusive','task-my-30d','act-03','human_handoff','客户C独家代理请求','涉及区域保护与年度商务条款','high','{"customer_id":"cust-c","request":"马来西亚独家代理"}','2026-08-29T14:21:00+08:00','pending','项目负责人',NULL,NULL);

INSERT INTO contents VALUES
('cnt-quality-en','task-my-30d','ins-quality','prd-m02','5 checks for a reliable matcha supplier','carousel','en','食品原料进口商','LinkedIn','Check batch consistency, food-safety documents, application fit, supply capacity and sample process before qualifying a matcha supplier.','Download the Demo specification sheet.','["doc-spec-m02","doc-test"]','["asset-line","asset-lab"]','approved','Demo content; claims and transaction terms are simulated.'),
('cnt-latte-en','task-my-30d','ins-latte','prd-m02','Three café applications from one beverage-grade matcha','short_video','en','咖啡与新茶饮连锁','Instagram','Explore latte, sparkling matcha and blended applications designed for menu testing.','Request a Demo formulation sample.','["doc-spec-m02"]','["asset-latte"]','scheduled','Demo content; claims and transaction terms are simulated.'),
('cnt-bakery-en','task-my-30d','ins-bakery','prd-m01','Choosing matcha for baking applications','short_video','en','烘焙食品制造商','Facebook','Fineness, dosage and process temperature all influence finished color. Start with a controlled sample test.','Get the Demo baking-grade specification.','["doc-spec-m01"]','["asset-tea-garden"]','draft','Demo content; claims and transaction terms are simulated.');

INSERT INTO content_schedule VALUES
('sch-01','task-my-30d','cnt-quality-en','2026-08-30T10:00:00+08:00','LinkedIn','published','2026-08-30T10:01:00+08:00','DEMO-LI-001','{"impressions":12840,"clicks":386,"downloads":42,"inquiries":4}',0),
('sch-02','task-my-30d','cnt-latte-en','2026-08-31T19:30:00+08:00','Instagram','scheduled',NULL,NULL,'{}',0),
('sch-03','task-my-30d','cnt-bakery-en','2026-09-02T11:00:00+08:00','Facebook','draft',NULL,NULL,'{}',0);

INSERT INTO ad_campaigns VALUES
('ad-importers','task-my-30d','马来西亚食品原料采购负责人获客','lead_generation','马来西亚','["吉隆坡","槟城"]','["食品原料进口商"]','["Procurement Manager","Sourcing Manager"]','["cnt-quality-en"]',12000,3260,'active','{"impressions":46500,"clicks":930,"landing_visits":612,"downloads":61,"inquiries":5,"cpl_cny":652}'),
('ad-cafes','task-my-30d','咖啡连锁新品测试样品计划','lead_generation','马来西亚','["吉隆坡","新山"]','["咖啡与新茶饮连锁"]','["R&D Manager","Beverage Director"]','["cnt-latte-en"]',8000,0,'pending_approval','{}');

INSERT INTO customers VALUES
('cust-a','客户A（Mock）','A','马来西亚','食品原料进口商','采购负责人','LinkedIn','["prd-m02"]','每月1–2吨','["Halal状态","批次检测","稳定供货"]','["合规资料完整性","价格稳定"]',82,'qualified','海外销售','发送可公开资料并确认年度采购量','Demo模拟客户，不代表真实企业或个人'),
('cust-b','客户B（Mock）','B','马来西亚','咖啡与新茶饮连锁','产品研发负责人','Instagram','["prd-m02","prd-m03"]','首轮测试2kg','["配方适配","颜色与口感"]','["新品测试周期","门店一致性"]',76,'sample_requested','海外销售','审批首次寄样','Demo模拟客户，不代表真实企业或个人'),
('cust-c','客户C（Mock）','C','马来西亚','区域经销商','总经理','WhatsApp','["prd-m01","prd-m02"]','年度约20吨','["区域独家","年度价格","交期"]','["渠道保护","利润空间"]',91,'human_handoff','项目负责人','安排30分钟人工商务会议','Demo模拟客户，不代表真实企业或个人');

INSERT INTO conversations VALUES
('conv-a','cust-a','LinkedIn','2026-08-30T11:22:00+08:00','active','客户经营数字员工','客户索取M-02规格书并询问Halal状态'),
('conv-b','cust-b','Instagram','2026-08-30T13:10:00+08:00','waiting_approval','海外销售','客户申请2kg菜单测试样品'),
('conv-c','cust-c','WhatsApp','2026-08-30T14:02:00+08:00','human_handoff','项目负责人','客户提出独家代理与年度价格要求');

INSERT INTO messages VALUES
('msg-a1','conv-a','2026-08-30T11:22:00+08:00','customer','客户A（Mock）','en','Please send the beverage-grade specification and confirm Halal status.','[]','[]',0,NULL),
('msg-a2','conv-a','2026-08-30T11:23:00+08:00','agent','客户经营数字员工','en','I can share the approved M-02 Demo specification. Halal status is currently under document confirmation, so I will not represent it as certified.','["doc-spec-m02"]','["doc-spec-m02","appr-halal"]',1,NULL),
('msg-b1','conv-b','2026-08-30T13:10:00+08:00','customer','客户B（Mock）','en','We would like 2 kg for a 28-store menu test.','[]','[]',0,NULL),
('msg-b2','conv-b','2026-08-30T13:11:00+08:00','agent','客户经营数字员工','en','I have recorded the test use and quantity. A first sample requires approval; our sales role will confirm the next step.','[]','["rule-sample"]',1,NULL),
('msg-c1','conv-c','2026-08-30T14:02:00+08:00','customer','客户C（Mock）','en','Can you grant us Malaysia exclusivity and an annual price?','[]','[]',0,NULL),
('msg-c2','conv-c','2026-08-30T14:03:00+08:00','agent','客户经营数字员工','en','This request requires a human commercial review. I have handed it to the project owner without making a commitment.','[]','["rule-exclusive","rule-price"]',1,'独家代理、年度价格属于人工红线');

INSERT INTO opportunities VALUES
('opp-a','task-my-30d','cust-a','客户A饮品级抹茶年度供应（Mock）','qualified',420000,0.45,'2026-10-31','["prd-m02"]','每月1–2吨','2026-08-30T11:23:00+08:00','确认认证需求与年度采购量','Demo模拟商机金额'),
('opp-b','task-my-30d','cust-b','客户B门店菜单测试（Mock）','sample',180000,0.35,'2026-11-15','["prd-m02","prd-m03"]','首轮测试2kg','2026-08-30T13:11:00+08:00','完成首次寄样审批','Demo模拟商机金额'),
('opp-c','task-my-30d','cust-c','客户C区域经销合作（Mock）','negotiation',680000,0.55,'2026-11-30','["prd-m01","prd-m02"]','年度约20吨','2026-08-30T14:03:00+08:00','人工评估区域与价格条款','Demo模拟商机金额');

INSERT INTO attribution_events VALUES
('attr-01','cust-a','opp-a','2026-08-30T10:18:00+08:00','content_impression','content','cnt-quality-en','ad-importers','cnt-quality-en','{"platform":"LinkedIn"}'),
('attr-02','cust-a','opp-a','2026-08-30T10:19:00+08:00','spec_download','document','doc-spec-m02','ad-importers','cnt-quality-en','{}'),
('attr-03','cust-a','opp-a','2026-08-30T11:22:00+08:00','inquiry','conversation','conv-a','ad-importers','cnt-quality-en','{}'),
('attr-04','cust-a','opp-a','2026-08-30T11:24:00+08:00','qualified','opportunity','opp-a','ad-importers','cnt-quality-en','{"score":82}'),
('attr-05','cust-b','opp-b','2026-08-30T13:10:00+08:00','sample_request','conversation','conv-b',NULL,'cnt-latte-en','{"quantity":"2kg"}');

INSERT INTO roles VALUES
('role-admin','集团管理员','["*"]','all'),
('role-owner','项目负责人','["task.manage","approval.decide","customer.read","commercial.handoff"]','project'),
('role-brand','品牌审核','["content.review","asset.read"]','project'),
('role-product','产品经理','["product.manage","content.fact_review"]','enterprise'),
('role-quality','质量负责人','["compliance.manage","approval.decide"]','enterprise'),
('role-sales','海外销售','["customer.manage","document.send","sample.request"]','assigned'),
('role-finance','财务审批','["budget.approve","commercial.read"]','enterprise'),
('role-vendor','外部内容服务商','["content.draft","asset.read_limited"]','task');

INSERT INTO organization_members VALUES
('member-owner','项目负责人','role-owner','human','active','2026-08-29T16:00:00+08:00'),
('member-agent-market','市场研究数字员工','role-product','agent','active','2026-08-29T15:55:00+08:00'),
('member-agent-content','内容数字员工','role-brand','agent','active','2026-08-29T15:58:00+08:00'),
('member-agent-crm','客户经营数字员工','role-sales','agent','active','2026-08-29T16:00:00+08:00');

INSERT INTO integrations VALUES
('int-linkedin','LinkedIn Demo连接','social','demo','connected','["content.publish","analytics.read"]','2026-08-29T15:50:00+08:00',28,NULL),
('int-whatsapp','WhatsApp Demo连接','messaging','demo','connected','["message.send","message.read"]','2026-08-29T15:52:00+08:00',9,NULL),
('int-assets','本地Demo素材库','storage','local','connected','["asset.read"]','2026-08-29T15:45:00+08:00',47,NULL),
('int-crm','Demo CRM','crm','demo','warning','["customer.read","customer.write"]','2026-08-29T14:00:00+08:00',12,'发现1条待匹配询盘');

INSERT INTO security_audit_events VALUES
('audit-01','2026-08-29T09:32:00+08:00','agent','member-agent-content','approval.request','content','cnt-quality-en','low','success','{"approval_id":"appr-content"}'),
('audit-02','2026-08-29T14:03:00+08:00','agent','member-agent-crm','commercial.handoff','customer','cust-c','high','success','{"reason":"exclusive_distribution"}'),
('audit-03','2026-08-29T14:04:00+08:00','system',NULL,'policy.block','message','conv-c','high','success','{"blocked_actions":["quote","exclusive_commitment"]}');
