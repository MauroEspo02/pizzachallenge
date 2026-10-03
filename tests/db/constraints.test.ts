import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureDatabase } from '../../src/database/migrate';
import { openSqliteDb } from '../../src/database/sqlite';

const INS = "INSERT INTO votes (id,event_id,pizza_version_id,user_id,taste_score,rewant_score,idea_score,smell_score,created_at,updated_at,admin_edit) VALUES (?,?,?,?,?,4,3,2,'x','x',0)";

test('il database difende le regole anche senza passare dal server', async () => {
  const db = openSqliteDb(':memory:');
  await ensureDatabase({ DB: db, APP_ENV: 'development' } as never);
  const raw = db.raw;
  const ev = raw.prepare('SELECT id FROM events').get() as { id: string };
  const [v1, v2] = raw.prepare('SELECT id FROM pizza_versions ORDER BY tasting_order').all() as Array<{ id: string }>;
  const u = raw.prepare("SELECT id FROM users WHERE role='PARTICIPANT' LIMIT 1").get() as { id: string };

  assert.throws(() => raw.prepare(INS).run('a', ev.id, v1!.id, u.id, 5), /VOTING_NOT_OPEN/, 'niente voti in preparazione');
  assert.throws(() => raw.prepare("UPDATE events SET status='RESULTS_REVEALED'").run(), 'niente salto al verdetto');

  raw.prepare("UPDATE events SET status='CREATION_OPEN'").run();
  raw.prepare("UPDATE events SET status='VOTING_OPEN'").run();
  raw.prepare(INS).run('a', ev.id, v1!.id, u.id, 5);
  assert.throws(() => raw.prepare(INS).run('b', ev.id, v1!.id, u.id, 5), /UNIQUE/, 'niente doppio voto');
  assert.throws(() => raw.prepare(INS).run('c', ev.id, v2!.id, u.id, 6), /CHECK/, 'voto massimo 5');
  assert.throws(() => raw.prepare(INS).run('c', ev.id, v2!.id, u.id, 4.5), /CHECK/, 'solo interi');

  assert.equal((raw.prepare('SELECT COUNT(*) n FROM revealed_vote_totals').get() as { n: number }).n, 0, 'risultati nascosti prima del reveal');

  raw.prepare("UPDATE events SET status='VOTING_CLOSED'").run();
  assert.throws(() => raw.prepare("UPDATE votes SET taste_score=1 WHERE id='a'").run(), /VOTING_NOT_OPEN/, 'voti chiusi');
  raw.prepare("UPDATE votes SET taste_score=1, admin_edit=1 WHERE id='a'").run();

  raw.prepare("UPDATE events SET status='RESULTS_REVEALED'").run();
  assert.equal((raw.prepare('SELECT COUNT(*) n FROM revealed_vote_totals').get() as { n: number }).n, 1);
  db.close();
});
