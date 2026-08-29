import { ApiError, createRequestContext, jsonResponse, readJsonBody, withApiErrors } from '@/lib/server';
import { assertTaskScope, commonStatements, json, parseWorkflowInput, priorResult, requireTransition, workflowId } from '@/lib/server/workflow';

type Row = Record<string, unknown>;
const MOCK = '贵客松 Demo模拟数据，不代表真实交易。';
const s = (p: Row, key: string, fallback = '') => typeof p[key] === 'string' && p[key] ? String(p[key]) : fallback;
const n = (p: Row, key: string, fallback = 0) => typeof p[key] === 'number' && Number.isFinite(p[key]) ? Number(p[key]) : fallback;
const a = (p: Row, key: string) => Array.isArray(p[key]) ? p[key] : [];

async function ensureRun(db: D1Database, org: string, actor: string, runId: string) {
  const foreign = await db.prepare('SELECT id FROM workflow_runs WHERE id=? AND organization_id<>?').bind(runId, org).first();
  if (foreign) throw new ApiError(403, 'forbidden', 'Workflow run belongs to another organization');
  await db.prepare(`INSERT OR IGNORE INTO workflow_runs
    (id,organization_id,workflow_type,status,correlation_id,input_json,result_json,error_json,created_by)
    VALUES (?,?,'commercial_e2e','running',?,'{}','{}','{}',?)`).bind(runId, org, runId, actor).run();
}

function resource(db: D1Database, runId: string, type: string, id: string, order: number) {
  return db.prepare(`INSERT INTO workflow_run_resources(id,workflow_run_id,resource_type,resource_id,delete_order)
    VALUES (?,?,?,?,?)`).bind(workflowId('wrr'), runId, type, id, order);
}

async function finish(db: D1Database, ctx: Awaited<ReturnType<typeof createRequestContext>>, w: ReturnType<typeof parseWorkflowInput>,
  type: string, id: string, result: Row, statements: D1PreparedStatement[], status = 201,
  state?: { from?: string | null; to: string; taskId?: string; customerId?: string; opportunityId?: string }) {
  statements.push(...commonStatements({ db, actor: ctx.actor, ledgerId: workflowId('idem'), auditId: workflowId('audit'),
    historyId: state ? workflowId('bsh') : undefined, outboxId: workflowId('outbox'), workflow: w,
    resourceType: type, resourceId: id, result, fromState: state?.from, toState: state?.to,
    taskId: state?.taskId, customerId: state?.customerId, opportunityId: state?.opportunityId }));
  await db.batch(statements);
  return jsonResponse({ ok: true, ...result }, { status });
}

export async function POST(request: Request) {
  return withApiErrors(async (requestId) => {
    // vinext's local proxy strips the production authentication headers. The
    // test-only alias is translated inside this route and remains subject to
    // normal organization membership validation.
    const localUserId = request.headers.get('x-openai-user-id');
    if (localUserId && !request.headers.get('oai-authenticated-user-id')) {
      const headers = new Headers(request.headers);
      headers.set('oai-authenticated-user-id', localUserId);
      headers.set('oai-authenticated-user-name', request.headers.get('x-openai-user-name') ?? 'E2E runner');
      request = new Request(request, { headers });
    }
    const ctx = await createRequestContext(request, { requestId });
    const w = parseWorkflowInput(await readJsonBody(request), request);
    const db = ctx.db, p = w.payload, now = new Date().toISOString();
    await ensureRun(db, ctx.actor.organizationId, ctx.actor.userId, w.runId);
    const replay = await priorResult(db, ctx.actor.organizationId, w.idempotencyKey);
    if (replay) return jsonResponse({ ok: true, replayed: true, ...replay });

    if (w.action === 'get_run') return getRun(db, ctx.actor.organizationId, w.runId);
    if (w.action === 'cleanup_run') return cleanup(db, ctx.actor.organizationId, w.runId);

    if (w.action === 'create_task') {
      const id = workflowId('task'), result = { task: { id, status: 'draft' } };
      return finish(db, ctx, w, 'task', id, result, [
        db.prepare(`INSERT INTO growth_tasks(id,enterprise_id,name,product_ids_json,target_market,target_segments_json,languages_json,channels_json,autonomy_mode,starts_on,ends_on,budget_cny,goals_json,status,owner_role,workflow_run_id,idempotency_key)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?)`).bind(id,s(p,'enterpriseId','ent-demo-matcha'),s(p,'name','E2E growth task'),json(a(p,'productIds')),s(p,'targetMarket','马来西亚'),json(a(p,'targetSegments')),json(a(p,'languages')),json(a(p,'channels')),s(p,'autonomyMode','collaborative'),s(p,'startsOn',now.slice(0,10)),s(p,'endsOn',new Date(Date.now()+30*864e5).toISOString().slice(0,10)),n(p,'budgetCny',10000),json(p.goals ?? {}),s(p,'ownerRole','项目负责人'),w.runId,w.idempotencyKey),
        db.prepare(`INSERT INTO durable_task_states(task_id,organization_id,status,state_json,updated_by_user_id) VALUES (?,?,'active','{}',?)`).bind(id,ctx.actor.organizationId,ctx.actor.userId), resource(db,w.runId,'growth_tasks',id,100),
      ]);
    }
    if (w.action === 'update_task') {
      const id=s(p,'taskId'); await assertTaskScope(db,ctx.actor.organizationId,id);
      const row=await db.prepare('SELECT status FROM growth_tasks WHERE id=?').bind(id).first<{status:string}>(); const next=s(p,'status',row!.status);
      requireTransition(row!.status,next,{draft:['draft','active','cancelled'],active:['active','paused','completed','cancelled'],paused:['paused','active','cancelled'],completed:['completed'],cancelled:['cancelled']});
      return finish(db,ctx,w,'task',id,{task:{id,status:next}},[db.prepare('UPDATE growth_tasks SET name=COALESCE(?,name),status=? WHERE id=?').bind(p.name??null,next,id)],200);
    }
    const taskId=s(p,'taskId'); if (taskId) await assertTaskScope(db,ctx.actor.organizationId,taskId);
    if (w.action === 'create_content') {
      const id=workflowId('content'), result={content:{id,status:'draft'}};
      return finish(db,ctx,w,'content',id,result,[db.prepare(`INSERT INTO contents(id,task_id,product_id,title,content_type,language,target_segment,channel,body,cta,evidence_refs_json,asset_refs_json,status,mock_notice,workflow_run_id,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?)`).bind(id,taskId,p.productId??null,s(p,'title','E2E content'),s(p,'contentType','post'),s(p,'language','en'),s(p,'targetSegment','buyer'),s(p,'channel','LinkedIn'),s(p,'body','E2E demo content'),s(p,'cta','Request specification'),json(a(p,'evidenceRefs')),json(a(p,'assetRefs')),MOCK,w.runId,w.idempotencyKey),resource(db,w.runId,'contents',id,150)]);
    }
    if (w.action === 'schedule_content') {
      const id=workflowId('schedule'), contentId=s(p,'contentId');
      const owned=await db.prepare('SELECT id FROM contents WHERE id=? AND task_id=?').bind(contentId,taskId).first(); if(!owned) throw new ApiError(404,'not_found','Content is outside the task');
      return finish(db,ctx,w,'schedule',id,{schedule:{id,status:'scheduled'}},[db.prepare(`INSERT INTO content_schedule(id,task_id,content_id,scheduled_at,channel,status,metrics_json,workflow_run_id,idempotency_key) VALUES (?,?,?,?,?,'scheduled','{}',?,?)`).bind(id,taskId,contentId,s(p,'scheduledAt',new Date(Date.now()+3600e3).toISOString()),s(p,'channel','LinkedIn'),w.runId,w.idempotencyKey),resource(db,w.runId,'content_schedule',id,170)]);
    }
    if (w.action === 'create_campaign') {
      const id=workflowId('campaign'); return finish(db,ctx,w,'campaign',id,{campaign:{id,status:'draft'}},[db.prepare(`INSERT INTO ad_campaigns(id,task_id,name,objective,market,cities_json,segments_json,job_titles_json,content_ids_json,budget_cny,status,metrics_json,workflow_run_id,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?,'draft','{}',?,?)`).bind(id,taskId,s(p,'name','E2E campaign'),s(p,'objective','lead_generation'),s(p,'market','马来西亚'),json(a(p,'cities')),json(a(p,'segments')),json(a(p,'jobTitles')),json(a(p,'contentIds')),n(p,'budgetCny',1000),w.runId,w.idempotencyKey),resource(db,w.runId,'ad_campaigns',id,160)]);
    }
    if (w.action === 'create_customer') {
      const interestedProducts = Array.isArray(p.interestedProductIds) ? p.interestedProductIds : a(p,'interestedProducts');
      const id=workflowId('customer'); return finish(db,ctx,w,'customer',id,{customer:{id,status:'new_inquiry'}},[db.prepare(`INSERT INTO customers(id,display_name,mock_label,market,company_type,contact_role,source_channel,interested_products_json,requirements_json,pain_points_json,intent_score,lifecycle_stage,owner_role,next_step,mock_notice,workflow_run_id,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,'new_inquiry',?,?,?, ?,?)`).bind(id,s(p,'displayName','E2E 客户（Mock）'),'Mock',s(p,'market','马来西亚'),s(p,'companyType','食品原料进口商'),s(p,'contactRole','采购负责人'),s(p,'sourceChannel','LinkedIn'),json(interestedProducts),json(a(p,'requirements')),json(a(p,'painPoints')),n(p,'intentScore',60),s(p,'ownerRole','海外销售'),s(p,'nextStep','需求资格确认'),MOCK,w.runId,w.idempotencyKey),resource(db,w.runId,'customers',id,200)]);
    }
    if (w.action === 'create_inquiry') {
      const id=workflowId('conversation'), customerId=s(p,'customerId');
      const customer=await db.prepare('SELECT id FROM customers WHERE id=? AND workflow_run_id=?').bind(customerId,w.runId).first(); if(!customer) throw new ApiError(404,'not_found','Customer is outside this run');
      const messageId=workflowId('message');
      return finish(db,ctx,w,'inquiry',id,{inquiry:{id,messageId,status:'open'}},[db.prepare(`INSERT INTO conversations(id,customer_id,channel,started_at,status,current_owner,summary,workflow_run_id,idempotency_key) VALUES (?,?,?,?,'open','AI',?,?,?)`).bind(id,customerId,s(p,'channel','WhatsApp'),now,s(p,'summary',s(p,'body','E2E inquiry')),w.runId,w.idempotencyKey),db.prepare(`INSERT INTO messages(id,conversation_id,sent_at,sender_type,sender_label,language,body,attachment_refs_json,knowledge_refs_json,automated) VALUES (?,?,?,'customer','E2E customer','en',?,'[]','[]',0)`).bind(messageId,id,now,s(p,'body','E2E inquiry')),resource(db,w.runId,'messages',messageId,310),resource(db,w.runId,'conversations',id,300)]);
    }
    if (w.action === 'create_quote') return createQuote(db,ctx,w);
    if (w.action === 'request_quote_approval') return requestApproval(db,ctx,w);
    if (w.action === 'decide_approval') return decideApproval(db,ctx,w);
    if (w.action === 'create_order') return createOrder(db,ctx,w);
    if (w.action === 'record_attribution') {
      const id=workflowId('attr'), orderId=s(p,'orderId');
      let customerId=s(p,'customerId'), opportunityId=s(p,'opportunityId'), attributionTaskId=taskId;
      if (orderId) {
        const order=await db.prepare(`SELECT o.customer_id customerId,o.opportunity_id opportunityId,o.task_id taskId
          FROM orders o JOIN durable_task_states d ON d.task_id=o.task_id
          WHERE o.id=? AND o.workflow_run_id=? AND d.organization_id=?`).bind(orderId,w.runId,ctx.actor.organizationId).first<Row>();
        if(!order) throw new ApiError(404,'not_found','Order is outside this workflow run');
        customerId=String(order.customerId); opportunityId=String(order.opportunityId); attributionTaskId=String(order.taskId);
      }
      return finish(db,ctx,w,'attribution',id,{attribution:{id,eventType:s(p,'eventType','order_won')}},[db.prepare(`INSERT INTO attribution_events(id,customer_id,opportunity_id,occurred_at,event_type,source_type,source_id,campaign_id,content_id,metadata_json,workflow_run_id,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,customerId,opportunityId||null,now,s(p,'eventType','order_won'),s(p,'sourceType','workflow'),p.sourceId??orderId??null,p.campaignId??null,p.contentId??null,json(p.metadata??{}),w.runId,w.idempotencyKey),resource(db,w.runId,'attribution_events',id,900)],201,{to:s(p,'eventType','recorded'),taskId:attributionTaskId,customerId,opportunityId});
    }
    throw new ApiError(422,'validation_error','Unsupported action');
  });
}

async function createQuote(db:D1Database,ctx:Awaited<ReturnType<typeof createRequestContext>>,w:ReturnType<typeof parseWorkflowInput>){
  const p=w.payload, taskId=s(p,'taskId'), customerId=s(p,'customerId'); await assertTaskScope(db,ctx.actor.organizationId,taskId);
  let opportunityId=s(p,'opportunityId'); const stmts:D1PreparedStatement[]=[];
  if(!opportunityId){ opportunityId=workflowId('opp'); stmts.push(db.prepare(`INSERT INTO opportunities(id,task_id,customer_id,name,stage,amount_cny,probability,product_ids_json,last_activity_at,next_step,mock_notice,workflow_run_id,idempotency_key) VALUES (?,?,?,?,'quotation',?,0.5,'[]',?,'报价待审批',?,?,?)`).bind(opportunityId,taskId,customerId,s(p,'opportunityName','E2E opportunity'),n(p,'totalAmount',n(p,'subtotalAmount',1000)),new Date().toISOString(),MOCK,w.runId,`${w.idempotencyKey}:opportunity`),resource(db,w.runId,'opportunities',opportunityId,400)); }
  const submittedLines=Array.isArray(p.lines)&&p.lines.length?p.lines:Array.isArray(p.items)&&p.items.length?p.items:null;
  const id=workflowId('quote'), lines=submittedLines?submittedLines as Row[]:[{description:'Demo product',quantity:1,unit:'kg',unitPrice:n(p,'totalAmount',1000)}];
  const subtotal=lines.reduce((sum,l)=>sum+n(l,'quantity',1)*n(l,'unitPrice',0)-n(l,'discountAmount',0),0), discount=n(p,'discountAmount',0), tax=n(p,'taxAmount',0), total=n(p,'totalAmount',subtotal-discount+tax);
  stmts.push(db.prepare(`INSERT INTO quotes(id,organization_id,workflow_run_id,task_id,customer_id,opportunity_id,quote_number,currency,subtotal_amount,discount_amount,tax_amount,total_amount,status,payment_terms,delivery_terms,valid_until,customer_snapshot_json,terms_json,mock_notice,created_by,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?,?,?,?,?,?)`).bind(id,ctx.actor.organizationId,w.runId,taskId,customerId,opportunityId,s(p,'quoteNumber',`E2E-${Date.now()}`),s(p,'currency','CNY'),subtotal,discount,tax,total,p.paymentTerms??null,p.deliveryTerms??null,s(p,'validUntil',new Date(Date.now()+14*864e5).toISOString()),'{}',json(p.terms??{}),MOCK,ctx.actor.userId,w.idempotencyKey));
  lines.forEach((l,i)=>stmts.push(db.prepare(`INSERT INTO quote_lines(id,quote_id,line_number,product_id,description,quantity,unit,unit_price,discount_amount,line_total,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(workflowId('ql'),id,i+1,l.productId??null,s(l,'description','Demo product'),n(l,'quantity',1),s(l,'unit','kg'),n(l,'unitPrice',0),n(l,'discountAmount',0),n(l,'quantity',1)*n(l,'unitPrice',0)-n(l,'discountAmount',0),'{}'))); stmts.push(resource(db,w.runId,'quotes',id,600));
  return finish(db,ctx,w,'quote',id,{quote:{id,status:'draft',opportunityId,totalAmount:total}},stmts,201,{to:'draft',taskId,customerId,opportunityId});
}

async function requestApproval(db:D1Database,ctx:Awaited<ReturnType<typeof createRequestContext>>,w:ReturnType<typeof parseWorkflowInput>){const p=w.payload,id=workflowId('approval'),quoteId=s(p,'quoteId');const q=await db.prepare(`SELECT q.*,d.organization_id FROM quotes q JOIN durable_task_states d ON d.task_id=q.task_id WHERE q.id=? AND d.organization_id=?`).bind(quoteId,ctx.actor.organizationId).first<Row>();if(!q)throw new ApiError(404,'not_found','Quote not found');requireTransition(String(q.status),'pending_approval',{draft:['pending_approval']});const result={approval:{id,status:'pending'},quote:{id:quoteId,status:'pending_approval'}};return finish(db,ctx,w,'approval',id,result,[db.prepare(`INSERT INTO approvals(id,task_id,approval_type,title,reason,risk_level,payload_json,requested_at,status,approver_role,workflow_run_id,idempotency_key) VALUES (?,?,'formal_quote',?,?, 'high',?,?,'pending',?,?,?)`).bind(id,q.task_id,s(p,'title','正式报价审批'),s(p,'reason','价格与交付条款需人工确认'),json({quoteId}),new Date().toISOString(),s(p,'approverRole','海外销售'),w.runId,w.idempotencyKey),db.prepare(`UPDATE quotes SET status='pending_approval',approval_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='draft'`).bind(id,quoteId),resource(db,w.runId,'approvals',id,500)],201,{from:'draft',to:'pending_approval',taskId:String(q.task_id),customerId:String(q.customer_id),opportunityId:String(q.opportunity_id)});}

async function decideApproval(db:D1Database,ctx:Awaited<ReturnType<typeof createRequestContext>>,w:ReturnType<typeof parseWorkflowInput>){const p=w.payload,id=s(p,'approvalId'),decision=s(p,'decision','approved');if(!['approved','rejected'].includes(decision))throw new ApiError(422,'validation_error','decision must be approved or rejected');const row=await db.prepare(`SELECT a.*,q.id quote_id,q.status quote_status,q.customer_id,q.opportunity_id FROM approvals a JOIN quotes q ON q.approval_id=a.id JOIN durable_task_states d ON d.task_id=a.task_id WHERE a.id=? AND d.organization_id=?`).bind(id,ctx.actor.organizationId).first<Row>();if(!row)throw new ApiError(404,'not_found','Approval not found');requireTransition(String(row.status),decision,{pending:['approved','rejected']});const quoteStatus=decision;const result={approval:{id,status:decision},resumed:{quote:{id:row.quote_id,status:quoteStatus}}};return finish(db,ctx,w,'approval',id,result,[db.prepare('UPDATE approvals SET status=?,decided_at=CURRENT_TIMESTAMP,decision_note=? WHERE id=? AND status=?').bind(decision,p.note??null,id,row.status),db.prepare('UPDATE quotes SET status=?,approved_at=CASE WHEN ?=\'approved\' THEN CURRENT_TIMESTAMP ELSE approved_at END,rejected_at=CASE WHEN ?=\'rejected\' THEN CURRENT_TIMESTAMP ELSE rejected_at END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?').bind(quoteStatus,decision,decision,row.quote_id,row.quote_status)],200,{from:String(row.status),to:decision,taskId:String(row.task_id),customerId:String(row.customer_id),opportunityId:String(row.opportunity_id)});}

async function createOrder(db:D1Database,ctx:Awaited<ReturnType<typeof createRequestContext>>,w:ReturnType<typeof parseWorkflowInput>){const p=w.payload,quoteId=s(p,'quoteId');const q=await db.prepare(`SELECT q.* FROM quotes q JOIN durable_task_states d ON d.task_id=q.task_id WHERE q.id=? AND d.organization_id=?`).bind(quoteId,ctx.actor.organizationId).first<Row>();if(!q)throw new ApiError(404,'not_found','Quote not found');if(!['approved','sent','accepted'].includes(String(q.status)))throw new ApiError(409,'conflict','Only an approved quote can create an order');const id=workflowId('order'),now=new Date().toISOString(),result={order:{id,status:'won',quoteId,amountCny:q.total_amount}};return finish(db,ctx,w,'order',id,result,[db.prepare(`INSERT INTO orders(id,task_id,customer_id,opportunity_id,amount_cny,contribution_type,evidence_completeness,status,ordered_at,mock_notice,quote_id,currency,accepted_at,workflow_run_id,idempotency_key) VALUES (?,?,?,?,?,'direct',100,'won',?,?,?,?,?,?,?)`).bind(id,q.task_id,q.customer_id,q.opportunity_id,q.total_amount,now,MOCK,quoteId,q.currency,now,w.runId,w.idempotencyKey),db.prepare(`INSERT INTO order_lines(id,order_id,quote_line_id,line_number,product_id,description,quantity,unit,unit_price,line_total) SELECT 'ol-'||lower(hex(randomblob(16))),?,id,line_number,product_id,description,quantity,unit,unit_price,line_total FROM quote_lines WHERE quote_id=?`).bind(id,quoteId),db.prepare(`UPDATE quotes SET status='accepted',accepted_at=?,updated_at=? WHERE id=?`).bind(now,now,quoteId),db.prepare(`UPDATE opportunities SET stage='won',amount_cny=?,probability=1,last_activity_at=?,next_step='进入履约' WHERE id=?`).bind(q.total_amount,now,q.opportunity_id),resource(db,w.runId,'orders',id,800)],201,{to:'won',taskId:String(q.task_id),customerId:String(q.customer_id),opportunityId:String(q.opportunity_id)});}

async function getRun(db:D1Database,org:string,runId:string){const run=await db.prepare('SELECT * FROM workflow_runs WHERE id=? AND organization_id=?').bind(runId,org).first<Row>();if(!run)throw new ApiError(404,'not_found','Run not found');const types=['growth_tasks','contents','content_schedule','ad_campaigns','customers','conversations','opportunities','quotes','approvals','orders','attribution_events'];const rs=await db.batch(types.map(t=>db.prepare('SELECT COUNT(*) n FROM workflow_run_resources WHERE workflow_run_id=? AND resource_type=?').bind(runId,t)));const counts=Object.fromEntries(types.map((t,i)=>[t==='growth_tasks'?'tasks':t==='content_schedule'?'schedules':t==='ad_campaigns'?'campaigns':t==='conversations'?'inquiries':t,(rs[i].results?.[0] as Row)?.n??0]));const chain=await db.prepare(`SELECT o.id orderId,q.status quoteStatus,a.status approvalStatus FROM orders o LEFT JOIN quotes q ON q.id=o.quote_id LEFT JOIN approvals a ON a.id=q.approval_id WHERE o.workflow_run_id=? LIMIT 1`).bind(runId).first<Row>();const fk=await db.prepare('PRAGMA foreign_key_check').all();return jsonResponse({ok:true,run,counts,chain:chain??{},foreignKeyViolations:(fk.results??[]).length});}

async function cleanup(db:D1Database,org:string,runId:string){const run=await db.prepare('SELECT id FROM workflow_runs WHERE id=? AND organization_id=?').bind(runId,org).first();if(!run)throw new ApiError(404,'not_found','Run not found');const rows=(await db.prepare('SELECT resource_type,resource_id FROM workflow_run_resources WHERE workflow_run_id=? ORDER BY delete_order DESC').bind(runId).all<Row>()).results??[];const allowed=new Set(['growth_tasks','contents','content_schedule','ad_campaigns','customers','conversations','messages','opportunities','quotes','approvals','orders','attribution_events']);const stmts:D1PreparedStatement[]=[db.prepare('DELETE FROM business_outbox WHERE organization_id=? AND correlation_id=?').bind(org,runId),db.prepare('DELETE FROM business_state_history WHERE organization_id=? AND workflow_run_id=?').bind(org,runId),db.prepare('DELETE FROM idempotency_keys WHERE organization_id=? AND workflow_run_id=?').bind(org,runId),db.prepare('DELETE FROM durable_task_states WHERE task_id IN (SELECT resource_id FROM workflow_run_resources WHERE workflow_run_id=? AND resource_type=?)').bind(runId,'growth_tasks')];for(const r of rows){const table=String(r.resource_type);if(allowed.has(table)){if(table==='messages')stmts.push(db.prepare('DELETE FROM messages WHERE id=?').bind(r.resource_id));else stmts.push(db.prepare(`DELETE FROM ${table} WHERE id=? AND workflow_run_id=?`).bind(r.resource_id,runId));}}stmts.push(db.prepare('DELETE FROM workflow_run_resources WHERE workflow_run_id=?').bind(runId),db.prepare(`UPDATE workflow_runs SET status='cleaned',cleaned_at=CURRENT_TIMESTAMP,completed_at=COALESCE(completed_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?`).bind(runId,org));if(stmts.length)await db.batch(stmts);return jsonResponse({ok:true,deleted:rows.length});}
