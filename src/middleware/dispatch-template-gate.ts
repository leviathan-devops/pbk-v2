/**
 * dispatch-template-gate — v2.0 (2026-09-17)
 *
 * THE OPERATOR'S DIRECTIVE (verbatim): "enforce that every single subagent
 * dispatched in omp is required to be dispatched with a ct dispatch
 * template - block all tool executions that dont contain the literal fucking
 * verbatim regex of the ct dispatch templates within them"
 *
 * THE ROOT DEFECT IN THE v1 PORT (dispatch-gate.ts): validateDpl1 checked for
 * `# mission`-style markdown headings, but the REAL templates use
 * `THE MISSION:` prose headers — validateDpl1(filled-E1) reports ALL sections
 * missing. The v1 gate would have blocked/rewritten every genuine template
 * dispatch. v2 matches the TEMPLATES THEMSELVES by their literal verbatim
 * fingerprints (the skeleton sentinels), extracted from the shipped
 * SKILL.md — the template IS the contract.
 *
 * THE ISE LAW (Lexicon bible §3.1): the fingerprints are the DETECTION layer
 * (mechanical, pure). The DECISION is this gate's ordered verdict: any dispatch
 * whose prompt lacks a complete template fingerprint-set is BLOCKED with the
 * named missing sentinels + the remedy (load skill dispatch-templates,
 * fill [FILEPATHS]+[CONTEXT], never rewrite the skeleton).
 */
import { BeforeGate } from "./chain";

export interface TemplateFingerprint {
  /** E1..E4, B1..B5 */
  id: string;
  /** the semantic context token — what this template IS, for selection */
  label: string;
  /** when to reach for this template */
  useWhen: string;
  /** the template's unique opening sentinel */
  opener: RegExp;
  /** the skeleton markers EVERY filled copy carries */
  requiredSentinels: RegExp[];
  /** the skeleton's floor (filled copies exceed it) */
  minLines: number;
}

// The sentinels are extracted verbatim from
// ~/.omp/agent/skills/dispatch-templates/SKILL.md (the shipped source).
// The EXECUTION LAW block is identical in every template — the strongest single
// fingerprint; each template ALSO carries its unique opener so the gate names
// WHICH template was detected.
export const TEMPLATE_FINGERPRINTS: TemplateFingerprint[] = [
  {
    id: "E1",
    label: "forensic-context-extraction",
    useWhen: "CODE regions — any wave that reads .ts/.py source files",
    opener: /EXECUTE THE FOLLOWING FORENSIC CONTEXT EXTRACTION VERBATIM/,
    requiredSentinels: [
      /═══ THE EXECUTION LAW \(this block is binding; it is identical in every task\) ═══/,
      /THE RETURN FORMAT:/,
      /THE READING ORDER \(READ BEFORE ANY EXECUTION/,
      /THE CONSTRAINTS:/,
      /Every claim in your return carries a file:line anchor/,
      /READ-ONLY/,
    ],
    minLines: 100,
  },
  {
    id: "E2",
    label: "deep-context-synthesis",
    useWhen: "DOCS/state — any wave that reads .md/docs/state files",
    opener: /EXECUTE THE FOLLOWING CONTEXT SYNTHESIS VERBATIM/,
    requiredSentinels: [
      /═══ THE EXECUTION LAW \(this block is binding; it is identical in every task\) ═══/,
      /THE RETURN FORMAT \(the brief sections/,
      /THE SYNTHESIS'S POSITION IN THE BUILD/,
      /Would a fresh reader be able to resume the work from my brief ALONE\?/,
      /READ-ONLY/,
    ],
    minLines: 100,
  },
  {
    id: "E3",
    label: "deep-research",
    useWhen: "external/web/hive research — landscape, library comparison, incident records",
    opener: /EXECUTE THE FOLLOWING RESEARCH TASK VERBATIM/,
    requiredSentinels: [
      /═══ THE EXECUTION LAW \(this block is binding; it is identical in every task\) ═══/,
      /THE RETURN FORMAT:/,
      /READ-ONLY/,
    ],
    minLines: 80,
  },
  {
    id: "E4",
    label: "failure-investigation",
    useWhen: "failure evidence gathering — incidents, regressions, production surprises",
    opener: /EXECUTE THE FOLLOWING FAILURE INVESTIGATION VERBATIM/,
    requiredSentinels: [
      /═══ THE EXECUTION LAW \(this block is binding; it is identical in every task\) ═══/,
      /THE RETURN FORMAT:/,
      /READ-ONLY/,
    ],
    minLines: 80,
  },
  {
    id: "B1",
    label: "full-stack-e2e-build",
    useWhen: "greenfield or overhaul builds — full-stack implementation from a spec",
    opener: /EXECUTE THE FOLLOWING BUILD PLAN VERBATIM/,
    requiredSentinels: [
      /═══ THE EXECUTION LAW \(this block is binding; it is identical in every task\) ═══/,
      /THE RETURN FORMAT:/,
      /ct_build/,
    ],
    minLines: 90,
  },
  {
    id: "B2",
    label: "debugging",
    useWhen: "root-cause-fix — debugging any broken behavior, test failure, or regression",
    opener: /EXECUTE THE FOLLOWING DEBUGGING PLAN VERBATIM/,
    requiredSentinels: [
      /═══ THE EXECUTION LAW \(this block is binding; it is identical in every task\) ═══/,
      /THE RETURN FORMAT:/,
      /ct_build/,
    ],
    minLines: 90,
  },
  {
    id: "B3",
    label: "surgical-edit",
    useWhen: "targeted changes following an existing spec — the edit hunk is already specified",
    opener: /EXECUTE THE FOLLOWING SURGICAL EDIT PLAN VERBATIM/,
    requiredSentinels: [
      /═══ THE EXECUTION LAW \(this block is binding; it is identical in every task\) ═══/,
      /THE RETURN FORMAT:/,
      /ct_build/,
    ],
    minLines: 90,
  },
  {
    id: "B4",
    label: "adversarial-test-implementation",
    useWhen: "test writing — adversarial coverage, edge cases, regression batteries",
    opener: /EXECUTE THE FOLLOWING TEST IMPLEMENTATION VERBATIM/,
    requiredSentinels: [
      /═══ THE EXECUTION LAW \(this block is binding; it is identical in every task\) ═══/,
      /THE RETURN FORMAT:/,
      /ct_build/,
    ],
    minLines: 90,
  },
  {
    id: "B5",
    label: "build-ci-pipeline",
    useWhen: "build scripts, dist manifest, deployment runbook, CI pipeline, packaging",
    opener: /EXECUTE THE FOLLOWING PIPELINE BUILD VERBATIM/,
    requiredSentinels: [
      /═══ THE EXECUTION LAW \(this block is binding; it is identical in every task\) ═══/,
      /THE RETURN FORMAT:/,
      /ct_build/,
    ],
    minLines: 90,
  },
];

export interface TemplateMatch {
  matched: boolean;
  templateId: string | null;
  missingSentinels: string[];
  lineCount: number;
}

/**
 * The DETECTION function (pure — Lexicon bible §3.1): which template, which
 * sentinels missing. Never selects the action.
 */
export function matchTemplate(prompt: string): TemplateMatch {
  const lines = prompt.split("\n").length;
  for (const fp of TEMPLATE_FINGERPRINTS) {
    if (!fp.opener.test(prompt)) continue;
    const missing: string[] = [];
    fp.requiredSentinels.forEach((re, i) => {
      if (!re.test(prompt)) missing.push(`sentinel[${i}] of ${fp.id}`);
    });
    if (lines < fp.minLines) missing.push(`density-floor(${fp.minLines} lines, got ${lines})`);
    return { matched: missing.length === 0, templateId: fp.id, missingSentinels: missing, lineCount: lines };
  }
  return { matched: false, templateId: null, missingSentinels: ["no template opener sentinel found"], lineCount: lines };
}

const REMEDY =
  "load skill dispatch-templates, copy the matching template VERBATIM " +
  "(E1 code-extract / E2 docs-synth / E3 research / E4 failure / B1-B5 builds), " +
  "fill ONLY [FILEPATHS] + [CONTEXT] (or the [WEAVE:*] slots), never rewrite the skeleton";

export interface DispatchTemplateInput {
  task?: string;
  tasks?: Array<{ task?: string; prompt?: string; agent?: string; name?: string }>;
  prompt?: string;
  [k: string]: unknown;
}

interface PromptItem {
  label: string;
  text: string;
}

function extractPrompts(input: DispatchTemplateInput): PromptItem[] {
  const prompts: PromptItem[] = [];
  if (Array.isArray(input.tasks)) {
    input.tasks.forEach((it, i) => {
      const text = String(it?.task ?? it?.prompt ?? "");
      if (text.trim()) prompts.push({ label: `tasks[${i}]`, text });
    });
  } else {
    const text = String(input.task ?? input.prompt ?? "");
    if (text.trim()) prompts.push({ label: "task", text });
  }
  return prompts;
}

/**
 * The DECISION function: EVERY dispatched prompt must carry a complete
 * template fingerprint. Bulk tasks: EVERY item must match (one thin prompt
 * blocks the batch — the operator said EVERY subagent).
 */
export function evaluateDispatchTemplate(input: DispatchTemplateInput): {
  verdict: "allow" | "block";
  reasons: string[];
} {
  const prompts = extractPrompts(input);
  if (prompts.length === 0) return { verdict: "allow", reasons: [] }; // nothing dispatched

  const reasons: string[] = [];
  for (const p of prompts) {
    const m = matchTemplate(p.text);
    if (!m.matched) {
      reasons.push(
        `${p.label}: NO ct dispatch template fingerprint (${m.templateId ? `template ${m.templateId} incomplete — missing ${m.missingSentinels.join(", ")}` : m.missingSentinels[0]}; ${m.lineCount} lines). Remedy: ${REMEDY}.`,
      );
    }
  }
  return { verdict: reasons.length > 0 ? "block" : "allow", reasons };
}

/**
 * The OMP BeforeGate wiring (wire into the middleware chain ahead of the
 * legacy dispatch-gate; extension-origin calls exempt — same law as v1).
 */
export function dispatchTemplateGate(host: unknown): BeforeGate {
  void host;
  return async (ctx) => {
    if (ctx.toolName !== "task") return undefined;
    if (ctx.isAgentOrigin) return undefined; // extension-origin exempt (v1 law)
    const evalResult = evaluateDispatchTemplate(ctx.input as DispatchTemplateInput);
    if (evalResult.verdict === "block") {
      return {
        action: "block",
        gate: "dispatch-template-v2",
        reason: `[CT DISPATCH TEMPLATE GATE v2] ${evalResult.reasons.join(" || ")}`,
      };
    }
    return undefined;
  };
}
