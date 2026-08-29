# 明日客户试用：前后端联调路径

这份清单只验收真实写入和真实返回；页面里的历史经营数字仍是贵州茶行业演示数据，不得当作客户真实经营结果。

## 0. 开始前

- 每位客户使用独立 SQLite 数据库、独立测试邮箱和新的 `runId`；不得复用共享/真实数据数据库。
- 使用 `APP_ENV=local`、`ALLOW_SINGLE_TENANT_TRIAL_REGISTRATION=true`，设置至少 32 位随机 `AUTH_JWT_SECRET`，并确认 `DEFAULT_ORGANIZATION_ID=org-demo-guikesong`。
- 先运行 `npm run test:backend:http`。只有退出码为 0，才进入浏览器联调。
- 客户试用空间目前绑定贵州茶演示组织，注册账号会获得 `DEFAULT_NEW_USER_ROLE_ID`。它只允许单客户独立数据库试用，不是多租户生产注册系统；production 即使误设注册开关也必须返回 403。

## 1. 新用户第一次进入

### 1A. 注册路径

1. 打开系统，未登录时应显示真实注册／登录入口。
2. 输入一个从未注册过的邮箱和自定义密码；页面不得预填或展示通用密码。
3. `POST /api/auth/register` 应返回 201，并设置 `HttpOnly; SameSite=Lax` 的 `qianhai_session`。
4. 随后 `POST /api/onboarding/first-login` 应返回 200、`shouldStartOnboarding:true`、`status:"issued"`。
5. 刷新页面再次调用 first-login，应返回 `shouldStartOnboarding:false`，不能重复发放新手任务。

### 1B. 老用户登录路径

1. `POST /api/auth/login` 正确密码返回 200；错误密码返回 401 `invalid_credentials`。
2. 已完成或已跳过 onboarding 的账号登录后，不再自动弹出首次配置。
3. `POST /api/auth/logout` 应清空会话 cookie；再次访问业务接口返回 401。

## 2. 首次信息配置

1. 企业信息：企业名称、所属产业。
2. 经营目标：产品、目标市场。
3. 执行边界：建议模式／审批后执行／边界内自主。
4. 每一步保存调用 `PUT /api/onboarding`，版本号递增；旧版本写入返回 409。
5. 完成调用 `POST /api/onboarding/complete`，首次返回 201，并得到稳定的首个 `task.id`。
6. 重复完成返回 200、`replayed:true`，不得新建第二个任务。
7. “稍后再说”调用 `POST /api/onboarding/skip`；已完成状态不能再跳过。

## 3. 经营链路（同一个 runId）

按顺序逐项执行，并在每一步记录响应里的资源 ID：

1. 经营任务：`create_task`（若使用 onboarding 任务，则先把它附加到前端链路状态）。
2. 内容草案：`create_content`。
3. 内容排期：`schedule_content`。
4. Campaign 草案：`create_campaign`。当前没有真实投放连接器，不能显示“已投放成功”。
5. 客户与询盘：`create_customer` → `create_inquiry`。这些是演示记录，不是真实外部客户。
6. 报价：`create_quote`，状态为 draft。
7. 审批：`request_quote_approval` → `decide_approval`，必须先审批后下单。
8. 订单：`create_order`，客户试用路径使用 won 演示状态。
9. 收入归因：`record_attribution`。
10. `get_run` 核对 task/content/schedule/campaign/customer/inquiry/quote/approval/order/attribution 的链路 ID 和数量。

每个按钮必须发送独立且可复用的 `idempotencyKey`。网络重试应返回 `replayed:true`，不能重复创建资源。

## 4. 独立模块

- 企业知识库：`GET /api/knowledge` → 带 version 的 `PUT /api/knowledge`；跨 enterprise 访问应返回 403。
- 平台与账号：`GET /api/platform` 能加载；未配 endpoint/secret 的连接测试返回 409 `needs_configuration`。
- 数据同步：当前返回 501 `connector_worker_not_implemented`，并留下一条 unsupported 运行记录；不得显示排队成功。
- 全局搜索：当前返回 501 `search_not_implemented`、`mode:"seeded_data"`、空结果；不得显示“已索引 326 条”或“联网搜索成功”。
- 客户、收入、知识库和平台页面已有各自接口，仍需检查 401、空数据、错误提示和刷新恢复。

## 5. 浏览器验收收束

- 从全新浏览器会话完成：注册 → 首次配置 → 首个任务 → 内容 → 排期 → Campaign 草案 → 客户询盘 → 报价审批 → 订单 → 归因。
- 每一步刷新页面一次，确认 `runId` 和资源 ID 能从本地状态恢复，并由 `get_run` 回读。
- 断开后端后点击一次，页面必须显示错误；恢复后可重试，且不产生重复记录。
- 最终截取两类证据：浏览器状态条／流程结果，以及 `npm run test:backend:http` 的退出码 0。

## 6. 当前边界

- 已实现：本地凭证会话、首次配置持久化、首个任务、经营链路数据库写入、知识库隔离、平台配置状态、HTTP E2E。
- 演示模拟：贵州茶企业、产品、客户、预算、收入和历史看板数字。
- 明确未实现：真实社媒发布、广告投放、CRM 同步 Worker、服务端搜索索引、多租户自助开通的生产级隔离。
