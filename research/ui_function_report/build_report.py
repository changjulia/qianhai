from pathlib import Path
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether

ROOT = Path('/Users/julia_chen/Documents/ChatGPT/贵客松')
BASE = ROOT / 'research/ui_function_report'
OUT = ROOT / 'output/pdf/黔海数字员工真实功能页竞品调研与UI建议.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont('ArialUnicode', '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'))
NAVY = colors.HexColor('#12213F'); BLUE = colors.HexColor('#3157D5'); ORANGE = colors.HexColor('#F47C20')
INK = colors.HexColor('#263247'); MUTED = colors.HexColor('#667085'); LIGHT = colors.HexColor('#F3F6FA'); LINE = colors.HexColor('#D7DFEA')

styles = getSampleStyleSheet()
body = ParagraphStyle('body', fontName='ArialUnicode', fontSize=9.2, leading=14, textColor=INK, spaceAfter=5)
bullet = ParagraphStyle('bullet', parent=body, leftIndent=13, firstLineIndent=-8, spaceAfter=3)
h1 = ParagraphStyle('h1', fontName='ArialUnicode', fontSize=17, leading=23, textColor=NAVY, spaceBefore=6, spaceAfter=8)
h2 = ParagraphStyle('h2', fontName='ArialUnicode', fontSize=12.5, leading=18, textColor=BLUE, spaceBefore=7, spaceAfter=5)
small = ParagraphStyle('small', fontName='ArialUnicode', fontSize=7.2, leading=10, textColor=MUTED, alignment=TA_CENTER, spaceAfter=5)
title = ParagraphStyle('title', fontName='ArialUnicode', fontSize=28, leading=37, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8)
subtitle = ParagraphStyle('subtitle', fontName='ArialUnicode', fontSize=13, leading=20, textColor=BLUE, alignment=TA_CENTER, spaceAfter=16)

def P(text, style=body): return Paragraph(text, style)
def B(text): return Paragraph('• ' + text, bullet)

def callout(label, text):
    t = Table([[P(f'<font color="#3157D5"><b>{label}</b></font>　{text}')]], colWidths=[170*mm])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),LIGHT),('BOX',(0,0),(-1,-1),.5,LINE),
                           ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
                           ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    return t

def matrix(headers, rows, widths):
    hs = ParagraphStyle('th', parent=body, textColor=colors.white, alignment=TA_CENTER, fontSize=8.1, spaceAfter=0)
    ds = ParagraphStyle('td', parent=body, fontSize=7.8, leading=11, spaceAfter=0)
    data = [[P(f'<b>{v}</b>', hs) for v in headers]] + [[P(str(v), ds) for v in row] for row in rows]
    t = Table(data, colWidths=[x*mm for x in widths], repeatRows=1)
    cmds = [('BACKGROUND',(0,0),(-1,0),NAVY),('GRID',(0,0),(-1,-1),.35,LINE),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
            ('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]
    for i in range(2, len(data), 2): cmds.append(('BACKGROUND',(0,i),(-1,i),colors.HexColor('#F8FAFC')))
    t.setStyle(TableStyle(cmds)); return t

def figure(rel, caption, source, max_w=164, max_h=82):
    path = BASE / rel
    with PILImage.open(path) as im:
        iw, ih = im.size
    scale = min((max_w*mm)/iw, (max_h*mm)/ih)
    img = Image(str(path), width=iw*scale, height=ih*scale)
    cap = P(f'<b>{caption}</b><br/>{source}｜证据：官方后台截图 A/B｜访问日期：2026-08-29', small)
    return KeepTogether([img, cap])

def page_num(canvas, doc):
    canvas.saveState(); canvas.setFont('ArialUnicode', 7.5); canvas.setFillColor(MUTED)
    canvas.drawString(20*mm, 12*mm, '黔海 Global Growth OS · 真实功能页研究')
    canvas.drawRightString(190*mm, 12*mm, str(doc.page)); canvas.restoreState()

doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=17*mm, bottomMargin=18*mm,
                        title='黔海数字员工真实功能页竞品调研与UI建议', author='OpenAI Codex')
S = []

S += [Spacer(1,15*mm), P('FUNCTIONAL UI RESEARCH', ParagraphStyle('kick', parent=body, textColor=ORANGE, fontSize=10, alignment=TA_CENTER, spaceAfter=14)),
      P('黔海数字员工', title), P('真实功能页竞品调研与 UI 设计建议', subtitle),
      P('面向贵州特色产业 B2B 出口｜内容创作 40% · 信号提取 30% · 客户承接 30%', ParagraphStyle('lead', parent=body, fontSize=10.5, leading=17, alignment=TA_CENTER, spaceAfter=18)),
      callout('修订说明','本报告只把可辨认的真实后台、官方帮助中心后台截图和官方教程画面作为功能证据；官网 Hero、概念动画和营销话术不再用于证明功能。'),
      Spacer(1,7*mm), P('结论先行', h1),
      P('黔海不应复制一个“内容工具＋监听大屏＋客服工单”的拼盘。界面主对象应是持续运行的经营任务，三个专业工作台只是数字员工的执行明细、审批和人工接管入口。'),
      matrix(['功能域','成熟竞品稳定模式','黔海的改造方向'],[
          ('内容 40%','项目上下文、多方案审阅、资产画布、发布日历','从“写一条内容”升级为“围绕出口目标运行内容任务”'),
          ('信号 30%','对象队列、趋势分数、证据构成、建议动作','从“看数据”升级为“今天最该处理哪些买家/企业”'),
          ('承接 30%','Agent独立队列、升级原因、动作日志、人工接管','从“客服关单”升级为“识别采购意图并转交高价值商机”')],[27,66,77])]

S += [PageBreak(), P('一、研究口径与证据等级', h1),
      matrix(['等级','定义','本报告用途'],[
          ('A','厂商官方帮助/课程中可明确辨认的真实产品后台','验证页面结构、字段和具体控件'),
          ('B','官方教程演示的后台画面，或官方文档明确操作路径','验证核心流程；不推断套餐、稳定性和自动化成熟度'),
          ('C','官网营销页、概念动画、第三方转载','不作为功能证据，仅可理解品牌定位')],[18,76,76]),
      Spacer(1,5*mm), callout('覆盖范围','内容：Jasper、Predis.ai、Creatify；信号：6sense、Common Room、Sprinklr、Clay；承接：Intercom Fin、Zendesk AI Agents、Gorgias AI Agent。'),
      P('判断边界',h2), B('截图可以证明某个界面与操作路径被官方展示，但不等于我们实际验证了所有账号权限、稳定性或完整自动化。'),
      B('无法获得后台画面的 Clay 只采用 B 级功能逻辑，不用营销图补位。'),
      B('所有 UI 建议均结合《贵客松项目方向与产品共识》中的经营任务、自主等级、动作权限和全过程审计原则。'),
      P('总体验原则',h1),
      matrix(['用户动作','首页必须回答'],[
          ('设目标','产品、国家、成交对象、目标、预算、周期、红线是什么？'),('看运行','Agent正在做什么？为什么做？预计影响是什么？'),
          ('批风险','哪些动作超出权限？涉及多少预算或商业承诺？'),('接商机','哪些客户值得人工介入？Agent已完成了什么？'),
          ('看学习','哪些内容和信号带来了有效询盘、样品、报价与订单？')],[35,135])]

S += [PageBreak(), P('二、内容创作：从空白编辑器转向“出口目标项目”',h1),
      P('2.1 Jasper：项目上下文、Agent配置与生成溯源',h2),
      figure('content_assets/jasper_studio_3.png','图1　Jasper Studio：运行预览与Agent配置双栏','https://help.jasper.ai/hc/en-us/articles/36783295610395-Jasper-Studio',164,72),
      figure('content_assets/jasper_agent_snapshot.png','图2　Jasper Agent Snapshot：从内容回看生成输入与上下文','https://help.jasper.ai/hc/en-us/articles/39657086973083-Agent-Snapshots',155,58),
      B('借鉴：内容必须继承项目级目标、品牌声音、受众和知识；每个结果可回看“由哪个Agent、基于什么输入生成”。'),
      B('改造：普通商家不配置Prompt和Agent字段，右栏改成市场依据、产品证据、风险和行动权限。')]

S += [PageBreak(), P('2.2 Predis.ai：内容库、日历、审批和自动发布闭环',h2),
      figure('content_assets/predis_library.png','图3　Predis 内容资产库：卡片、类型和发布状态','https://predis.ai/resources/content-approval-process/',162,72),
      figure('content_assets/predis_calendar.png','图4　Predis 发布日历：缩略图、渠道、时间和状态','https://predis.ai/resources/content-approval-process/',162,72),
      figure('content_assets/predis_schedule.png','图5　Predis 排期确认：AI建议时间与指定审批人','https://predis.ai/resources/content-approval-process/',150,48),
      B('借鉴：用户能一眼看出即将自动执行、等待审核、失败和已发布的内容。'),
      B('改造：状态增加“待证据核对、待商业审批、已产生采购信号”，并解释推荐发布时间与目标采购商。')]

S += [PageBreak(), P('2.3 Creatify：产品驱动、多方案选择、再进入编辑',h2),
      figure('content_assets/creatify_product_setup.png','图6　Creatify：从产品链接与资料进入，而不是空白Prompt','https://creatify.ai/blog/how-to-create-video-ads-with-ai',155,55),
      figure('content_assets/creatify_scripts.png','图7　Creatify：并列呈现多套AI脚本供选择','https://creatify.ai/blog/how-to-create-video-ads-with-ai',155,55),
      figure('content_assets/creatify_editor.png','图8　Creatify：预览、素材与多轨编辑工作台','https://creatify.ai/blog/how-to-make-video-ads-with-ai-in-5-minutes',155,58),
      B('借鉴：贵州商家先选择产品/资料包，Agent并行提出认证可信、产地故事、渠道利润等市场角度。'),
      B('不照搬：P0不建设重型时间线；主动作应是“批准本批内容并进入发布计划”。')]

S += [PageBreak(), P('三、信号提取：首页必须是行动队列',h1),
      P('3.1 6sense：把趋势直接变成销售对象列表',h2),
      figure('signal_assets/6sense-people-dashboard.png','图9　6sense People Dashboard：趋势分组、互动与快捷动作','https://support.6sense.com/v1/docs/people-6sense-sales-intelligence-dashboard',164,78),
      P('3.2 Common Room：分数必须解释趋势和构成',h2),
      figure('signal_assets/commonroom-signal-trend.png','图10　Common Room：Lead score、变化趋势和加减分证据','https://www.commonroom.io/docs/using-common-room/signal-trend-tracking/',155,66),
      B('黔海列表每行显示：公司/国家、买家身份、信号类型、当前强度、变化速度、证据摘要、责任人和建议动作。'),
      B('高意向但48小时无人跟进必须成为独立保存视图，而不是埋在统计图里。')]

S += [PageBreak(), P('3.3 Sprinklr与Clay：AI建议必须带来源、范围与执行边界',h2),
      figure('signal_assets/sprinklr-copilot-suggestions.png','图11　Sprinklr Copilot：附着在数据页上的建议、追问和分析入口','https://www.sprinklr.com/help/articles/sprinklr-ai/sprinklr-copilot-for-listening-dashboards/678105272136755ad71c7225',164,78),
      callout('Clay功能逻辑（B级）','从联系人/企业表配置监测对象、过滤条件、频率和样例结果，再把信号路由到业务系统。黔海应把配置压缩为：监测谁、看什么变化、多久一次、什么算重要、触发后Agent能做什么。'),
      P('推荐的证据抽屉',h2),
      matrix(['区块','必须展示'],[
          ('AI结论','采购/渠道/认证/代理等信号类型、置信度与时效'),('强度拆解','适配度、意向度、时效性、证据完整度及趋势'),
          ('原始证据','原句、页面/会话、来源、时间、国家与关联内容'),('建议动作','补充研究、生成内容、标准澄清、转人工；同时显示权限'),
          ('结果回写','是否形成有效询盘、样品、报价、渠道合作或订单')],[38,132])]

S += [PageBreak(), P('四、客户承接：Agent队列、升级原因与人工接管',h1),
      P('4.1 Intercom Fin：把Agent会话从人工队列分开管理',h2),
      figure('service_assets/intercom-fin-inbox-cropped.png','图12　Intercom Fin Inbox：已解决、升级/交接、等待中的独立视图','https://www.intercom.com/help/en/articles/7860256-view-fin-ai-agent-s-conversations-from-the-inbox',164,75),
      figure('service_assets/intercom-escalation-rule-cropped.png','图13　Intercom：以客户、公司和会话属性配置升级条件','https://www.intercom.com/help/en/articles/12396892-manage-fin-ai-agent-s-escalation-guidance-and-rules',155,60),
      B('借鉴：列表直接显示为什么升级；人工真正发出客户可见回复后，Agent才停止，避免双重答复。'),
      B('黔海状态机：Agent处理中 → 待人工确认 → 人工已接管 → 可交回Agent。')]

S += [PageBreak(), P('4.2 Zendesk与Gorgias：动作日志比复杂工单更值得借鉴',h2),
      figure('service_assets/zendesk-action-log-cropped.png','图14　Zendesk：Agent动作卡与API执行详情进入会话时间线','https://support.zendesk.com/hc/en-us/articles/8357749580186-Reviewing-conversation-logs-for-AI-agents',155,66),
      figure('service_assets/gorgias-ai-agent-chat-cropped.png','图15　Gorgias：自动回复标识和低摩擦人工帮助入口','https://docs.gorgias.com/en-US/set-up-and-use-ai-agent-on-chat-828220',155,60),
      P('黔海客户承接三栏结构',h2),
      matrix(['区域','关键内容'],[
          ('左：商机队列','公司/国家、意图、预计价值、Agent状态、升级原因、等待时长'),('中：会话与动作','客户消息、自动回复、字段提取、外部动作、失败/审批卡混排'),
          ('右：账户与接管','采购角色、品类、量级、认证、交期、代理意图、证据原句、接管按钮')],[42,128]),
      B('不建设完整工单、呼叫中心、复杂SLA和售后系统；客服价值以有效采购信号和高价值商机转交衡量。')]

S += [PageBreak(), P('五、黔海最终信息架构',h1),
      callout('总原则','一级导航用于管理数字员工；内容、信号和客户承接是任务下钻工作台，不要求用户按模块逐步推动流程。'),
      matrix(['一级页面','核心问题','默认界面'],[
          ('经营任务 / 员工驾驶舱','目标是什么？Agent现在做什么？','目标条、行动流、四项结果、异常与待人工事项'),
          ('内容任务 40%','围绕目标生产和发布了什么？','项目画布/表格、多方案审阅、发布计划、生成溯源'),
          ('信号中心 30%','今天最该处理哪些买家与企业？','行动队列、趋势强度、证据抽屉、建议动作'),
          ('客户承接 30%','哪些互动需要回复或人工接管？','商机队列、会话动作时间线、账户与接管面板'),
          ('结果与学习','什么带来了商机与收入？','内容→信号→商机→收入归因及策略记忆'),
          ('权限与连接','Agent能自主做到哪一步？','账号、预算、发布、外发、承诺红线、审批与审计')],[36,54,80]),
      P('驾驶舱布局',h2),
      B('顶部：经营任务、国家、买家、周期目标、预算、自主等级、暂停开关。'),
      B('中央70%：按时间排列的研究、生成、发布、跟进、等待审批与结果动作卡。'),
      B('右侧30%：待审批、高价值商机、风险、资料缺口和系统异常。'),
      B('动作卡统一展示：目标、依据、动作、影响对象、预算、权限、结果、下一步和撤回能力。'),
      P('视觉建议',h2), B('可信、专业、克制；避免霓虹AI大屏。蓝=进行中，绿=完成，橙=待审批，红=风险，灰=等待输入。')]

S += [PageBreak(), P('六、P0开发范围与演示主线',h1),
      matrix(['能力包','占比','P0真实页面'],[
          ('内容创作','40%','出口目标项目、三套市场角度、多资产审阅、发布日历、批量授权、生成溯源'),
          ('信号提取','30%','买家/企业行动队列、强度趋势、证据抽屉、建议动作、组合信号'),
          ('客户承接','30%','高价值队列、字段证据、升级原因、接管状态机、动作审计')],[30,20,120]),
      Spacer(1,5*mm), callout('P0演示主线','负责人为贵州刺梨/茶叶设置东南亚渠道目标 → Agent基于产品资料提出多套内容角度 → 批准整批发布计划 → 捕捉认证、MOQ、交期和代理信号 → 自动澄清并识别渠道商 → 触发商业承诺边界 → 人工接管 → 结果回写并调整下一轮内容。'),
      P('五条验收标准',h2),
      B('用户不进入三个模块，也能从驾驶舱看懂Agent今天做了什么以及为什么。'),
      B('任何AI判断都可下钻到原始证据、时间、来源和置信度。'),
      B('低风险动作可批量授权；价格、交期、认证、折扣和独家代理永远触发审批。'),
      B('人工接管后不会与Agent同时对外回复，并可把任务交回Agent。'),
      B('结果指标不是发帖量和关单量，而是目标账户覆盖、有效采购信号、合格商机和收入贡献。'),
      P('最终判断',h1),
      P('真实竞品功能页验证了三个成熟模式：内容要有项目上下文和发布状态；信号要成为可执行对象队列；客服要有明确升级原因与动作审计。黔海的差异不在于把三者都做一遍，而在于用同一个经营目标、权限体系、行动账本和结果学习把三者连接成一个持续工作的数字员工。', ParagraphStyle('big', parent=body, fontSize=12.2, leading=19, textColor=NAVY))]

S += [PageBreak(), P('附录：官方来源',h1),
      P('Jasper Canvas / Studio / Agent Snapshots　https://help.jasper.ai/',body),
      P('Predis Content Approval / Auto Posting　https://predis.ai/resources/content-approval-process/　https://help.predis.ai/',body),
      P('Creatify Tutorials / My Ads　https://creatify.ai/blog/　https://help.creatify.ai/',body),
      P('6sense People Dashboard　https://support.6sense.com/v1/docs/people-6sense-sales-intelligence-dashboard',body),
      P('Common Room Signal Trend Tracking　https://www.commonroom.io/docs/using-common-room/signal-trend-tracking/',body),
      P('Sprinklr Copilot for Listening　https://www.sprinklr.com/help/articles/sprinklr-ai/',body),
      P('Clay Signals　https://university.clay.com/docs/signals',body),
      P('Intercom Fin Inbox / Escalation　https://www.intercom.com/help/en/',body),
      P('Zendesk AI Agent Logs / Escalation　https://support.zendesk.com/hc/en-us/',body),
      P('Gorgias AI Agent on Chat　https://docs.gorgias.com/en-US/',body),
      Spacer(1,8*mm),
      P('证据说明：A/B等级用于描述证据完整度，而非产品质量评分。本报告没有使用C级营销页截图证明任何具体功能；也未对竞品当前套餐、可用性、性能和端到端自动化做独立测试。',body)]

doc.build(S, onFirstPage=page_num, onLaterPages=page_num)
print(OUT)
