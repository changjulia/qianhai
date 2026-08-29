import { buildWorkflowLocally, decideStrategyLocally, type CreationStrategy, type StrategyInput } from '../../../lib/content-agent';
import { buildWorkflowWithQwen, decideWithQwen } from '../../../lib/qwen';
import { runAi } from '../../../lib/ai';

type RequestBody =
  | { action: 'decide'; input: StrategyInput }
  | { action: 'build'; input: StrategyInput; strategy: CreationStrategy };

const strategies:CreationStrategy[]=['viral_remix','product_led','asset_led'];
const validDecision=(value:unknown):value is Awaited<ReturnType<typeof decideWithQwen>> & object=>{const item=value as {strategy?:unknown;confidence?:unknown;reason?:unknown};return Boolean(item&&strategies.includes(item.strategy as CreationStrategy)&&typeof item.confidence==='number'&&typeof item.reason==='string')};
const validWorkflow=(value:unknown):value is Awaited<ReturnType<typeof buildWorkflowWithQwen>> & object=>{const item=value as {strategy?:unknown;steps?:unknown};return Boolean(item&&strategies.includes(item.strategy as CreationStrategy)&&Array.isArray(item.steps)&&item.steps.length===5&&item.steps.every((step:unknown)=>{const entry=step as {name?:unknown;objective?:unknown;output?:unknown;evidence?:unknown;checks?:unknown};return typeof entry.name==='string'&&typeof entry.objective==='string'&&typeof entry.output==='string'&&Array.isArray(entry.evidence)&&Array.isArray(entry.checks)}))};

export async function POST(request: Request) {
  try {
    const body = await request.json() as RequestBody;
    if (!body?.input || !['decide', 'build'].includes(body.action)) {
      return Response.json({ error: 'invalid_request' }, { status: 400 });
    }
    if (body.action === 'decide') {
      const local = decideStrategyLocally(body.input);
      try {
        const qwen = await decideWithQwen(body.input);
        if(validDecision(qwen))return Response.json({decision:{...local,...qwen,provider:'qwen'}});
        const explanation=await runAi('market_strategy',{task:'在既定规则路由结果基础上解释视频创作路径，不改变策略ID',strategy:local.strategy,input:body.input,evidence:local.evidence});
        return Response.json({decision:{...local,reason:explanation.summary,evidence:explanation.evidence.length?explanation.evidence:local.evidence,provider:explanation.provider}});
      } catch {
        const explanation=await runAi('market_strategy',{task:'解释既定视频策略路由结果',strategy:local.strategy,input:body.input,evidence:local.evidence});
        return Response.json({decision:{...local,reason:explanation.summary,evidence:explanation.evidence.length?explanation.evidence:local.evidence,provider:explanation.provider},warning:explanation.provider==='local'?'qwen_unavailable':undefined});
      }
    }
    const local = buildWorkflowLocally(body.input, body.strategy);
    try {
      const qwen = await buildWorkflowWithQwen(body.input, body.strategy);
      if(validWorkflow(qwen))return Response.json({workflow:{...local,...qwen,provider:'qwen'}});
      const guidance=await runAi('market_strategy',{task:'为既定五步视频工作流生成有事实依据的阶段建议',strategy:body.strategy,input:body.input,steps:local.steps});
      return Response.json({workflow:{...local,summary:guidance.summary,steps:local.steps.map((step,index)=>({...step,output:guidance.recommendations[index]||step.output,evidence:guidance.evidence.length?guidance.evidence:step.evidence})),provider:guidance.provider}});
    } catch {
      const guidance=await runAi('market_strategy',{task:'为既定五步视频工作流生成有事实依据的阶段建议',strategy:body.strategy,input:body.input,steps:local.steps});
      return Response.json({workflow:{...local,summary:guidance.summary,steps:local.steps.map((step,index)=>({...step,output:guidance.recommendations[index]||step.output,evidence:guidance.evidence.length?guidance.evidence:step.evidence})),provider:guidance.provider},warning:guidance.provider==='local'?'qwen_unavailable':undefined});
    }
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
}
