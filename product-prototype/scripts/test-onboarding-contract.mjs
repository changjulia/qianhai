import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = resolve(projectRoot, 'migrations/0010_onboarding_first_login.sql');
const database = new DatabaseSync(':memory:');

try {
  database.exec(`CREATE TABLE app_users (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  const legacyCreatedAt = '2026-08-29T00:00:00.000Z';
  database.prepare(`INSERT INTO app_users (id, created_at, updated_at)
    VALUES (?, ?, ?)`)
    .run('legacy-user', legacyCreatedAt, legacyCreatedAt);

  database.exec(await readFile(migrationPath, 'utf8'));

  const legacy = database.prepare(`SELECT onboarding_task_issued_at
    FROM app_users WHERE id = ?`)
    .get('legacy-user');
  assert.equal(
    legacy.onboarding_task_issued_at,
    legacyCreatedAt,
    'accounts created before the migration must be marked as already issued',
  );

  const registeredAt = '2026-08-30T00:00:00.000Z';
  database.prepare(`INSERT INTO app_users
      (id, created_at, updated_at, onboarding_task_issued_at)
    VALUES (?, ?, ?, NULL)`)
    .run('new-user', registeredAt, registeredAt);

  const claimFirstLogin = database.prepare(`UPDATE app_users
    SET onboarding_task_issued_at = ?, updated_at = ?
    WHERE id = ? AND onboarding_task_issued_at IS NULL`);
  const firstIssuedAt = '2026-08-30T00:01:00.000Z';
  const laterLoginAt = '2026-08-30T01:00:00.000Z';

  assert.equal(
    claimFirstLogin.run(firstIssuedAt, firstIssuedAt, 'new-user').changes,
    1,
    'a new account must claim onboarding exactly once on its first login',
  );
  assert.equal(
    claimFirstLogin.run(laterLoginAt, laterLoginAt, 'new-user').changes,
    0,
    'the same account must not claim onboarding on a later login',
  );

  const newUser = database.prepare(`SELECT onboarding_task_issued_at
    FROM app_users WHERE id = ?`)
    .get('new-user');
  assert.equal(
    newUser.onboarding_task_issued_at,
    firstIssuedAt,
    'later logins must preserve the original issue timestamp',
  );

  console.log('[onboarding-contract] PASS');
  console.log('legacy account: marked as already issued by migration');
  console.log('new account: first login=true, later login=false, issuedAt preserved');
} finally {
  database.close();
}
