import { runAi, type AiPurpose } from '../../../lib/ai';

const purposes:AiPurpose[]=['executive_summary','market_strategy','customer_intelligence','reply_draft','knowledge_answer','deal_next_action','ad_diagnosis','revenue_analysis'];
export async function POST(request:Request){
 try{const body=await request.json() as {purpose?:AiPurpose;context?:unknown};if(!body.purpose||!purposes.includes(body.purpose))return Response.json({error:'unsupported_purpose'},{status:400});const result=await runAi(body.purpose,body.context??{});return Response.json({result},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'invalid_request'},{status:400})}
}
