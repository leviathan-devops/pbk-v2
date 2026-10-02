/**
 * http-path.test.ts — the JUDGE'S HTTP CLIENT PATH, exercised with a MOCKED fetch.
 *
 * WHY THIS EXISTS: a bogus key proves the REQUEST reaches api.typesafe.ai (HTTP 401). It does NOT
 * prove the RESPONSE would be parsed correctly — so a valid key could still produce nothing. These
 * tests mock `fetch` and assert the real client path: the request body shape, the answer parsing,
 * the probability clamping, and the failure modes.
 *
 * ADVERSARIAL FIRST: the first test is a MALFORMED response (a 200 with no `answers`), which must NOT
 * crash and must not invent a probability.
 */
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { defaultJudge, loadRubric, selectEditModelRules, type RubricRule } from "../src/ext/kernel-judge";

const EDIT_RULE: RubricRule = {
  id: "verify-rule",
  text: "an edit that adds an orphan module",
  when: "edit",
  status: "active",
  check: { type: "model", question: { type: "boolean", instructions: "Did this edit add an orphan module?" } },
} as RubricRule;

const STATE = { diff: "+++ b/src/x.ts\n+export function neverCalled() { return 1 }\n", task: "add a helper", file: "src/x.ts", phase: "edit" as const };
const KEY = "sk-test-key-not-real";

let captured: { url: string; body: string; auth: string } | null = null;
const realFetch = globalThis.fetch;

function mockFetch(responder: () => Response | Promise<Response>) {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    captured = { url: u, body: String(init?.body ?? ""), auth: headers.Authorization ?? headers.authorization ?? "" };
    return responder();
  }) as typeof fetch;
}

beforeEach(() => { captured = null; });
afterEach(() => { globalThis.fetch = realFetch; });

describe("the judge's HTTP client path (mocked fetch)", () => {
  test("ADVERSARIAL: a 200 with NO answers does not crash and invents nothing", async () => {
    mockFetch(() => new Response(JSON.stringify({ model: "jev-latest" }), { status: 200 }));
    const scores = await defaultJudge([EDIT_RULE], STATE, KEY);
    expect(scores).toEqual({});
  });

  test("a well-formed response parses the probability and the request is correctly shaped", async () => {
    mockFetch(() => new Response(JSON.stringify({ model: "jev-latest", answers: { "verify-rule": { probability: 0.91 } } }), { status: 200 }));
    const scores = await defaultJudge([EDIT_RULE], STATE, KEY);
    expect(scores["verify-rule"]).toBeCloseTo(0.91, 5);
    // the REQUEST shape (what a real key would send)
    expect(captured!.url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(captured!.auth).toBe(`Bearer ${KEY}`);
    const body = JSON.parse(captured!.body);
    expect(body.model).toBe("jev-latest");
    expect(typeof body.state).toBe("object");
    expect(Object.keys(body.questions ?? {})).toContain("verify-rule");
  });

  test("an out-of-range probability is clamped to [0,1]", async () => {
    mockFetch(() => new Response(JSON.stringify({ answers: { "verify-rule": { probability: 7.5 } } }), { status: 200 }));
    const scores = await defaultJudge([EDIT_RULE], STATE, KEY);
    expect(scores["verify-rule"]).toBe(1);
  });

  test("a 401 surfaces as an HTTP error (never a silent pass)", async () => {
    mockFetch(() => new Response("Unauthorized", { status: 401, statusText: "Unauthorized" }));
    await expect(defaultJudge([EDIT_RULE], STATE, KEY)).rejects.toThrow(/HTTP 401/);
  });

  test("CONTROL: the compiled rubric selects its 6 edit+model rules", () => {
    // FINDING (documented, not hidden): loadRubric()'s DEFAULT resolves `.abide/rubric.json`
    // relative to process.cwd(). Under `cd tests && bun test .` the cwd is tests/, so the default
    // finds NOTHING — a logged `no-model-rules` skip, never a silent pass. In production cwd is the
    // workspace root, which is why the live judge resolved all 6. This test therefore passes the
    // path EXPLICITLY rather than depending on the cwd.
    const rubricPath = join(import.meta.dir, "..", ".abide", "rubric.json");
    const rules = loadRubric(rubricPath);
    expect(rules.length).toBeGreaterThan(0);
    const edit = selectEditModelRules(rules);
    expect(edit.length).toBe(6);
    expect(edit.every((r) => r.when === "edit" && r.check.type === "model" && r.status === "active")).toBe(true);
  });

  test("DOCUMENTED: the default rubric path is cwd-relative (an explicit path frees it)", () => {
    // FINDING (documented, not hidden): loadRubric()'s DEFAULT resolves `.abide/rubric.json` relative to
    // process.cwd(), so it finds rules only when cwd IS a workspace root. Under `cd tests && bun test .`
    // the default found nothing (the live judge writes a logged `no-model-rules` skip, never a silent
    // pass); production runs with cwd = the workspace root, which is why all 6 edit+model rules resolved.
    //
    // ASSERTED DETERMINISTICALLY (cwd-independent): an explicit path loads; a MISSING path loads nothing.
    // The earlier version compared the default's count against the explicit count, which is environment-
    // dependent — inside a self-contained checkpoint the default ALSO resolves, and that is correct.
    const explicit = join(import.meta.dir, "..", ".abide", "rubric.json");
    expect(loadRubric(explicit).length).toBeGreaterThan(0);
    expect(loadRubric(join(import.meta.dir, "does-not-exist.json")).length).toBe(0);
  });});
