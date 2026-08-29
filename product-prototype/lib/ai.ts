export type AiPurpose='executive_summary'|'market_strategy'|'customer_intelligence'|'reply_draft'|'knowledge_answer'|'deal_next_action'|'ad_diagnosis'|'revenue_analysis';
export type AiResult={headline:string;summary:string;recommendations:string[];evidence:string[];confidence:number;warnings:string[];draft?:string;translation?:string;tags?:string[];missingFields?:string[];provider:'qwen'|'local'};

const instructions:Record<AiPurpose,string>={
 executive_summary:'基于经营指标给出管理摘要。只引用输入数字，指出最大偏差、影响和下一步。',
 market_strategy:'评估目标市场、买家与企业准备度，给出市场路径、证据、风险和下一步任务。',
 customer_intelligence:'从客户原话与历史记录提取企业、采购意图、数量、时间、角色和风险。不得猜测缺失字段。',
 reply_draft:'根据客户原话和已确认知识生成简短专业回复。价格、交期、认证、独家代理等未有证据时必须询问或转人工。',
 knowledge_answer:'只使用提供的企业事实和已审批FAQ回答；找不到答案必须明确未命中并建议转人工。',
 deal_next_action:'根据客户、商机阶段和缺失信息给出下一步，区分AI可执行与必须人工确认的动作。',
 ad_diagnosis:'根据投放指标诊断变化原因并给出可验证的下一轮实验。数字计算以输入为准，不臆造因果。',
 revenue_analysis:'基于确定性归因结果总结最佳收入路径、证据完整度和可复制动作，不重新计算或篡改归因。',
};

export function localAiResult(purpose:AiPurpose,context:unknown):AiResult{
 const text=JSON.stringify(context);
 const defaults:Record<AiPurpose,[string,string,string[]]>={
  executive_summary:['经营重点已识别','优先处理高价值待办与当前转化漏损。',['处理超时高意向客户','复核低于目标的转化阶段']],
  market_strategy:['建议优先验证证据完整的目标市场','先以目标买家的采购决策问题组织市场验证，再扩大预算。',['补齐准入与产品证据','用小规模内容和询盘质量验证路径']],
  customer_intelligence:['客户意图已整理','已从现有客户信息提取显性需求；未提供的信息保持未知。',['确认产品规格','确认预算与交付地区']],
  reply_draft:['回复草稿已生成','已按企业事实边界生成安全草稿。',['发送前检查价格与交期承诺']],
  knowledge_answer:['知识检索完成','仅返回已确认企业知识；未命中内容需要人工处理。',['核对引用来源']],
  deal_next_action:['下一步已生成','优先补齐影响资格与报价的关键信息。',['确认预算和决策链','创建有明确期限的跟进']],
  ad_diagnosis:['投放诊断完成','建议先验证素材、受众和落地承接三个变量。',['保留对照组','一次只调整一个主要变量']],
  revenue_analysis:['收入路径已总结','优先复制证据完整且可追溯到商机与订单的增长路径。',['复用高贡献内容结构','补齐低完整度订单证据']],
 };
 const [headline,summary,recommendations]=defaults[purpose];
 if(purpose==='revenue_analysis'){
  const source=context&&typeof context==='object'?context as Record<string,unknown>:{};
  const orders=Array.isArray(source.orders)?source.orders.filter(item=>item&&typeof item==='object') as Record<string,unknown>[]:[];
  const amounts=orders.map(item=>typeof item.amount==='number'&&Number.isFinite(item.amount)?item.amount:0);
  const total=amounts.reduce((sum,value)=>sum+value,0);
  const channels=[...new Set(orders.map(item=>typeof item.channel==='string'?item.channel.trim():'').filter(Boolean))];
  const completeness=orders.map(item=>typeof item.completeness==='number'&&Number.isFinite(item.completeness)?item.completeness:null).filter((value):value is number=>value!==null);
  const average=completeness.length?Math.round(completeness.reduce((sum,value)=>sum+value,0)/completeness.length):null;
  const known=[orders.length?`已读取 ${orders.length} 笔订单`:'未提供订单明细',total?`输入订单金额合计 ¥${total.toLocaleString('zh-CN')}`:'',channels.length?`来源渠道：${channels.join('、')}`:'',average!==null?`平均证据完整度 ${average}%`:''].filter(Boolean);
  return {
   headline:orders.length?`已按 ${orders.length} 笔输入订单核对收入证据`:'当前数据不足以形成收入结论',
   summary:known.join('；')+'。当前只能描述已提供记录，不能由单笔或不完整输入推断整体最佳渠道或客户行业。',
   recommendations:['补充同期全部订单及各渠道对照数据','核对每笔订单的触点序列与原始证据'],
   evidence:known,
   confidence:orders.length&&average!==null?Math.max(0,Math.min(100,average)):40,
   warnings:['未在输入中提供的行业、人群、触点和因果关系均保持未知'],
   provider:'local',
  };
 }
 return {headline,summary,recommendations,evidence:[`已读取 ${text.length} 字符结构化上下文`],confidence:68,warnings:['当前为规则降级结果'],draft:purpose==='reply_draft'?'Thank you for sharing your requirements. I can provide the confirmed specification and sample options. Could you also confirm the target grade, delivery location, and expected timeline so our sales team can prepare the appropriate proposal?':undefined,provider:'local'};
}

function parseJson(text:string){return JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim()) as unknown}
function valid(value:unknown):value is Omit<AiResult,'provider'>{const x=value as Partial<AiResult>;return Boolean(x&&typeof x.headline==='string'&&typeof x.summary==='string'&&Array.isArray(x.recommendations)&&Array.isArray(x.evidence)&&typeof x.confidence==='number'&&Array.isArray(x.warnings))}

export async function runAi(purpose:AiPurpose,context:unknown):Promise<AiResult>{
 const fallback=localAiResult(purpose,context),key=process.env.DASHSCOPE_API_KEY;
 // Revenue attribution is decision-critical. Keep it deterministic so the
 // model cannot introduce industries, audiences or causal claims absent from
 // the verified attribution payload.
 if(purpose==='revenue_analysis')return fallback;
 if(!key)return fallback;
 const base=(process.env.QWEN_BASE_URL||'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/,'');
 const system=`你是黔海灵枢企业经营智能体。${instructions[purpose]}\n必须返回JSON对象：headline, summary, recommendations(string[]), evidence(string[]), confidence(0-100), warnings(string[])；reply_draft可增加draft和translation；customer_intelligence可增加tags和missingFields。重要判断必须引用输入证据。不得编造数字、客户身份、产品参数、认证、价格、MOQ、交期或归因。`;
 for(let attempt=0;attempt<2;attempt++){
  try{const response=await fetch(`${base}/chat/completions`,{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.QWEN_MODEL||'qwen-plus',temperature:.15,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(context)}]})});if(!response.ok){if(response.status<500&&response.status!==429)break;if(attempt===0)await new Promise(resolve=>setTimeout(resolve,350));continue}const data=await response.json() as {choices?:Array<{message?:{content?:string}}>};const content=data.choices?.[0]?.message?.content;if(!content)continue;const parsed=parseJson(content);if(valid(parsed))return {...fallback,...parsed,confidence:Math.max(0,Math.min(100,parsed.confidence)),provider:'qwen'}}catch{if(attempt===0)await new Promise(resolve=>setTimeout(resolve,350))}
 }
 return {...fallback,warnings:['千问调用失败，已返回规则降级结果'],provider:'local'};
}
