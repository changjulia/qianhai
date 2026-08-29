# 客服承接 / Agent 人工接管真实功能页竞品调研

## 证据等级

- **A 级**：厂商官方帮助中心中的真实产品后台截图，可作为功能与界面证据。
- **B 级**：厂商官方帮助中心的明确文字说明，但页面没有对应后台截图，可作为功能逻辑证据。
- **C 级**：官网营销页、概念动画或第三方转述，只能说明定位，**不得作为功能证据**。本笔记未使用 C 级证据得出功能结论。

## 1. Intercom Fin

### A 级截图

1. `service_assets/intercom-fin-inbox.png`
   - 来源：[View Fin AI Agent's conversations from the Inbox](https://www.intercom.com/help/en/articles/7860256-view-fin-ai-agent-s-conversations-from-the-inbox)
   - 真实界面要点：Fin 会话作为 Inbox 内的独立文件夹/视图存在；官方默认区分 All、Resolved、Escalated & Handoff、Pending、Negative CX Score。
   - 可借鉴：把 Agent 会话按“处理中 / 已解决 / 待人工 / 异常反馈”组织成状态队列，不要让人逐条翻聊天记录判断。

2. `service_assets/intercom-escalation-rule.png`
   - 来源：[Manage Fin AI Agent's escalation guidance and rules](https://www.intercom.com/help/en/articles/12396892-manage-fin-ai-agent-s-escalation-guidance-and-rules)
   - 真实界面要点：升级规则以条件构建器配置，可基于 User、Company、Conversation data、Audience 等结构化信息触发。
   - 可借鉴：灵枢应把“公司类型、采购意图、目标市场、预计采购额、认证要求、代理诉求”做成一等条件，而不是只靠关键词。

3. `service_assets/intercom-escalation-guidance.png`
   - 来源同上。
   - 真实界面要点：除了结构化规则，还允许用自然语言 Guidance 描述何时升级、升级前询问什么。
   - 可借鉴：提供“规则条件 + 自然语言策略”双层配置；前者可审计，后者提高业务人员配置效率。

### B 级功能证据

- Fin 默认会在明确要求人工、强烈负面情绪、重复多轮无解时升级；也支持按 Sentiment、Issue Type、订单金额、VIP 标记等属性升级。
- 人工仅“被分配”会话不会停止 Fin；**人工发送一条面向客户的回复后，Fin 才停止继续答复**。这是一条非常重要的接管状态机规则。
- Bot Inbox 可把仍由 Fin 处理的会话从人工队列隔离，避免 AI 与人工“双重处理”，并可将 Bot 时间排除在人工 SLA 外。
- 升级原因可作为筛选字段，例如 Guidance applied、Escalation rule applied；因此“为什么升级”应在列表层可见，而不是藏在详情页。

### 对灵枢的启示

- 列表行建议至少展示：公司名、国家/地区、意图、采购阶段、Agent 状态、升级原因、风险级别、等待时长。
- 右侧详情建议同时显示：会话、Agent 摘要、已提取字段、证据原句、下一步建议。
- 人工接管按钮必须明确改变状态：`Agent 处理中 → 待人工确认 → 人工已接管 → 可交回 Agent`。

## 2. Zendesk AI Agents

### A 级截图

1. `service_assets/zendesk-escalation-flow.png`
   - 来源：[Configuring escalation strategies and flows for AI agents](https://support.zendesk.com/hc/en-us/articles/8357756604186-Configuring-escalation-strategies-and-flows-for-AI-agents)
   - 真实界面要点：升级作为 Dialogue Builder 中的显式节点；可在升级前检查营业时间/坐席可用性，再决定转即时人工或转邮件。
   - 可借鉴：升级不是一个按钮，而是一条包含“收集信息—检查条件—选择通道—通知客户—分配人员”的可审计路径。

2. `service_assets/zendesk-conversation-logs.png`
   - 来源：[Reviewing conversation logs for AI agents](https://support.zendesk.com/hc/en-us/articles/8357749580186-Reviewing-conversation-logs-for-AI-agents)
   - 真实界面要点：会话日志支持时间范围和属性过滤，列表与会话详情联动。
   - 可借鉴：客服承接页需要“队列 + 对话详情”主结构，并支持按国家、行业、意图、状态、负责人和时间过滤。

3. `service_assets/zendesk-message-overview.png`
   - 来源同上。
   - 真实界面要点：可下钻单条消息，查看消息级详情，而不是只看完整 transcript。
   - 可借鉴：灵枢要允许点击某条 Agent 判断，查看对应的证据、知识来源和信号字段。

4. `service_assets/zendesk-action-log.png`
   - 来源同上。
   - 真实界面要点：Agent 执行的动作以灰色动作卡嵌入会话时间线，可展开查看动作详情；API 调用也有请求、响应与错误信息。
   - 可借鉴：在内容分发、询盘承接和订单动作中使用统一“动作卡”，展示执行结果、失败原因和重试/接管入口。

### B 级功能证据

- 升级前可收集订单号、姓名、邮箱，添加标签和字段，并识别适合接手的坐席。
- 会话结果区分 Verified resolution、Escalated to agent、Escalated via email 等状态。
- Conversation logs 可以查看已执行动作、动作详情、API 请求参数、响应与错误。

### 对灵枢的启示

- 不需要复制 Zendesk 的复杂 Dialogue Builder，但必须保留“升级前收集字段”和“动作审计”。
- 对 B2B 出口，更适合收集：企业名称、采购角色、采购品类、预计量级、目标到货时间、目标港口、认证要求、是否寻求代理权。

## 3. Gorgias AI Agent

### A 级截图

1. `service_assets/gorgias-ai-agent-deploy.png`
   - 来源：[Set up and use AI Agent on Chat](https://docs.gorgias.com/en-US/set-up-and-use-ai-agent-on-chat-828220)
   - 真实界面要点：按渠道选择并启用 AI Agent，部署入口非常轻；权限要求明确为 Lead、Admin、Account Owner。
   - 可借鉴：灵枢的渠道连接页应该保持简单，核心是渠道开关、Agent 身份、营业时间和接管团队，不要演变成复杂客服配置中心。

2. `service_assets/gorgias-ai-agent-chat.png`
   - 来源同上。
   - 真实界面要点：AI 回复明确标识自动化，并在回答后提供“有帮助 / 需要更多帮助”的低摩擦反馈，后者进入继续处理或人工接管。
   - 可借鉴：客户侧不用暴露复杂状态，只需要清晰说明当前由 Agent 服务，并提供自然的人工升级出口。

### B 级功能证据

- Gorgias 将升级原因归为三类：内置信号（愤怒、明确要求人工、敏感主题）、商家配置的 handover topics、回答质量不足。
- 可设置 `Tell customers when handing over`，决定显式告知还是静默转交。
- Chat 在线/离线可以分别配置；离线时收集邮箱，在线时可选择邮箱收集方式并展示动态等待时间。
- 升级票据以 `ai_handover` 标签进入专属 AI Agent ticket view，可再通过规则自动分配给团队。
- AI 生成消息标记为 Automated；官方强调每次回答均可查看 reasoning 与来源并给予反馈。

### 对灵枢的启示

- 将“升级原因”固定为少量可解释类别：商业承诺、关键信息不足、负面/风险、客户主动要求、Agent 置信度不足、系统执行失败。
- 在线接管与异步跟进应分开设计。B2B 场景很多不是实时客服，应允许自动生成“已记录需求，业务负责人将在 X 小时内联系”的承诺，并创建待办。

## 4. 横向对比

| 能力 | Intercom Fin | Zendesk AI Agents | Gorgias AI Agent | 灵枢建议 |
|---|---|---|---|---|
| 会话队列 | Fin 独立视图，按解决/升级/待定分类 | Conversation logs + 属性过滤 | AI Agent 专属 ticket views | 独立“客户承接”队列，按商机与风险优先级排序 |
| Agent 状态 | Bot inbox 与人工 inbox 分离 | Resolution / escalation states | AI 处理、关闭、handover 标签 | 处理中、待人工确认、人工已接管、等待客户、已关闭 |
| 升级原因 | 属性规则 + 自然语言 Guidance | Dialogue 中显式升级节点 | 内置信号 + handover topics + 低置信度 | 统一升级原因枚举，并显示证据原句 |
| 公司/意图标签 | User、Company、Audience、Fin Attributes | Attributes、labels、fields | tags、ticket fields | 公司类型、采购角色、品类、量级、地区、认证、代理意图 |
| 人工接管 | 人工发出客户可见回复后 Fin 停止 | 转坐席或邮件，结合可用性 | 在线/离线分别配置 | 明确接管动作、责任人、响应时限；可交回 Agent |
| 权限 | 规则与部署由管理员配置 | 工作区与流程配置权限 | Lead/Admin/Owner | 运营可调整话术；主管可批商业承诺；管理员管渠道与数据权限 |
| 审计 | 升级原因、属性、会话状态 | 消息、动作、API 调用日志最完整 | Automated 标识、reasoning、来源 | 统一时间线记录判断、来源、动作、结果和人工改写 |

## 5. 对灵枢“客服承接”页面的推荐结构

### 页面主结构

采用三栏，而不是传统 CRM 的多层详情页：

1. **左栏：商机/会话队列**
   - 公司 + 国家；
   - 意图标签与预计价值；
   - Agent 状态、升级原因、等待时长；
   - 高价值、临期、风险置顶。
2. **中栏：会话与动作时间线**
   - 客户消息、Agent 回复、发布内容来源、字段提取、外部动作混排；
   - Agent 消息标记“自动发送”；
   - 动作卡展示成功/失败/需审批。
3. **右栏：账户与接管面板**
   - 企业画像、采购角色、品类、量级、地区、认证、交期与代理意图；
   - 每个字段可点开看证据原句与置信度；
   - 展示升级原因、Agent 摘要、建议回复；
   - 主按钮“接管并回复”，次按钮“批准 Agent 发送”“交回 Agent”。

### 不建议投入过多的部分

- 不自建完整工单、客服排班、呼叫中心、复杂 SLA 与售后知识库。
- 不复制 Zendesk 的重型流程编排器；灵枢只保留少量业务策略模板和自然语言配置。
- 客服模块的价值指标应是“识别多少有效采购信号、推进多少高价值商机、节省多少首次响应时间”，而不是单纯票据关闭率。

## 6. 最值得进入 P0 的五个功能

1. 高价值商机/风险会话队列。
2. Agent 自动提取企业与采购意图字段，并可回看证据。
3. 升级原因与人工接管状态机。
4. Agent 回复及外部动作的统一审计时间线。
5. “建议回复—人工修改—发送—沉淀为新规则”的闭环。
