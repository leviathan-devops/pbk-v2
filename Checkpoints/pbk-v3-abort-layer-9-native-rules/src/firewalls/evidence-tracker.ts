// THE EVIDENCE MACHINE — the 7.5 SSTF overhaul's C-1 (the spec:
// docs/CT_V7.5_SSTF_OVERHAUL_L2_SPEC.md :352-902 + the data model :1549-1806).
// THE SINGLE SOURCE of the mechanical testing-degree state: the per-session
// evidence records + the verdicts. THE MACHINE answers ONE question: what degree
// of evidence exists for the current dist? It is the ISE law's state machine
// applied (the states as the nodes, the events as the transitions, the guards as
// the typed functions, the effects as the pure functions) — NEVER a regex tower,
// NEVER an N-branch classifier. THE FAIL-CLOSED (FR-16.1): a load failure → the
// fresh UNEVIDENCED record + the loud log — NEVER a silent LEGIT. The verdict
// cache (DD-11) is an optimization, never the source of truth.
//
// THE DEPENDENCY GRAPH (the spec :292): evidence-tracker.ts → agent-state.ts
// (the db helpers) + utils.ts (ctLog). The persistence lives in the
// agent-state migration (CN-18); this module composes the load/save helpers
// with the transition core + the verdict query.

import { ctLog } from '../utils.js';
import {
  initAgentStateDb,
  loadEvidenceRow,
  loadEvidenceEventRows,
  saveEvidenceRow,
  insertEvidenceEventRow,
  pruneEvidenceRecords,
} from '../hooks/agent-state.js';
import { existsSync } from 'node:fs';

// ── THE THRESHOLDS (the spec's registers — 4.8.1-4.8.3 + C-1.6) ──
export const EVIDENCE_RING_CAP = 50;                 // the ring's cap (4.8.1)
export const VERDICT_CACHE_TTL_MS = 5000;            // the verdict cache TTL (4.8.2)
export const EVIDENCE_RECORD_WINDOW_MS = 86_400_000; // the 24h pruning window (4.8.3)
export const CLAIM_FRESH_WINDOW_MS = 300_000;        // the claim's arming decay (C-1.6)
export const EVIDENCE_ARTIFACT_REL_PATHS: readonly string[] = [
  '.ct/container-test-results.json',
  '.ct/suite-report.json',
];

// ── THE TYPE CONTRACTS (C-1.2 verbatim from the spec :363-419) ──

export type EvidenceState = 'NO_EVIDENCE' | 'UNIT_EVIDENCED' | 'CONTAINER_EVIDENCED';

export type EvidenceEventKind =
  | 'unit'             // E_UNIT — the battery/tsc successful exit
  | 'container'        // E_CONTAINER — the container-test evidence-producing action
  | 'smoke'            // E_SMOKE — the smoke-classified run (node -e/bun -e/grep-as-proof/source-inspection)
  | 'dist_change'      // E_DIST_CHANGE — the build event (the new dist SHA)
  | 'claim'            // E_CLAIM — the text.complete's claim sentences
  | 'evidence_clear';  // E_EVIDENCE_CLEAR — the container evidence's claim de-arm

export interface EvidenceEvent {
  kind: EvidenceEventKind;
  at: number;                    // the epoch-ms timestamp
  distSha: string;               // the dist the event verified (or the current at the ingestion)
  subject?: string;              // the optional subject tagging (DD-6 — the battery's test files, the container scenarios' tools-under-test)
  artifact?: string;             // the evidence artifact's path (the container evidence REQUIRES it — DD-5)
  exitOk?: boolean;              // the E_UNIT guard's exit-code signal
  hasEvidenceArtifact?: boolean; // the E_CONTAINER guard's artifact signal
  detail?: string;               // the detector's log detail (the misclassification audit — G-10)
}

export interface EvidenceRecord {
  sessionId: string;
  distSha: string | null;        // null = the session has no dist yet
  state: EvidenceState;
  smokeOnly: boolean;            // the orthogonal SMOKE_ONLY flag (BC-6 — the smoke never satisfies)
  lastUnitAt: number | null;
  lastContainerAt: number | null;
  lastSmokeAt: number | null;
  lastDistChangeAt: number | null;
  events: EvidenceEvent[];       // the capped ring — the last EVIDENCE_RING_CAP = 50
  updatedAt: number;
}

export type EvidenceVerdictKind = 'LEGIT' | 'UNIT_ONLY' | 'SMOKE' | 'UNEVIDENCED';

export interface EvidenceVerdict {
  verdict: EvidenceVerdictKind;
  distSha: string | null;
  lastContainerAt: number | null;
  lastUnitAt: number | null;
  smokeCount: number;            // the smoke events in the current record
  reason: string;                // the machine's explainability string
}

// THE VERDICT CACHE (DD-11 — the performance, never the source of truth)
export interface VerdictCacheEntry {
  verdict: EvidenceVerdict;
  at: number;                    // the cache timestamp — the TTL = VERDICT_CACHE_TTL_MS = 5000
}

// THE MACHINE'S PUBLIC SURFACE (the consumers: the smoke lexicon, the tool gate, the hook wiring)
export interface EvidenceTrackerSurface {
  getEvidenceState(sessionId: string): EvidenceRecord;
  ingestEvidenceEvent(sessionId: string, event: EvidenceEvent): EvidenceRecord;
  queryEvidenceVerdict(sessionId: string, subject?: string): EvidenceVerdict;
}

// ── THE FRESH-RECORD FACTORY (the spec :893's initial shape) ──
export function freshRecord(sessionId: string, distSha: string | null = null): EvidenceRecord {
  return {
    sessionId,
    distSha,
    state: 'NO_EVIDENCE',
    smokeOnly: false,
    lastUnitAt: null,
    lastContainerAt: null,
    lastSmokeAt: null,
    lastDistChangeAt: null,
    events: [],
    updatedAt: Date.now(),
  };
}

// ── THE TRANSITION CORE (C-1.3 — the guards + the effects separated, the XState discipline C-9) ──
// The pure core takes (record, event) → record. The side effects (the SQLite
// write, the cache invalidation, the log) live in the INGEST wrapper, NEVER in
// the core. The single exception: the dist-change archive (applyDistChange
// preserves the old dist's record) — the spec's C-1.8 battery asserts the
// archive immediately after ingestEvent, so the archive is written in the
// effect (documented deviation, the in-memory archive is deterministic + cheap).

// A guard's dist-sha validation: an empty/missing distSha is the MALFORMED
// event class (the adversarial) — the guards reject it, the record unchanged.
function validDistSha(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

// THE GUARD — the E_UNIT event's admission (the battery/tsc successful exit for the current dist)
function canUnit(record: EvidenceRecord, event: EvidenceEvent): boolean {
  if (event.kind !== 'unit') return false;
  if (event.exitOk !== true) return false;
  if (!validDistSha(event.distSha)) return false;
  // The first event adopts the dist; the subsequent events must match it.
  if (record.distSha === null) return true;
  return event.distSha === record.distSha;
}

// THE GUARD — the E_CONTAINER event's admission (the container evidence with the artifact)
function canContainer(record: EvidenceRecord, event: EvidenceEvent): boolean {
  if (event.kind !== 'container') return false;
  // THE DD-5 CALIBRATION: the artifact is REQUIRED — the setup alone is NOT the
  // LEGIT evidence. The hasEvidenceArtifact flag = the suite/report action with
  // the pass verdicts OR the check action with a matched pass token. An
  // artifact-less "container tested" = the SMOKE class.
  if (event.hasEvidenceArtifact !== true) return false;
  if (!validDistSha(event.distSha)) return false;
  // The first event adopts the dist; the subsequent events must match it.
  if (record.distSha === null) return true;
  return event.distSha === record.distSha;
}

// THE GUARD — the E_SMOKE event (the flag is orthogonal — the state NEVER changes)
function canSmoke(record: EvidenceRecord, event: EvidenceEvent): boolean {
  if (event.kind !== 'smoke') return false;
  return validDistSha(event.distSha);
}

// THE GUARD — the E_DIST_CHANGE event (the new dist ≠ the current — the reset)
function canDistChange(record: EvidenceRecord, event: EvidenceEvent): boolean {
  if (event.kind !== 'dist_change') return false;
  if (!validDistSha(event.distSha)) return false;
  // The first dist adoption; a same-SHA rebuild is a no-op (4.7).
  if (record.distSha === null) return true;
  return event.distSha !== record.distSha;
}

function pushRing(events: EvidenceEvent[], event: EvidenceEvent): EvidenceEvent[] {
  const next = [...events, event];
  return next.length > EVIDENCE_RING_CAP ? next.slice(next.length - EVIDENCE_RING_CAP) : next;
}

// THE ARCHIVE (4.7): the old dist's record preserved at the reset — the audit's
// chain reconstruction. Keyed by session+dist; the durable mirror (the events
// table) retains the old-SHA event rows regardless — this map is the in-memory
// reconstruction surface the battery asserts.
const evidenceArchive = new Map<string, EvidenceRecord[]>();
function archiveKey(sessionId: string, distSha: string): string {
  return `${sessionId}::${distSha}`;
}
function archiveRecord(record: EvidenceRecord): void {
  if (record.distSha === null) return;
  const key = archiveKey(record.sessionId, record.distSha);
  const existing = evidenceArchive.get(key) ?? [];
  existing.push({ ...record, events: [...record.events] });
  evidenceArchive.set(key, existing);
}
export function archivedCount(sessionId: string, distSha: string): number {
  return (evidenceArchive.get(archiveKey(sessionId, distSha)) ?? []).length;
}

// THE EFFECTS (the state mutations — the pure functions):
function applyUnit(record: EvidenceRecord, event: EvidenceEvent): EvidenceRecord {
  return {
    ...record,
    state: 'UNIT_EVIDENCED',
    distSha: record.distSha ?? event.distSha,
    lastUnitAt: event.at,
    updatedAt: event.at,
    events: pushRing(record.events, event),
  };
}

function applyContainer(record: EvidenceRecord, event: EvidenceEvent): EvidenceRecord {
  return {
    ...record,
    state: 'CONTAINER_EVIDENCED',
    distSha: record.distSha ?? event.distSha,
    lastContainerAt: event.at,
    updatedAt: event.at,
    events: pushRing(record.events, event),
  };
}

function applySmoke(record: EvidenceRecord, event: EvidenceEvent): EvidenceRecord {
  // THE BC-6 CONTRACT: the smoke flag is orthogonal + the state UNCHANGED — the
  // smoke event NEVER transitions the machine toward the container evidence.
  return {
    ...record,
    distSha: record.distSha ?? event.distSha,
    smokeOnly: true,
    lastSmokeAt: event.at,
    updatedAt: event.at,
    events: pushRing(record.events, event),
  };
}

function applyDistChange(record: EvidenceRecord, event: EvidenceEvent): EvidenceRecord {
  // THE DIST-SCOPE RESET (FR-1.2/CN-10.1): the evidence NEVER carries across the
  // dist changes. The old record is archived (preserved with the old distSha
  // tags — the audit's chain reconstruction); the new record starts the fresh
  // state for the new dist.
  archiveRecord(record);
  return {
    ...record,
    distSha: event.distSha,
    state: 'NO_EVIDENCE',
    smokeOnly: false,
    lastUnitAt: null,
    lastContainerAt: null,
    lastSmokeAt: null,
    lastDistChangeAt: event.at,
    updatedAt: event.at,
    events: pushRing([], event),
  };
}

// THE INGEST (the event → the transition dispatch — the single-state-machine
// pattern, never an N-branch tower — the spec :536-549):
export function ingestEvent(record: EvidenceRecord, event: EvidenceEvent): EvidenceRecord {
  // THE ORDER IS LOAD-BEARING: the dist-change check FIRST (a dist-change event
  // is not a unit/container/smoke event for the OLD dist); the claim/
  // evidence_clear events update the record's context without a state transition.
  if (event.kind === 'dist_change' && canDistChange(record, event)) return applyDistChange(record, event);
  if (event.kind === 'unit' && canUnit(record, event)) return applyUnit(record, event);
  if (event.kind === 'container' && canContainer(record, event)) return applyContainer(record, event);
  if (event.kind === 'smoke' && canSmoke(record, event)) return applySmoke(record, event);
  if (event.kind === 'claim' || event.kind === 'evidence_clear') {
    return { ...record, updatedAt: event.at, events: pushRing(record.events, event) };
  }
  // A rejected event leaves the record untouched — the guard decided the event
  // is not admissible for the current state/dist; the caller logs the rejection.
  return record;
}

// ── THE VERDICT QUERY (C-1.4 — the machine's output, the single query surface) ──

function countSmoke(record: EvidenceRecord): number {
  let n = 0;
  for (const e of record.events) {
    if (e.kind === 'smoke') n++;
  }
  return n;
}

function subjectTaggedEvidenceExists(record: EvidenceRecord, subject: string): boolean {
  for (const e of record.events) {
    if (e.kind === 'container' && e.hasEvidenceArtifact === true && e.subject === subject) return true;
  }
  return false;
}

export function queryVerdict(record: EvidenceRecord, subject?: string): EvidenceVerdict {
  // THE FAIL-CLOSED PERSISTENCE CONTRACT (FR-16.1/CN-4.4): the record's
  // absence/unavailability = the UNEVIDENCED verdict, NEVER a silent LEGIT. The
  // caller (the load layer) returns a fresh UNEVIDENCED record on the db error —
  // the machine's query never fabricates evidence.
  if (record.distSha === null) {
    return {
      verdict: 'UNEVIDENCED',
      distSha: null,
      lastContainerAt: null,
      lastUnitAt: null,
      smokeCount: countSmoke(record),
      reason: 'no dist recorded for the session — no evidence possible',
    };
  }
  if (record.state === 'CONTAINER_EVIDENCED') {
    // THE DIST-LEVEL DEFAULT (DD-6): the dist-level container evidence satisfies
    // ANY subject's claim — the dist IS the unit under test. The STRICT option
    // (the subject-tagged events matching the claimed subject) is the extension
    // point, enabled when the events carry the subjects.
    if (subject !== undefined && subjectTaggedEvidenceExists(record, subject)) {
      return {
        verdict: 'LEGIT',
        distSha: record.distSha,
        lastContainerAt: record.lastContainerAt,
        lastUnitAt: record.lastUnitAt,
        smokeCount: countSmoke(record),
        reason: `subject '${subject}' container-evidenced for dist ${record.distSha} at ${record.lastContainerAt}`,
      };
    }
    return {
      verdict: 'LEGIT',
      distSha: record.distSha,
      lastContainerAt: record.lastContainerAt,
      lastUnitAt: record.lastUnitAt,
      smokeCount: countSmoke(record),
      reason: `container-evidenced for dist ${record.distSha} at ${record.lastContainerAt}`,
    };
  }
  if (record.state === 'UNIT_EVIDENCED') {
    return {
      verdict: 'UNIT_ONLY',
      distSha: record.distSha,
      lastContainerAt: record.lastContainerAt,
      lastUnitAt: record.lastUnitAt,
      smokeCount: countSmoke(record),
      reason: `unit-only: the battery at ${record.lastUnitAt}, no container evidence for dist ${record.distSha}`,
    };
  }
  if (record.smokeOnly) {
    return {
      verdict: 'SMOKE',
      distSha: record.distSha,
      lastContainerAt: null,
      lastUnitAt: record.lastUnitAt,
      smokeCount: countSmoke(record),
      reason: `smoke-only: the smoke runs at ${record.lastSmokeAt}, no container evidence for dist ${record.distSha}`,
    };
  }
  return {
    verdict: 'UNEVIDENCED',
    distSha: record.distSha,
    lastContainerAt: null,
    lastUnitAt: record.lastUnitAt,
    smokeCount: countSmoke(record),
    reason: `no evidence recorded for dist ${record.distSha}`,
  };
}

// ── THE PERSISTENCE (C-1.5 — the agent-state migration's tables) ──

export function loadEvidenceRecord(sessionId: string): EvidenceRecord {
  // THE FAIL-CLOSED LOAD (FR-16.1): a db error → the fresh UNEVIDENCED record +
  // the loud log. A record load failure is NEVER a silent LEGIT — the machine's
  // fail-state is UNEVIDENCED.
  try {
    const row = loadEvidenceRow(sessionId);
    if (!row) return freshRecord(sessionId);
    const eventRows = loadEvidenceEventRows(sessionId, EVIDENCE_RING_CAP);
    const events: EvidenceEvent[] = eventRows.reverse().map((r) => ({
      kind: r.kind as EvidenceEventKind,
      at: r.at,
      distSha: r.dist_sha ?? '',
      subject: r.subject ?? undefined,
      artifact: r.artifact ?? undefined,
      detail: r.detail ?? undefined,
    }));
    return {
      sessionId,
      distSha: row.dist_sha,
      state: row.state as EvidenceState,
      smokeOnly: row.smoke_only === 1,
      lastUnitAt: row.last_unit_at,
      lastContainerAt: row.last_container_at,
      lastSmokeAt: row.last_smoke_at,
      lastDistChangeAt: row.last_dist_change_at,
      events,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    ctLog('ERROR', 'evidence-tracker', `evidence record load failed for ${sessionId}: ${err instanceof Error ? err.message : String(err)}`);
    return freshRecord(sessionId);
  }
}

export function saveEvidenceRecord(record: EvidenceRecord, persistEvent = true): void {
  // THE WRITE (the upsert + the event append) + the PRUNING (CN-18.4 — the
  // EVIDENCE_RECORD_WINDOW_MS = 86_400_000 window). The last ring event is
  // appended to the durable mirror ONLY when the ingest consumed it
  // (persistEvent) — a REJECTED event (the guard refused it) is logged, never
  // re-inserted as a duplicate row. A save failure LOGS + PROPAGATES — the
  // caller sees the error.
  try {
    saveEvidenceRow({
      session_id: record.sessionId,
      dist_sha: record.distSha,
      state: record.state,
      smoke_only: record.smokeOnly ? 1 : 0,
      last_unit_at: record.lastUnitAt,
      last_container_at: record.lastContainerAt,
      last_smoke_at: record.lastSmokeAt,
      last_dist_change_at: record.lastDistChangeAt,
      updated_at: record.updatedAt,
    });
    if (persistEvent) {
      const last = record.events.length > 0 ? record.events[record.events.length - 1] : null;
      if (last) {
        insertEvidenceEventRow({
          session_id: record.sessionId,
          kind: last.kind,
          at: last.at,
          dist_sha: last.distSha,
          subject: last.subject ?? null,
          artifact: last.artifact ?? null,
          detail: last.detail ?? null,
        });
      }
    }
    pruneEvidenceRecords(Date.now() - EVIDENCE_RECORD_WINDOW_MS);
  } catch (err) {
    ctLog('ERROR', 'evidence-tracker', `evidence record save failed for ${record.sessionId}: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

// ── THE VERDICT CACHE (DD-11) ──
const verdictCache = new Map<string, VerdictCacheEntry>();

function invalidateVerdictCache(sessionId: string): void {
  const prefix = `${sessionId}::`;
  for (const key of verdictCache.keys()) {
    if (key.startsWith(prefix)) verdictCache.delete(key);
  }
}

// ── THE PUBLIC SURFACE (C-1.6) ──

export function getEvidenceState(sessionId: string): EvidenceRecord {
  initAgentStateDb();
  return loadEvidenceRecord(sessionId);
}

export function ingestEvidenceEvent(sessionId: string, event: EvidenceEvent): EvidenceRecord {
  initAgentStateDb();
  const record = loadEvidenceRecord(sessionId);
  const next = ingestEvent(record, event);
  // THE NO-OP LOG (the spec C-1.3 :548 — "the detail logged by the caller"):
  // a guard-rejected event is never a silent swallow — the rejection is logged,
  // the record saved without a duplicate event row (the ring stays consistent).
  if (next !== record) {
    saveEvidenceRecord(next);
    invalidateVerdictCache(sessionId);
  } else {
    saveEvidenceRecord(next, false);
    ctLog('WARN', 'evidence-tracker', `event rejected (no transition) for ${sessionId}: kind=${event.kind} distSha=${event.distSha || '(empty)'}`);
  }
  return next;
}

export function queryEvidenceVerdict(sessionId: string, subject?: string): EvidenceVerdict {
  const key = `${sessionId}::${subject ?? '*'}`;
  const cached = verdictCache.get(key);
  const now = Date.now();
  if (cached && (now - cached.at) < VERDICT_CACHE_TTL_MS) return cached.verdict;
  const record = loadEvidenceRecord(sessionId);
  const verdict = queryVerdict(record, subject);
  verdictCache.set(key, { verdict, at: now });
  return verdict;
}

export const evidenceTrackerSurface: EvidenceTrackerSurface = {
  getEvidenceState,
  ingestEvidenceEvent,
  queryEvidenceVerdict,
};

// ── THE ARTIFACT LOCATOR (the DD-5 delegation's evidence check) ──
// The container evidence REQUIRES the artifact on disk — the delegation's
// setContainerTestRan checks the artifact's existence before ingesting the
// 'container' event (the artifact-less "container tested" = the SMOKE class).
export function locateEvidenceArtifact(): string | null {
  try {
    const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '';
    for (const rel of EVIDENCE_ARTIFACT_REL_PATHS) {
      const abs = cwd ? (rel.startsWith('/') ? rel : cwd + '/' + rel) : rel;
      if (existsSync(abs)) return abs;
    }
  } catch (err) {
    ctLog('WARN', 'evidence-tracker', `artifact locate failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  return null;
}
