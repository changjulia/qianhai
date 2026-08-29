'use client';

import { useEffect, useMemo, useState } from 'react';
import { requestAi } from '../lib/ai-client';

type Area = 'facts' | 'social' | 'service';
type FactTab = 'company' | 'products';
type ServiceTab = 'rules' | 'faq' | 'style' | 'handoff';

type KnowledgeState = {
  company: { name:string; industry:string; type:string; founded:string; markets:string; languages:string; description:string };
  product: { name:string; sku:string; category:string; price:string; moq:string; leadTime:string; certifications:string; highlights:string };
  social: { routes:string[]; buyers:string; cta:string; tone:string; excludedMarkets:string };
  rules: { quoteMode:'human'|'range'; priceRange:string; bargain:'no'|'limited'|'open'; bargainFloor:string; sample:string; payment:string };
  faq: Array<{ id:string; question:string; answer:string; approved:boolean }>;
  style: { tone:string; length:string; proven:string; weak:string; corrections:string };
  handoff: { autonomy:'remind'|'draft'|'auto'; keywords:string; missCount:number; negative:boolean; aiAccess:boolean };
};

const initialState:KnowledgeState = {
  company:{name:'贵州梵净山抹茶有限公司',industry:'食品饮料 / 茶原料',type:'工贸一体',founded:'2017',markets:'马来西亚、新加坡、阿联酋',languages:'中文、英语',description:'专注食品级抹茶粉研发、生产与出口，服务饮品、烘焙和食品加工客户。'},
  product:{name:'食品级抹茶 M-02',sku:'MATCHA-M02',category:'抹茶粉',price:'USD 18–24 / kg',moq:'100 kg',leadTime:'常规订单 15–20 天',certifications:'ISO 22000、HACCP、Halal',highlights:'色泽鲜亮、低苦涩，适用于连锁饮品、冰淇淋与烘焙。'},
  social:{routes:['OEM / ODM','现货批发 / 经销'],buyers:'食品原料进口商、连锁饮品研发负责人、采购经理',cta:'索取规格书与样品',tone:'专业可靠、简洁直接',excludedMarkets:'暂不主动经营欧盟零售市场'},
  rules:{quoteMode:'human',priceRange:'USD 18–24 / kg',bargain:'limited',bargainFloor:'低于 USD 18 / kg 必须转人工',sample:'可寄 100g 付费样品；运费由客户承担',payment:'T/T 30% 订金，发货前付清尾款'},
  faq:[
    {id:'f1',question:'你们的最低起订量是多少？',answer:'食品级抹茶常规 MOQ 为 100 kg；试单需求由销售经理另行确认。',approved:true},
    {id:'f2',question:'是否可以提供清真认证？',answer:'M-02 当前可提供 Halal 认证文件，发送前需由销售人员核对版本。',approved:true},
    {id:'f3',question:'可以免费寄样吗？',answer:'目前提供 100g 付费样品，运费由客户承担；特殊申请需人工确认。',approved:false},
  ],
  style:{tone:'专业、友好、不夸张',length:'2–4 句，先回答再提一个推进问题',proven:'先确认应用场景，再提供匹配等级与样品选项',weak:'首轮沟通一次性发送过多参数',corrections:'避免使用“绝对最好”；交期必须表达为常规区间'},
  handoff:{autonomy:'draft',keywords:'投诉、退款、独家代理、账期、manager、complaint',missCount:2,negative:true,aiAccess:true},
};

function Field({label,children,wide=false}:{label:string;children:React.ReactNode;wide?:boolean}) {
  return <label className={wide?'kb-field kb-wide':'kb-field'}><span>{label}</span>{children}</label>;
}

export function EnterpriseKnowledgePage() {
  const [area,setArea]=useState<Area>('facts');
  const [factTab,setFactTab]=useState<FactTab>('company');
  const [serviceTab,setServiceTab]=useState<ServiceTab>('rules');
  const [data,setData]=useState<KnowledgeState>(initialState);
  const [saved,setSaved]=useState(true);
  const [notice,setNotice]=useState('');
  const [version,setVersion]=useState(0);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [checking,setChecking]=useState(false);

  useEffect(()=>{
    let active=true;
    fetch('/api/knowledge',{cache:'no-store'}).then(async response=>{
      if(!response.ok) throw new Error('知识库加载失败');
      return response.json() as Promise<{state:KnowledgeState|null;version:number}>;
    }).then(result=>{if(active){if(result.state){setData(result.state);setSaved(true)}else{setSaved(false);setNotice('当前显示演示资料，尚未保存到企业知识库')}setVersion(result.version);setError('')}})
      .catch(()=>{if(active)setError('暂时无法读取服务器知识，请检查后端连接。')})
      .finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[]);

  const completion=useMemo(()=>{
    const checks=[data.company.name&&data.company.description,data.product.name&&data.product.moq,data.rules.priceRange&&data.rules.payment,data.faq.some(item=>item.approved),data.style.tone,data.handoff.keywords];
    return Math.round(checks.filter(Boolean).length/checks.length*100);
  },[data]);
  const approvedFaqs=data.faq.filter(item=>item.approved).length;
  const change=(updater:(current:KnowledgeState)=>KnowledgeState)=>{setData(updater);setSaved(false);};
  const save=async()=>{setSaving(true);setError('');try{const response=await fetch('/api/knowledge',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:data,version})});const result=await response.json() as {version?:number;error?:string;currentVersion?:number};if(response.status===409){setVersion(result.currentVersion??version);throw new Error('知识已被其他成员更新，请刷新后再保存。')}if(!response.ok||!result.version)throw new Error('知识保存失败');setVersion(result.version);setSaved(true);setNotice('资料已写入企业知识库，并更新数字员工可用范围');window.setTimeout(()=>setNotice(''),2600)}catch(reason){setError(reason instanceof Error?reason.message:'知识保存失败')}finally{setSaving(false)}};
  const checkKnowledge=async()=>{setChecking(true);setError('');try{const result=await requestAi('knowledge_answer',{question:'请说明该产品的MOQ、常规交期、认证和样品政策。',company:data.company,product:data.product,rules:data.rules,approvedFaqs:data.faq.filter(item=>item.approved),guardrails:data.handoff});setNotice(`${result.provider==='qwen'?'千问':'规则'}知识检查：${result.summary}`)}catch(reason){setError(reason instanceof Error?reason.message:'知识检查失败')}finally{setChecking(false)}};
  const input=(value:string,onChange:(value:string)=>void)=><input value={value} onChange={event=>onChange(event.target.value)}/>;
  const textarea=(value:string,onChange:(value:string)=>void,rows=3)=><textarea rows={rows} value={value} onChange={event=>onChange(event.target.value)}/>;

  return <div className="knowledge-page">
    <div className="kb-heading">
      <div><p className="eyebrow">黔海 · 平台管理</p><h1>企业知识库</h1><p>集中管理企业真实事实、经营规则与沟通边界，作为所有数字员工统一可信来源。</p></div>
      <div className="kb-heading-actions"><span className={saved?'saved':'unsaved'}>{loading?'正在同步…':saved?'✓ 已保存':'● 演示资料尚未保存'}</span><button disabled={checking||loading} onClick={()=>void checkKnowledge()}>{checking?'检查中…':'AI知识检查'}</button><button className="primary" disabled={saved||saving||loading} onClick={save}>{saving?'正在保存…':saved?'已保存':'保存并授权 AI 使用'}</button></div>
    </div>
    {notice&&<div className="kb-toast">✓ {notice}</div>}
    {error&&<div className="kb-toast" role="alert">{error}</div>}

    <section className="kb-overview panel">
      <div className="kb-score"><span style={{'--score':`${completion*3.6}deg`} as React.CSSProperties}><b>{completion}%</b></span><div><strong>知识完成度</strong><small>{completion>=84?'已满足安全运行基线':'仍有关键资料待补充'}</small></div></div>
      <div className="kb-metric"><span>产品资料</span><strong>1 个</strong><small>MOQ、交期、认证已填写</small></div>
      <div className="kb-metric"><span>已审批问答</span><strong>{approvedFaqs} 条</strong><small>仅审批内容允许自动引用</small></div>
      <div className="kb-metric"><span>知识缺口</span><strong>3 类</strong><small>独家代理、账期、定制包装</small></div>
      <div className="kb-access"><span>AI 全局访问</span><button type="button" role="switch" aria-label="AI 全局访问" aria-checked={data.handoff.aiAccess} className={data.handoff.aiAccess?'on':''} onClick={()=>change(d=>({...d,handoff:{...d.handoff,aiAccess:!d.handoff.aiAccess}}))}><i/></button><small>{data.handoff.aiAccess?'已授权 6 位数字员工':'当前已暂停知识注入'}</small></div>
    </section>

    <div className="kb-area-tabs" role="tablist">
      <button className={area==='facts'?'active':''} onClick={()=>setArea('facts')}><b>企</b><span>企业真实资料<small>公司、市场与产品事实</small></span></button>
      <button className={area==='social'?'active':''} onClick={()=>setArea('social')}><b>策</b><span>社媒策略<small>获客路线与品牌表达</small></span></button>
      <button className={area==='service'?'active':''} onClick={()=>setArea('service')}><b>客</b><span>智能客服规范<small>回答边界与转人工规则</small></span></button>
    </div>

    <div className="kb-workspace">
      <aside className="kb-side panel">
        <div><span>全局注入范围</span><strong>知识保存后自动生效</strong></div>
        {['市场策略数字员工','内容策划数字员工','询盘接待数字员工','成交推进数字员工'].map((name,index)=><p key={name}><i>{index<2?'策':'客'}</i><span><b>{name}</b><small>{data.handoff.aiAccess?'可读取当前知识':'知识访问已暂停'}</small></span><em className={data.handoff.aiAccess?'ready':''}>{data.handoff.aiAccess?'已授权':'暂停'}</em></p>)}
        <footer><b>可信回答原则</b><p>企业知识 ＞ 已审批 FAQ ＞ 销售风格。价格、库存、MOQ、交期和资质未命中时，数字员工不得推测。</p></footer>
      </aside>

      <section className="kb-editor panel">
        {area==='facts'&&<>
          <header><div><h2>企业真实资料</h2><p>数字员工回答业务事实时，以这里的当前版本为准。</p></div><div className="kb-subtabs"><button className={factTab==='company'?'active':''} onClick={()=>setFactTab('company')}>公司与市场</button><button className={factTab==='products'?'active':''} onClick={()=>setFactTab('products')}>产品资料</button></div></header>
          {factTab==='company'?<div className="kb-form">
            <Field label="企业名称">{input(data.company.name,v=>change(d=>({...d,company:{...d.company,name:v}})))}</Field><Field label="所属行业">{input(data.company.industry,v=>change(d=>({...d,company:{...d.company,industry:v}})))}</Field>
            <Field label="企业类型"><select value={data.company.type} onChange={e=>change(d=>({...d,company:{...d.company,type:e.target.value}}))}>{['工厂','工贸一体','贸易商','品牌商'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="成立年份">{input(data.company.founded,v=>change(d=>({...d,company:{...d.company,founded:v}})))}</Field>
            <Field label="主攻市场">{input(data.company.markets,v=>change(d=>({...d,company:{...d.company,markets:v}})))}</Field><Field label="首选沟通语言">{input(data.company.languages,v=>change(d=>({...d,company:{...d.company,languages:v}})))}</Field>
            <Field label="企业介绍" wide>{textarea(data.company.description,v=>change(d=>({...d,company:{...d.company,description:v}})),4)}</Field>
          </div>:<div className="kb-product-card"><div className="kb-product-head"><span>茶</span><div><h3>{data.product.name}</h3><p>{data.product.sku} · {data.product.category}</p></div><em>资料完整</em></div><div className="kb-form">
            <Field label="产品名称">{input(data.product.name,v=>change(d=>({...d,product:{...d.product,name:v}})))}</Field><Field label="SKU">{input(data.product.sku,v=>change(d=>({...d,product:{...d.product,sku:v}})))}</Field>
            <Field label="可公开价格区间">{input(data.product.price,v=>change(d=>({...d,product:{...d.product,price:v}})))}</Field><Field label="最低起订量">{input(data.product.moq,v=>change(d=>({...d,product:{...d.product,moq:v}})))}</Field>
            <Field label="常规交期">{input(data.product.leadTime,v=>change(d=>({...d,product:{...d.product,leadTime:v}})))}</Field><Field label="认证资质">{input(data.product.certifications,v=>change(d=>({...d,product:{...d.product,certifications:v}})))}</Field>
            <Field label="核心卖点与适用场景" wide>{textarea(data.product.highlights,v=>change(d=>({...d,product:{...d.product,highlights:v}})),3)}</Field>
          </div></div>}
        </>}

        {area==='social'&&<><header><div><h2>社媒获客策略</h2><p>将企业真实能力转换为统一的内容路线与行动引导。</p></div><span className="kb-policy">不覆盖事实资料</span></header><div className="kb-form">
          <Field label="启用的合作路线" wide><div className="kb-checks">{['OEM / ODM','现货批发 / 经销','C 端零售'].map(route=><label key={route}><input type="checkbox" checked={data.social.routes.includes(route)} onChange={()=>change(d=>({...d,social:{...d.social,routes:d.social.routes.includes(route)?d.social.routes.filter(x=>x!==route):[...d.social.routes,route]}}))}/><span>{route}</span></label>)}</div></Field>
          <Field label="目标买家角色" wide>{input(data.social.buyers,v=>change(d=>({...d,social:{...d.social,buyers:v}})))}</Field><Field label="主要行动引导">{input(data.social.cta,v=>change(d=>({...d,social:{...d.social,cta:v}})))}</Field><Field label="品牌调性">{input(data.social.tone,v=>change(d=>({...d,social:{...d.social,tone:v}})))}</Field><Field label="暂不经营市场" wide>{input(data.social.excludedMarkets,v=>change(d=>({...d,social:{...d.social,excludedMarkets:v}})))}</Field>
        </div></>}

        {area==='service'&&<><header><div><h2>智能客服规范</h2><p>控制数字员工可以怎么答、什么时候必须转人工。</p></div><div className="kb-subtabs service"><button className={serviceTab==='rules'?'active':''} onClick={()=>setServiceTab('rules')}>报价规则</button><button className={serviceTab==='faq'?'active':''} onClick={()=>setServiceTab('faq')}>常见问答</button><button className={serviceTab==='style'?'active':''} onClick={()=>setServiceTab('style')}>销售风格</button><button className={serviceTab==='handoff'?'active':''} onClick={()=>setServiceTab('handoff')}>接待与转人工</button></div></header>
          {serviceTab==='rules'&&<div className="kb-form"><Field label="报价模式" wide><div className="kb-choice"><button className={data.rules.quoteMode==='human'?'active':''} onClick={()=>change(d=>({...d,rules:{...d.rules,quoteMode:'human'}}))}><b>询价转人工</b><small>AI 不直接承诺最终价格</small></button><button className={data.rules.quoteMode==='range'?'active':''} onClick={()=>change(d=>({...d,rules:{...d.rules,quoteMode:'range'}}))}><b>允许回答区间</b><small>仅引用已确认区间</small></button></div></Field><Field label="可引用价格区间">{input(data.rules.priceRange,v=>change(d=>({...d,rules:{...d.rules,priceRange:v}})))}</Field><Field label="议价底线">{input(data.rules.bargainFloor,v=>change(d=>({...d,rules:{...d.rules,bargainFloor:v}})))}</Field><Field label="样品政策" wide>{textarea(data.rules.sample,v=>change(d=>({...d,rules:{...d.rules,sample:v}})))}</Field><Field label="付款条款" wide>{textarea(data.rules.payment,v=>change(d=>({...d,rules:{...d.rules,payment:v}})))}</Field></div>}
          {serviceTab==='faq'&&<div className="kb-faq"><div className="kb-callout"><b>自动回复安全门</b><span>仅“已审批”且语义置信度 ≥ 90% 的问答可自动引用；其余进入草稿或转人工。</span><button onClick={()=>change(d=>({...d,faq:[...d.faq,{id:`f${Date.now()}`,question:'',answer:'',approved:false}]}))}>＋ 新增问答</button></div>{data.faq.map((item,index)=><article key={item.id}><span>{index+1}</span><div><input aria-label="问题" value={item.question} placeholder="客户常见问题" onChange={e=>change(d=>({...d,faq:d.faq.map(x=>x.id===item.id?{...x,question:e.target.value}:x)}))}/><textarea aria-label="答案" rows={2} value={item.answer} placeholder="只能填写已核实的答案" onChange={e=>change(d=>({...d,faq:d.faq.map(x=>x.id===item.id?{...x,answer:e.target.value}:x)}))}/></div><label><input type="checkbox" checked={item.approved} onChange={()=>change(d=>({...d,faq:d.faq.map(x=>x.id===item.id?{...x,approved:!x.approved}:x)}))}/><b>{item.approved?'已审批':'待审批'}</b></label></article>)}</div>}
          {serviceTab==='style'&&<div className="kb-form"><div className="kb-style-rule kb-wide"><b>只学习表达，不学习事实</b><p>称呼、语气、回复长度和行动引导可由历史对话沉淀；价格、MOQ、交期、库存和资质始终使用知识库当前事实。</p></div><Field label="沟通语气">{input(data.style.tone,v=>change(d=>({...d,style:{...d.style,tone:v}})))}</Field><Field label="回复长度与结构">{input(data.style.length,v=>change(d=>({...d,style:{...d.style,length:v}})))}</Field><Field label="已验证有效表达" wide>{textarea(data.style.proven,v=>change(d=>({...d,style:{...d.style,proven:v}})))}</Field><Field label="低效表达 / 需降权" wide>{textarea(data.style.weak,v=>change(d=>({...d,style:{...d.style,weak:v}})))}</Field><Field label="用户纠正偏好" wide>{textarea(data.style.corrections,v=>change(d=>({...d,style:{...d.style,corrections:v}})))}</Field></div>}
          {serviceTab==='handoff'&&<div className="kb-form"><Field label="数字员工自主等级" wide><div className="kb-choice three">{([['remind','只提醒我'],['draft','草稿需确认'],['auto','已审批问答自动回']] as const).map(([key,label])=><button key={key} className={data.handoff.autonomy===key?'active':''} onClick={()=>change(d=>({...d,handoff:{...d.handoff,autonomy:key}}))}><b>{label}</b><small>{key==='auto'?'未命中仍转人工':key==='draft'?'推荐的安全模式':'不生成客户回复'}</small></button>)}</div></Field><Field label="强制转人工关键词" wide>{textarea(data.handoff.keywords,v=>change(d=>({...d,handoff:{...d.handoff,keywords:v}})))}</Field><Field label="连续未命中次数"><input type="number" min="1" max="5" value={data.handoff.missCount} onChange={e=>change(d=>({...d,handoff:{...d.handoff,missCount:Number(e.target.value)}}))}/></Field><Field label="负面情绪"><label className="kb-inline-check"><input type="checkbox" checked={data.handoff.negative} onChange={()=>change(d=>({...d,handoff:{...d.handoff,negative:!d.handoff.negative}}))}/>识别后转人工</label></Field><div className="kb-flow kb-wide"><span><b>客户提问</b><small>识别意图</small></span><i>→</i><span><b>检索知识</b><small>事实 + FAQ</small></span><i>→</i><span className="success"><b>高置信命中</b><small>按自主等级执行</small></span><i> / </i><span className="danger"><b>未命中 / 红线</b><small>澄清或转人工</small></span></div></div>}
        </>}
      </section>
    </div>
  </div>;
}
