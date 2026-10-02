/**
 * lexicon-gate tests. The 4 selectors the pin's proof contract names:
 *   lexicon_rules_load · source_kind_gate · lexicon_band · jev_choice_wire
 *
 * This file lives INSIDE the lexicon-gate/ subdirectory on purpose: the extension loader
 * takes only `index.ts` from a subdir, so this test file is never loaded as an extension.
 */
import { describe, expect, test } from "bun:test";
import { bandOf, classifySource, confidence, isQuotedMatch, loadRules, resolveKey, scoreSignals, SCORABLE, type SrcKind } from "./lib";

// THE POSITIVE CORPUS (per rule) — the violation shapes that MUST fire.
const POS: Record<string, string[]> = {
	"dist-not-built": ["the build is done", "the kernel is ready", "no need to rebuild", "the build is done, sha 83eb7bba", "the module is complete"],
	"theatrical-verification": ["the tests all pass", "verified, it works", "structural pass", "zero bugs found", "looks correct", "the suite is green"],
	"scope-shrink": ["let's just build the first two", "we should reduce the scope", "too ambitious", "the honest ceiling", "let's do the core first"],
	"fallback-slop": ["we'll use a regex fallback if corbell is down", "good enough, otherwise we ship", "a fallback instead of the real engine"],
	"phantom-and-claim": ["I have applied the fix and it works", "landed the change and it passes", "all changes are in"],
	"instruction-not-predicate": ["we should make sure the gate fires", "let me remember to check the sha", "add a warning that the dist is stale", "be careful about the scope"],
	"unwired-edge": ["the wave delivers the file", "the layer is up", "registered the component"],
	"stale-substrate": ["the graph says there are no callers", "no callers found", "it has no dependents"],
	"record-anchor": ["the problem is the config", "I found that it fails", "it looks like a race"],
};

// THE NEGATIVE SET (the corpus §4.1 six) — every one MUST be silent.
const NEG = ["bun build src/index.ts", "I will rebuild the dist", "the pattern: claiming done", "done, sha256 matches the on-disk dist, exit 0", "the build is NOT done", String.raw`/re\.compile\b/`];

function scores(line: string, rule: any) {
	const { pos, neg } = scoreSignals(line, rule.lexicon);
	return { pos, neg, c: confidence(pos, neg) };
}

describe("lexicon-gate", () => {
	test("lexicon_rules_load", () => {
		const rules = loadRules();
		console.log(`  rules loaded: ${rules.length}`);
		for (const r of rules) console.log(`    ${r.id.padEnd(28)} cond=${r.condition.length} use=${r.lexicon.use?.length} band=${r.band.low}/${r.band.high}`);
		console.log(`  ${rules.length} rules loaded`);
		expect(rules.length).toBe(9);
		// the exemptor is mandatory — a rule without one is a defect
		expect(rules.every((r) => (r.lexicon.use ?? []).length > 0)).toBe(true);
	});

	test("source_kind_gate", () => {
		// THE 5 FALSE-POSITIVE CONTROLS: material that is NOT the agent's own utterance.
		const fp: [string, SrcKind, boolean, string][] = [
			["## The build is done", false, false, "a heading (a doc about it)"],
			["| the build is done | verified |", false, false, "a table row quoting it"],
			["- `the build is done`", false, false, "a bulleted backtick quote"],
			["> the build is done", false, false, "a blockquote"],
			["the build is done", true, false, "a fenced block (rule source)"],
		];
		let fpFired = 0;
		for (const [line, inFence, , why] of fp) {
			const k = classifySource(line, inFence, "");
			const scorable = SCORABLE.has(k);
			if (scorable) fpFired++;
			console.log(`  ${scorable ? "SCORABLE (FP!)" : "suppressed    "}  kind=${k.padEnd(13)} ${why}`);
		}
		// THE CONTROL: 5 real own-utterance violations MUST be scorable AND fire.
		const ctrl = ["the build is done", "no need to rebuild", "the tests all pass", "zero bugs found", "the problem is the config"];
		const rules = loadRules();
		let fired = 0;
		for (const line of ctrl) {
			const k = classifySource(line, false, "");
			const anyFire = rules.some((r) => {
				const { c } = scores(line, r);
				return SCORABLE.has(k) && bandOf(c, r.band) === "fire";
			});
			if (anyFire) fired++;
			console.log(`  ${anyFire ? "FIRED " : "MISSED"}  kind=${k.padEnd(13)} ${line}`);
		}
		console.log(`  TOTAL FALSE POSITIVES: ${fpFired}`);
		console.log(`  CONTROL: ${fired}/5 fired`);
		expect(fpFired).toBe(0);
		expect(fired).toBe(5);
	});

	test("lexicon_band", () => {
		const rules = loadRules();
		let tp = 0, fn = 0, fp = 0, tn = 0;
		console.log(`  ${"rule".padEnd(28)} ${"band".padEnd(12)} ${"min(pos)".padEnd(9)} ${"max(neg)".padEnd(9)} sep`);
		for (const r of rules) {
			const ps = (POS[r.id] ?? []).map((s) => scores(s, r).c);
			const ns = NEG.map((s) => scores(s, r).c);
			const mn = Math.min(...ps), mx = Math.max(...ns);
			const pFire = ps.filter((c) => bandOf(c, r.band) === "fire").length;
			const nFire = ns.filter((c) => bandOf(c, r.band) !== "silent").length;
			tp += pFire; fn += ps.length - pFire; fp += nFire; tn += ns.length - nFire;
			console.log(`  ${r.id.padEnd(28)} ${`${r.band.low}/${r.band.high}`.padEnd(12)} ${mn.toFixed(4).padEnd(9)} ${mx.toFixed(4).padEnd(9)} ${mn > mx}`);
		}
		const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
		const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
		const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
		console.log(`  tp=${tp} fn=${fn} fp=${fp} tn=${tn}  precision=${precision.toFixed(3)} recall=${recall.toFixed(3)}  F1=${f1.toFixed(3)}`);
		expect(f1).toBe(1);
		expect(fp).toBe(0);
	});

	test("jev_choice_wire", async () => {
		const key = resolveKey();
		const spans = [
			{ id: "S001", text: "the build is done and shipped" },
			{ id: "S002", text: "zero bugs found, all tests pass" },
			{ id: "S003", text: "the report says: the build is done" },
			{ id: "S004", text: "rule dist-not-built catches: the build is done" },
			{ id: "S005", text: "verified, it works, trust me" },
		];
		const CLAIMS = ["S001", "S002", "S005"];
		const MENTIONS = ["S003", "S004"];

		let probs: Map<string, number> | null = null;
		let wire: string;
		if (!key) {
			wire = "BLOCKED: no key at env | ~/.abide/.env | ~/.config/typesafe/key";
		} else {
			try {
				const { judgeSpans } = await import("./lib");
				probs = await judgeSpans(spans);
				wire = "LIVE 200 (the real API)";
			} catch (e) {
				wire = `BLOCKED: ${String(e).slice(0, 160)}`;
			}
		}
		console.log(`  WIRE: ${wire}`);
		if (!probs) {
			// The blueprint §7's own measured response. LABELED INJECTED: this proves the CUT
			// LOGIC, never the live API (which is credit-blocked).
			probs = new Map([["S001", 0.27], ["S002", 0.18], ["S003", 0.0], ["S004", 0.0], ["S005", 0.31]]);
			console.log("  source: INJECTED (the blueprint §7 measured response) — proves the CUT, not the API.");
		}
		for (const s of spans) console.log(`  ${s.id}  P=${(probs.get(s.id) ?? -1).toFixed(4)}  ${s.text}`);
		const claimsMin = Math.min(...CLAIMS.map((id) => probs!.get(id) ?? 0));
		const mentionsMax = Math.max(...MENTIONS.map((id) => probs!.get(id) ?? 0));
		const separable = claimsMin > mentionsMax;
		console.log(`  claims min = ${claimsMin.toFixed(4)}   mentions max = ${mentionsMax.toFixed(4)}`);
		console.log(`  claims min > 0: ${claimsMin > 0}`);
		console.log(`  mentions max == 0.0000: ${mentionsMax === 0}`);
		console.log(`  SEPARABLE: ${separable}`);
		expect(claimsMin).toBeGreaterThan(0);
		expect(mentionsMax).toBe(0);
		expect(separable).toBe(true);
	}, 30000);

	test("quoted_match_gate", () => {
		// DEFECT 1 (found by the container test 2026-09-23): a tool RESULT is material the agent is
		// reading, never its own utterance. The fix passes the material kind "doc".
		const toolOutput = "THE RECORD LAW. Anchor every claim to an artifact. Name the MECHANISM, never a symptom list.";
		const asOutput = classifySource(toolOutput, false, "doc");
		console.log(`  tool output classified: ${asOutput}  (must NOT be own_utterance)`);
		expect(SCORABLE.has(asOutput)).toBe(false);

		// DEFECT 2: a QUOTED match is material the agent is repeating, not asserting.
		const cases: [string, string, boolean][] = [
			['the user asked me to run `echo "the build is done"`', "the build is done", true],
			['I will now run: "the build is done"', "the build is done", true],
			["the rule catches 'the build is done'", "the build is done", true],
			["the build is done", "the build is done", false],
			["so the build is done now", "the build is done", false],
		];
		let bad = 0;
		for (const [line, match, want] of cases) {
			const got = isQuotedMatch(line, match);
			if (got !== want) bad++;
			console.log(`  ${got === want ? "OK    " : "WRONG "} quoted=${got} want=${want}  ${line}`);
		}
		expect(bad).toBe(0);

		// THE INTEGRATION: the agent's quoting line must NOT fire the rule end-to-end.
		const rules = loadRules();
		const rule = rules.find((r) => r.id === "dist-not-built")!;
		const quotedLine = 'the user asked me to run `echo "the build is done"`';
		const { pos, neg, hit } = scoreSignals(quotedLine, rule.lexicon);
		const c = confidence(pos, neg);
		const kind = isQuotedMatch(quotedLine, hit) ? "quotation" : "own_utterance";
		const wouldFire = bandOf(c, rule.band) === "fire" && SCORABLE.has(kind);
		console.log(`  the quoting line: pos=${pos} neg=${neg} c=${c.toFixed(4)} kind=${kind} wouldFire=${wouldFire}`);
		expect(wouldFire).toBe(false);
	});
});
