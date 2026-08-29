import {
  getRequestActor,
  getRequestOrganization,
  persistRequestActor,
  type RequestActor,
  type RequestOrganization,
} from './auth';
import { getDatabase, type Database } from './d1';

export interface RequestContext {
  actor: RequestActor;
  organization: RequestOrganization;
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
  const organization = await getRequestOrganization(db, actor);
  return {
    actor,
    organization,
    db,
    requestId: options.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID(),
  };
}
