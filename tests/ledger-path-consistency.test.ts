/**
 * ledger-path-consistency.test.ts — a PINNED INTEGRATION PROPERTY.
 *
 * PROBED 2026-09-21: the judge WRITES to `.abide/events.jsonl` and the census READS
 * `.abide/events.jsonl`. Both resolve cwd-relative (with ABIDE_DIR as the override). If those two
 * resolutions ever diverged, the census would report an EMPTY ledger while the judge wrote rows —
 * a silent gap of exactly the kind this layer exists to prevent.
 *
 * This test drives the REAL writer and then the REAL census over the same cwd, and asserts the
 * census sees the row the writer wrote.
 *
 * ADVERSARIAL FIRST: the first assertion is that the census sees a NON-ZERO row count.
 */
import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("the judge's writer and the census's reader agree on the ledger path", () => {
  test("ADVERSARIAL: a row the judge writes is SEEN by the census (never a silently empty ledger)", () => {
    const dir = mkdtempSync(join(tmpdir(), "ledger-path-"));
    try {
      // drive the REAL judge with ABIDE_DIR pointing at a temp dir (one judge cycle, no key -> skip)
      const driver = join(dir, "drive.ts");
      execFileSync(
        "bun",
        [
          "-e",
          `import { kernelJudge } from ${JSON.stringify(join(import.meta.dir, "..", "src/ext/kernel-judge.ts"))};` +
            `await kernelJudge().judge({ type:"tool_result", toolName:"write", toolCallId:"pc", content:"w",` +
            ` input:{ file_path:"src/x.ts", content:"export const a=1;\\n" }, sessionId:"pc", turnId:"t" });`,
        ],
        { cwd: dir, env: { ...process.env, ABIDE_DIR: join(dir, ".abide") }, stdio: "ignore" },
      );
      const ledger = join(dir, ".abide", "events.jsonl");
      const written = readFileSync(ledger, "utf8").split("\n").filter((l) => l.trim()).length;
      expect(written).toBeGreaterThan(0); // the writer wrote

      // now the REAL census over the SAME ledger
      const out = execFileSync("node", [join(import.meta.dir, "..", "scripts", "census.mjs"), "--ledger", ledger], {
        encoding: "utf8",
      });
      expect(out).toContain(`rows ${written}`); // the reader sees exactly that
      expect(out).not.toContain("rows 0");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
