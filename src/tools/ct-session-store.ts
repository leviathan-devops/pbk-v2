// ct-session-store.ts — the container session-store reader (READ-ONLY; L2/L4 of §2.0.2)
// @ts-ignore — bun:sqlite ships no type package under tsc (the bun runtime provides it); the SqliteDatabase aether interface below is the typing boundary
import { Database } from 'bun:sqlite';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface CtSqliteStatement<T = unknown> {
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: unknown[]): T | undefined;
  all(...params: unknown[]): T[];
}

interface SqliteDatabase {
  exec(sql: string): void;
  run(sql: string, ...params: unknown[]): void;
  query<T = unknown>(sql: string): CtSqliteStatement<T>;
  close(): void;
}

export interface CtPart {
  id: string;
  row: number;
  sessionId: string;
  messageId: string;
  role: 'user' | 'assistant' | 'system' | 'unknown';
  type: string;
  text: string | null;
  tool: string | null;
  toolOutput: string | null;
  toolStatus: string | null;
  timeMs: number | null;
  raw: unknown;
}

export type CtStoreMode = 'sqlite' | 'json' | 'none';

export interface CtStoreStatus {
  mode: CtStoreMode;
  storePath: string | null;
  snapshotPath: string | null;
  fingerprint: string | null;
  schemaVerified: boolean;
  sessionCount: number;
  latestSessionId: string | null;
  lastError: string | null;
}

export type CtLiveness = {
  sessionId: string | null;
  partCount: number;
  newestPartAgeMs: number | null;
  hasTerminalFinish: boolean;
  status: 'stream' | 'idle' | 'complete' | 'absent';
};

export class CtStoreError extends Error {
  constructor(public code: 'store_unavailable' | 'store_snapshot_failed' | 'store_schema_mismatch', message: string, public detail?: string) { super(message); this.name = 'CtStoreError'; }
}

export const CT_STREAM_WINDOW_MS = 300_000; // provenance: wave-read.ts:71 STREAM_WINDOW_MS
export const CT_QUIET_WINDOW_MS = 90_000; // provenance: wave-cron.ts:201 quiet-window tick gate
export const MIN_ELAPSED_MS = 2_000; // provenance: container-test.ts:1228 anti-instant-race
const DATA_DIR_CANDIDATES = ['/root/.local/share/opencode', '/root/.opencode'] as const;
const SNAPSHOT_ATTEMPTS = 3;
const SNAPSHOT_BACKOFF_MS = 250;
const DISCOVERY_RETRIES = 5;
const DISCOVERY_RETRY_MS = 2_000;
const CT_TMP_BASE = path.join(os.tmpdir(), 'opencode', 'ct-store');
export const CHECK_SCAN_LIMIT = 800;

export interface CtIo {
  execInContainer: (cmd: string, opts?: { timeoutMs?: number }) => { stdout: string; stderr: string; exitCode: number };
  execInternal: (cmd: string, opts?: { timeoutMs?: number }) => { stdout: string; stderr: string; exitCode: number };
  containerName: () => string | null;
  log: (level: 'INFO' | 'WARN' | 'ERROR', msg: string) => void;
  now?: () => number;
}

type Probe = { mode: CtStoreMode; storePath: string | null; fingerprint: string | null };

interface StoreState {
  mode: CtStoreMode;
  storePath: string | null;
  fingerprint: string | null;
  snapshotPath: string | null;
  db: SqliteDatabase | null;
  columnMap: Record<string, string | null> | null;
  tables: string[];
  sessionCount: number;
  latestSessionId: string | null;
  lastError: string | null;
  jsonRoot: string | null;
  schemaVerified: boolean;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function probeOnce(io: CtIo): Probe {
  const combined = io.execInContainer(`ls -1 ${DATA_DIR_CANDIDATES[0]} 2>/dev/null; echo "__SEP__"; ls -1 ${DATA_DIR_CANDIDATES[1]} 2>/dev/null`, { timeoutMs: 5_000 });
  const parts = combined.stdout.split('__SEP__');
  const firstEntries = (parts[0] ?? '').split('\n').map(s => s.trim()).filter(Boolean);
  const secondEntries = (parts[1] ?? '').split('\n').map(s => s.trim()).filter(Boolean);
  if (firstEntries.includes('opencode.db')) {
    // W4 FIX: stat the WAL too — sqlite absorbs writes into the -wal without touching
    // the main db's mtime/size, so a db-only fingerprint misses active writes (the
    // stale-snapshot bug the live matrix caught: completion polls read old sessions).
    const st = io.execInContainer(`stat -c '%Y %s' ${DATA_DIR_CANDIDATES[0]}/opencode.db ${DATA_DIR_CANDIDATES[0]}/opencode.db-wal 2>/dev/null`, { timeoutMs: 5_000 });
    return { mode: 'sqlite', storePath: `${DATA_DIR_CANDIDATES[0]}/opencode.db`, fingerprint: `sqlite:${DATA_DIR_CANDIDATES[0]}/opencode.db:${st.stdout.trim()}` };
  }
  if (firstEntries.includes('storage')) {
    const st = io.execInContainer(`stat -c '%Y %s' ${DATA_DIR_CANDIDATES[0]}/storage 2>/dev/null`, { timeoutMs: 5_000 });
    return { mode: 'json', storePath: `${DATA_DIR_CANDIDATES[0]}/storage`, fingerprint: `json:${DATA_DIR_CANDIDATES[0]}/storage:${st.stdout.trim()}` };
  }
  if (secondEntries.includes('opencode.db')) {
    const st = io.execInContainer(`stat -c '%Y %s' ${DATA_DIR_CANDIDATES[1]}/opencode.db 2>/dev/null`, { timeoutMs: 5_000 });
    return { mode: 'sqlite', storePath: `${DATA_DIR_CANDIDATES[1]}/opencode.db`, fingerprint: `sqlite:${DATA_DIR_CANDIDATES[1]}/opencode.db:${st.stdout.trim()}` };
  }
  if (secondEntries.includes('storage')) {
    const st = io.execInContainer(`stat -c '%Y %s' ${DATA_DIR_CANDIDATES[1]}/storage 2>/dev/null`, { timeoutMs: 5_000 });
    return { mode: 'json', storePath: `${DATA_DIR_CANDIDATES[1]}/storage`, fingerprint: `json:${DATA_DIR_CANDIDATES[1]}/storage:${st.stdout.trim()}` };
  }
  return { mode: 'none', storePath: null, fingerprint: null };
}

async function discover(io: CtIo): Promise<Probe> {
  for (let attempt = 1; attempt <= DISCOVERY_RETRIES; attempt++) {
    const p = probeOnce(io);
    if (p.mode !== 'none') return p;
    if (attempt < DISCOVERY_RETRIES) await sleep(DISCOVERY_RETRY_MS);
  }
  throw new CtStoreError('store_unavailable', `no session store found after ${DISCOVERY_RETRIES} probes (looked in ${DATA_DIR_CANDIDATES.join(', ')})`, 'the agent may not have completed first boot; retry after the TUI settles');
}

async function snapshotSqlite(io: CtIo, container: string, storePath: string): Promise<string> {
  const target = path.join(CT_TMP_BASE, container);
  const snapTmp = path.join(os.tmpdir(), 'ct-snap');
  io.execInternal(`mkdir -p ${JSON.stringify(target)}`, { timeoutMs: 5_000 });
  const mk = io.execInContainer(
    `mkdir -p ${JSON.stringify(snapTmp)} && cp ${JSON.stringify(storePath)} ${JSON.stringify(path.join(snapTmp, 'db.sqlite'))} && (cp ${JSON.stringify(storePath + '-wal')} ${JSON.stringify(path.join(snapTmp, 'db.sqlite-wal'))} 2>/dev/null; true) && (cp ${JSON.stringify(storePath + '-shm')} ${JSON.stringify(path.join(snapTmp, 'db.sqlite-shm'))} 2>/dev/null; true) && echo SNAP_OK`,
    { timeoutMs: 20_000 });
  if (!mk.stdout.includes('SNAP_OK')) throw new CtStoreError('store_snapshot_failed', 'in-container copy failed', mk.stderr);
  const files: Array<[string, string]> = [
    [path.join(snapTmp, 'db.sqlite'), path.join(target, 'db.sqlite')],
    [path.join(snapTmp, 'db.sqlite-wal'), path.join(target, 'db.sqlite-wal')],
    [path.join(snapTmp, 'db.sqlite-shm'), path.join(target, 'db.sqlite-shm')],
  ];
  for (const [inside, dest] of files) {
    if (dest.endsWith('db.sqlite')) {
      const cp = io.execInternal(`docker cp ${container}:${inside} ${JSON.stringify(dest)}`, { timeoutMs: 60_000 });
      if (cp.exitCode !== 0) throw new CtStoreError('store_snapshot_failed', `docker cp failed for ${path.basename(dest)}`, cp.stderr);
    } else {
      const check = io.execInContainer(`test -f ${JSON.stringify(inside)} && echo EXISTS || echo MISSING`, { timeoutMs: 5_000 });
      if (check.stdout.includes('EXISTS')) {
        const cp = io.execInternal(`docker cp ${container}:${inside} ${JSON.stringify(dest)}`, { timeoutMs: 60_000 });
        if (cp.exitCode !== 0) throw new CtStoreError('store_snapshot_failed', `docker cp failed for ${path.basename(dest)}`, cp.stderr);
      }
    }
  }
  return path.join(target, 'db.sqlite');
}

async function snapshotJson(io: CtIo, container: string, storePath: string): Promise<string> {
  const target = path.join(CT_TMP_BASE, container);
  const snapTmp = path.join(os.tmpdir(), 'ct-snap');
  io.execInternal(`mkdir -p ${JSON.stringify(target)}`, { timeoutMs: 5_000 });
  const mk = io.execInContainer(`mkdir -p ${JSON.stringify(snapTmp)} && echo SNAP_OK`, { timeoutMs: 5_000 });
  if (!mk.stdout.includes('SNAP_OK')) throw new CtStoreError('store_snapshot_failed', 'in-container mkdir failed', mk.stderr);
  return storePath;
}

function openVerified(dbPath: string): { db: SqliteDatabase; columnMap: Record<string, string | null>; tables: string[] } {
  let db: SqliteDatabase;
  try {
    db = new (Database as unknown as new (p: string, opts?: unknown) => SqliteDatabase)(dbPath, { readonly: true } as unknown as Record<string, unknown>);
  } catch (e) {
    throw new CtStoreError('store_snapshot_failed', 'readonly open failed', (e as Error).message);
  }
  try {
    const qc = db.query<{ quick_check: string }>(`PRAGMA quick_check`).get() as { quick_check: string } | undefined;
    const qcVal = qc?.quick_check ?? '';
    if (qcVal !== 'ok') {
      try { db.close(); } catch (_e) { void 0; }
      throw new CtStoreError('store_snapshot_failed', `quick_check: ${qcVal || 'no result'}`, qcVal || 'no result');
    }
    const tables = (db.query<{ name: string }>(`SELECT name FROM sqlite_master WHERE type='table'`).all() as Array<{ name: string }>).map(r => r.name);
    for (const req of ['part', 'message']) {
      if (!tables.includes(req)) {
        try { db.close(); } catch (_e) { void 0; }
        throw new CtStoreError('store_schema_mismatch', `observed tables: [${tables.join(',')}]; expected part+message — the image binary's schema is not the sqlite session-store family`, `missing table: ${req}; observed: [${tables.join(',')}]`);
      }
    }
    const info = db.query<{ name: string }>(`PRAGMA table_info(part)`).all() as Array<{ name: string }>;
    const cols = info.map(c => c.name);
    const pick = (role: string, candidates: string[]): string => {
      for (const c of candidates) if (cols.includes(c)) return c;
      throw new CtStoreError('store_schema_mismatch', `part table lacks a ${role} column`, `observed columns: [${cols.join(',')}]`);
    };
    const columnMap: Record<string, string | null> = {
      id: pick('id', ['id']),
      message: pick('message', ['message_id', 'messageId', 'messageID']),
      data: pick('data', ['data']),
      time: cols.includes('time_created') ? 'time_created' : null,
    };
    return { db, columnMap, tables };
  } catch (e) {
    if (e instanceof CtStoreError) throw e;
    try { db.close(); } catch (_e) { void 0; }
    throw new CtStoreError('store_snapshot_failed', 'schema gate failed', (e as Error).message);
  }
}

function verifyJsonSample(io: CtIo, storePath: string): void {
  const find = io.execInContainer(`find ${JSON.stringify(storePath)} -name '*.json' -type f 2>/dev/null | head -20`, { timeoutMs: 10_000 });
  const files = find.stdout.split('\n').map(s => s.trim()).filter(Boolean);
  if (files.length === 0) throw new CtStoreError('store_schema_mismatch', 'json family: no part subtree found', `scanned 0 files under ${storePath}`);
  const byDirV = new Map<string, number>();
  for (const f of files) { const d = f.substring(0, f.lastIndexOf('/')); byDirV.set(d, (byDirV.get(d) ?? 0) + 1); }
  let bestDir = ''; let bestN = -1;
  for (const [d, n] of byDirV) if (n > bestN) { bestN = n; bestDir = d; }
  let sampleFile = files.find(f => f.startsWith(bestDir)) ?? files[0];
  const cat = io.execInContainer(`cat ${JSON.stringify(sampleFile)} 2>/dev/null`, { timeoutMs: 5_000 });
  if (cat.exitCode !== 0) throw new CtStoreError('store_schema_mismatch', 'json family: cannot read sample file', cat.stderr);
  try {
    const j = JSON.parse(cat.stdout) as Record<string, unknown>;
    const hasExpected = ('id' in j || 'sessionID' in j || 'sessionId' in j) && ('type' in j || 'kind' in j);
    if (!hasExpected) throw new CtStoreError('store_schema_mismatch', 'json family: sample lacks expected keys (id/sessionID/type)', `observed keys: [${Object.keys(j).join(',')}]`);
  } catch (e) {
    if (e instanceof CtStoreError) throw e;
    throw new CtStoreError('store_schema_mismatch', 'json family: sample unparseable', (e as Error).message);
  }
}

interface PartRow { [k: string]: unknown; _row?: unknown; _id?: unknown; _msg?: unknown }

function rowToCtPart(r: PartRow, cm: Record<string, string | null>, fallbackRow: number): CtPart {
  const rawId = String(r[cm.id!] ?? r['_id'] ?? `row-${fallbackRow}`);
  let payload: unknown = r[cm.data!];
  if (payload === undefined && cm.data) payload = r['data'];
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload as string); } catch {
      const s = (payload as string).trimStart();
      if (s.startsWith('{')) {
        try { payload = JSON.parse(payload as string); } catch (_e2) { void 0; }
      }
    }
    if (typeof payload === 'string') {
      return { id: rawId, row: fallbackRow, sessionId: 'unknown', messageId: String(r[cm.message!] ?? r['_msg'] ?? ''), role: 'unknown', type: 'unparseable', text: (payload as string).slice(0, 200), tool: null, toolOutput: null, toolStatus: null, timeMs: null, raw: payload };
    }
  }
  if (payload === null || payload === undefined || typeof payload !== 'object') {
    return { id: rawId, row: fallbackRow, sessionId: 'unknown', messageId: String(r[cm.message!] ?? r['_msg'] ?? ''), role: 'unknown', type: 'unparseable', text: typeof payload === 'string' ? (payload as string).slice(0, 200) : null, tool: null, toolOutput: null, toolStatus: null, timeMs: null, raw: payload };
  }
  const p = payload as Record<string, unknown>;
  const state = (p['state'] ?? {}) as Record<string, unknown>;
  const timeObj = p['time'] as Record<string, unknown> | undefined;
  let timeMs: number | null = null;
  if (timeObj && typeof timeObj['created'] === 'number') timeMs = timeObj['created'] as number;
  else if (cm.time && typeof r[cm.time] === 'number') timeMs = r[cm.time] as number;
  const sessionId = String((p['sessionID'] ?? p['sessionId'] ?? p['session_id'] ?? '') as string);
  const messageId = String(r[cm.message!] ?? r['_msg'] ?? p['messageID'] ?? p['messageId'] ?? '');
  const roleVal = (r['_role'] as string) ?? (p['role'] ?? 'unknown') as string;
  const role: CtPart['role'] = roleVal === 'user' || roleVal === 'assistant' || roleVal === 'system' ? roleVal as CtPart['role'] : 'unknown';
  const type = String(p['type'] ?? 'unknown');
  const text = typeof p['text'] === 'string' ? p['text'] as string : null;
  const tool = typeof p['tool'] === 'string' ? p['tool'] as string : null;
  const toolOutput = typeof state['output'] === 'string' ? state['output'] as string : typeof state['error'] === 'string' ? state['error'] as string : typeof p['output'] === 'string' ? p['output'] as string : null;
  const toolStatus = typeof state['status'] === 'string' ? state['status'] as string : null;
  return { id: rawId, row: fallbackRow, sessionId, messageId, role, type, text, tool, toolOutput, toolStatus, timeMs, raw: payload };
}

function jsonToCtPart(j: Record<string, unknown>, filePath: string, row: number): CtPart {
  const id = String(j['id'] ?? path.basename(filePath, '.json'));
  const sessionId = String(j['sessionID'] ?? j['sessionId'] ?? '');
  const messageId = String(j['messageID'] ?? j['messageId'] ?? '');
  const role = (j['role'] as string) ?? 'unknown';
  const type = String(j['type'] ?? 'unknown');
  const text = typeof j['text'] === 'string' ? j['text'] as string : null;
  const tool = typeof j['tool'] === 'string' ? j['tool'] as string : null;
  const state = (j['state'] ?? {}) as Record<string, unknown>;
  const toolOutput = typeof state['output'] === 'string' ? state['output'] as string : typeof state['error'] === 'string' ? state['error'] as string : null;
  const toolStatus = typeof state['status'] === 'string' ? state['status'] as string : null;
  const timeMs = typeof (j['time'] as Record<string, unknown> | undefined)?.['created'] === 'number' ? ((j['time'] as Record<string, unknown>)['created'] as number) : null;
  return { id, row, sessionId, messageId, role: role as CtPart['role'], type, text, tool, toolOutput, toolStatus, timeMs, raw: j };
}

function unparseableCtPart(filePath: string, row: number): CtPart {
  return { id: path.basename(filePath, '.json'), row, sessionId: 'unknown', messageId: '', role: 'unknown', type: 'unparseable', text: null, tool: null, toolOutput: null, toolStatus: null, timeMs: null, raw: filePath };
}

function latestSessionSqlite(db: SqliteDatabase): string | null {
  try {
    const row = db.query<{ id: string }>(`SELECT id FROM session ORDER BY id DESC LIMIT 1`).get() as { id: string } | undefined;
    if (row?.id) return row.id;
  } catch (_e) { void 0; }
  try {
    const row = db.query<{ session_id: string }>(`SELECT session_id FROM message ORDER BY rowid DESC LIMIT 1`).get() as { session_id: string } | undefined;
    if (row?.session_id) return row.session_id;
  } catch (_e) { void 0; }
  return null;
}

function firstSessionOfMessage(db: SqliteDatabase, messageId: string): string {
  try {
    const row = db.query<{ session_id: string }>(`SELECT session_id FROM message WHERE id = ? LIMIT 1`).get(messageId) as { session_id: string } | undefined;
    if (row?.session_id) return row.session_id;
  } catch (_e) { void 0; }
  return '';
}

async function readPartsSqlite(s: StoreState, cursor: number | null, limit: number, sessionId?: string): Promise<CtPart[]> {
  if (!s.db || !s.columnMap || s.mode !== 'sqlite') return [];
  const db = s.db;
  const cm = s.columnMap;
  const idCol = cm['id']!, msgCol = cm['message']!, dataCol = cm['data']!;
  // THE SESSION-SCOPING FIX (EN 207): filter to the AGENT'S session, not "latest by rowid" —
  // containers accumulate multiple sessions across restarts; the completion poll must see only
  // the parts belonging to the CURRENT conversation's session.
  const sesFilter = sessionId ? ` AND m.session_id = '${sessionId.replace(/'/g, "''")}'` : '';
  let rows: PartRow[];
  if (cursor === null) {
    rows = db.query<PartRow>(`SELECT p.rowid AS _row, p.${idCol} AS _id, p.${msgCol} AS _msg, json_extract(m.data, '$.role') AS _role, p.${dataCol} AS _data, p.* FROM part p LEFT JOIN message m ON p.${msgCol} = m.id WHERE p.rowid > (SELECT COALESCE(MAX(rowid),0) - ? FROM part)${sesFilter} ORDER BY p.rowid ASC`).all(limit) as PartRow[];
  } else {
    rows = db.query<PartRow>(`SELECT p.rowid AS _row, p.${idCol} AS _id, p.${msgCol} AS _msg, json_extract(m.data, '$.role') AS _role, p.${dataCol} AS _data, p.* FROM part p LEFT JOIN message m ON p.${msgCol} = m.id WHERE p.rowid > ?${sesFilter} ORDER BY p.rowid ASC LIMIT ?`).all(cursor, limit) as PartRow[];
  }
  return rows.map(r => rowToCtPart(r, cm, Number(r['_row'] ?? 0)));
}

async function countPartsSqlite(s: StoreState): Promise<number> {
  if (!s.db || s.mode !== 'sqlite') return 0;
  try {
    const r = s.db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM part`).get() as { n: number } | undefined;
    return r?.n ?? 0;
  } catch (_e) { return 0; }
}

async function livenessSqlite(io: CtIo, s: StoreState, sessionId?: string): Promise<CtLiveness> {
  if (!s.db || !s.columnMap || s.mode !== 'sqlite') return { sessionId: null, partCount: 0, newestPartAgeMs: null, hasTerminalFinish: false, status: 'absent' };
  const now = io.now ? io.now() : Date.now();
  // THE SESSION-SCOPING FIX: filter to the agent's session, not "latest by rowid"
  const sesFilter = sessionId ? ` WHERE m.session_id = '${sessionId.replace(/'/g, "''")}'` : '';
  const n = sessionId ? ((s.db.query(`SELECT COUNT(*) AS n FROM part p LEFT JOIN message m ON p.message_id = m.id${sesFilter}`).get() as any)?.n ?? 0) : await countPartsSqlite(s);
  if (n === 0) return { sessionId: sessionId ?? null, partCount: 0, newestPartAgeMs: null, hasTerminalFinish: false, status: 'absent' };
  const newest = s.db.query<PartRow>(`SELECT p.rowid AS _row, p.* FROM part p LEFT JOIN message m ON p.message_id = m.id${sesFilter} ORDER BY p.rowid DESC LIMIT 40`).all() as PartRow[];
  const parts = newest.map(r => rowToCtPart(r, s.columnMap!, Number(r['_row'] ?? 0))).reverse();
  const latest = parts[parts.length - 1];
  let resolvedSessionId = latest.sessionId;
  if (!resolvedSessionId) resolvedSessionId = firstSessionOfMessage(s.db, latest.messageId);
  if (!resolvedSessionId) resolvedSessionId = s.latestSessionId ?? null as unknown as string;
  const newestTime = latest.timeMs ?? null;
  const newestAge = newestTime === null ? null : Math.max(0, now - newestTime);
  const msgParts = parts.filter(p => p.messageId === latest.messageId);
  const meaningful = msgParts.filter(p => p.type !== 'reasoning');
  const hasTerminalFinish = meaningful.length > 0 && meaningful[meaningful.length - 1].type === 'step-finish';
  let status: CtLiveness['status'];
  if (hasTerminalFinish) status = 'complete';
  else if (newestAge !== null && newestAge <= CT_STREAM_WINDOW_MS) status = 'stream';
  else if (newestAge === null) status = hasTerminalFinish ? 'complete' : 'stream';
  else status = 'idle';
  return { sessionId: resolvedSessionId || s.latestSessionId, partCount: n, newestPartAgeMs: newestAge, hasTerminalFinish, status };
}

function readPartsJson(io: CtIo, s: StoreState, cursor: string | null, limit: number): CtPart[] {
  const root = s.jsonRoot ?? s.storePath ?? '';
  const find = io.execInContainer(`find ${JSON.stringify(root)} -name '*.json' -type f 2>/dev/null`, { timeoutMs: 10_000 });
  const all = find.stdout.split('\n').map(x => x.trim()).filter(Boolean);
  const byDir = new Map<string, number>();
  for (const f of all) { const d = path.dirname(f); byDir.set(d, (byDir.get(d) ?? 0) + 1); }
  let partDir = '';
  let best = -1;
  for (const [d, n] of byDir) if (n > best) { best = n; partDir = d; }
  if (!partDir) throw new CtStoreError('store_schema_mismatch', 'json family: no part subtree found', `scanned ${all.length} files under ${root}`);
  const files = all.filter(f => path.dirname(f) === partDir).sort();
  let startIdx = 0;
  if (cursor !== null) {
    const idx = files.findIndex(f => f.endsWith(cursor) || f.includes(cursor));
    startIdx = idx >= 0 ? idx + 1 : 0;
    if (startIdx === 0 && cursor !== null) startIdx = Math.max(0, files.length - limit);
  } else {
    startIdx = Math.max(0, files.length - limit);
  }
  const out: CtPart[] = [];
  for (let i = Math.max(0, startIdx); i < files.length && out.length < limit; i++) {
    const cat = io.execInContainer(`cat ${JSON.stringify(files[i])}`, { timeoutMs: 5_000 });
    if (cat.exitCode !== 0) { out.push(unparseableCtPart(files[i], i + 1)); continue; }
    try { const j = JSON.parse(cat.stdout) as Record<string, unknown>; out.push(jsonToCtPart(j, files[i], i + 1)); }
    catch (_e) { out.push(unparseableCtPart(files[i], i + 1)); }
  }
  return out;
}

function countPartsJson(io: CtIo, s: StoreState): number {
  const root = s.jsonRoot ?? s.storePath ?? '';
  const find = io.execInContainer(`find ${JSON.stringify(root)} -name '*.json' -type f 2>/dev/null | head -10000`, { timeoutMs: 10_000 });
  const all = find.stdout.split('\n').map(x => x.trim()).filter(Boolean);
  const byDir = new Map<string, number>();
  for (const f of all) { const d = path.dirname(f); byDir.set(d, (byDir.get(d) ?? 0) + 1); }
  let best = -1;
  for (const [, n] of byDir) if (n > best) best = n;
  return best >= 0 ? best : 0;
}

function livenessJson(io: CtIo, s: StoreState): CtLiveness {
  try {
    const parts = readPartsJson(io, s, null, CHECK_SCAN_LIMIT);
    if (parts.length === 0) return { sessionId: null, partCount: 0, newestPartAgeMs: null, hasTerminalFinish: false, status: 'absent' };
    const now = io.now ? io.now() : Date.now();
    const latest = parts[parts.length - 1];
    const newestTime = latest.timeMs ?? null;
    const newestAge = newestTime === null ? null : Math.max(0, now - newestTime);
    const msgParts = parts.filter(p => p.messageId === latest.messageId);
    const meaningful = msgParts.filter(p => p.type !== 'reasoning');
    const hasTerminalFinish = meaningful.length > 0 && meaningful[meaningful.length - 1].type === 'step-finish';
    let status: CtLiveness['status'];
    if (hasTerminalFinish) status = 'complete';
    else if (newestAge !== null && newestAge <= CT_STREAM_WINDOW_MS) status = 'stream';
    else if (newestAge === null) status = hasTerminalFinish ? 'complete' : 'stream';
    else status = 'idle';
    return { sessionId: latest.sessionId || s.latestSessionId, partCount: parts.length, newestPartAgeMs: newestAge, hasTerminalFinish, status };
  } catch (_e) { return { sessionId: null, partCount: 0, newestPartAgeMs: null, hasTerminalFinish: false, status: 'absent' }; }
}

function closeOpen(s: StoreState): void {
  try { s.db?.close(); } catch (_e) { void 0; }
  s.db = null;
}

export interface CtSessionStore {
  status(): CtStoreStatus;
  ensureReady(force?: boolean): Promise<CtStoreStatus>;
  readParts(cursor: number | null, limit: number, sessionId?: string): Promise<CtPart[]>;
  rowOf(partId: string): Promise<number | null>;
  countParts(): Promise<number>;
  sessionLiveness(sessionId?: string): Promise<CtLiveness>;
  close(): void;
  invalidate(): void;
  __testables: {
    probeOnce: typeof probeOnce;
    discover: typeof discover;
    rowToCtPart: typeof rowToCtPart;
    openVerified: typeof openVerified;
  };
}

export function createCtSessionStore(io: CtIo): CtSessionStore {
  const s: StoreState = {
    mode: 'none', storePath: null, fingerprint: null, snapshotPath: null,
    db: null, columnMap: null, tables: [], sessionCount: 0,
    latestSessionId: null, lastError: null, jsonRoot: null, schemaVerified: false,
  };

  async function ensureOpen(force: boolean): Promise<StoreState> {
    const container = io.containerName();
    if (!container) throw new CtStoreError('store_unavailable', 'no container configured');
    const p = await discover(io);
    // THE CONTAINER-SCOPED FINGERPRINT (W4 live-matrix fix): the path+mtime alone
    // collides across containers (same path, same-size dbs) — a stale snapshot from
    // container A would survive a switch to container B. The container name is part
    // of the store's identity; the fingerprint must carry it.
    const scopedFingerprint = `${container}:${p.fingerprint}`;
    if (!force && scopedFingerprint === s.fingerprint && s.db !== null && s.mode !== 'none') return s;
    closeOpen(s);
    s.mode = p.mode;
    s.storePath = p.storePath;
    s.fingerprint = scopedFingerprint;
    s.schemaVerified = false;
    if (p.mode === 'none') throw new CtStoreError('store_unavailable', 'store vanished between probe and open');
    let lastErr: string | null = null;
    for (let attempt = 1; attempt <= SNAPSHOT_ATTEMPTS; attempt++) {
      try {
        if (p.mode === 'sqlite') {
          const snap = await snapshotSqlite(io, container, p.storePath!);
          s.snapshotPath = snap;
          const opened = openVerified(snap);
          s.db = opened.db;
          s.columnMap = opened.columnMap;
          s.tables = opened.tables;
          try { s.sessionCount = (opened.db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM session`).get() as { n: number })?.n ?? 0; } catch (_e) { s.sessionCount = 0; }
          s.latestSessionId = latestSessionSqlite(opened.db);
          s.jsonRoot = null;
        } else {
          const snap = await snapshotJson(io, container, p.storePath!);
          s.snapshotPath = snap;
          s.jsonRoot = snap;
          verifyJsonSample(io, snap);
          s.db = null;
          s.columnMap = null;
          s.tables = ['part', 'message'];
        }
        s.schemaVerified = true;
        s.lastError = null;
        return s;
      } catch (e) {
        lastErr = e instanceof CtStoreError ? `${e.code}: ${e.message} ${e.detail ?? ''}` : (e as Error).message;
        if (e instanceof CtStoreError && e.code === 'store_schema_mismatch') throw e;
        if (attempt < SNAPSHOT_ATTEMPTS) await sleep(SNAPSHOT_BACKOFF_MS * attempt);
        else {
          closeOpen(s);
          s.schemaVerified = false;
          s.lastError = lastErr;
        }
      }
    }
    throw new CtStoreError('store_snapshot_failed', `snapshot failed integrity after ${SNAPSHOT_ATTEMPTS} attempts`, lastErr ?? 'unknown');
  }

  return {
    status(): CtStoreStatus {
      return { mode: s.mode, storePath: s.storePath, snapshotPath: s.snapshotPath, fingerprint: s.fingerprint, schemaVerified: s.schemaVerified, sessionCount: s.sessionCount, latestSessionId: s.latestSessionId, lastError: s.lastError };
    },
    async ensureReady(force = false): Promise<CtStoreStatus> {
      if (force) { closeOpen(s); s.fingerprint = null; }
      await ensureOpen(force);
      return { mode: s.mode, storePath: s.storePath, snapshotPath: s.snapshotPath, fingerprint: s.fingerprint, schemaVerified: s.schemaVerified, sessionCount: s.sessionCount, latestSessionId: s.latestSessionId, lastError: s.lastError };
    },
    async readParts(cursor: number | null, limit: number, sessionId?: string): Promise<CtPart[]> {
      const st = await ensureOpen(false);
      if (st.mode === 'sqlite') return readPartsSqlite(st, cursor, limit, sessionId);
      if (st.mode === 'json') return readPartsJson(io, st, cursor === null ? null : String(cursor), limit);
      return [];
    },
    async rowOf(partId: string): Promise<number | null> {
      const st = await ensureOpen(false);
      if (st.mode === 'sqlite' && st.db && st.columnMap) {
        const idCol = st.columnMap['id']!;
        const row = st.db.query<{ r: number }>(`SELECT rowid AS r FROM part WHERE ${idCol} = ?`).get(partId) as { r: number } | undefined;
        return row?.r ?? null;
      }
      return null;
    },
    async countParts(): Promise<number> {
      const st = await ensureOpen(false);
      if (st.mode === 'sqlite') return countPartsSqlite(st);
      if (st.mode === 'json') return countPartsJson(io, st);
      return 0;
    },
    async sessionLiveness(sessionId?: string): Promise<CtLiveness> {
      // THE COMPLETION-PATH FRESHNESS LAW: liveness is the completion-detection
      // data source — stale data here means the difference between "the agent
      // finished" and "the agent is still running." ALWAYS force re-snapshot.
      const st = await ensureOpen(true);
      if (st.mode === 'sqlite') return livenessSqlite(io, st, sessionId ?? undefined);
      if (st.mode === 'json') return livenessJson(io, st);
      return { sessionId: null, partCount: 0, newestPartAgeMs: null, hasTerminalFinish: false, status: 'absent' };
    },
    close(): void { closeOpen(s); s.mode = 'none'; s.fingerprint = null; s.schemaVerified = false; },
    invalidate(): void { s.fingerprint = null; },
    __testables: { probeOnce, discover, rowToCtPart, openVerified },
  };
}
