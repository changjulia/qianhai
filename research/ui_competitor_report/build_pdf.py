from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether
from pathlib import Path

ROOT=Path('/Users/julia_chen/Documents/ChatGPT/贵客松'); A=ROOT/'research/ui_competitor_report/assets'; OUT=ROOT/'output/pdf/灵枢数字员工UI竞品研究与设计建议.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('ArialUnicode','/System/Library/Fonts/Supplemental/Arial Unicode.ttf'))

NAVY=colors.HexColor('#14213D'); BLUE=colors.HexColor('#3157D5'); ORANGE=colors.HexColor('#F47C20'); LIGHT=colors.HexColor('#F3F6FA'); MUTED=colors.HexColor('#687386'); DARK=colors.HexColor('#243043')
styles=getSampleStyleSheet()
body=ParagraphStyle('body',fontName='ArialUnicode',fontSize=9.3,leading=14,textColor=DARK,spaceAfter=5)
h1=ParagraphStyle('h1',fontName='ArialUnicode',fontSize=17,leading=23,textColor=NAVY,spaceBefore=9,spaceAfter=8)
h2=ParagraphStyle('h2',fontName='ArialUnicode',fontSize=13,leading=18,textColor=BLUE,spaceBefore=8,spaceAfter=6)
h3=ParagraphStyle('h3',fontName='ArialUnicode',fontSize=10.5,leading=15,textColor=BLUE,spaceBefore=5,spaceAfter=3)
small=ParagraphStyle('small',fontName='ArialUnicode',fontSize=7.5,leading=10,textColor=MUTED,alignment=TA_CENTER,spaceAfter=6)
bullet=ParagraphStyle('bullet',parent=body,leftIndent=13,firstLineIndent=-8,bulletIndent=2,spaceAfter=3)
title=ParagraphStyle('title',fontName='ArialUnicode',fontSize=29,leading=37,textColor=NAVY,alignment=TA_CENTER,spaceAfter=7)
subtitle=ParagraphStyle('subtitle',fontName='ArialUnicode',fontSize=13,leading=20,textColor=BLUE,alignment=TA_CENTER,spaceAfter=16)

def P(t,s=body): return Paragraph(t,s)
def B(t): return Paragraph('• '+t,bullet)
def callout(label,text):
    t=Table([[P(f'<font color="#3157D5"><b>{label}</b></font>　{text}',body)]],colWidths=[170*mm])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),LIGHT),('BOX',(0,0),(-1,-1),.5,colors.HexColor('#D9E1EC')),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)])); return t
def matrix(headers,rows,widths):
    data=[[P(f'<b>{x}</b>',ParagraphStyle('th',parent=body,textColor=colors.white,alignment=TA_CENTER,fontSize=8.3)) for x in headers]]
    for row in rows: data.append([P(str(x),ParagraphStyle('td',parent=body,fontSize=7.9,leading=11,spaceAfter=0)) for x in row])
    t=Table(data,colWidths=[w*mm for w in widths],repeatRows=1)
    cmds=[('BACKGROUND',(0,0),(-1,0),NAVY),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#D9E1EC')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]
    for i in range(2,len(data),2): cmds.append(('BACKGROUND',(0,i),(-1,i),colors.HexColor('#F8FAFC')))
    t.setStyle(TableStyle(cmds)); return t
def figure(file,cap,url,w=168):
    im=Image(str(A/file),width=w*mm,height=w*mm*753/1270)
    return KeepTogether([im,P(f'<b>{cap}</b><br/>{url}｜访问日期：2026-08-29',small)])
def page_num(canvas,doc):
    canvas.saveState(); canvas.setFont('ArialUnicode',7.5); canvas.setFillColor(MUTED); canvas.drawString(20*mm,12*mm,'灵枢 Global Growth OS · 产品研究'); canvas.drawRightString(190*mm,12*mm,f'{doc.page}'); canvas.restoreState()

doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=20*mm,leftMargin=20*mm,topMargin=18*mm,bottomMargin=18*mm,title='灵枢数字员工UI竞品研究与设计建议',author='OpenAI Codex')
S=[]
S += [Spacer(1,16*mm),P('PRODUCT UI RESEARCH',ParagraphStyle('kick',parent=body,textColor=ORANGE,fontSize=10,alignment=TA_CENTER,spaceAfter=14)),P('灵枢数字员工 UI',title),P('竞品研究与产品界面设计建议',subtitle),P('面向贵州特色产业 B2B 出口的“内容创作 40% · 信号提取 30% · 客服承接 30%”数字员工',ParagraphStyle('lead',parent=body,fontSize=10.5,leading=17,alignment=TA_CENTER,spaceAfter=18)),callout('核心结论','灵枢不应设计成“内容工具＋数据看板＋客服后台”的拼盘，而应设计成一个可被管理、授权、观察和接管的海外内容增长数字员工。'),Spacer(1,8*mm),P('研究范围',h1),B('重点样本：Omneky、Creatify、Hermoso、Adanamous、Predis.ai。'),B('观察维度：Agent入口、目标设定、创作工作台、数据反馈、行动记录、自主权限、异常审批与商业结果。'),B('截图来自公开产品页；公开营销界面不等同于完整后台实装。'),Spacer(1,5*mm),P('结论先行',h1),P('传统营销软件按功能拆成素材、脚本、日历、发布、数据和会话；数字员工产品应按管理动作组织：设目标、看行动、批风险、理解学习、接管机会。',body),matrix(['界面问题','传统工具','灵枢应给出的答案'],[('今天做什么？','用户逐模块操作','员工展示今日计划与进行中任务'),('为什么这样做？','数据散落','行动附带信号、判断、置信度和目标'),('什么需要人工？','所有步骤靠人协调','只把审批、异常、高价值客户放入人工队列'),('如何衡量？','内容数和播放量','买家触达、有效信号、合格商机')],[35,55,80])]
S += [PageBreak(),P('一、竞品界面观察',h1),P('1.1 Creatify：用“一个岗位”替代复杂广告菜单',h2),figure('creatify-media-buyer.png','图1　Creatify 直接把产品包装成 AI 效果营销专家','https://creatify.ai/features/media-buyer'),B('借鉴：灵枢首页先出现“海外内容增长员工”，而不是模块名。'),B('不照搬：其中心仍是广告账户，缺少B2B渠道商信号和业务接管。'),P('1.2 Hermoso：Agent在中央，营销工具退到执行层',h2),figure('hermoso-home.png','图2　Hermoso 将自身定位为通用 Agent 可调用的营销执行层','https://hermoso.ai/'),B('借鉴：素材、日历、会话是Agent的工具；默认入口是员工驾驶舱。'),B('警惕：完全聊天式界面不利于批量审核、比较和经营管理。')]
S += [PageBreak(),P('1.3 Hermoso 工作室：仍需结构化工作台',h2),figure('hermoso-workflow.png','图3　对话入口之外仍保留素材、排期与广告研究工作台','https://hermoso.ai/'),P('1.4 Adanamous：把自主运营拆成四个阶段',h2),figure('adanamous-control.png','图4　寻找机会—转成创意—上线执行—放大结果','https://adanamous.com/'),B('可借鉴：灵枢闭环应表述为“发现信号—生产内容—客户互动—学习再行动”。'),B('必须补充：B2B出口要增加证据、权限和人工承诺边界。')]
S += [PageBreak(),P('1.5 Predis.ai：自动发帖流程清楚，但仍是效率工具',h2),figure('creatify-workflow.png','图5　Predis.ai 的“连接品牌—生成内容—自动发布”','https://predis.ai/auto-post/',150),B('优点：上手路径短，清楚表达“设一次、持续运行”。'),B('不足：强调节省工时和发帖量，没有展示为什么创作、从市场学到了什么。'),P('1.6 Omneky：Agent连接营销栈，高风险动作保留确认',h2),figure('omneky-mcp.png','图6　Omneky 将 Agent 与品牌、商品、广告和效果数据连接','https://www.omneky.com/mcp',150),B('借鉴：花钱、外发、业务承诺设确认点；低风险动作自动执行。动作卡应展示影响对象、预算、依据、权限和撤回能力。')]
S += [PageBreak(),P('二、灵枢推荐的信息架构',h1),callout('设计原则','一级导航围绕管理数字员工；二级工作台才围绕内容、信号和会话。'),Spacer(1,4*mm),matrix(['一级页面','回答的问题','主要内容'],[('员工驾驶舱','它负责什么、现在怎么样？','目标、市场、行动、结果、异常、待人工事项'),('内容工作台 40%','它在生产和发布什么？','策略、选题、素材、脚本、审核、日历、投流实验'),('信号中心 30%','海外市场在反馈什么？','品牌、需求、渠道、采购、竞品、风险信号'),('客户承接 30%','哪些互动要回复或转交？','统一收件箱、身份判断、建议回复、人工接管'),('结果与学习','它带来了什么、学到了什么？','买家触达、有效信号、商机、归因、策略记忆'),('权限与连接','它能自主做到哪一步？','账号、预算、发布、外发、红线、审批、审计')],[38,48,84]),P('三、六个关键页面',h1),P('3.1 员工驾驶舱：首页是管理面板，不是数据大屏',h2),matrix(['区域','建议组件','优先级'],[('顶部目标条','国家、买家、周期目标、预算、自主等级','P0'),('今日行动流','研究/生成/发布/回复/等待审批时间线','P0'),('四项结果','买家触达、有效信号、有效对话、人工接管','P0'),('Agent判断','本周学习、建议、置信度、证据','P0'),('人工收件箱','待审批、风险回复、高价值客户、资料缺口','P0'),('经营趋势','国家、产品、角色漏斗与内容贡献','P1')],[38,100,32]),P('布局建议：左侧窄导航；中央70%为目标与行动流；右侧30%为“需要你处理”和风险。',ParagraphStyle('em',parent=body,textColor=BLUE,fontSize=10,leading=15,spaceBefore=5))]
S += [PageBreak(),P('3.2 内容工作台：围绕内容任务，不围绕编辑器',h2),B('左栏：市场、买家角色、采购阶段、内容目标和证据。'),B('中栏：脚本/图文/视频多版本画布，解释Agent为何选这个角度。'),B('右栏：品牌事实、合规、平台格式、CTA和发布建议。'),B('底部：版本对比、审批、发布/投流、回滚、行动审计。'),callout('关键差异','每条内容必须绑定“面向谁、解决什么采购问题、使用什么证据、希望触发什么信号”。'),P('3.3 信号中心：行动信号流，不是舆情大屏',h2),B('默认只展示值得行动的信号，而不是全部互动。'),B('每条信号：来源、国家、公司、类型、强度、证据、建议动作。'),B('固定类型：品牌兴趣、产品需求、采购意向、渠道合作、专业技术、竞品机会、风险。'),B('一键触发生成解释内容、补FAQ、调整投流、创建客服任务或转交人工。'),P('3.4 客户承接：轻客服，强识别与转交',h2),B('三栏式：对话列表—当前对话—客户公司与信号侧栏。'),B('Agent先完成语言、公司、买家类型和标准资料识别。'),B('突出“为何判断为渠道商/采购商”“还缺什么”“是否需要人工”。'),B('P0不做工单、售后、物流、退款和完整CRM。'),P('3.5 自主权限中心',h2),matrix(['动作','默认模式','建议边界'],[('研究/分析/草稿','自动','保留来源和判断'),('已批准模板自然发布','自动/批量授权','限定账号、国家、频率'),('首次或敏感内容','审批','事实、合规、品牌检查'),('小额投流调整','阈值内自动','预算、增幅、止损线'),('标准资料回复','自动','只调用已批准知识'),('价格/交期/认证/独家','人工','禁止Agent自主承诺')],[55,42,73])]
S += [PageBreak(),P('四、P0开发范围与4:3:3落地',h1),matrix(['能力包','占比','P0必须完成','暂缓'],[('内容创作','40%','知识约束、策略/选题、多语内容、视频/图文、审核、发布、基础投流','复杂视频模型、重型资产管理'),('信号提取','30%','评论/私信/数据接入、七类信号、证据、强度、建议动作、策略回流','全网舆情、复杂预测'),('客服承接','30%','统一会话、标准回复、公司/角色识别、资格补全、人工接管','售后、退款物流、完整CRM、合同报价')],[32,18,75,45]),Spacer(1,5*mm),callout('P0演示主线','设定贵州茶/农特产品的东南亚渠道目标 → Agent生成并发布内容 → 捕捉“认证/MOQ/代理”信号 → 自动回复并识别海外渠道商 → 人工接管 → Agent根据反馈调整下一轮内容。'),P('五、视觉与交互规范',h1),B('可信、专业、克制，避免炫技型AI霓虹大屏。'),B('状态色：蓝=进行中，绿=完成，橙=审批，红=风险，灰=等待外部输入。'),B('统一行动卡：目标、依据、动作、影响、权限、结果、下一步。'),B('重要AI判断必须展示证据和置信度，并允许纠正形成组织记忆。'),B('对话不是唯一入口；批量审核、信号队列和结果比较必须结构化。'),B('移动端只做审批、异常和高价值客户提醒。'),P('六、最终建议',h1),P('灵枢前端应让客户感觉自己“雇佣并管理了一名海外内容增长员工”，而不是购买了一套功能更多的内容平台。',ParagraphStyle('big',parent=body,fontSize=13,leading=20,textColor=NAVY,spaceAfter=10)),matrix(['应强化','应弱化'],[('员工目标、行动流、判断依据、学习结果','首页堆叠传统流量图表'),('内容—信号—客服闭环','三个独立系统式导航'),('权限、审批、异常、审计','宣称完全无人监管'),('目标买家、渠道信号、合格商机','只强调发帖量和播放量'),('企业证据和B2B采购语境','通用消费爆款模板')],[85,85]),Spacer(1,6*mm),P('下一步：制作六页高保真原型——员工驾驶舱、内容任务、信号中心、客户承接、自主权限、结果与学习。先用一个真实贵州品牌和一个目标国家跑通演示数据。',body)]
S += [PageBreak(),P('附录：公开来源',h1),P('Omneky MCP　https://www.omneky.com/mcp',body),P('Creatify AI Media Buyer　https://creatify.ai/features/media-buyer',body),P('Hermoso　https://hermoso.ai/',body),P('Adanamous　https://adanamous.com/',body),P('Predis.ai Auto Post　https://predis.ai/auto-post/',body),Spacer(1,8*mm),P('说明：本报告截图来自各公司公开产品页面，主要用于研究信息架构和交互表达，不代表对其后台全部功能、客户效果或自动化成熟度的独立验证。',body)]
doc.build(S,onFirstPage=page_num,onLaterPages=page_num)
print(OUT)
