# 内容创作 / 发布：真实功能页竞品调研

调研日期：2026-08-29

## 证据口径

- A：研究者实际进入并操作登录后台。
- B：厂商官方帮助中心、官方教程或官方演示中出现的真实后台画面。
- C：营销官网、概念动画或无可验证功能状态的展示图。本笔记不使用 C 级材料作为功能结论。

本轮没有在用户账号中注册或登录竞品，因此所有有效截图均为 B 级；它们能验证界面结构和官方声明的操作路径，但不能证明当前套餐、稳定性或端到端自动化的实际可用性。

## 1. Jasper：从“单篇编辑器”转向“项目画布 + Agent 上下文”

### 已验证功能（B）

1. Jasper Canvas 将一次营销任务定义为 Project，项目中包含多个 Asset，而不是把用户直接送进一篇空白文档。
2. 项目级设置承载目标、品牌声音、受众和知识资产；生成出的 Asset 默认继承这些上下文，也可以局部覆盖。
3. Canvas 有空间画布和表格两种视图；表格视图服务于状态、负责人和批量管理。
4. 内容可以由 Agent、Chat 或空白文档发起；选中一个或多个 Asset 后，可用 AI 工具栏做改写、扩写、总结或批量修改。
5. Agent Snapshot 在内容卡左上角提供“生成溯源”入口，可回看生成该内容时的 Agent、输入、设置和上下文，并基于修改后的输入重新生成。
6. Jasper Studio 采用“左侧运行预览 + 右侧 Agent 配置”的双栏结构；右侧配置名称、描述、可见范围、输入字段和上下文，顶部直接提供 Test your App。

### 截图

- `jasper_agent_snapshot.png`：内容 Asset 的 Agent Snapshot 入口与 Draft 状态。来源：Jasper 官方帮助中心《Agent Snapshots》。证据 B。
- `jasper_studio_1.png`、`jasper_studio_2.png`、`jasper_studio_3.png`：自定义 Agent/App 的创建、配置和预览后台。来源：Jasper 官方帮助中心《Jasper Studio》。证据 B。

### 对灵枢的启发

- 内容首页不应是“新建文章”，而应是“围绕一个出口目标的内容项目”。一个项目可同时包含英文产品页、LinkedIn 帖子、短视频脚本、询盘跟进素材。
- 每条内容必须显示 Agent 的依据：用了哪个产品知识、目标市场、采购商画像和品牌规范。这个“可解释入口”比暴露完整工作流节点更适合业务人员。
- 建议采用“项目目标 / 内容资产画布 / Agent 对话”三层结构；表格模式用于批量审核，画布模式用于理解一组内容之间的关系。
- 灵枢可借鉴 Jasper Studio 的双栏，但右栏应改为“本次行动依据与权限”，避免让商家配置复杂 Prompt。

### 官方来源

- https://help.jasper.ai/hc/en-us/articles/37817833127963-Jasper-Canvas
- https://help.jasper.ai/hc/en-us/articles/39657086973083-Agent-Snapshots
- https://help.jasper.ai/hc/en-us/articles/36783295610395-Jasper-Studio

## 2. Predis.ai：内容库、日历、审批和自动发布形成明确闭环

### 已验证功能（B）

1. 左侧一级导航直接并列 Content Library、Content Calendar、Brand & Social Accounts，内容生产与渠道连接在同一产品壳内。
2. Content Library 以卡片网格展示图片、视频、轮播等资产，卡片直接显示比例、内容类型、发布时间和 Published 等状态。
3. Content Calendar 同时提供周/月视图，日历卡片展示素材缩略图、发布时间和已选渠道；底部用颜色区分 Scheduled、Failed、Published、Rejected、In Review。
4. Schedule post 弹窗把发布时间、品牌时区、AI 建议时间、指定审批人和“立即发布”放在同一决策面板。
5. 官方 Auto Posting 教程显示：先给出月度计划摘要和周计划，再选择内容类型、发布时间和渠道，最后核对预计消耗并激活计划。第一周内容可立即编辑，后续周按计划生成。
6. 官方 FAQ 明确当前尚不支持统一处理评论和私信，因此 Predis 的产品边界仍以“内容生产 + 发布”为中心。

### 截图

- `predis_library.png`：内容资产网格及状态。来源：Predis 官方教程《Social Media Content Approval Process Using Predis AI》。证据 B。
- `predis_calendar.png`：月视图、渠道图标和发布状态图例。来源同上。证据 B。
- `predis_schedule.png`：排期、AI 建议发布时间和指定审批人。来源同上。证据 B。

### 对灵枢的启发

- 内容发布不能藏在编辑器最后一步，应有独立“发布计划”页，用户一眼看出今天将自动执行什么、哪些在等待审批、哪些失败。
- 颜色状态非常有效，但灵枢需要把状态从纯发布状态扩展为：准备中、待证据核对、待商业审批、已发布、已产生采购信号、失败。
- 排期弹窗里应同时展示“为什么此时发布”和“本次会触达哪类采购商”，让 AI 建议从时间建议升级为经营解释。
- 自动发布应按计划激活，而不是每条内容单独授权；但认证、价格、交期或独家代理相关内容需单独审批。

### 官方来源

- https://predis.ai/resources/content-approval-process/
- https://help.predis.ai/en/article/get-started-with-auto-posting-using-predis-11h7ihl/
- https://help.predis.ai/en/article/common-faqs-1pipj6m/

## 3. Creatify：把复杂视频生产压缩成产品驱动的阶段式决策

### 已验证功能（B）

1. URL-to-Video 从产品链接进入，先自动抓取产品名称、描述和素材，再让用户校对，而非要求用户从空白脚本开始。
2. 脚本阶段同时给出多种 AI Scripts，并保留 DIY；其交互重点是“选择候选方案”，不是逐句写作。
3. 样式阶段将风格、Avatar、Voice 和预览集中在一个步骤，适合快速比较多版本。
4. 编辑器采用典型视频工作台：左侧 Script / Avatar / Assets / Music / CTA；中央竖屏预览；底部为 Music、Voiceover、Caption、Avatar、Assets 多轨时间线；右上角 Render 是明确的阶段出口。
5. 官方教程说明可以一次生成多条变体，预览后编辑或渲染，用于广告测试。

### 截图

- `creatify_product_setup.png`：产品 URL 输入和产品信息抓取。来源：Creatify 官方教程《How to make short video ads with the help of AI》。证据 B。
- `creatify_scripts.png`：AI 多脚本候选。来源同上。证据 B。
- `creatify_editor.png`：视频预览、素材工具和多轨时间线。来源同上。证据 B。

### 对灵枢的启发

- 贵州商家最自然的入口是“选择一个产品 / 产品链接 / 产品资料包”，Agent 自动补齐内容 brief；不要先让用户选择模板或输入 Prompt。
- Agent 可以并行产出 3 个市场角度，例如认证可信、产地故事、渠道利润；商家以选择和否决为主。
- 灵枢 P0 不应复制完整时间线编辑器。主界面只需支持脚本、画面、字幕、CTA 的卡片式替换；深度剪辑作为二级入口。
- Render 应替换为更符合数字员工的动作：“批准本批内容并进入发布计划”，把内容生产和分发连接起来。

### 官方来源

- https://creatify.ai/blog/how-to-create-video-ads-with-ai
- https://creatify.ai/blog/how-to-make-video-ads-with-ai-in-5-minutes

## 横向结论：灵枢内容模块建议界面

| 层级 | 建议页面 | 核心对象 | 借鉴来源 |
|---|---|---|---|
| 1 | 内容任务首页 | 出口目标、目标市场、产品、任务进度、预期结果 | Jasper Project/Canvas |
| 2 | 内容方案审阅 | Agent 生成的市场角度、证据、内容组合与多版本候选 | Creatify 脚本候选 |
| 3 | 内容资产工作区 | 多资产画布/表格、状态、批量修改、评论 | Jasper Canvas |
| 4 | 发布计划 | 周/月日历、渠道、时区、失败状态、待审批项 | Predis Calendar |
| 5 | 单次执行确认 | AI 推荐时间、渠道、目标采购商、权限、审批人 | Predis Schedule |
| 6 | 生成溯源与学习 | Agent 使用的知识、生成原因、版本、结果信号 | Jasper Agent Snapshot |

### 推荐的核心页面骨架

1. 顶部目标条：`本月为贵州刺梨原浆找到 20 个东南亚食品渠道商`，展示进度与可暂停状态。
2. 左侧任务/资产：内容项目、渠道和日期筛选；默认按经营任务而不是文件夹组织。
3. 中央行动画布：Agent 正在研究、生成、待核对、已发布和已产生信号的内容卡片。
4. 右侧证据与决策：目标采购商、引用产品知识、市场依据、风险、预计影响，以及“批准/要求修改/暂停”。
5. 二级发布日历：每个卡片必须能回溯到内容任务和依据；失败或被拒绝时给出 Agent 的修复动作。

## 不应照搬的部分

- 不照搬 Creatify 的重型时间线作为默认首页：它仍然把用户拉回人工剪辑工作流。
- 不照搬 Predis 的纯社媒日历：B2B 出口内容可能面向 LinkedIn、独立站、邮件、产品页和展会物料，渠道不只是社媒。
- 不把 Jasper Studio 的 Agent 配置表单直接交给普通商家：灵枢应把这些字段预配置为产品知识、市场、采购商画像和商业权限。
- 不用“生成了多少条内容”做主 KPI；主 KPI 应是有效采购信号、目标账户覆盖、被转交商机和内容贡献收入。
