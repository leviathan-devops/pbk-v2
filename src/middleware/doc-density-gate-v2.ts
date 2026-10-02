/**
 * doc-density-gate v2.0 — the quality-forcing fork (2026-09-17)
 *
 * FORKED FROM: ct v4 doc-density-state.ts (paragon-cache-autopsy-cleaned,
 * src/tools/doc-density-state.ts 458L) — the state machine (UNTRACKED →
 * DRAFTING → BUILDING → COMPLETE → VERIFIED, INCONCLUSIVE fail-state), the
 * accumulated-state rule (the floor binds on the FILE, never the write), the
 * ordered resolution (L1 path → L2 name → L3 content), the chunked-protocol
 * non-throw path, the DOC-COMPLETE marker.
 *
 * WHAT v2 ADDS (the operator: "extensions is still a prototype so dont port it
 * but observe it... see how we can improve this to better detect theatrical
 * shitty toiletplate doc writes and force quality generations"):
 *
 *  1. THE TOILETPLATE LEXICON (L7-new): Order-2 structural detectors for the
 *     repeated-filler class the v1 line-count floor REWARDS — a 3000-line
 *     document of restated boilerplate passes v1. v2 scores toiletplate
 *     density (repeated paragraphs, marketing filler, anchorless claims,
 *     section-less walls) and BLOCKS high-slop documents even over floor.
 *  2. THE ANCHOR-DENSITY CONTRACT: engineering claims require file:line
 *     anchors or command receipts — the ratio anchors/claims is measured
 *     (Order-2: regex components in a structural judgment), not guessed.
 *  3. THE HEADING-HIERARCHY MATCHER (Order-2): a spec without a heading
 *     hierarchy (the # / ## tree) is structureless — v1 only checked regex
 *     markers.
 *  4. THE FACTS-ONCE CHECK (v4's own doctrine made mechanical): duplicated
 *     identical paragraphs are counted and penalized.
 *  5. THE EVIDENCE TRIAD: every block/allow carries {detector hits, state,
 *     measured numbers} — Lexicon bible §3.1 evidence layer.
 *
 * The v1 separation law HOLDS: the matchers are pure DETECTION; the state
 * machine + the ordered verdict are the DECISION; the message names the
 * shortfall + the remedy.
 */
import { BeforeGate } from "./chain";
import type { EngineHost } from "../host";
// ★ W3 — THE JEV DECISION LAYER: the path-regex classifies the doc TYPE; the judge confirms it.
import { askGateDecision, enforceGate, docTypeCandidate, recordGateDecision } from "../ext/tool-gate";

// ─── floors (forked verbatim from v4 / hook-chain warhead-7 table) ───

export type DocType =
  | "SPEC" | "COMPLETION" | "ARCHITECTURE" | "REPORT"
  | "AUDIT" | "LOG" | "OVERVIEW" | "GENERIC";

export const DOC_FLOORS: Record<DocType, number> = {
  SPEC: 3000,
  COMPLETION: 2000,
  ARCHITECTURE: 1000,
  REPORT: 500,
  AUDIT: 100,
  LOG: 100,
  OVERVIEW: 300,
  GENERIC: 200,
};

export const EXEMPT_PATHS = [
  "/generated_artifacts/",
  "/skills/",
  "/node_modules/",
  "ct-tmp",
  "/tmp/opencode",
  ".ct/wave-",
];

// ─── DETECTION LAYER (pure matchers — never decide) ───

/** Order-1: path/name → type (forked from v4's L1/L2, simplified to the OMP surface). */
export function classifyDocType(filePath: string): DocType {
  const lower = filePath.toLowerCase();
  if (/\/context_management\//.test(lower)) {
    if (/spec|plan|post-compaction/.test(lower)) return "SPEC";
    if (/build_report|completion/.test(lower)) return "COMPLETION";
  }
  if (/ship_packages|ship_package/.test(lower)) {
    if (/build_report|full_build_context/.test(lower)) return "COMPLETION";
    if (/debug_log/.test(lower)) return "LOG";
    if (/readme|master_index|manifest/.test(lower)) return "OVERVIEW";
    if (/package_audit/.test(lower)) return "AUDIT";
  }
  // [audit:83] bare substrings over-classified (`inspection`/`respect`/`perspective` → SPEC,
  //   `preview` → REPORT, `package_audit` needed `_` to still match). Segment-boundary anchored.
  const seg = (alts: string): RegExp => new RegExp(`(^|[/_.-])(${alts})([/_.-]|$)`);
  if (seg("audit|zero_trust").test(lower)) return "AUDIT";
  if (seg("debug_log|changelog").test(lower)) return "LOG";
  if (seg("spec|dpl1|plan").test(lower)) return "SPEC";
  if (seg("completion|definition_of_done").test(lower)) return "COMPLETION";
  if (seg("architect|overhaul|breakdown|blueprint").test(lower)) return "ARCHITECTURE";
  if (seg("report|review|findings").test(lower)) return "REPORT";
  if (seg("readme|index|overview").test(lower)) return "OVERVIEW";
  return "GENERIC";
}

export interface SlopHit {
  signature: string;
  hits: number;
  evidence: string;
}

/** Order-2 detectors: the regex components in a structural judgment (Lexicon §3.3). */

/** TOILET-1 repeated paragraphs: identical non-trivial paragraphs counted twice+. */
export function detectRepeatedParagraphs(content: string): SlopHit {
  const paras = content
    .split(/\n{2,}|\n(?=[A-Z"'])/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 120); // non-trivial paragraphs only
  const counts = new Map<string, number>();
  for (const p of paras) counts.set(p, (counts.get(p) ?? 0) + 1);
  const dupes = [...counts.entries()].filter(([, n]) => n > 1);
  const worst = dupes.sort((a, b) => b[1] - a[1])[0];
  return {
    signature: "REPEATED_PARAGRAPH",
    hits: dupes.reduce((acc, [, n]) => acc + (n - 1), 0),
    evidence: worst ? `identical paragraph repeated ${worst[1]}x: "${worst[0].slice(0, 80)}…"` : "none",
  };
}

/** TOILET-2 marketing filler: the buzzword density per 100 lines. */
const FILLER_RE =
  // [audit:117] the truncated stems `synerg`/`game[- ]chang` with a trailing `\b` could never
  // match their real forms (`synergy`, `game-changer`). Suffixes added.
  /\b(seamless|seamlessly|leverage|leveraging|utilize|utilizing|cutting[- ]edge|state[- ]of[- ]the[- ]art|robust|comprehensive|holistic|synerg\w*|paradigm|best[- ]in[- ]class|world[- ]class|enterprise[- ]grade|blazingly fast|game[- ]chang(?:er|ing|ers)?)\b/gi;

export function detectFillerDensity(content: string): SlopHit {
  const lines = Math.max(1, content.split("\n").length);
  const fillerHits = [...content.matchAll(FILLER_RE)].length;
  const per100 = (fillerHits / lines) * 100;
  return {
    signature: "MARKETING_FILLER",
    hits: fillerHits,
    evidence: `${fillerHits} filler terms across ${lines} lines (${per100.toFixed(1)}/100 lines)`,
  };
}

/** TOILET-3 anchorless engineering prose: claims w/o file:line or command receipts. */
export function detectAnchorlessClaims(content: string): SlopHit {
  // PARAGRAPH-level judgment, not sentence-level: a claim and its anchor often
  // split across a sentence boundary ("...the handler enforces the schema. SEE
  // path/to/a.ts:48.") — sentence-splitting orphans the anchor from the claim
  // and flags every anchored paragraph anchorless (the live diag: 80/80 on a
  // fully-anchored spec). A PARAGRAPH carrying an engineering verb must carry
  // an anchor somewhere in the same paragraph.
  // ★ doc-density-gate-v2.ts:139 + [audit:142] — the old alternation `[:\d]\d+\b|:[0-9]{2,}`
  //   matched bare digit runs and colon-numbers (`12:30`, `count: 80`) as if they were anchors.
  //   An anchor is now a FILE:LINE shape or an explicit receipt token, never a bare number.
  const anchorRe = /[a-z0-9_./-]+\.(ts|md|ya?ml|json):\d+\b|file:line|`[a-z0-9_/-]+\.(ts|md|ya?ml|json)`|output:|verification:|SEE /i;
  // V-065: THE INFLECTION DEFECT (measured before this fix). The old alternation listed bare stems with
  // `\b…\b` boundaries, so it matched `implements`/`handles`/`verif` but NOT `implemented`, `handled`,
  // `verified`, `enforced`, `dispatched`, `parsed`, `blocked`, `writes`, `returns` — **12 of 18 common
  // forms measured missed**, and past-tense engineering prose is the most common register in a report. A
  // "does this paragraph carry an engineering verb?" test that misses the past tense under-counts exactly
  // the paragraphs the detector exists for. Each stem now carries its inflections.
  const verbRe =
    /\b(?:implement(?:s|ed|ing)?|handl(?:es|e|ed|ing)|writ(?:es|e|ten|ing)|read(?:s|ing)?|rout(?:es|e|ed|ing)|dispatch(?:es|ed|ing)?|enforc(?:es|e|ed|ing|ement)?|verif(?:y|ies|ied|ying|ication)|return(?:s|ed|ing)?|load(?:s|ed|ing)?|pars(?:es|e|ed|ing)|block(?:s|ed|ing)?|allow(?:s|ed|ing)?)\b/i;
  const paragraphs = content.split(/\n{2,}|\n(?=[A-Z"'])/).map((p) => p.trim()).filter((p) => p.length > 60);
  let anchorless = 0;
  let total = 0;
  let firstBad = "";
  for (const para of paragraphs) {
    if (/^#\s/.test(para) && !verbRe.test(para)) continue; // bare heading
    if (!verbRe.test(para)) continue;
    total += 1;
    if (!anchorRe.test(para)) {
      anchorless += 1;
      if (!firstBad) firstBad = para.slice(0, 80);
    }
  }
  const ratio = total > 0 ? anchorless / total : 0;
  return {
    signature: "ANCHORLESS_CLAIMS",
    hits: anchorless,
    evidence: `${anchorless}/${total} engineering paragraphs carry no file:line/anchor/receipt (${(ratio * 100).toFixed(0)}%)${firstBad ? ' — e.g. "' + firstBad + '…"' : ""}`,
  };
}

/** TOILET-4 structureless wall: no heading hierarchy in a long document. */
export function detectMissingHierarchy(content: string): SlopHit {
  const lines = content.split("\n").length;
  const h1 = (content.match(/^# /gm) ?? []).length;
  const h2 = (content.match(/^## /gm) ?? []).length;
  const hasTree = h1 + h2 >= 2; // any heading tree counts — h2-only specs are structured
  return {
    signature: "NO_HEADING_HIERARCHY",
    hits: hasTree ? 0 : 1,
    evidence: hasTree ? `h1=${h1} h2=${h2}` : `${lines} lines with h1=${h1} h2=${h2} — structureless wall`,
  };
}

/** TOILET-5 placeholder debris: unfilled slots and continuation debris. */
export function detectPlaceholderDebris(content: string): SlopHit {
  const weaves = (content.match(/\[WEAVE: /g) ?? []).length;
  const fills = (content.match(/\[FILL:/g) ?? []).length;
  const todos = (content.match(/\b(TODO|TBD|FIXME|to be continued)\b/gi) ?? []).length;
  const hits = weaves + fills + todos;
  return {
    signature: "PLACEHOLDER_DEBRIS",
    hits,
    evidence: `[WEAVE:]×${weaves} [FILL:]×${fills} TODO/TBD×${todos}`,
  };
}

export interface SlopReport {
  hits: SlopHit[];
  /** 0 (clean) — 100 (pure toiletplate) */
  slopScore: number;
  verdictFlags: string[];
}

/**
 * The composite slop score (the weighted sum, the named calibration):
 *   REPEATED_PARAGRAPH 12/dupe | MARKETING_FILLER ≤25 over 3/100 lines
 *   ANCHORLESS_CLAIMS ≤30 (ratio-scaled, ≥5 claims to judge)
 *   NO_HEADING_HIERARCHY 25 flat | PLACEHOLDER_DEBRIS 8/hit
 * BLOCK-QUALITY at slopScore >= 40 (the floor alone no longer saves it).
 * Named + rationaled — the anti Magic-Ladder law (Lexicon bible §3.2 SLOP-SIG-3).
 */
export function computeSlop(content: string): SlopReport {
  const hits: SlopHit[] = [
    detectRepeatedParagraphs(content),
    detectFillerDensity(content),
    detectAnchorlessClaims(content),
    detectMissingHierarchy(content),
    detectPlaceholderDebris(content),
  ];
  let score = 0;
  const flags: string[] = [];
  for (const h of hits) {
    if (h.hits === 0) continue;
    switch (h.signature) {
      case "REPEATED_PARAGRAPH": score += h.hits * 12; break;
      case "MARKETING_FILLER": {
        const lines = Math.max(1, content.split("\n").length);
        const per100 = (h.hits / lines) * 100;
        if (per100 > 3) score += Math.min(25, (per100 - 3) * 5);
        break;
      }
      case "ANCHORLESS_CLAIMS": {
        const m = h.evidence.match(/(\d+)\/(\d+)/);
        if (m && Number(m[2]) >= 5) {
          const ratio = Number(m[1]) / Number(m[2]);
          if (ratio > 0.6) score += Math.round(ratio * 30);
        }
        break;
      }
      case "NO_HEADING_HIERARCHY": score += 25; break;
      case "PLACEHOLDER_DEBRIS": score += h.hits * 8; break;
    }
    flags.push(`${h.signature}: ${h.evidence}`);
  }
  return { hits, slopScore: Math.min(100, Math.round(score)), verdictFlags: flags };
}

// ─── DECISION LAYER (the state machine + the ordered verdict) ───

export const DOC_COMPLETE_MARKER = "<!-- DOC-COMPLETE -->";
export const DRAFT_MIN_LINES = 20;

/**
 * V-082 THE THREE SPINE-LEVEL DEFECTS (measured by an ocr CRITICAL, verified by reading the code):
 *
 *   (a) `isEdit` was `input.content.length === 0 && existing !== null` — but the wrapper passes
 *       `content = input.content ?? input.newString`, so for an EDIT (whose params are oldString/newString)
 *       content is the NEW STRING and for a WRITE it is the body. **`isEdit` was false for EVERY real
 *       call**, so `postState` was never the file-after-write — it was the snippet.
 *   (b) `postState = isEdit ? existing : content` NEVER APPLIED THE PATCH even when `isEdit` was true.
 *       **The module's headline claim — "the gate judges the file AFTER the write/edit lands" — was false
 *       as implemented, and chunked edits could never accumulate toward the floor.**
 *   (c) `isFinalize` included `(!isEdit && content.length > 0)`, and with `isEdit` always false that made
 *       **`isFinalize` ALWAYS TRUE** for any write or edit — so the DRAFT path was UNREACHABLE and the
 *       remedy the gate's own message offers ("write the skeleton as a draft, then chunk-edit to the floor,
 *       then finalize") was IMPOSSIBLE TO FOLLOW.
 *
 * THE FIX: the input carries the patch; `postState` APPLIES it to the existing file; `isFinalize` requires
 * the marker (for an edit) or a whole-file write (for a create).
 */
export interface DocDensityV2Input {
  filePath: string;
  /** For a WRITE: the file body. For an EDIT: the `newString` (the patch's replacement). */
  content: string;
  /** The file as it exists on disk (an edit), or null (a create). */
  existing?: string | null;
  /** The edit's target text (present for an edit). */
  oldString?: string;
}

export interface DocDensityV2Verdict {
  action: "allow" | "block";
  gate: string;
  reason?: string;
  evidence: {
    docType: DocType;
    floor: number;
    lines: number;
    isFinalize: boolean;
    isDraft: boolean;
    slopScore: number;
    slopFlags: string[];
  };
}

export function evaluateDocDensityV2(input: DocDensityV2Input): DocDensityV2Verdict {
  if (EXEMPT_PATHS.some((e) => input.filePath.includes(e))) {
    return {
      action: "allow",
      gate: "doc-density-v2",
      evidence: { docType: "GENERIC", floor: 0, lines: 0, isFinalize: false, isDraft: false, slopScore: 0, slopFlags: ["exempt-path"] },
    };
  }
  const docType = classifyDocType(input.filePath);
  const floor = DOC_FLOORS[docType];
  const existing = input.existing ?? null;
  // V-082 (a): an EDIT is a call against an EXISTING file that carries a patch — detected by the patch's
  // presence, never by the content being empty (it never is).
  const isEdit = existing !== null && (input.oldString !== undefined || input.content.length > 0);

  // V-082 (b): THE POST-STATE APPLIES THE PATCH. For an edit on an existing file the state is the file
  // WITH the replacement applied — the accumulated state the module's headline claims. (When the edit's
  // target is not found the patch cannot be applied and the file stands as it is; that is the honest
  // reconstruction, and the marker check below still governs finalization.)
  const postState = isEdit
    ? (input.oldString !== undefined && input.oldString !== "" && existing !== null && existing.includes(input.oldString)
        // [audit:316] a single-occurrence replace matches real edit semantics (an edit applies
        // once); split/join replaced ALL occurrences. The empty-target guard prevents the
        // split("") per-char explosion (includes("") is always true).
        ? existing.replace(input.oldString, input.content)
        // [audit] the fallback was `existing ?? input.content` → `existing` — a WRITE-over-existing
        // (oldString absent) judged the OLD file and ignored the overwrite payload. A write
        // REPLACES the file, so the post-state is the new content.
        : (input.oldString !== undefined && input.oldString !== "" ? existing ?? input.content : input.content))
    : input.content;

  // V-082 (c): FINALIZE REQUIRES THE MARKER for an edit; a whole-file WRITE (no existing) is complete by
  // definition. Without this, `isFinalize` was always true and the DRAFT path — the remedy the gate's own
  // message names — was unreachable.
  // V-082 (c): FINALIZE REQUIRES THE MARKER for an edit; a whole-file WRITE (no existing) is
  // complete by definition. (A create under its floor is still BLOCKED — the floor check below
  // runs on the finalize path — so the draft protocol is not an escape hatch for creates.)
  const isFinalize = postState.includes(DOC_COMPLETE_MARKER) || (existing === null && input.content.trim().length > 0);
  const isDraftMarked = postState.startsWith("DRAFT") || postState.includes("<!-- DRAFT -->");
  // [audit:333] `split("\n").length` counted blank/trailing rows — a 3000-newline shell of
  // nothing passed the floor. Count NON-EMPTY lines so the floor measures content.
  const lines = postState.split("\n").filter((l) => l.trim().length > 0).length;

  // DRAFT path (the chunked protocol unbroken): the 20-line sanity floor only,
  // PLUS the slop screen (a 200-line toiletplate draft is still slop).
  if (!isFinalize || isDraftMarked) {
    // [audit:336] the draft floor binds on the FILE, not the write: an edit that shrinks the
    // post-state below the 20-line sanity floor blocks, even though it is "only a chunk".
    if (lines < DRAFT_MIN_LINES) {
      return {
        action: "block",
        gate: "doc-density-v2",
        reason: `[DOC DENSITY GATE v2] ${docType} draft under-specified: ${lines} lines (min ${DRAFT_MIN_LINES} — even a DRAFT carries real content). Write the skeleton as a draft, then chunk-edit to the ${docType} floor (${floor}+), then finalize with ${DOC_COMPLETE_MARKER}.`,
        evidence: { docType, floor, lines, isFinalize: false, isDraft: isDraftMarked, slopScore: 0, slopFlags: [] },
      };
    }
    const draftSlop = computeSlop(postState);
    if (draftSlop.slopScore >= 60) {
      return {
        action: "block",
        gate: "doc-density-v2",
        reason: `[DOC DENSITY GATE v2] DRAFT is toiletplate (slop ${draftSlop.slopScore}/100): ${draftSlop.verdictFlags.join("; ")}. Rewrite with real engineering content.`,
        evidence: { docType, floor, lines, isFinalize: false, isDraft: true, slopScore: draftSlop.slopScore, slopFlags: draftSlop.verdictFlags },
      };
    }
    return {
      action: "allow",
      gate: "doc-density-v2",
      evidence: { docType, floor, lines, isFinalize: false, isDraft: isDraftMarked, slopScore: draftSlop.slopScore, slopFlags: draftSlop.verdictFlags },
    };
  }

  // FINALIZE path: floor + slop screen on the POST-STATE.
  const slop = computeSlop(postState);
  if (lines < floor) {
    return {
      action: "block",
      gate: "doc-density-v2",
      reason: `[DOC DENSITY GATE v2] ${docType} finalize under-specified: ${lines} lines (min ${floor} — the ${docType} floor). Continue chunk-editing to the floor, then finalize with ${DOC_COMPLETE_MARKER}.`,
      evidence: { docType, floor, lines, isFinalize: true, isDraft: false, slopScore: slop.slopScore, slopFlags: slop.verdictFlags },
    };
  }
  if (slop.slopScore >= 40) {
    return {
      action: "block",
      gate: "doc-density-v2",
      reason: `[DOC DENSITY GATE v2] ${docType} meets the ${floor}-line floor but is TOILETPLATE (slop ${slop.slopScore}/100): ${slop.verdictFlags.join("; ")}. Replace filler with real engineering content (interfaces, file:line anchors, data flows, failure modes, evidence) — density is DATA, not line count.`,
      evidence: { docType, floor, lines, isFinalize: true, isDraft: false, slopScore: slop.slopScore, slopFlags: slop.verdictFlags },
    };
  }
  return {
    action: "allow",
    gate: "doc-density-v2",
    evidence: { docType, floor, lines, isFinalize: true, isDraft: false, slopScore: slop.slopScore, slopFlags: slop.verdictFlags },
  };
}

/**
 * The OMP BeforeGate wiring (wire later per the operator: "wired into omp
 * later"). Exemptions: non-.md, the EXEMPT_PATHS set.
 */
export function docDensityGateV2(host: EngineHost): BeforeGate {
  return async (ctx) => {
    if (!["write", "edit"].includes(ctx.toolName)) return undefined;
    const path = String(ctx.input.path ?? ctx.input.filePath ?? "");
    if (!path.toLowerCase().endsWith(".md")) return undefined;
    if (EXEMPT_PATHS.some((e) => path.includes(e))) return undefined;
    const content = String(ctx.input.content ?? ctx.input.newString ?? "");
    // [audit:389 + :399] a missing/transient/unreadable path never bricks the gate; and a WRITE
    // over an EXISTING file is judged against the accumulated file, not the snippet alone
    // (an overwrite evaluated as a create would judge only the patch against the floor).
    let existing: string | null = null;
    try { existing = host.readFileSync(path); } catch { existing = null; }
    // V-082: the patch travels with the input so the post-state can APPLY it.
    const oldString = typeof ctx.input.oldString === "string" ? ctx.input.oldString : undefined;
    // [audit:415 + :409] the postState the judge reviews MUST be the same formula the verdict
    // used: the patch applied to the existing file, the new content for a write-over-existing
    // (a write REPLACES), or the snippet for a create. A divergent append formula here meant the
    // judge reviewed a different file state than the verdict judged.
    const postState = existing !== null
      ? (oldString !== undefined && oldString !== "" && existing.includes(oldString)
          ? existing.replace(oldString, content)
          : (oldString !== undefined && oldString !== "" ? existing : content))
      : content;
    const verdict = evaluateDocDensityV2({ filePath: path, content, existing, oldString });
    if (verdict.action === "block") {
      // ★ W3 — THE JEV DECISION LAYER: the path-regex classified the doc TYPE; the JUDGE
      //   confirms whether that class (and the floor it imposes) is right. THE F-140/F-141
      //   CLASS: a path-regex read a `WAVE_PLAN.md` as a SPEC and demanded a 3000-line floor
      //   it was never meant to meet. Consult the judge for the FLOOR ("under-specified")
      //   block only; the slop screen is a real quality check the judge does not override.
      //   INFO surface: a dead judge fails OPEN (never bricks a doc write).
      if ((verdict.reason ?? "").includes("under-specified")) {
        try {
          // [audit:415] the judge reviewed the WRITE SNIPPET, not the judged postState — a
          // chunked edit's classification was decided on the full file but reviewed on the patch.
          // The judge sees the same postState the verdict was computed on.
          const ev = verdict.evidence;
          const cand = docTypeCandidate(path, ev.docType, postState.slice(0, 2000));
          const jv = await askGateDecision(cand, `file=${path}\nclassified as=${ev.docType}\nfloor=${ev.floor}\nlines=${ev.lines}\nhead:\n${postState.slice(0, 2000)}`);
          const ef = enforceGate(cand, jv);
          recordGateDecision(cand, jv, {
            tool: ctx.toolName, command: path, sessionId: ctx.sessionId,
            enforced: ef.action === "refuse" ? "refused" : "served", remedy: ef.remedy,
          });
          if (ef.action === "serve") {
            host.log("INFO", "pbk", `doc-density judge CLEARED the classification (${jv.choice} p=${jv.confidence.toFixed(3)}) for ${path} — allow`);
            return undefined; // the judge decided the classification is wrong — do not block
          }
        } catch (jevErr) {
          // [audit:439] the header promises "a dead judge fails OPEN (never bricks a doc write)" —
          // the catch logged "fail-OPEN" while the code fell through to BLOCK. INFO surface now
          // fails OPEN for real: a judge outage lets the doc write proceed.
          host.log("WARN", "pbk", `doc-density judge failed (INFO surface — fail-OPEN, allowing the write): ${jevErr instanceof Error ? jevErr.message : String(jevErr)}`);
          return undefined;
        }
      }
      return { action: "block", gate: verdict.gate, reason: verdict.reason ?? "[DOC DENSITY GATE v2] doc-density floor violated" };
    }
    return undefined;
  };
}
