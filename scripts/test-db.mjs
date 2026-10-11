// Database integration tests: migrations, Row Level Security, timer functions.
//
// Usage:
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
//
// The script creates a temporary database, applies a small Supabase auth shim
// plus every file in supabase/migrations, runs the checks as two different
// users, and drops the database afterwards. Use a disposable local Postgres,
// never your production Supabase database.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
const dbName = `studay_test_${Date.now()}`;

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
await admin.query(`create database ${dbName}`);

const testUrl = new URL(adminUrl);
testUrl.pathname = `/${dbName}`;

const results = [];
let failed = 0;

function newClient() {
  return new pg.Client({ connectionString: testUrl.toString() });
}

async function test(name, fn) {
  try {
    await fn();
    results.push(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    results.push(`  ✗ ${name}\n      ${error.message}`);
  }
}

async function expectError(promise, pattern) {
  try {
    await promise;
  } catch (error) {
    assert.match(error.message, pattern);
    return;
  }
  throw new Error(`expected error matching ${pattern}, but the query succeeded`);
}

const db = newClient();

try {
  await db.connect();

  // ---- Apply shim + migrations ------------------------------------------
  await db.query(await readFile(path.join(root, "scripts/sql/supabase-shim.sql"), "utf8"));
  const migrationsDir = path.join(root, "supabase/migrations");
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    await db.query(await readFile(path.join(migrationsDir, file), "utf8"));
  }
  console.log(`Applied ${files.length} migration(s) to ${dbName}`);

  // Run fn inside a transaction as the given user (or anon when uid is null).
  async function as(uid, fn, client = db) {
    await client.query("begin");
    try {
      await client.query(`set local role ${uid ? "authenticated" : "anon"}`);
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify(uid ? { sub: uid, role: "authenticated" } : { role: "anon" }),
      ]);
      const value = await fn((sql, params) => client.query(sql, params));
      await client.query("commit");
      return value;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  const alice = randomUUID();
  const bob = randomUUID();
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
      ($1, 'alice@example.com', '{"display_name":"앨리스"}'), ($2, 'bob@example.com', '{}')`,
    [alice, bob],
  );

  // ---- Settings ----------------------------------------------------------
  await test("새 사용자에게 user_settings 행이 자동 생성된다", async () => {
    const { rows } = await as(alice, (q) => q("select * from user_settings"));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].display_name, "앨리스");
    assert.equal(rows[0].timezone, "Asia/Seoul");
  });

  await test("잘못된 시간대는 거부된다", async () => {
    await expectError(
      as(alice, (q) => q("update user_settings set timezone = 'Mars/Base'")),
      /INVALID_TIMEZONE/,
    );
  });

  await test("다른 사용자의 설정은 보이지 않는다", async () => {
    const { rows } = await as(bob, (q) => q("select * from user_settings"));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, bob);
  });

  // ---- Seed Alice's data -------------------------------------------------
  const seed = await as(alice, async (q) => {
    const os = (
      await q("insert into subjects (name, color) values ('운영체제', '#3B82F6') returning id")
    ).rows[0].id;
    const db2 = (await q("insert into subjects (name) values ('데이터베이스') returning id"))
      .rows[0].id;
    const hw = (
      await q("insert into categories (subject_id, name) values ($1, '과제') returning id", [os])
    ).rows[0].id;
    const todo = (
      await q(
        `insert into todos (subject_id, category_id, title, due_date)
         values ($1, $2, 'PA1 미니쉘', current_date) returning id`,
        [os, hw],
      )
    ).rows[0].id;
    const event = (
      await q(
        `insert into calendar_events (subject_id, title, event_type, starts_at)
         values ($1, '중간고사', 'exam', now() + interval '3 days') returning id`,
        [os],
      )
    ).rows[0].id;
    return { os, db2, hw, todo, event };
  });

  // ---- RLS isolation -----------------------------------------------------
  for (const table of ["subjects", "categories", "todos", "calendar_events"]) {
    await test(`다른 사용자는 ${table}를 조회·수정·삭제할 수 없다`, async () => {
      await as(bob, async (q) => {
        assert.equal((await q(`select * from ${table}`)).rowCount, 0);
        assert.equal((await q(`update ${table} set created_at = created_at`)).rowCount, 0);
        assert.equal((await q(`delete from ${table}`)).rowCount, 0);
      });
      const { rowCount } = await as(alice, (q) => q(`select * from ${table}`));
      assert.ok(rowCount > 0);
    });
  }

  await test("다른 사용자의 user_id로 행을 만들 수 없다", async () => {
    await expectError(
      as(bob, (q) => q("insert into subjects (user_id, name) values ($1, '침입')", [alice])),
      /row-level security/,
    );
  });

  await test("다른 사용자의 과목에 TODO를 연결할 수 없다", async () => {
    await expectError(
      as(bob, (q) => q("insert into todos (subject_id, title) values ($1, '침입')", [seed.os])),
      /violates foreign key constraint/,
    );
  });

  await test("로그인하지 않은 사용자(anon)는 어떤 테이블에도 접근할 수 없다", async () => {
    await expectError(
      as(null, (q) => q("select * from subjects")),
      /permission denied/,
    );
    await expectError(
      as(null, (q) => q("select start_study_session($1)", [seed.os])),
      /permission denied/,
    );
  });

  // ---- Integrity -------------------------------------------------------
  await test("TODO의 카테고리는 같은 과목의 카테고리여야 한다", async () => {
    await expectError(
      as(alice, (q) =>
        q("insert into todos (subject_id, category_id, title) values ($1, $2, '불일치')", [
          seed.db2,
          seed.hw,
        ]),
      ),
      /todos_category_fk/,
    );
  });

  await test("TODO 완료 시 completed_at이 기록되고 완료 취소 시 지워진다", async () => {
    await as(alice, async (q) => {
      const done = await q("update todos set status = 'done' where id = $1 returning *", [
        seed.todo,
      ]);
      assert.ok(done.rows[0].completed_at);
      const undone = await q("update todos set status = 'todo' where id = $1 returning *", [
        seed.todo,
      ]);
      assert.equal(undone.rows[0].completed_at, null);
    });
  });

  await test("카테고리를 삭제하면 TODO는 미분류로 남는다", async () => {
    await as(alice, async (q) => {
      const cat = (
        await q("insert into categories (subject_id, name) values ($1, '임시') returning id", [
          seed.os,
        ])
      ).rows[0].id;
      const todo = (
        await q(
          "insert into todos (subject_id, category_id, title) values ($1, $2, '임시 할 일') returning id",
          [seed.os, cat],
        )
      ).rows[0].id;
      await q("delete from categories where id = $1", [cat]);
      const { rows } = await q("select category_id from todos where id = $1", [todo]);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].category_id, null);
      await q("delete from todos where id = $1", [todo]);
    });
  });

  // ---- Timer -----------------------------------------------------------
  let sessionId;
  await test("타이머를 시작하면 세션과 실행 구간이 함께 만들어진다", async () => {
    const session = await as(alice, async (q) => {
      const s = (await q("select * from start_study_session($1, $2)", [seed.os, seed.todo]))
        .rows[0];
      const segs = await q("select * from study_segments where session_id = $1", [s.id]);
      assert.equal(segs.rowCount, 1);
      assert.equal(segs.rows[0].ended_at, null);
      return s;
    });
    assert.equal(session.status, "running");
    sessionId = session.id;
  });

  await test("이미 진행 중인 타이머가 있으면 새 타이머를 시작할 수 없다", async () => {
    await expectError(
      as(alice, (q) => q("select start_study_session($1)", [seed.db2])),
      /ACTIVE_SESSION_EXISTS/,
    );
  });

  await test("동시에 두 번 시작해도 진행 중 세션은 하나만 생긴다", async () => {
    const c1 = newClient();
    const c2 = newClient();
    await Promise.all([c1.connect(), c2.connect()]);
    try {
      // Bob has no active session yet.
      const bobSubject = await as(
        bob,
        async (q) =>
          (await q("insert into subjects (name) values ('알고리즘') returning id")).rows[0].id,
      );
      const outcomes = await Promise.allSettled([
        as(bob, (q) => q("select start_study_session($1)", [bobSubject]), c1),
        as(bob, (q) => q("select start_study_session($1)", [bobSubject]), c2),
      ]);
      assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
      const { rows } = await as(bob, (q) =>
        q("select count(*)::int as n from study_sessions where status <> 'completed'"),
      );
      assert.equal(rows[0].n, 1);
      await as(bob, (q) => q("delete from study_sessions"));
    } finally {
      await Promise.all([c1.end(), c2.end()]);
    }
  });

  await test("다른 사용자는 내 타이머를 조작하거나 볼 수 없다", async () => {
    await expectError(
      as(bob, (q) => q("select pause_study_session($1)", [sessionId])),
      /SESSION_NOT_FOUND/,
    );
    const { rowCount } = await as(bob, (q) => q("select * from study_segments"));
    assert.equal(rowCount, 0);
  });

  await test("세션 시간과 구간은 클라이언트가 직접 쓸 수 없다", async () => {
    await expectError(
      as(alice, (q) =>
        q("update study_sessions set total_seconds = 99999 where id = $1", [sessionId]),
      ),
      /permission denied/,
    );
    await expectError(
      as(alice, (q) =>
        q("insert into study_sessions (subject_id, status) values ($1, 'completed')", [seed.os]),
      ),
      /permission denied/,
    );
    await expectError(
      as(alice, (q) =>
        q("insert into study_segments (user_id, session_id, started_at) values ($1, $2, now())", [
          alice,
          sessionId,
        ]),
      ),
      /permission denied/,
    );
  });

  await test("일시정지·재개를 반복하면 구간이 나뉘어 기록된다", async () => {
    await as(alice, (q) => q("select pause_study_session($1)", [sessionId]));
    await as(alice, (q) => q("select pause_study_session($1)", [sessionId])); // idempotent
    await as(alice, (q) => q("select resume_study_session($1)", [sessionId]));
    await as(alice, (q) => q("select pause_study_session($1)", [sessionId]));
    await as(alice, (q) => q("select resume_study_session($1)", [sessionId]));
    const { rows } = await as(alice, (q) =>
      q("select * from study_segments where session_id = $1 order by started_at", [sessionId]),
    );
    assert.equal(rows.length, 3);
    assert.equal(rows.filter((r) => r.ended_at === null).length, 1);
  });

  await test("종료하면 총 시간이 구간 합계와 같고, 두 번 종료해도 중복 집계되지 않는다", async () => {
    // Admin-side adjustment (test only): move segments into the past so the
    // measured duration is non-trivial.
    await db.query(
      `update study_segments set started_at = started_at - interval '10 minutes',
         ended_at = ended_at - interval '10 minutes' where session_id = $1 and ended_at is not null`,
      [sessionId],
    );
    await db.query(
      `update study_segments set started_at = started_at - interval '5 minutes'
       where session_id = $1 and ended_at is null`,
      [sessionId],
    );
    const finished = await as(alice, (q) =>
      q("select * from finish_study_session($1, '복습 완료')", [sessionId]),
    );
    const again = await as(alice, (q) => q("select * from finish_study_session($1)", [sessionId]));
    const { rows } = await db.query(
      `select coalesce(sum(floor(extract(epoch from (ended_at - started_at)))), 0)::int as total
       from study_segments where session_id = $1`,
      [sessionId],
    );
    assert.equal(finished.rows[0].status, "completed");
    assert.equal(finished.rows[0].total_seconds, rows[0].total);
    assert.ok(rows[0].total >= 300);
    assert.equal(again.rows[0].total_seconds, finished.rows[0].total_seconds);
    assert.equal(again.rows[0].ended_at.getTime(), finished.rows[0].ended_at.getTime());
  });

  await test("종료 후에는 새 타이머를 시작할 수 있다", async () => {
    const { rows } = await as(alice, (q) => q("select * from start_study_session($1)", [seed.db2]));
    await as(alice, (q) => q("select finish_study_session($1)", [rows[0].id]));
  });

  await test("기록 시간을 수정할 수 있고, 다른 세션과 겹치면 거부된다", async () => {
    const range = await as(alice, async (q) => {
      const s = (await q("select * from start_study_session($1)", [seed.db2])).rows[0];
      await q("select finish_study_session($1)", [s.id]);
      return s.id;
    });
    const edited = await as(alice, (q) =>
      q(
        `select * from update_study_session_time($1, now() - interval '3 days 2 hours',
          now() - interval '3 days 30 minutes')`,
        [range],
      ),
    );
    assert.equal(edited.rows[0].total_seconds, 90 * 60);
    await expectError(
      as(alice, (q) =>
        q(
          `select update_study_session_time($1, now() - interval '3 days 1 hour',
            now() - interval '3 days')`,
          [sessionId],
        ),
      ),
      /SESSION_OVERLAP/,
    );
    await expectError(
      as(alice, (q) =>
        q("select update_study_session_time($1, now(), now() + interval '2 hours')", [range]),
      ),
      /TIME_IN_FUTURE/,
    );
  });

  await test("세션에 연결한 TODO는 같은 과목이어야 한다", async () => {
    await expectError(
      as(alice, (q) => q("select start_study_session($1, $2)", [seed.db2, seed.todo])),
      /TODO_SUBJECT_MISMATCH/,
    );
  });

  await test("보관한 과목으로는 타이머를 시작할 수 없다", async () => {
    await as(alice, (q) => q("update subjects set is_archived = true where id = $1", [seed.db2]));
    await expectError(
      as(alice, (q) => q("select start_study_session($1)", [seed.db2])),
      /SUBJECT_NOT_FOUND/,
    );
    await as(alice, (q) => q("update subjects set is_archived = false where id = $1", [seed.db2]));
  });

  // ---- Deletion policy ------------------------------------------------
  await test("TODO를 삭제해도 공부 기록은 남고 연결만 해제된다", async () => {
    await as(alice, (q) => q("delete from todos where id = $1", [seed.todo]));
    const { rows } = await as(alice, (q) =>
      q("select todo_id from study_sessions where id = $1", [sessionId]),
    );
    assert.equal(rows[0].todo_id, null);
  });

  await test("과목을 삭제하면 카테고리·TODO·공부 기록은 삭제되고 일정은 과목 연결만 해제된다", async () => {
    await as(alice, (q) => q("delete from subjects where id = $1", [seed.os]));
    await as(alice, async (q) => {
      assert.equal(
        (await q("select * from categories where subject_id = $1", [seed.os])).rowCount,
        0,
      );
      assert.equal((await q("select * from todos where subject_id = $1", [seed.os])).rowCount, 0);
      assert.equal(
        (await q("select * from study_sessions where id = $1", [sessionId])).rowCount,
        0,
      );
      assert.equal(
        (await q("select * from study_segments where session_id = $1", [sessionId])).rowCount,
        0,
      );
      const ev = await q("select subject_id from calendar_events where id = $1", [seed.event]);
      assert.equal(ev.rowCount, 1);
      assert.equal(ev.rows[0].subject_id, null);
    });
  });
} finally {
  await db.end().catch(() => {});
  await admin.query(`drop database if exists ${dbName} with (force)`);
  await admin.end();
}

console.log(results.join("\n"));
console.log(
  failed === 0 ? `\nAll ${results.length} DB tests passed.` : `\n${failed} test(s) failed.`,
);
process.exit(failed === 0 ? 0 : 1);
