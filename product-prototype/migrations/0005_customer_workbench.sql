PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customer_workbench_profiles (
  customer_id TEXT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  source_content TEXT NOT NULL,
  translated_summary TEXT NOT NULL,
  reply_draft TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  qualification_json TEXT NOT NULL DEFAULT '[]',
  conversation_tags_json TEXT NOT NULL DEFAULT '[]',
  psychology_json TEXT NOT NULL DEFAULT '[]',
  sales_json TEXT NOT NULL DEFAULT '[]',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  memory_summary TEXT NOT NULL DEFAULT '',
  qualification_fields_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_workbench_tasks (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount_cny REAL NOT NULL DEFAULT 0,
  sla_text TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '待处理' CHECK(status IN ('待处理','已完成','已驳回')),
  due_at TEXT,
  decided_at TEXT,
  decided_by TEXT,
  decision_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_memories (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_workbench_tasks_status ON customer_workbench_tasks(status, due_at);
CREATE INDEX IF NOT EXISTS idx_customer_memories_customer_time ON customer_memories(customer_id, created_at);

INSERT OR IGNORE INTO customers VALUES
('adrian','Adrian Tan','AT','马来西亚','食品原料进口商','采购经理','LinkedIn','["prd-m02"]','500kg 试单','["食品级认证","批次稳定","正式报价"]','["供应稳定性","合规资料"]',91,'quotation','王宁 · 海外业务部','确认产品等级、预算与交付地址','Demo模拟客户，不代表真实企业或个人'),
('maya','Maya Chen','MC','新加坡','高端酒类渠道商','渠道负责人','Instagram','["prd-m01"]','年度计划待确认','["独家经销","标签合规","品鉴支持"]','["动销能力","合作边界"]',86,'opportunity','周岚 · 海外销售','审核渠道覆盖与年度采购计划','Demo模拟客户，不代表真实企业或个人'),
('omar','Omar Said','OS','阿联酋','储能系统集成商','技术采购','LinkedIn','["prd-m02"]','20MWh 项目','["IEC 报告","高温循环","样品验证"]','["高温衰减","交付风险"]',83,'qualified','王宁 · 海外业务部','确认电芯规格、验证协议与样品数量','Demo模拟客户，不代表真实企业或个人'),
('elena','Elena Rossi','ER','意大利','文化小团旅行社','产品经理','Instagram','[]','8 天线路','["旅行社净价","英文导游","酒店等级"]','["国际接待成熟度","渠道利润"]',76,'new_inquiry','周岚 · 海外销售','确认出行月份、人数和酒店等级','Demo模拟客户，不代表真实企业或个人'),
('diego','Diego Santos','DS','巴西','矿山车队供应商','渠道采购','YouTube','[]','1×40HQ','["12.00R24","载荷指数","INMETRO"]','["工况适配","停机成本"]',88,'quotation','王宁 · 海外业务部','确认花纹、工况与目的港','Demo模拟客户，不代表真实企业或个人'),
('sokha','Sokha Lim','SL','柬埔寨','媒体网络','版权采购','Email','[]','2 部纪录片','["电视+OTT","12 个月授权","本地化物料"]','["权利边界","本地化成本"]',72,'qualified','刘蓁 · 品牌审核','确认片单、媒介范围与上线窗口','Demo模拟客户，不代表真实企业或个人');

INSERT OR IGNORE INTO conversations VALUES
('conv-adrian','adrian','LinkedIn','2026-08-29T10:42:00+08:00','active','客户经营数字员工','500kg 抹茶，要求食品级认证与正式报价'),
('conv-maya','maya','Instagram','2026-08-29T10:10:00+08:00','active','客户经营数字员工','评估酒类经销合作、进口标签与品鉴支持'),
('conv-omar','omar','LinkedIn','2026-08-29T09:42:00+08:00','active','客户经营数字员工','储能电芯送样、IEC 报告与高温循环数据'),
('conv-elena','elena','Instagram','2026-08-29T08:55:00+08:00','active','客户经营数字员工','贵州 8 天游线、欧洲旅行社净价与英文接待'),
('conv-diego','diego','YouTube','2026-08-29T09:20:00+08:00','active','客户经营数字员工','矿用轮胎参数、南美认证与 40HQ 试单报价'),
('conv-sokha','sokha','Email','2026-08-28T16:30:00+08:00','active','客户经营数字员工','贵州纪录片东南亚播映授权与本地化交付');

INSERT OR IGNORE INTO messages VALUES
('msg-adrian-1','conv-adrian','2026-08-29T10:42:00+08:00','customer','Adrian Tan','en','Hi, we are looking for a stable matcha supplier for our beverage clients. Could you share the specifications, sample options and a quote for 500kg?','[]','[]',0,NULL),
('msg-maya-1','conv-maya','2026-08-29T10:10:00+08:00','customer','Maya Chen','en','We distribute premium spirits to hotels and Chinese restaurants in Singapore. Do you offer exclusive distribution, and can you provide label-compliance documents and tasting support?','[]','[]',0,NULL),
('msg-omar-1','conv-omar','2026-08-29T09:42:00+08:00','customer','Omar Said','en','We are qualifying LFP cell suppliers for a 20 MWh storage project in the UAE. Please share IEC reports, high-temperature cycle data and your sample validation lead time.','[]','[]',0,NULL),
('msg-elena-1','conv-elena','2026-08-29T08:55:00+08:00','customer','Elena Rossi','en','We design small-group cultural tours for Italian travelers. Could you send an 8-day Guizhou itinerary, net rates for agencies and details about English-speaking guides?','[]','[]',0,NULL),
('msg-diego-1','conv-diego','2026-08-29T09:20:00+08:00','customer','Diego Santos','en','We supply tires to mining fleets in Brazil. Please confirm the load index, INMETRO compliance and a trial quotation for one 40HQ container of 12.00R24 tires.','[]','[]',0,NULL),
('msg-sokha-1','conv-sokha','2026-08-28T16:30:00+08:00','customer','Sokha Lim','en','We are interested in licensing two Guizhou documentary titles for television and OTT distribution in Cambodia. Please advise on English masters, Khmer localization materials and a 12-month rights package.','[]','[]',0,NULL);

INSERT OR IGNORE INTO opportunities VALUES
('opp-adrian','task-my-30d','adrian','Lumi Ingredients 500kg 正式采购','quotation',680000,0.78,'2026-09-30','["prd-m02"]','500kg','2026-08-29T10:42:00+08:00','确认并发送正式报价','Demo模拟商机金额'),
('opp-maya','task-my-30d','maya','新加坡渠道经销合作','opportunity',1200000,0.60,'2026-11-30','["prd-m01"]','年度计划待确认','2026-08-29T10:10:00+08:00','审批渠道政策','Demo模拟商机金额'),
('opp-omar','task-my-30d','omar','20MWh 储能项目样品测试','qualified',180000,0.35,'2026-11-15','["prd-m02"]','样品数量待确认','2026-08-29T09:42:00+08:00','安排技术澄清','Demo模拟商机金额');

INSERT OR IGNORE INTO customer_workbench_tasks
(id, customer_id, opportunity_id, title, reason, amount_cny, sla_text, kind, status, due_at) VALUES
('cwt-adrian-quote','adrian','opp-adrian','确认 Adrian Tan 的 500kg 正式报价','AI 已整理规格、成本和历史价格，需要人工确认最终价格',680000,'剩余 18 分钟','报价','待处理','2026-08-29T11:18:00+08:00'),
('cwt-maya-exclusive','maya','opp-maya','审批 Maya Chen 的独家经销申请','涉及区域授权，需要负责人确认经营边界',1200000,'剩余 42 分钟','审批','待处理','2026-08-29T11:42:00+08:00'),
('cwt-elena-followup','elena',NULL,'跟进 Alpine Routes 的超期商机','客户 48 小时未响应，AI 建议调整跟进内容',230000,'已超时 2 小时','跟进','待处理','2026-08-29T08:00:00+08:00');

INSERT OR IGNORE INTO customer_workbench_profiles VALUES
('adrian','Lumi Ingredients','山地特色产业','工厂品质与批次追溯视频','我们正在为饮品客户寻找稳定的抹茶供应商，希望获取规格、样品方案以及 500kg 报价。','Hi Adrian, thank you for reaching out. I can share our export specification and sample options. Before preparing the right quote, may I confirm your required grade and target application?','["500kg 测试采购","证据驱动型","风险敏感","供应商比选"]','[["需求 Need","明确","100%"],["时间 Timeline","30 天内","82%"],["决策 Authority","采购经理","75%"],["预算 Budget","待确认","40%"]]','[["采购阶段","供应商初筛","正在同时验证产品、认证与报价"],["核心意图","获取可比较的正式方案","采购数量明确，尚未确认目标等级"],["显性关注","食品级认证 / 批次稳定","认证要求在首次询问中主动提出"]]','[["决策风格","证据驱动型","92%","先索要规格与认证，再讨论价格"],["风险敏感度","较高","88%","优先关注认证、品质和供应稳定"]]','[["情境 Situation","为饮品客户寻找稳定供应商","已确认"],["问题 Problem","现有供应稳定性或合规材料不足","高概率"],["影响 Implication","可能影响新品计划与供应商审核","待追问"],["价值 Need-payoff","稳定批次＋完整认证可加速准入","明确"],["决策链","采购经理发起，技术团队可能参与","待确认"],["竞争态势","大概率处于多供应商比选","需防守"],["成交阻力","等级、预算、交付地址未补全","3 项"],["推进窗口","建议 30 分钟内给出证据型响应","高优先"]]','[["客户原话","询问 500kg 报价、规格及样品","对话 · 今天 10:42"],["企业身份","食品原料进口商","企业库 · 已核验"],["内容行为","英文规格书累计查看 3 次","内容追踪 · 近 7 天"],["知识引用","抹茶规格书 / 出口认证资料","企业知识库 · 已授权"]]','服务马来西亚连锁饮品品牌，关注批次稳定性、食品认证与交期。','{}','2026-08-29T10:42:00+08:00');

-- Remaining customers use structured server defaults derived from their CRM fields; the
-- profile rows below preserve only UI-specific company, translation and draft content.
INSERT OR IGNORE INTO customer_workbench_profiles
(customer_id,company_name,industry,source_content,translated_summary,reply_draft,tags_json,memory_summary) VALUES
('maya','Meridian Spirits','白酒','新加坡餐饮渠道品鉴活动','我们向新加坡酒店和中餐厅分销高端烈酒，希望了解独家经销、标签合规和品鉴支持。','Hi Maya, thank you for your interest. Could you confirm your current channel coverage and annual purchase plan?','["渠道经销","独家权益","标签合规","品鉴支持"]','覆盖新加坡酒店和中餐饮渠道，重视合规资料、独家权益与本地品鉴支持。'),
('omar','GulfGrid Energy','能源','高温工况储能电芯测试案例','阿联酋 20MWh 储能项目正在筛选磷酸铁锂电芯供应商，需要 IEC 报告、高温循环数据和样品验证周期。','Hi Omar, could you confirm the target cell format, validation protocol and required sample quantity?','["20MWh 项目","技术送样","IEC 报告","高温工况"]','阿联酋储能集成商，当前项目容量 20MWh，技术准入优先于价格谈判。'),
('elena','Alpine Routes','文旅','贵州山地与少数民族文化线路','希望获取贵州 8 天游线、旅行社净价以及英文导游服务信息。','Hi Elena, could you confirm your preferred travel month, group size and hotel category?','["欧洲旅行社","8 天游线","渠道净价","英文接待"]','主营意大利文化小团，关注旅行社净价、英文导游和可直接上架的逐日行程。'),
('diego','Andes Fleet Supply','先进制造','矿山车队轮胎耐久与总成本案例','需要确认 12.00R24 轮胎的载荷指数、INMETRO 合规和一个 40HQ 的试单报价。','Hi Diego, could you confirm the tread pattern, operating conditions and destination port?','["矿山车队","40HQ 试单","INMETRO","12.00R24"]','服务巴西矿山车队，首次采购倾向整柜试单，重视 INMETRO 和高载荷工况。'),
('sokha','Mekong Media Network','广电','国际传播节目目录','希望获得两部贵州纪录片在柬埔寨电视和 OTT 渠道的 12 个月播映授权。','Hi Sokha, could you share the title list, intended channels, territory scope and planned launch window?','["内容授权","电视＋OTT","12 个月版权","本地化交付"]','柬埔寨媒体网络，关注电视与 OTT 双渠道授权、英文母版和高棉语本地化材料。');

PRAGMA optimize;
