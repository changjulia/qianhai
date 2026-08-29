import { getRequestActor, persistRequestActor, type RequestActor } from './auth';
import { getDatabase, type Database } from './d1';

export interface RequestContext {
  actor: RequestActor;
  db: Database;
  requestId: string;
}

export async function createRequestContext(
  request: Request,
  options: { persistActor?: boolean; requestId?: string } = {},
): Promise<RequestContext> {
  const db = getDatabase();
  const actor = await getRequestActor(request);
  if (!actor) throw new Error('Authenticated actor unexpectedly missing');
  if (options.persistActor !== false) await persistRequestActor(db, actor);
  return {
    actor,
    db,
    requestId: options.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID(),
  };
}
