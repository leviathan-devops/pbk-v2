/**
 * v056-claim-judge-success.test.ts — the claim judge's SUCCESS path, which only runs when a key exists.
 *
 * V-056's lesson, applied to V-056's own fix: *when an item is blocked on an external resource, audit the
 * path that would run when the resource arrives.* The wiring test proves the judge is SUPPLIED and that a
 * missing/bogus key fails closed — but the branch that actually executes with a real key (a 200 carrying an
 * answer) had never been exercised. This file exercises it through a mocked fetch, so the success path is
 * not itself a block waiting to be discovered.
 *
 * ADVERSARIAL FIRST: the malformed responses (absent answer, non-finite probability, HTTP error, garbage
 * JSON) are asserted BEFORE the happy path, because those are the branches a real API will hit.
 */
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { judgeClaimViaTypeSafe, type RingSpan } from "../src/ext/claim-bind";

const span: RingSpan = { text: "the daemon is running", ts: "2026-09-21T10:00:00.000Z", source: "t" };
const atom = { kind: "status", text: "the daemon is running" } as never;

let dir = "";
const realFetch = globalThis.fetch;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "cj-")); process.env.ABIDE_DIR = join(dir, ".abide"); });
afterEach(() => { globalThis.fetch = realFetch; rmSync(dir, { recursive: true, force: true }); });

const withFetch = (impl: (url: string, init?: RequestInit) => Promise<unknown>) => { globalThis.fetch = impl as never; };
const ok = (body: unknown) => async () => ({ ok: true, status: 200, json: async () => body });

describe("V-056 the claim judge's SUCCESS path (the branch a real key executes)", () => {
  test("ADVERSARIAL: a 200 with NO answer for the question -> null (fail-closed, never a support)", async () => {
    withFetch(ok({ answers: {} }));
    expect(await judgeClaimViaTypeSafe(atom, span, "k-123456789")).toBeNull();
  });

  test("ADVERSARIAL: a 200 with a NON-FINITE probability -> null (V-046's guard, applied here)", async () => {
    withFetch(ok({ answers: { 'claim-supported': { probability: Number.NaN } } }));
    expect(await judgeClaimViaTypeSafe(atom, span, "k-123456789")).toBeNull();
  });

  test("ADVERSARIAL: an HTTP error -> null AND a NAMED skip row (no silent skip)", async () => {
    withFetch(async () => ({ ok: false, status: 401, statusText: "Unauthorized", json: async () => ({}) }));
    expect(await judgeClaimViaTypeSafe(atom, span, "k-123456789")).toBeNull();
    const rows = readFileSync(join(dir, ".abide", "events.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const skip = rows.find((r) => String(r.skip_reason ?? "").includes("claim judge HTTP"));
    expect(skip).toBeDefined();
    expect(skip.band).toBe("skip");
  });

  test("ADVERSARIAL: a thrown fetch (network/timeout) -> null AND a NAMED skip row", async () => {
    withFetch(async () => { throw new Error("aborted"); });
    expect(await judgeClaimViaTypeSafe(atom, span, "k-123456789")).toBeNull();
    const rows = readFileSync(join(dir, ".abide", "events.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows.some((r) => String(r.skip_reason ?? "").includes("claim judge error"))).toBe(true);
  });

  // ── the happy path LAST ──
  test("a 200 with a HIGH probability -> verdict 'support'", async () => {
    withFetch(ok({ answers: { 'claim-supported': { probability: 0.97 } } }));
    const r = await judgeClaimViaTypeSafe(atom, span, "k-123456789");
    expect(r?.verdict).toBe("support");
    expect(r?.probability).toBeCloseTo(0.97, 5);
  });

  test("a 200 with a LOW probability -> verdict 'reject' (never a support by default)", async () => {
    withFetch(ok({ answers: { 'claim-supported': { probability: 0.2 } } }));
    const r = await judgeClaimViaTypeSafe(atom, span, "k-123456789");
    expect(r?.verdict).toBe("reject");
  });

  test("the request carries the key as a Bearer header and the atom+span as state", async () => {
    let seenUrl = "", seenInit: RequestInit | undefined;
    withFetch(async (url, init) => { seenUrl = url; seenInit = init; return { ok: true, status: 200, json: async () => ({ answers: { 'claim-supported': { probability: 0.9 } } }) }; });
    await judgeClaimViaTypeSafe(atom, span, "k-123456789");
    expect(seenUrl).toContain("api.typesafe.ai");
    const headers = (seenInit?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer k-123456789");
    const body = JSON.parse(String(seenInit?.body));
    expect(body.state.claim).toBe("the daemon is running");
    expect(body.state.evidence).toBe("the daemon is running");
    expect(body.model).toBe("jev-latest");
  });
});
