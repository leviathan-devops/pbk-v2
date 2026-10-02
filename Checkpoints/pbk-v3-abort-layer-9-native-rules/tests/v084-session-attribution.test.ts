/**
 * v084-session-attribution.test.ts — THE CROSS-SESSION EVIDENCE CONTAMINATION FIX.
 *
 * FOUND LIVE, by the host test (deep-host-testing), exactly as the ATTRIBUTION LAW predicted:
 * the ledger is CWD-SCOPED, so every omp session sharing a cwd appends to ONE file. Measured in
 * Shared_Workspace: **512 rows in a single second from two different sessions** — one editing
 * `jarvis-manager.js`, one running this suite.
 *
 * THE DEFECT: `ringFromLedger()` read the last 40 span-bearing rows of that SHARED file with NO session
 * filter (impossible — the row carried no session identity), so `currentTurn` was the last row ANY session
 * wrote. The claim firewall's contract is **"span from THIS TURN"**; in a shared cwd it was
 * **"span from whoever wrote last"** — i.e. a claim could PASS on ANOTHER SESSION'S evidence. That is the
 * exact class W5 forbids.
 *
 * THE FIX: `session` is stamped on every row this process writes, and the ring is scoped to it. A row
 * WITHOUT a session is EXCLUDED (unattributable is not evidence of this turn — the fail-closed direction).
 *
 * ADVERSARIAL FIRST: the foreign-session row must be excluded BEFORE the own-session row is admitted.
 */
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  recordFiring, readAllRows, setLedgerSession, getLedgerSession, FIRING_SCHEMA, FIRING_EXTRA_KEYS,
} from "../src/ledger/events-ledger";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "v084-"));
  process.env.ABIDE_DIR = join(dir, ".abide");
  setLedgerSession(undefined);
});
afterEach(() => { setLedgerSession(undefined); rmSync(dir, { recursive: true, force: true }); });

const row = (span: string, session?: string) =>
  recordFiring({ rule: "r", buffer: "agent-text", band: "act", matched_span: span, verdict: "v", ...(session ? { session } : {}) });

/** The ring rule, mirrored from src/index.ts: this session's span-bearing rows only. */
const ringFor = (sid: string | undefined) => {
  const raw = readFileSync(join(dir, ".abide", "events.jsonl"), "utf8");
  return raw.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Record<string, unknown>)
    .filter((r) => typeof r.matched_span === "string" && r.matched_span)
    .filter((r) => sid !== undefined && r.session === sid)
    .map((r) => String(r.matched_span));
};

describe("V-084 session attribution (the cross-session evidence fix)", () => {
  test("ADVERSARIAL: ANOTHER session's row is EXCLUDED from this session's ring", () => {
    setLedgerSession("session-A");
    row("A's evidence");
    setLedgerSession("session-B");
    row("B's evidence");
    // B's ring must contain B's span and NEVER A's — the whole defect
    expect(ringFor("session-B")).toEqual(["B's evidence"]);
    expect(ringFor("session-B")).not.toContain("A's evidence");
    expect(ringFor("session-A")).toEqual(["A's evidence"]);
  });

  test("ADVERSARIAL: an UNATTRIBUTED row is excluded (unattributable is not evidence)", () => {
    row("legacy row, no session");       // a row written before the field existed
    setLedgerSession("session-C");
    row("C's evidence");
    expect(ringFor("session-C")).toEqual(["C's evidence"]);
  });

  test("ADVERSARIAL: with NO session set, the ring is EMPTY (fail-closed, never 'everything')", () => {
    row("A's evidence", "session-A");
    expect(ringFor(undefined)).toEqual([]);
  });

  test("the writer STAMPS the process session on every row", () => {
    setLedgerSession("session-D");
    row("D's evidence");
    expect(getLedgerSession()).toBe("session-D");
    const r = readAllRows().find((x) => x.matched_span === "D's evidence");
    expect(r?.session).toBe("session-D");
  });

  test("CONTROL: the schema is the 10 audit-law fields + the ONE permitted extra", () => {
    setLedgerSession("session-E");
    row("E's evidence");
    const raw = JSON.parse(readFileSync(join(dir, ".abide", "events.jsonl"), "utf8").trim().split("\n")[0]);
    const keys = Object.keys(raw);
    for (const k of FIRING_SCHEMA) expect(keys).toContain(k);
    const extras = keys.filter((k) => !(FIRING_SCHEMA as readonly string[]).includes(k));
    expect(extras).toEqual([...(FIRING_EXTRA_KEYS as readonly string[])]);
  });

  test("CONTROL: a LEGACY row (no session) still PARSES (the reader must not drop history)", () => {
    mkdirSync(join(dir, ".abide"), { recursive: true });
    // write a 10-key row by hand, as 6,800+ existing rows are
    writeFileSync(join(dir, ".abide", "events.jsonl"),
      JSON.stringify({ ts: new Date().toISOString(), rule: "legacy", buffer: "agent-text", band: "clear",
        probability: null, verdict: "v", jev_called: false, ms: 0, matched_span: "legacy span", skip_reason: null }) + "\n");
    const rows = readAllRows();
    expect(rows).toHaveLength(1);            // NOT dropped
    expect(rows[0].matched_span).toBe("legacy span");
    expect(rows[0].session).toBeUndefined();
  });

  test("CONTROL: a row with an UNAPPROVED extra key is still REJECTED", () => {
    mkdirSync(join(dir, ".abide"), { recursive: true });
    writeFileSync(join(dir, ".abide", "events.jsonl"),
      JSON.stringify({ ts: "t", rule: "r", buffer: "agent-text", band: "clear", probability: null, verdict: "v",
        jev_called: false, ms: 0, matched_span: "s", skip_reason: null, EVIL: "extra" }) + "\n");
    expect(readAllRows()).toHaveLength(0);   // the schema law still holds
  });
});
