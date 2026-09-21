interface AgentState {
  agent: string | undefined;
  timestamp: number;
  sessionId: string;
  toolsCalledThisTurn: number;
  lastModelMessage: string | null;
}

// Global-backed storage — the plugin can load TWICE (config path + plugin-dir
// symlink / hot-reload overlap), creating duplicate module instances with
// separate Maps. Writes land in instance A, reads hit empty instance B.
// globalThis guarantees ONE map across all instances and reloads.
const g = globalThis as Record<string, unknown>;
if (!g.__ctAgentBySession) g.__ctAgentBySession = new Map<string, AgentState>();
const agentBySession = g.__ctAgentBySession as Map<string, AgentState>;

export function setCurrentAgent(agent: string | undefined, sessionId?: string): void {
  const sid = sessionId || 'default';
  const current = agentBySession.get(sid);
  agentBySession.set(sid, {
    agent,
    timestamp: Date.now(),
    sessionId: sid,
    toolsCalledThisTurn: current?.toolsCalledThisTurn || 0,
    lastModelMessage: current?.lastModelMessage || null,
  });
}

export function getCurrentAgent(sessionId?: string): string | undefined {
  const sid = sessionId || 'default';
  return agentBySession.get(sid)?.agent;
}

export function clearCurrentAgent(sessionId?: string): void {
  const sid = sessionId || 'default';
  agentBySession.delete(sid);
}

export function getToolsCalled(sessionId?: string): number {
  return agentBySession.get(sessionId || 'default')?.toolsCalledThisTurn || 0;
}

export function setToolsCalled(value: number, sessionId?: string): void {
  const sid = sessionId || 'default';
  const current = agentBySession.get(sid);
  if (current) {
    current.toolsCalledThisTurn = value;
    agentBySession.set(sid, current);
  }
}

export function resetToolsCalled(sessionId?: string): void {
  setToolsCalled(0, sessionId);
}

export function incrementToolsCalled(sessionId?: string): void {
  setToolsCalled(getToolsCalled(sessionId) + 1, sessionId);
}

export function getLastMessage(sessionId?: string): string | null {
  return agentBySession.get(sessionId || 'default')?.lastModelMessage || null;
}

export function setLastMessage(value: string | null, sessionId?: string): void {
  const sid = sessionId || 'default';
  const current = agentBySession.get(sid);
  if (current) {
    current.lastModelMessage = value;
    agentBySession.set(sid, current);
  }
}

// ── L1 OUTPUT INJECTION (tool.after reads file, injects into output) ──
var pendingL1Path: string | null = null;
export function getPendingL1Path(): string | null { return pendingL1Path; }
export function setPendingL1Path(p: string): void { pendingL1Path = p; }
export function clearPendingL1Path(): void { pendingL1Path = null; }

// ── CONTAINER TESTING SKILL TRACKING ──
var containerSkillSessions = new Set<string>();
export function setContainerSkillLoaded(sessionId: string): void {
  containerSkillSessions.add(sessionId);
  containerSkillSessions.add('default');
}

// Plan-file fallback: the skill may not be loadable inside a container (skills
// live on the host). A validated .ct/test-plan.md satisfies the gate the
// same way setup() accepts it (setup reads planText from the file). This
// breaks the deadlock where the hook demands the skill but the agent can't
// load it, while still enforcing plan-first: no plan file, no gate pass.
// NOTE: bare `require` is NOT available in the bun ESM bundle — the fs reader
// is injected by hook-chain.ts at load (globalThis.__ctReadFile).
var ctPlanFileChecked = false;
var ctPlanFileValid = false;
export function hasValidContainerTestPlanFile(): boolean {
  try {
    if (ctPlanFileChecked) return ctPlanFileValid;
    ctPlanFileChecked = true;
    var g = globalThis as Record<string, unknown>;
    var readFile = g.__ctReadFile as ((p: string) => string) | undefined;
    if (typeof readFile !== 'function') return false;
    var cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '/';
    var candidates = [cwd + '/.ct/test-plan.md', cwd + '/.ct/test-plan.json'];
    for (var ci = 0; ci < candidates.length; ci++) {
      try {
        var planText = readFile(candidates[ci]);
        if (typeof planText === 'string' && planText.length >= 2000 &&
            /OBJECTIVE/i.test(planText) && /TOOLS UNDER TEST/i.test(planText) &&
            /TEST SCENARIOS/i.test(planText) && /ADVERSARIAL/i.test(planText) &&
            /EVIDENCE/i.test(planText) && /PASS CRITERIA/i.test(planText)) {
          ctPlanFileValid = true;
          return true;
        }
      } catch (e) { /* try next candidate */ }
    }
    return false;
  } catch (e) { return false; }
}
export function isContainerSkillLoaded(sessionId: string): boolean {
  return containerSkillSessions.has(sessionId) || containerSkillSessions.has('default') ||
    hasValidContainerTestPlanFile();
}
// ═══ THE CONTAINER-INTERACTION FIREWALL (2026-08-19 — the 5-LAYER UPGRADE) ═══
// THE OLD CLASSIFIER was a string-position regex: it anchored docker/tmux at
// command-start (^|[;&|]) so "timeout 25 docker exec ..." BYPASSED it; it
// required the "-test" token IN THE SOURCE PATH of a docker cp so a cp from a
// plain path PASSED; and it FAILED-OPEN (return false on any gap). The live
// breach: raw `docker exec ... kill -9` + `docker cp` executed via the bash
// tool. THE UPGRADE is the ISE pattern: the regex is the DETECTOR only; the
// DECISION is the STATE MACHINE (tokenize → wrapper-strip → verb-class →
// target-check → fail-closed). docker exec/run/cp + tmux send-keys/pipe-pane/
// capture-pane are MUTATIONS the CT tool owns — blocked BY THE VERB, always,
// regardless of wrapper, path, or target name.
//   IDLE → TOKENIZED → WRAPPER_STRIPPED → CORE_IDENTIFIED → VERB_CLASSED
//   → { MUTATION → BLOCK } | { READ_ONLY → INFRA_ALLOW } | { UNKNOWN → BLOCK }
// The evidence triad { verb, target, tokenIndex } names the exact token so
// the block message teaches the boundary. Fail-closed: any docker/tmux that
// does not parse clean into the READ_ONLY allowlist is BLOCKED.

export type ContainerCommandVerdict =
  | 'ALLOW_INFRA'      // read-only docker (ps/images/inspect/logs/version/info) or non-docker
  | 'BLOCK_MUTATION'   // docker exec|run|cp / tmux send-keys|pipe-pane|capture-pane — CT tool owns
  | 'BLOCK_TARGET'     // docker into a KNOWN test container name (defense-in-depth)
  | 'BLOCK_UNPARSEABLE'; // fail-closed: docker/tmux present but the parse is ambiguous

export interface ContainerCommandEvidence {
  verb: string;          // the classified verb (exec|run|cp|send-keys|...)
  target?: string;       // the container/target name when extractable
  tokenIndex: number;    // the argv index of the verb (for the message)
  reason: string;        // the human reason — the block message body
}

const KNOWN_TEST_CONTAINER_RE = /(^|[-_])(test|ct|forge|sandbox)([-_]|$)/i;
const KNOWN_TEST_CONTAINER_PATTERNS = [
  /^forge-/, /-test$/, /^ct-/, /-ct\d*$/, /^test-/, /^container-test-/, /-dispatch-test$/,
];

function isKnownTestContainer(name: string): boolean {
  if (!name) return false;
  for (const p of KNOWN_TEST_CONTAINER_PATTERNS) if (p.test(name)) return true;
  return KNOWN_TEST_CONTAINER_RE.test(name);
}

/** L1 — TOKENIZE: quote/heredoc/escape-aware argv split. Returns the shell-level
 *  tokens — strings in quotes are ONE token and NEVER matched as verbs. */
export function tokenizeShell(command: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let inSingle = false, inDouble = false, inBacktick = false;
  let escaped = false;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (escaped) { cur += ch; escaped = false; continue; }
    if (ch === '\\' && !inSingle) { cur += ch; escaped = true; continue; }
    if (ch === "'" && !inDouble && !inBacktick) { inSingle = !inSingle; cur += ch; continue; }
    if (ch === '"' && !inSingle && !inBacktick) { inDouble = !inDouble; cur += ch; continue; }
    if (ch === '`' && !inSingle && !inDouble) { inBacktick = !inBacktick; cur += ch; continue; }
    if ((ch === ' ' || ch === '\t' || ch === '\n') && !inSingle && !inDouble && !inBacktick) {
      if (cur.length > 0) { tokens.push(cur); cur = ''; }
      continue;
    }
    cur += ch;
  }
  if (cur.length > 0) tokens.push(cur);
  // strip the SURROUNDING quotes from each token — the quoted string is the
  // VALUE, not a verb carrier; `bash -c "docker exec x"` must re-tokenize the
  // INNER as shell-level, not keep the quotes in the token.
  return tokens.map((t) => {
    if (t.length >= 2 && ((t[0] === '"' && t[t.length - 1] === '"') || (t[0] === "'" && t[t.length - 1] === "'"))) {
      return t.substring(1, t.length - 1);
    }
    return t;
  });
}

/** L2 — WRAPPER-STRIP: walk leading wrappers (timeout/sudo/env/nohup/bash -c/
 *  sh -c/docker exec <c> sh -c) until the CORE command. Recursive, depth ≤ 6.
 *  Returns the stripped argv. */
export function stripWrappers(argv: string[]): string[] {
  let out = argv;
  for (let depth = 0; depth < 6; depth++) {
    if (out.length === 0) return out;
    const head = out[0].toLowerCase();
    if (head === 'timeout' && out.length >= 2) { out = out.slice(2); continue; }
    if ((head === 'sudo' || head === 'nohup' || head === 'nice') ) { out = out.slice(1); continue; }
    if (head === 'env') { out = out.slice(1); continue; } // env X=Y cmd — env itself is a wrapper
    if ((head === 'bash' || head === 'sh' || head === 'zsh') &&
        out.length >= 3 && (out[1] === '-c' || out[1] === '-lc' || out[1] === '-c ' || out[1] === '-lc')) {
      // bash -c 'inner' → the inner is argv[2] — re-tokenize it
      const inner = out.slice(2).join(' ');
      out = tokenizeShell(inner);
      continue;
    }
    // docker exec is NOT a wrapper — it IS the core command to classify.
    // `docker exec <c> sh -c 'kill'` must BLOCK by the docker-exec verb, never
    // unwrap to the inner kill. (THE HOLE this kills: the old strip unwrapped
    // docker exec → the head became 'kill' → the command ALLOWED — the exact
    // bypass that executed the destructive kill.)
    break;
  }
  return out;
}

/** L3 + L4 + L5 — the DECISION: verb-class (mutation → BLOCK by verb alone),
 *  target-registry (known test container → BLOCK_TARGET), fail-closed. */
export function classifyContainerCommand(command: string): { verdict: ContainerCommandVerdict; evidence: ContainerCommandEvidence | null } {
  if (!command || typeof command !== 'string') return { verdict: 'ALLOW_INFRA', evidence: null };

  // DETECTOR (the ISE law: the regex DETECTS, the state machine DECIDES):
  // does the RAW string contain docker/tmux AT ALL? If NOT — clean pass,
  // zero token work. If YES — the DECISION below keys off the TOKENIZED
  // HEAD (after wrapper-strip), so `echo "docker exec foo"` (head=echo) is
  // ALLOW — the quoted string is a VALUE, not a shell verb. A bare `docker`
  // or `tmux` token in the head is what the verb-class gate consumes.
  if (!/\bdocker\b/.test(command) && !/\btmux\b/.test(command)) {
    return { verdict: 'ALLOW_INFRA', evidence: null };
  }

  const argv = stripWrappers(tokenizeShell(command));
  if (argv.length === 0) return { verdict: 'ALLOW_INFRA', evidence: null };

  const head = argv[0].toLowerCase();

  // ── the head is NOT docker/tmux (echo, cat, ls, git, bun, python...) →
  //    the docker/tmux was inside a quoted string / heredoc body / variable
  //    value. The shell-level command does NOT interact with containers.
  //    ALLOW (the DECISION is the head — the raw scan was only the DETECTOR).
  if (head !== 'docker' && head !== 'tmux') {
    return { verdict: 'ALLOW_INFRA', evidence: null };
  }

  // ── TMUX: send-keys/pipe-pane/capture-pane = MUTATION (drives the TUI the
  //    CT tool owns). ALWAYS BLOCK by verb. ──
  if (head === 'tmux') {
    const verb = argv[1] ? argv[1].toLowerCase() : '';
    if (['send-keys', 'pipe-pane', 'capture-pane', 'select-pane', 'split-window', 'new-window', 'kill-session', 'new-session'].indexOf(verb) !== -1) {
      return { verdict: 'BLOCK_MUTATION', evidence: { verb, tokenIndex: 1, reason: 'tmux ' + verb + ' mutates the TUI the container-testing tool owns — raw tmux is the theatrical path' } };
    }
    if (verb === 'list-sessions' || verb === 'display-message' || verb === 'list-panes') {
      return { verdict: 'ALLOW_INFRA', evidence: null };
    }
    return { verdict: 'BLOCK_UNPARSEABLE', evidence: { verb: verb || 'unknown', tokenIndex: 1, reason: 'unparseable tmux verb — fail-closed' } };
  }

  // ── DOCKER: the verb-class gate. ──
  if (head === 'docker') {
    const verb = argv[1] ? argv[1].toLowerCase() : '';
    // READ-ONLY infra — ALWAYS allowed (the CT tool's own inspection surface)
    if (['ps', 'images', 'inspect', 'logs', 'version', 'info', 'network', 'volume', 'system', 'history'].indexOf(verb) !== -1) {
      return { verdict: 'ALLOW_INFRA', evidence: null };
    }
    // MUTATION — blocked BY THE VERB, always (no target-name dependence)
    if (['exec', 'run', 'cp', 'rm', 'stop', 'kill', 'restart', 'start', 'create', 'commit', 'build', 'push', 'pull', 'tag', 'save', 'load', 'import', 'export'].indexOf(verb) !== -1) {
      // the target (the container/image name — the first non-flag arg after the verb)
      let target: string | undefined;
      for (let i = 2; i < Math.min(argv.length, 6); i++) {
        const a = argv[i];
        if (a.startsWith('-')) continue;
        target = a.split(':')[0].split('/').pop(); // strip :tag and repo/path
        break;
      }
      const evidence: ContainerCommandEvidence = {
        verb, target, tokenIndex: 1,
        reason: 'docker ' + verb + ' mutates a container/image — the container-testing tool owns ALL container interaction (setup|deploy|send|read|check|suite)',
      };
      // L4 — defense-in-depth: into a KNOWN test container → BLOCK_TARGET
      if (target && isKnownTestContainer(target)) {
        return { verdict: 'BLOCK_TARGET', evidence: { ...evidence, reason: 'docker ' + verb + ' into the KNOWN test container "' + target + '" — use container-testing ' + verb + ' instead' } };
      }
      return { verdict: 'BLOCK_MUTATION', evidence };
    }
    // docker with an unknown/missing verb → fail-closed BLOCK
    return { verdict: 'BLOCK_UNPARSEABLE', evidence: { verb: verb || 'missing', tokenIndex: 1, reason: 'docker ' + (verb || '<missing verb>') + ' — fail-closed: unparseable docker command' } };
  }

  // ── docker/tmux appeared but NOT at the head after wrapper-strip → the
  //    command is ambiguous (heredoc body, string content, weird nesting).
  //    FAIL-CLOSED: block rather than risk a bypass. ──
  return { verdict: 'BLOCK_UNPARSEABLE', evidence: { verb: 'docker/tmux-in-command', tokenIndex: 0, reason: 'docker/tmux present but not the command head after wrapper-strip — fail-closed' } };
}

/** THE PUBLIC ENTRY — the hook calls this. TRUE = the command must be blocked
 *  (a container-testing command OR an unparseable docker/tmux). The verdict
 *  detail rides the evidence so the hook can name the exact verb + target. */
export function isContainerTestingCommand(command: string): boolean {
  const { verdict } = classifyContainerCommand(command);
  return verdict === 'BLOCK_MUTATION' || verdict === 'BLOCK_TARGET' || verdict === 'BLOCK_UNPARSEABLE';
}

// ── POSEIDON ACTIVATION INTENT ──
// Stores the classified intent of the user's Poseidon activation message:
//   PERMISSIONS — unlock tools for direct work (do NOT call poseidon-tool action=start)
//   GOD_LOOP    — autonomous build orchestration (action=start is correct)
//   NONE        — no activation context
var poseidonIntentBySession = new Map<string, string>();
export function setPoseidonIntent(sessionId: string, intent: string): void {
  poseidonIntentBySession.set(sessionId, intent);
  poseidonIntentBySession.set('default', intent);
}
export function getPoseidonIntent(sessionId: string): string {
  return poseidonIntentBySession.get(sessionId) || poseidonIntentBySession.get('default') || 'NONE';
}
export function clearPoseidonIntent(sessionId: string): void {
  poseidonIntentBySession.delete(sessionId);
  poseidonIntentBySession.delete('default');
}

// ── MODEL WIRING ──
// Stores the current session's model provider+ID so callLLM() can use it
// for internal LLM calls without reading client.session.messages().
let _currentSessionModel: { providerID: string; modelID: string } | null = null;

export function setCurrentSessionModel(model: { providerID: string; modelID: string } | null): void {
  _currentSessionModel = model;
}

export function getCurrentSessionModel(): { providerID: string; modelID: string } | null {
  return _currentSessionModel;
}

// ── THE EVIDENCE MACHINE PERSISTENCE (the 7.5 migration — CN-18, ADDITIVE) ──
// The evidence machine's (src/firewalls/evidence-tracker.ts) durable home: the
// ct_evidence + ct_evidence_events tables (the spec's CN-18.1/18.2
// DDL) over bun:sqlite — the SAME engine container-test.ts + aether-memory.ts
// use. The handle is globalThis-backed (the same dual-instance hazard guard as
// the agent map above) — a hot-reload must never open a second handle over the
// same file. THE FAIL-CLOSED CONTRACT (FR-16.1): the helpers THROW on a db
// failure; the machine's loadEvidenceRecord catches and returns the fresh
// UNEVIDENCED record — a load error NEVER yields a silent LEGIT. The migration
// is ADDITIVE: every pre-existing export above is untouched.
// @ts-ignore — bun:sqlite ships no type package under tsc (the bun runtime provides it); the aether interface below is the typing boundary
import { Database } from 'bun:sqlite';
import type { EvidenceEvent } from '../firewalls/evidence-tracker.js';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

interface EvidenceSqliteStatement<T = unknown> {
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: unknown[]): T | undefined;
  all(...params: unknown[]): T[];
}
interface EvidenceSqliteDatabase {
  exec(sql: string): void;
  run(sql: string, ...params: unknown[]): void;
  query<T = unknown>(sql: string): EvidenceSqliteStatement<T>;
  close(): void;
}

export interface EvidenceRow {
  session_id: string;
  dist_sha: string | null;
  state: string;
  smoke_only: number;
  last_unit_at: number | null;
  last_container_at: number | null;
  last_smoke_at: number | null;
  last_dist_change_at: number | null;
  updated_at: number;
}

export interface EvidenceEventRow {
  id: number;
  session_id: string;
  kind: string;
  at: number;
  dist_sha: string | null;
  subject: string | null;
  artifact: string | null;
  detail: string | null;
}

// THE EVIDENCE TABLE (CN-18.1): the per-session record.
const EVIDENCE_TABLE_DDL = `CREATE TABLE IF NOT EXISTS ct_evidence (
  session_id          TEXT PRIMARY KEY,
  dist_sha            TEXT,
  state               TEXT NOT NULL DEFAULT 'NO_EVIDENCE',
  smoke_only          INTEGER NOT NULL DEFAULT 0,
  last_unit_at        INTEGER,
  last_container_at   INTEGER,
  last_smoke_at       INTEGER,
  last_dist_change_at INTEGER,
  updated_at          INTEGER NOT NULL
)`;
// THE EVENTS TABLE (CN-18.2): the append-only event log (the ring's durable mirror).
const EVIDENCE_EVENTS_TABLE_DDL = `CREATE TABLE IF NOT EXISTS ct_evidence_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL,
  kind        TEXT NOT NULL,
  at          INTEGER NOT NULL,
  dist_sha    TEXT NOT NULL,
  subject     TEXT,
  artifact    TEXT,
  detail      TEXT
)`;
const EVIDENCE_EVENTS_INDEX_DDL =
  'CREATE INDEX IF NOT EXISTS idx_evidence_events_session ON ct_evidence_events(session_id, at DESC)';

interface EvidenceDbHandle {
  db: EvidenceSqliteDatabase | null;
  ready: boolean;
  fault: 'load' | 'save' | null;
}
const gEdb = globalThis as Record<string, unknown>;
if (!gEdb.__ctEvidenceDbHandle) {
  const freshHandle: EvidenceDbHandle = { db: null, ready: false, fault: null };
  gEdb.__ctEvidenceDbHandle = freshHandle;
}
const evidenceDbHandle = gEdb.__ctEvidenceDbHandle as EvidenceDbHandle;

const EVIDENCE_DB_PATH = process.env.CT_EVIDENCE_DB_PATH || join(tmpdir(), 'ct-evidence.sqlite');

function getEvidenceDb(): EvidenceSqliteDatabase {
  if (evidenceDbHandle.db === null) {
    const db = new Database(EVIDENCE_DB_PATH) as EvidenceSqliteDatabase;
    // THE CONCURRENCY FIX (2026-08-13 — "SQLiteError: database is locked" in
    // the parallel test workers + the runtime): WAL allows concurrent readers
    // with ONE writer; the busy_timeout makes the writer WAIT for the lock
    // instead of failing immediately — the canonical sqlite concurrency pair.
    try {
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA busy_timeout = 5000;');
    } catch (pErr) { /* non-fatal — the pragmas are a hardening, not a requirement */ }
    db.exec(EVIDENCE_TABLE_DDL);
    db.exec(EVIDENCE_EVENTS_TABLE_DDL);
    db.exec(EVIDENCE_EVENTS_INDEX_DDL);
    evidenceDbHandle.db = db;
  }
  evidenceDbHandle.ready = true;
  return evidenceDbHandle.db;
}

export function initAgentStateDb(): boolean {
  try {
    getEvidenceDb();
    return evidenceDbHandle.ready;
  } catch (err) {
    console.error('[AgentState] evidence db init failed (fail-closed):', err);
    return false;
  }
}

// The test-support fault injection (FR-16.1's db-error stub): a real db failure
// is simulated by making the load/save helpers throw — the machine's fail-closed
// path is exercised honestly, never by asserting a hand-built fake.
export function __setEvidenceDbFault(fault: 'load' | 'save' | null): void {
  evidenceDbHandle.fault = fault;
}

export function __clearEvidenceSession(sessionId: string): void {
  try {
    const db = getEvidenceDb();
    db.run('DELETE FROM ct_evidence WHERE session_id = ?', sessionId);
    db.run('DELETE FROM ct_evidence_events WHERE session_id = ?', sessionId);
  } catch (err) { /* non-fatal — the cleanup is best-effort */ }
}

export function loadEvidenceRow(sessionId: string): EvidenceRow | null {
  if (evidenceDbHandle.fault === 'load') throw new Error('evidence db fault (load stub)');
  const db = getEvidenceDb();
  const row = db.query<EvidenceRow>(
    'SELECT session_id, dist_sha, state, smoke_only, last_unit_at, last_container_at, last_smoke_at, last_dist_change_at, updated_at FROM ct_evidence WHERE session_id = ?',
  ).get(sessionId);
  return row ?? null;
}

export function loadEvidenceEventRows(sessionId: string, limit: number): EvidenceEventRow[] {
  if (evidenceDbHandle.fault === 'load') throw new Error('evidence db fault (load stub)');
  const db = getEvidenceDb();
  // ORDER BY at DESC, id DESC — the id tiebreak makes the same-millisecond
  // events deterministic (the spec's at-only order was tie-ambiguous).
  return db.query<EvidenceEventRow>(
    'SELECT id, session_id, kind, at, dist_sha, subject, artifact, detail FROM ct_evidence_events WHERE session_id = ? ORDER BY at DESC, id DESC LIMIT ?',
  ).all(sessionId, limit);
}

export function saveEvidenceRow(row: EvidenceRow): void {
  if (evidenceDbHandle.fault === 'save') throw new Error('evidence db fault (save stub)');
  const db = getEvidenceDb();
  db.run(
    `INSERT INTO ct_evidence (session_id, dist_sha, state, smoke_only, last_unit_at, last_container_at, last_smoke_at, last_dist_change_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       dist_sha = excluded.dist_sha,
       state = excluded.state,
       smoke_only = excluded.smoke_only,
       last_unit_at = excluded.last_unit_at,
       last_container_at = excluded.last_container_at,
       last_smoke_at = excluded.last_smoke_at,
       last_dist_change_at = excluded.last_dist_change_at,
       updated_at = excluded.updated_at`,
    [row.session_id, row.dist_sha, row.state, row.smoke_only, row.last_unit_at, row.last_container_at, row.last_smoke_at, row.last_dist_change_at, row.updated_at],
  );
}

export function insertEvidenceEventRow(row: Omit<EvidenceEventRow, 'id'>): void {
  if (evidenceDbHandle.fault === 'save') throw new Error('evidence db fault (save stub)');
  const db = getEvidenceDb();
  db.run(
    'INSERT INTO ct_evidence_events (session_id, kind, at, dist_sha, subject, artifact, detail) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [row.session_id, row.kind, row.at, row.dist_sha, row.subject, row.artifact, row.detail],
  );
}

// THE PRUNING (CN-18.4): the rows older than the 24h window are deleted — the
// scalar record's state + timestamps survive; the ring's deep detail is bounded.
// THE CUTOFF is passed by the caller (Date.now() - EVIDENCE_RECORD_WINDOW_MS) —
// the window constant lives in the machine (evidence-tracker.ts), never here.
export function pruneEvidenceRecords(cutoff: number): void {
  try {
    const db = getEvidenceDb();
    db.run('DELETE FROM ct_evidence_events WHERE session_id IN (SELECT session_id FROM ct_evidence WHERE updated_at < ?)', cutoff);
    db.run('DELETE FROM ct_evidence WHERE updated_at < ?', cutoff);
  } catch (err) { /* non-fatal — the opportunistic sweep */ }
}
