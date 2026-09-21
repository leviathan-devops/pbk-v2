/**
 * evidence-tracker.test.ts — THE EVIDENCE MACHINE (494L, live, and untested until now).
 *
 * Found by V-058's coverage sweep: it is reached from the entry via
 * `index.ts → firewalls/semantic-smoke-firewall.ts → firewalls/evidence-tracker.ts`, and it is the SINGLE
 * SOURCE of the testing-degree state — the machine that answers "what degree of evidence exists for the
 * current dist?". Its own header states the law under test here:
 *
 *     "THE FAIL-CLOSED (FR-16.1): a load failure → the fresh UNEVIDENCED record + the loud log —
 *      NEVER a silent LEGIT."
 *
 * and the two guards that make a claim earnable:
 *     E_UNIT      — `exitOk` must be true for a unit run to count
 *     E_CONTAINER — DD-5: the container evidence REQUIRES its artifact
 *
 * ADVERSARIAL FIRST: the two guards and the smoke class run BEFORE the full ladder, because the guards are
 * where a fail-closed machine can silently become a permissive one.
 */
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getEvidenceState, ingestEvidenceEvent, queryEvidenceVerdict,
} from "../src/firewalls/evidence-tracker";

const SHA = "abcd1234abcd1234";
let dir = "";
let n = 0;
const newSession = () => `probe-${Date.now()}-${++n}`;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ev-"));
  process.env.ABIDE_DIR = join(dir, ".abide");
  process.env.CT_ABIDE_DIR = join(dir, ".abide");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("the evidence machine (the testing-degree state)", () => {
  describe("ADVERSARIAL: the guards that make a claim earnable", () => {
    test("E_UNIT: a FAILED unit run does not count (exitOk:false -> UNEVIDENCED)", () => {
      const s = newSession();
      ingestEvidenceEvent(s, { kind: "dist_change", at: Date.now(), distSha: SHA });
      ingestEvidenceEvent(s, { kind: "unit", at: Date.now(), distSha: SHA, exitOk: false });
      expect(getEvidenceState(s).state).toBe("NO_EVIDENCE");
      expect(queryEvidenceVerdict(s).verdict).toBe("UNEVIDENCED");
    });

    test("E_CONTAINER (DD-5): a container run WITHOUT its artifact does not count", () => {
      const s = newSession();
      ingestEvidenceEvent(s, { kind: "dist_change", at: Date.now(), distSha: SHA });
      ingestEvidenceEvent(s, { kind: "container", at: Date.now(), distSha: SHA, hasEvidenceArtifact: false });
      expect(getEvidenceState(s).state).toBe("NO_EVIDENCE");
      expect(queryEvidenceVerdict(s).verdict).toBe("UNEVIDENCED");
    });

    test("a SMOKE run never reaches the evidenced states (it is the class the machine exists to refuse)", () => {
      const s = newSession();
      ingestEvidenceEvent(s, { kind: "dist_change", at: Date.now(), distSha: SHA });
      ingestEvidenceEvent(s, { kind: "smoke", at: Date.now(), distSha: SHA });
      expect(queryEvidenceVerdict(s).verdict).toBe("SMOKE");
      expect(getEvidenceState(s).state).toBe("NO_EVIDENCE");
    });

    test("a fresh session is UNEVIDENCED with a NAMED reason (never a silent pass)", () => {
      const v = queryEvidenceVerdict(newSession());
      expect(v.verdict).toBe("UNEVIDENCED");
      expect(String(v.reason ?? "").length).toBeGreaterThan(10);
    });
  });

  describe("the ladder, in order", () => {
    test("a unit run alone reaches UNIT_EVIDENCED / UNIT_ONLY — never LEGIT", () => {
      const s = newSession();
      ingestEvidenceEvent(s, { kind: "dist_change", at: Date.now(), distSha: SHA });
      ingestEvidenceEvent(s, { kind: "unit", at: Date.now(), distSha: SHA, exitOk: true });
      expect(getEvidenceState(s).state).toBe("UNIT_EVIDENCED");
      expect(queryEvidenceVerdict(s).verdict).toBe("UNIT_ONLY");
    });

    test("unit THEN container+artifact reaches CONTAINER_EVIDENCED / LEGIT (the full ladder)", () => {
      const s = newSession();
      ingestEvidenceEvent(s, { kind: "dist_change", at: Date.now(), distSha: SHA });
      ingestEvidenceEvent(s, { kind: "unit", at: Date.now(), distSha: SHA, exitOk: true });
      ingestEvidenceEvent(s, { kind: "container", at: Date.now(), distSha: SHA, hasEvidenceArtifact: true, artifact: "ct-results.json" });
      expect(getEvidenceState(s).state).toBe("CONTAINER_EVIDENCED");
      expect(queryEvidenceVerdict(s).verdict).toBe("LEGIT");
    });
  });

  test("CONTROL: the record carries the dist the evidence belongs to (the machine answers about A dist)", () => {
    const s = newSession();
    ingestEvidenceEvent(s, { kind: "dist_change", at: Date.now(), distSha: SHA });
    ingestEvidenceEvent(s, { kind: "unit", at: Date.now(), distSha: SHA, exitOk: true });
    const v = queryEvidenceVerdict(s);
    expect(v.distSha).toBe(SHA);
  });
});
