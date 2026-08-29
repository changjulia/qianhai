import { DEMO_SCHEMA_VERSION } from '../../../db/schema';
import { databaseHealth, getDatabase } from '../../../lib/server/d1';
import { jsonResponse, withApiErrors } from '../../../lib/server/errors';

export async function GET() {
  return withApiErrors(async (requestId) => {
    const database = await databaseHealth(getDatabase());
    return jsonResponse({
      ok: true,
      service: 'guikesong-product-prototype',
      schemaVersion: DEMO_SCHEMA_VERSION,
      database,
      requestId,
      checkedAt: new Date().toISOString(),
    });
  });
}
