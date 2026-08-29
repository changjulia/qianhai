import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const databasePath = resolve(process.argv[2] ?? '');
const projectRoot = resolve(process.cwd());
const expectedRoot = resolve(projectRoot, '.wrangler', 'state');
if (!databasePath.startsWith(`${expectedRoot}${sep}`) || !databasePath.endsWith('.sqlite')) {
  throw new Error('Refusing to update a database outside the project-local .wrangler state directory');
}

const sql = await readFile(resolve(projectRoot, 'migrations', '0014_platform_demo_completion.sql'), 'utf8');
const database = new DatabaseSync(databasePath);
try {
  database.exec('BEGIN IMMEDIATE');
  database.exec(sql);
  database.exec('COMMIT');
  const counts = Object.fromEntries([
    ['organizationNodes', 'organization_nodes'], ['members', 'organization_members'],
    ['roles', 'roles'], ['approvalChains', 'approval_chains'], ['integrations', 'integrations'],
    ['dataSources', 'data_sources'], ['syncRuns', 'sync_runs'], ['qualityIssues', 'data_quality_issues'],
    ['securityPolicies', 'security_policies'], ['auditEvents', 'security_audit_events'],
  ].map(([key, table]) => [key, database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]));
  console.log(JSON.stringify({ ok: true, databasePath, counts }, null, 2));
} catch (error) {
  database.exec('ROLLBACK');
  throw error;
} finally {
  database.close();
}
