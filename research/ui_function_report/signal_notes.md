# 信号提取 / 市场与买家信号：真实功能页竞品调研

调研日期：2026-08-29  
范围：Clay Signals、Common Room、6sense、Sprinklr。仅将真实产品后台截图或官方帮助中心中嵌入的真实后台截图作为功能证据。

## 证据等级

- **A**：官方帮助中心/官方课程中可明确辨认的真实产品后台页面，能够验证具体控件、字段和交互。
- **B**：官方文档对功能和操作路径的明确描述，或真实后台局部截图；足以验证功能，但不足以完整还原页面。
- **C**：官网营销图、概念动画、第三方转载。只可用于理解定位，不作为功能存在的证据。

## 一、6sense Sales Intelligence：把信号变成“人员行动队列”

**证据等级：A**  
官方来源：[People 6sense Sales Intelligence Dashboard](https://support.6sense.com/v1/docs/people-6sense-sales-intelligence-dashboard)  
截图：`signal_assets/6sense-people-dashboard.png`

### 功能页观察

- 顶层不是图表，而是可执行的对象列表；一级标签为 `Accounts / People / Recent Activities / Recommended Actions`。
- People 页内再按 `Trending Up / Trending Down / Priority Profile` 分流，把趋势直接变成工作队列。
- 每行把人物、职位、地区、Engagement Trend、销售活动、营销互动、所属账户放在同一视线内。
- 右侧保留邮件、LinkedIn、CRM 等动作入口，信号不止用于“看”，而是直接承接动作。
- 提供 `Accounts without sales activity` 快捷筛选，能找到“高意向但无人跟进”的漏接机会。
- 官方说明中还列出 Buying Stage、Intent Score、Profile Fit、Last 6QA 等可选字段，说明列表可以按成熟度、强度和适配度排序。

### 对灵枢的启发

信号中心首页应默认是“买家/企业行动队列”，而不是宏观数据大屏。推荐列表列：

1. 买家/企业与国家地区；
2. 身份标签（进口商、经销商、采购商、协会、媒体）；
3. 信号类型（询 MOQ、认证、代理权、交期、样品等）；
4. 信号强度与变化趋势；
5. 最近证据与发生时间；
6. Agent 建议动作；
7. 当前责任人/是否无人承接；
8. 一键“自动跟进 / 转人工 / 暂不处理”。

## 二、Common Room：把单点信号升级为“速度、趋势与组合”

**证据等级：A（局部真实后台）+ B（官方功能说明）**  
官方来源：[Signal Trend Tracking](https://www.commonroom.io/docs/using-common-room/signal-trend-tracking/)  
截图：`signal_assets/commonroom-signal-trend.png`

### 功能页观察

- 联系人/账户详情页用大号 Lead score、百分位和等级（如 Excellent）给出总体优先级。
- 折线展示分数随时间变化；悬停显示某日期分数及环比变化，不只呈现一个静态分数。
- 分数下方列出构成证据，并使用绿色上升/红色下降标识方向，例如内容创建、LinkedIn 评论等。
- 后方页面仍保留联系人详情、Segments、关键字段与 `Add to sequence / Draft AI message` 等后续动作。
- 官方文档说明趋势字段可被用于筛选、评分、分群和自动告警；也能作为 RoomieAI 提示变量。

### 对灵枢的启发

- “强信号”必须同时显示：**当前强度、变化速度、证据构成、最近发生时间**。
- 不宜只给一个黑盒 87 分；应允许展开“为什么是 87 分”。
- 适合贵州出口的组合信号示例：
  - 7 天内浏览认证页 + 询问 MOQ + 来自目标国家 = 高意向采购；
  - 多次查看工厂/产能内容 + 询交期 = 供应稳定性需求；
  - 询独家代理 + 关注多个 SKU + 有渠道身份证据 = 渠道伙伴候选；
  - 互动频率上升但 48 小时无人跟进 = 高优先级转人工。

## 三、Sprinklr Listening Copilot：让 AI 的结论带证据、范围与可追问性

**证据等级：A**  
官方来源：[Sprinklr Copilot for Listening Dashboards](https://www.sprinklr.com/help/articles/sprinklr-ai/sprinklr-copilot-for-listening-dashboards/678105272136755ad71c7225)  
截图：`signal_assets/sprinklr-copilot-suggestions.png`

### 功能页观察

- Copilot 以侧栏/浮层方式附着在 Listening Dashboard，不替代原始数据界面。
- 默认建议动作包括 Summarize Dashboard、Identify Anomalies、Sentiment Analysis，也支持自然语言追问。
- Suggestion Categories 将提示分为 AI Suggestions、标准场景和 Build Widgets，降低用户不知道问什么的门槛。
- 官方说明明确：回答基于 Dashboard 参数，可引用 Supporting Widgets，并提供 source/citation；也能从具体数据点 Drilldown 后携带范围进入 Copilot。
- 反馈、复制、历史会话、分享等功能形成“洞察—协作—学习”闭环。

### 对灵枢的启发

- Agent 不能只输出“东南亚茶叶需求正在上升”，必须带：来源、原文/截图、时间、国家、匹配规则和置信度。
- 点击任一信号后，右侧应出现“证据抽屉”，包含原始证据、AI 判断过程、相关信号和建议动作。
- 默认问题可以变成业务化按钮：
  - “为什么这是高意向买家？”
  - “有哪些相互印证的证据？”
  - “建议用什么内容继续验证？”
  - “能否自动回复？需要我确认什么？”

## 四、Clay Signals：在表格数据上配置持续监测与自动路由

**证据等级：B**  
官方来源：[Signals in Clay](https://university.clay.com/docs/signals)、[Custom Signals](https://university.clay.com/docs/custom-signals)、[Setting Up Signals in Clay](https://university.clay.com/lessons/setting-up-signals-in-clay)

### 已验证功能

- 从现有联系人/企业表发起监测；默认信号包括新入职、晋升、换工作、新闻与融资等。
- 配置对象标识、过滤条件、运行频率，可先添加 sample results 预览结果形态。
- 自定义信号可持续监测网站、社媒、RSS、技术采用、合规变化等，并用 AI 比较两次运行差异。
- 信号结果可写入新表/已有表，并路由到 Slack、Webhook、Salesforce 或 HubSpot。
- 支持暂停、编辑、控制频率和信用额度消耗。

### 对灵枢的启发

- 信号创建器不应要求用户搭复杂工作流，只问五件事：监测谁、看什么变化、多久看一次、什么条件算重要、触发后允许 Agent 做什么。
- 保存前展示“样例信号卡”，尤其适合中小外贸企业理解规则是否正确。
- 监测成本和频率应透明；低价值对象可降频，高价值目标市场与重点渠道商可高频。

## 五、跨竞品稳定出现的 UI 模式

### 1. 列表优先，而非数据墙

信号首页应回答“今天最该处理谁”，宏观趋势作为二级页或顶部摘要。6sense 的对象队列比传统 Listening 大屏更接近数字员工日常工作。

### 2. 筛选器围绕业务决策

推荐筛选维度：目标国家、买家类型、产品线、信号来源、信号类型、强度、变化趋势、发生时间、是否已跟进、自动化权限、责任人。

### 3. 强度必须可解释

每个分数至少拆成：适配度、意向度、时效性、证据完整度。用户可看到加分/减分项，避免黑盒。

### 4. 证据与结论同屏

列表只展示 1 行摘要；详情抽屉展示原始对话、网页、社媒或互动记录，标注时间和来源，并说明 Agent 是如何判断的。

### 5. 建议动作必须受权限约束

- 低风险：自动打标签、补充研究、生成跟进内容、提醒责任人。
- 中风险：自动发送标准澄清问题，可允许按品牌规则执行。
- 高风险：报价、交期承诺、认证承诺、独家代理、付款条款必须转人工审批。

### 6. 转人工不是失败状态

列表和详情页都应有显式 `转人工`；交接包自动包含买家摘要、证据链、已执行动作、未解决问题和推荐回复。人工处理后结果回写，成为 Agent 学习样本。

## 六、推荐的“信号中心”页面骨架

### 顶部：目标与健康度

- 当前业务目标：如“30 天内找到 20 家东南亚茶叶渠道商”。
- 今日新信号、高意向信号、无人承接、等待审批。
- Agent 监测状态、数据源异常和最近刷新时间。

### 左侧：保存视图

- 今日优先
- 高意向采购
- 渠道伙伴候选
- 认证/合规需求
- 无人承接
- Agent 自动跟进中
- 已转人工

### 中间：信号行动队列

以买家/企业为行，显示身份、强度趋势、证据摘要、建议动作、Agent 当前状态。支持批量自动研究、生成内容、提醒或转人工。

### 右侧：证据与动作抽屉

依次显示：AI 结论、强度拆解、原始证据、相关历史、推荐动作、权限提示、执行预览、人工接管按钮。

## 七、P0 开发优先级

1. **P0：买家/企业信号列表**——保存视图、业务筛选、强度趋势、状态与责任人。
2. **P0：证据抽屉**——原始来源、时间、AI 理由、置信度、相关证据。
3. **P0：建议动作与转人工**——自动研究、生成跟进内容、标准澄清、人工接管。
4. **P1：组合信号规则**——支持多个弱信号叠加成为强信号。
5. **P1：趋势与异常**——近 7/30 天变化、突然升温、长期无人响应。
6. **P1：信号效果学习**——记录哪些信号最终带来有效询盘、样品和订单，反向校准权重。

## 截图清单

| 文件 | 产品 | 页面/功能 | 证据等级 |
|---|---|---|---|
| `6sense-people-dashboard.png` | 6sense | People Dashboard：趋势分组、人员列表、互动与快捷动作 | A |
| `commonroom-signal-trend.png` | Common Room | 联系人 Lead score、趋势折线、构成信号与后续动作 | A |
| `sprinklr-copilot-suggestions.png` | Sprinklr | Listening Copilot 的 AI 建议问题与分析入口 | A |

