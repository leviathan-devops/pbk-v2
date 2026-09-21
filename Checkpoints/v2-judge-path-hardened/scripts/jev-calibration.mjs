/**
 * jev-calibration.mjs — the band distribution per rule × file kind (the operator's Phase-5 measurement).
 *
 * THE QUESTION IT ANSWERS: do the judge's six edit rules DISCRIMINATE — or do they fire at similar
 * probabilities on every file kind, which would make them tokens that cost money and produce noise?
 *
 * THE INSPIRATION (measured live, V-079): `w7-doc-density` — a rule whose own text is "EVERY .md write is an
 * ENGINEERING ARTIFACT with a per-type density floor" — fired on a **TypeScript** edit at 0.63. The judge
 * answered the question it was asked; the question was scoped by the TOOL (`when: "edit"`), not by the
 * rule's own SUBJECT (`.md` files).
 *
 * THE MEASUREMENT: four file kinds (a .ts source, a .md report, a .md draft, a .json config), the same
 * judge, the same call shape — one question per rule, per edit. The MATRIX is the calibration data.
 *
 * A rule that separates (high on its subject, low elsewhere) EARNS its tokens.
 * A rule flat across the kinds is a constant — and a constant is not a judgment.
 */
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { kernelJudge } from "../src/ext/kernel-judge.ts";
import { resolveApiKey } from "../src/ext/kernel-judge.ts";

const key = resolveApiKey();
if (!key) {
  console.log("NO KEY — the calibration cannot run. This is a BLOCKED measurement, not a result.");
  process.exit(2);
}

const T = mkdtempSync(join(tmpdir(), "cal-"));
process.env.ABIDE_DIR = join(T, ".abide");

/** The four file kinds — the same SUBJECT matter, different SHAPES. */
const KINDS = [
  ["a .ts source", "src/example.ts", "export function add(a: number, b: number) { return a + b; }\nexport const K = 1;\n"],
  ["a .md report", "BUILD_REPORT.md", "## The build\n\nMeasured at src/foo.ts:118 — the suite ran 12 tests, 0 failed. The fix is recorded as V-1.\n".repeat(6)],
  ["an .md draft", "DRAFT-notes.md", "DRAFT\n" + "a line of draft content\n".repeat(30)],
  ["a .json config", "config.json", JSON.stringify({ modelRoles: { default: "x" }, providers: { a: 1 } }, null, 2) + "\n"],
];

const rows = [];
for (const [label, path, content] of KINDS) {
  const ledger = join(T, ".abide", "events.jsonl");
  try { rmSync(ledger); } catch { /* fresh */ }
  const j = kernelJudge({ rubricPath: join(process.cwd(), ".abide", "rubric.json") });
  await j.judge({
    type: "tool_result", toolName: "write", toolCallId: "cal-" + label,
    content: `wrote ${path}`,
    input: { file_path: path, content },
    sessionId: "cal", turnId: "t",
  });
  const { readFileSync } = await import("node:fs");
  let parsed = [];
  try {
    parsed = readFileSync(ledger, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch { /* none */ }
  for (const r of parsed) {
    if (r.rule && r.rule !== "kernel-judge") rows.push({ kind: label, rule: r.rule, band: r.band, prob: r.probability, ms: r.ms });
  }
}

// ── THE MATRIX ──
const rules = [...new Set(rows.map((r) => r.rule))].sort();
const kinds = KINDS.map(([l]) => l);
console.log(`\n═══ THE JEV CALIBRATION — the judge's band per rule × file kind ═══\n`);
console.log("rule".padEnd(26) + kinds.map((k) => k.padEnd(14)).join("") + "  SPREAD");
console.log("─".repeat(26 + 14 * kinds.length + 8));
const spreads = [];
for (const rule of rules) {
  const cells = kinds.map((k) => {
    const r = rows.find((x) => x.rule === rule && x.kind === k);
    return r ? `${r.band}:${typeof r.prob === "number" ? r.prob.toFixed(2) : "—"}` : "—";
  });
  const probs = cells.map((c) => (c.includes(":") ? parseFloat(c.split(":")[1]) : NaN)).filter((n) => !Number.isNaN(n));
  const spread = probs.length > 1 ? Math.max(...probs) - Math.min(...probs) : 0;
  spreads.push({ rule, spread });
  console.log(rule.padEnd(26) + cells.map((c) => c.padEnd(14)).join("") + `  ${spread.toFixed(2)}`);
}
console.log("─".repeat(26 + 14 * kinds.length + 8));
console.log(`\nTHE VERDICT PER RULE:`);
for (const s of spreads.sort((a, b) => b.spread - a.spread)) {
  const v = s.spread >= 0.35 ? "DISCRIMINATES" : s.spread >= 0.15 ? "weak separation" : "FLAT — a constant, not a judgment";
  console.log(`  ${s.rule.padEnd(26)} spread ${s.spread.toFixed(2)}  ${v}`);
}
console.log(`\nlatency: ${rows.filter((r) => r.ms).map((r) => r.ms)[0] ?? "—"} ms per ${rules.length}-question call`);
rmSync(T, { recursive: true, force: true });
