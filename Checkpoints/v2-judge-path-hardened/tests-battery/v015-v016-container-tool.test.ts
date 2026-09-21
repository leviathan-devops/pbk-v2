/**
 * v015-v016-container-tool.test.ts — the two OPEN container-tool defects, closed.
 *
 * V-015: `action=read` returned a correct-looking header over an EMPTY body — three times, on two
 * containers. ROOT CAUSE, proven in the rig: the slice was built as
 * `sed -n '${off + 1},$((off + lim))p'` INSIDE a JS template literal, which is NOT an interpolation — the
 * identifiers `off` and `lim` reached sed literally. Measured in the container:
 *   `sed -n '1,$((off + lim))p' file`  ->  `sed: -e expression #1, char 4: unknown command: '('`
 *   `sed -n '1,50p' file`              ->  content
 * and `2>/dev/null` swallowed the error, so the failure presented as an empty body rather than an error.
 * Impact: `read` is the ONLY sanctioned observation channel once the containerGate blocks raw host-shell
 * container verbs — a bodyless read leaves container-round adjudication with nothing to observe.
 *
 * V-016: `deploy` was declared in CT_ACTIONS but had NO dispatcher branch, so the documented sync verb fell
 * through to the "unhandled (loud)" return. Measured consequence: a freshly rebuilt rig carried dist
 * 6ea49fb8aba2b821 against a deployed e1bd1dbad665d83f, and the ONLY repair was a manual `cp`.
 *
 * ADVERSARIAL FIRST in both: an empty body must FAIL (not read as an empty pane), and a sha mismatch must
 * FAIL (not report a successful deploy).
 */
import { describe, expect, test } from "bun:test";
import { buildContainerTestingTool, CT_ACTIONS } from "../src/tools/container-testing";
import type { ExtensionAPI } from "../src/types/omp";
import { RecordedRunSet } from "../src/middleware/phantom-gate";

function chainable() {
  const self: Record<string, unknown> = {};
  const wrap = (v: unknown) => {
    const o = v as Record<string, unknown>;
    o.optional = () => wrap(o);
    o.min = () => wrap(o);
    return o;
  };
  self.string = () => wrap({ t: "string" });
  self.number = () => wrap({ t: "number" });
  self.boolean = () => wrap({ t: "boolean" });
  self.array = () => wrap({ t: "array" });
  self.enum = (values: string[]) => wrap({ t: "enum", values });
  self.object = (shape: unknown) => wrap({ t: "object", shape });
  return self;
}
function mockPi(): ExtensionAPI {
  return {
    on() {}, registerCommand() {}, registerTool() {}, registerShortcut() {},
    sendMessage() {}, sendUserMessage() {}, appendEntry() {},
    async exec() { return { exitCode: 0, stdout: "", stderr: "" }; },
    setActiveTools() {}, getActiveTools() { return []; }, getSystemPrompt() { return ""; },
    setLabel() {}, logger: { log() {} }, pi: {}, zod: chainable() as ExtensionAPI["zod"],
  };
}

/** A host whose execSync is scripted by regex, so a docker conversation can be simulated exactly. */
function scriptedHost(rules: Array<[RegExp, { code: number; stdout: string; stderr: string }]>, log?: string[]) {
  return {
    readFileSync: () => null, writeFileSync() {}, existsSync: () => false, mkdirSync() {},
    execSync: (cmd: string) => {
      log?.push(cmd);
      for (const [re, r] of rules) if (re.test(cmd)) return r;
      return { code: 0, stdout: "", stderr: "" };
    },
    sha256Sync: () => null, now: () => "2026-09-21T00:00:00.000Z", log() {},
  };
}

async function runWith(host: ReturnType<typeof scriptedHost>, action: string, extra: Record<string, unknown> = {}) {
  const t = buildContainerTestingTool(mockPi(), { host: host as never, recordedRuns: new RecordedRunSet() });
  const r = await t.execute("id", { action, ...extra });
  return { text: (r.content?.[0] as { text?: string })?.text ?? "", isError: !!r.isError };
}

describe("V-015 action=read produces a body, or fails loudly", () => {
  test("ADVERSARIAL: a header over an EMPTY body is an ERROR, never a reading", async () => {
    // the stream HAS 190 lines, but the slice comes back empty — the exact measured shape
    const host = scriptedHost([
      [/wc -l < \/tmp\/tui-stream\.txt/, { code: 0, stdout: "190\n", stderr: "" }],
      [/pane_pipe/, { code: 0, stdout: "1\n", stderr: "" }],   // V-054: the stream path requires an ATTACHED pipe
      [/sed -n .*1,12p/, { code: 0, stdout: "\n", stderr: "" }],
    ]);
    const r = await runWith(host, "read", { offset: 0, limit: 12 });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("CT READ FAILED");
    expect(r.text).toContain("do NOT read this as an empty pane");
  });

  test("the SED COMMAND carries NUMBERS, not identifiers (the interpolation fault)", async () => {
    const log: string[] = [];
    const host = scriptedHost([
      [/wc -l < \/tmp\/tui-stream\.txt/, { code: 0, stdout: "190\n", stderr: "" }],
      [/pane_pipe/, { code: 0, stdout: "1\n", stderr: "" }],
      [/sed -n/, { code: 0, stdout: "line one\nline two\n", stderr: "" }],
    ], log);
    await runWith(host, "read", { offset: 9, limit: 12 });
    const sed = log.find((c) => c.includes("sed -n")) ?? "";
    expect(sed).toMatch(/10,21p/);            // the computed numbers
    expect(sed).not.toContain("off + lim");   // never the literal identifiers (V-015)       // never the literal identifiers (V-015)
  });

  test("CONTROL: a real slice is returned with its header and body", async () => {
    const host = scriptedHost([
      [/wc -l < \/tmp\/tui-stream\.txt/, { code: 0, stdout: "190\n", stderr: "" }],
      [/pane_pipe/, { code: 0, stdout: "1\n", stderr: "" }],
      [/sed -n .*1,4p/, { code: 0, stdout: "alpha\nbeta\n", stderr: "" }],
    ]);
    const r = await runWith(host, "read", { offset: 0, limit: 4 });
    expect(r.isError).toBe(false);
    expect(r.text).toContain("CT READ lines 1-4/190:");
    expect(r.text).toContain("alpha");
  });
});

describe("V-016 action=deploy has a branch and verifies the sha", () => {
  test("deploy is DECLARED and does NOT fall through to unhandled", async () => {
    expect(CT_ACTIONS).toContain("deploy");
    const host = scriptedHost([
      [/sha256sum .*dist\/index\.js/, { code: 0, stdout: "abc123def4567890  dist/index.js\n", stderr: "" }],
      [/docker cp/, { code: 0, stdout: "", stderr: "" }],
      [/sha256sum \/root\/\.omp\/agent\/extensions\/omp-ct\/dist\.js/, { code: 0, stdout: "abc123def4567890  /root/.omp/x\n", stderr: "" }],
    ]);
    const r = await runWith(host, "deploy", { distPath: "dist/index.js" });
    expect(r.text).not.toContain("unhandled");
    expect(r.text).toContain("CT DEPLOY");
  });

  test("ADVERSARIAL: a sha MISMATCH is an error, never a successful deploy", async () => {
    const host = scriptedHost([
      [/sha256sum .*dist\/index\.js/, { code: 0, stdout: "aaaa111122223333  dist/index.js\n", stderr: "" }],
      [/docker cp/, { code: 0, stdout: "", stderr: "" }],
      [/sha256sum \/root\/\.omp\/agent\/extensions\/omp-ct\/dist\.js/, { code: 0, stdout: "bbbb444455556666  /root/.omp/x\n", stderr: "" }],
    ]);
    const r = await runWith(host, "deploy", { distPath: "dist/index.js" });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("MISMATCH");
    expect(r.text).toContain("do not run a round against it");
  });

  test("CONTROL: a matching sha reports the trio REPAIRED", async () => {
    const host = scriptedHost([
      [/sha256sum .*dist\/index\.js/, { code: 0, stdout: "deadbeefcafe1234  dist/index.js\n", stderr: "" }],
      [/docker cp/, { code: 0, stdout: "", stderr: "" }],
      [/sha256sum \/root\/\.omp\/agent\/extensions\/omp-ct\/dist\.js/, { code: 0, stdout: "deadbeefcafe1234  /root/.omp/x\n", stderr: "" }],
    ]);
    const r = await runWith(host, "deploy", { distPath: "dist/index.js" });
    expect(r.isError).toBe(false);
    expect(r.text).toContain("sha trio REPAIRED");
  });

  test("a failed copy is a loud CT DEPLOY FAILED", async () => {
    const host = scriptedHost([
      [/sha256sum .*dist\/index\.js/, { code: 0, stdout: "aaaa0000  dist/index.js\n", stderr: "" }],
      [/docker cp/, { code: 1, stdout: "", stderr: "no such container" }],
    ]);
    const r = await runWith(host, "deploy", { distPath: "dist/index.js" });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("CT DEPLOY FAILED");
  });
});

// ═══ V-054 — A STREAM THAT IS NOT BEING WRITTEN IS NOT AN OBSERVATION ═══════════════════════════════
// Found while running the container round: the rig's /tmp/tui-stream.txt had an mtime FIVE HOURS old and
// `pane_pipe` read 0 (the pipe is attached to the pane active at SETUP, and the active window changes),
// while the TUI was answering prompts. The stale file still contained the PREVIOUS round's token
// ("recap: ALIVE"), so `read` could hand back an old run's evidence as a fresh observation.
// Live ground truth is `tmux capture-pane`.
describe("V-054 a dead stream is named, and the live pane is read", () => {
  test("ADVERSARIAL: an unattached pipe reads the LIVE PANE and says why", async () => {
    const host = scriptedHost([
      [/wc -l < \/tmp\/tui-stream\.txt/, { code: 0, stdout: "190\n", stderr: "" }],
      [/pane_pipe/, { code: 0, stdout: "0\n", stderr: "" }],          // no pipe attached
      [/capture-pane/, { code: 0, stdout: "THE LIVE TUI CONTENT\n", stderr: "" }],
      [/sed -n/, { code: 0, stdout: "STALE STREAM CONTENT\n", stderr: "" }],
    ]);
    const r = await runWith(host, "read", { offset: 0, limit: 10 });
    expect(r.text).toContain("LIVE PANE");
    expect(r.text).toContain("pane_pipe=0");
    expect(r.text).toContain("must not be read as evidence");
    expect(r.text).toContain("THE LIVE TUI CONTENT");
    expect(r.text).not.toContain("STALE STREAM CONTENT");   // the old run's output never passes as a reading
  });

  test("CONTROL: an attached pipe still reads the stream (the fix did not replace the normal path)", async () => {
    const host = scriptedHost([
      [/wc -l < \/tmp\/tui-stream\.txt/, { code: 0, stdout: "190\n", stderr: "" }],
      [/pane_pipe/, { code: 0, stdout: "1\n", stderr: "" }],          // attached
      [/sed -n/, { code: 0, stdout: "stream line one\n", stderr: "" }],
    ]);
    const r = await runWith(host, "read", { offset: 0, limit: 10 });
    expect(r.text).toContain("CT READ lines 1-10/190:");
    expect(r.text).toContain("stream line one");
    expect(r.text).not.toContain("LIVE PANE");
  });
});
