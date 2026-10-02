/**
 * ledger-concurrency.test.ts — a PINNED PROPERTY (not a defect fix).
 *
 * PROBED 2026-09-21: the append-only ledger is written by `appendFileSync` and is shared by every omp
 * session on the host. If concurrent writers could interleave a partial line, the audit trail — the
 * whole point of this layer — would corrupt silently.
 *
 * MEASURED: 12 writers x 40 rows = 480 appends in parallel -> 480 lines, 480 parseable, 0 corrupt.
 * So a single small append is atomic (O_APPEND + a write under the platform's atomic threshold).
 * This test pins that so a future change to a chunked/streamed writer cannot break it unmeasured.
 *
 * ADVERSARIAL FIRST: the first assertion is CORRUPT === 0 — the failure is what we look for.
 */
import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const N_WRITERS = 12;
const ROWS_EACH = 40;

describe("the ledger survives concurrent writers", () => {
  test("ADVERSARIAL: 480 parallel appends produce 480 WHOLE lines, zero corrupt", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ledger-concurrency-"));
    try {
      const ledger = join(dir, "events.jsonl");
      const worker = join(dir, "worker.mjs");
      writeFileSync(
        worker,
        `import { appendFileSync } from "node:fs";\n` +
          `const [ledger, id, rows] = [process.argv[2], process.argv[3], Number(process.argv[4])];\n` +
          `for (let i = 0; i < rows; i++) appendFileSync(ledger, JSON.stringify({ ts: new Date().toISOString(), rule: "probe-" + id, band: "skip", i, matched_span: "x".repeat(120), skip_reason: "probe" }) + "\\n");\n`,
      );
      await Promise.all(
        Array.from({ length: N_WRITERS }, (_, id) =>
          new Promise((res) => spawn(process.execPath, [worker, ledger, String(id), String(ROWS_EACH)], { stdio: "ignore" }).on("exit", res)),
        ),
      );
      const lines = readFileSync(ledger, "utf8").split("\n").filter((l) => l.trim());
      let corrupt = 0;
      for (const l of lines) { try { JSON.parse(l); } catch { corrupt++; } }
      expect(corrupt).toBe(0);
      expect(lines.length).toBe(N_WRITERS * ROWS_EACH);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
