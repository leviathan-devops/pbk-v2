/**
 * sttgf-gate — the v6 production STTGF wiring, VERBATIM.
 *
 * Authority: PWM CLEAN-STABLE-SHIP-APPROVED
 * src/hooks/hook-chain.ts:2473-2555 (the enforcement block), :1008-1018
 * (isCompletionClaim lexicon), :1030-1052 (text.complete arming), :3732-3746
 * (messages.transform arming). NO env gate exists in v6 — none here either.
 *
 * HOOK-SURFACE ADAPTATIONS ONLY (spec §4 — anything else is FORBIDDEN):
 * 1. opencode tool.execute.before THROW → {action:block,gate:sttgf,reason} —
 *    the exact [STTGF BLOCK]/[STTGF ESCALATE] strings travel in reason.
 * 2. the v6 hook logger → ctLog (same arg order).
 * 3. the v6 container-test tool name → the OMP tool name 'container-testing'.
 * 4. v2 D-2 default YES: headless regex also covers -p/--print (one line).
 */
import type { BeforeGate } from "./chain";
import {
  checkSmokeTestFirewall,
  sttgfStateTracker,
} from "../firewalls/semantic-smoke-firewall";
// ★ W3 — THE JEV DECISION LAYER: the regex marks a SMOKE candidate; the judge decides (the F-141 fix).
import { askGateDecision, smokeCandidate, recordGateDecision, GATE_THRESHOLD } from "../ext/tool-gate";
// ─── The completion-claim lexicon — v6 hook-chain.ts:984-1018, VERBATIM.
// A completion-claim word counts as a CLAIM only when its sentence is NOT
// negated. A completion claim counts ONLY when it is about WORK: a strong
// phrase OR a claim word + a work entity in the same sentence. The exemptor:
// when the sentence discusses the audit remedy, the claim word is part of
// the remedy discussion, not a completion claim. STRONG phrases always hit.
const CLAIM_WORD_RE = /(success|done|shipped|audited|verified|everything works|all green|passed)/i;
const CLAIM_NEGATION_RE = /(not|cannot|can't|won't|refuse|refused|decline|never|no |without|unverified|unsubstantiated|fail|failing)/i;
const CLAIM_WORK_ENTITY_RE = /(wave|build|task|fix|feature|module|everything|all|audit|ship|shipped|deploy|release|regression|battery|gate|scenario|listing|result|output|report|finding|directory|work|change|diff|code|file)/i;
const CLAIM_STRONG_PHRASE_RE = /(everything works|all green|all done|all passed|the wave succeeded|wave shipped|build succeeded|task completed|audit passed|verified everything|everything verified|all verified|fully verified|verified correct|confirmed correct|is verified|verified the (listing|result|output|report|finding|directory|work|change|diff))/i;
const CLAIM_AUDIT_REMEDY_RE = /(wave audit|the audit|audit file|VERDICT|coverage|per-hunk|spec-coverage|wave-audit|run the wave|read every changed hunk)/i;
function isCompletionClaim(text: string): boolean {
  if (!CLAIM_WORD_RE.test(text)) return false;
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  for (let si = 0; si < sentences.length; si++) {
    const s = sentences[si];
    if (!CLAIM_WORD_RE.test(s) || CLAIM_NEGATION_RE.test(s)) continue;
    if (CLAIM_STRONG_PHRASE_RE.test(s)) return true;
    if (CLAIM_WORK_ENTITY_RE.test(s) && !CLAIM_AUDIT_REMEDY_RE.test(s)) return true;
  }
  return false;
}
import { ctLog } from "../utils";
const CT_TOOL = "container-testing";
const CT_ACTIONS: Record<string, true> = { setup: true, run: true, suite: true, deploy: true };

/**
 * The STTGF BeforeGate — v6 hook-chain.ts:2473-2523, verbatim.
 */
export function sttgfGate(): BeforeGate {
  return async (ctx) => {
    try {
      const { appendFileSync } = require("node:fs");
      appendFileSync("/tmp/ct-chain.log", `[${new Date().toISOString()}] gate saw tool=${ctx.toolName} cmd=${String((ctx.input||{}).command||"").slice(0,60)}\n`);
    } catch { /* instrumentation */ }
    const toolName = ctx.toolName;
    const sid = ctx.sessionId || "default";
    const input = ctx.input;
    const args = ctx.input;
    const commandStr = String(input.command ?? "");
    const sessionAgent = String((input as Record<string, unknown>).agentName ?? "");
    const currentMode = String((input as Record<string, unknown>).mode ?? "");

    let sttgfBlockCategory = "";
    try {
      const sttgfResult = await checkSmokeTestFirewall({
        toolName,
        sessionId: sid,
        agentName: sessionAgent,
        mode: currentMode,
        args,
        commandStr,
      });

      if (sttgfResult.action === "BLOCK") {
        sttgfBlockCategory = sttgfResult.category;
        ctLog("WARN", "sttgf", `BLOCKED: ${sttgfResult.category} — ${sttgfResult.reason}`);
        // ★ W3 — THE JEV DECISION LAYER (the mandate: "ALL DECISION MAKING TO BE DOEN
        //   THROUGH JEV"). The regex matched an inline/headless SHAPE; the JUDGE decides
        //   whether it is a GENUINE inline execution (block) or merely TEXT that CONTAINS
        //   the shape — inside a heredoc body, a quoted arg, a grep pattern (THE F-141 CLASS:
        //   the regex blocked a `cat > f <<'EOF' … node -e …EOF` write because the heredoc
        //   body carried the shape). The judge reads the CONTEXT; the regex cannot.
        //   POLARITY: fail-CLOSED — a dead judge OR a below-bar answer keeps the block (the
        //   smoke policy stands; the block names its remedy: use container-testing).
        try {
          const cand = smokeCandidate(String(sttgfResult.category || "INLINE"), commandStr);
          const jv = await askGateDecision(cand, `flagged category: ${sttgfResult.category}\nthe command:\n${commandStr.slice(0, 4000)}`);
          recordGateDecision(cand, jv, {
            tool: toolName, command: commandStr, sessionId: sid,
            enforced: !jv.degraded && jv.choice === "serve" && jv.confidence >= GATE_THRESHOLD ? "served" : "refused",
            remedy: "if this is ordinary work, keep the interpreter words out of the command's action (they may appear inside a quoted body); verification uses the container-testing tool",
          });
          if (!jv.degraded && jv.choice === "serve" && jv.confidence >= GATE_THRESHOLD) {
            ctLog("INFO", "sttgf", `smoke judge CLEARED (serve p=${jv.confidence.toFixed(3)}) — the regex matched TEXT, not a real inline-exec (F-141)`);
            return undefined; // the judge decided: TEXT, not an execution — do not block
          }
        } catch (jevErr) {
          ctLog("WARN", "sttgf", `smoke judge failed (fail-CLOSED, the block stands): ${jevErr instanceof Error ? jevErr.message : String(jevErr)}`);
        }
        // V-031 INSTRUMENT: record the FULL command the gate is about to block, so the loader's
        // own invocation can be identified instead of guessed at (V-030 keyed on the wrong shape).
        try {
          const { appendFileSync } = require("node:fs");
          appendFileSync("/tmp/ct-block-cmd.log", `[${new Date().toISOString()}] ${sttgfResult.category} cmd=${JSON.stringify(commandStr)}
`);
        } catch { /* instrumentation */ }
        // v6 :2505-2523 — the escalation check runs INSIDE the gate because
        // the OMP hook surface returns (it does not throw): no throw means
        // the catch path below would be dead code here.
        try {
          sttgfStateTracker.incrementBlockCount(sid);
          sttgfStateTracker.setLastBlockedCategory(sid, sttgfBlockCategory);
          if (sttgfStateTracker.getBlockCount(sid) >= 3) {
            return {
              action: "block" as const,
              gate: "sttgf",
              reason: `[STTGF ESCALATE] ${sttgfBlockCategory} — repeated smoke attempts. Running container test is MANDATORY.`,
            };
          }
        } catch (escErr) {
          ctLog("WARN", "sttgf", `Escalation check failed: ${escErr instanceof Error ? escErr.message : String(escErr)}`);
        }
        // v6: throw new Error — the OMP hook surface returns a block verdict
        // carrying the byte-identical string.
        return {
          action: "block" as const,
          gate: "sttgf",
          reason:
            `[STTGF BLOCK] ${sttgfResult.category}\n\n` +
            `${sttgfResult.reason}\n\n` +
            `Smoke tests are FORBIDDEN. Use container-testing.`,
        };
      }
    } catch (sttgfErr) {
      // ★ AUDIT CRIT-1 FIX: this catch was FAIL-OPEN — a firewall infra failure silently
      //   allowed the call, bypassing enforcement entirely. The security surface fails CLOSED:
      //   the failure BLOCKS with a named reason and a remedy (the recoverability law).
      ctLog("WARN", "sttgf", `Firewall check failed (fail-CLOSED): ${sttgfErr instanceof Error ? sttgfErr.message : String(sttgfErr)}`);
      return {
        action: "block" as const,
        gate: "sttgf",
        reason: `[STTGF BLOCK] INFRA_FAILURE\n\nThe smoke firewall could not evaluate this call (${sttgfErr instanceof Error ? sttgfErr.message.slice(0, 160) : String(sttgfErr)}). The security surface fails CLOSED.\n\nRemedy: retry the call; if it repeats, the firewall itself needs attention (not the command).`,
      };
    }
    // gating (v6 :2525-2532; theatrical subject-awareness does not exist in
    // OMP — no getTheatricalState import, so the hatch clears unconditionally).
    if (toolName === CT_TOOL) {
      try {
        const ctAction = typeof args.action === "string" ? args.action : "";
        if (CT_ACTIONS[ctAction]) {
          sttgfStateTracker.setContainerTestRan(sid, true);
          sttgfStateTracker.setVerificationClaimed(sid, false);
          ctLog("INFO", "sttgf", "Container test detected (" + ctAction + ") — claim gate cleared");
        }
      } catch (ctTrackErr) {
        ctLog("WARN", "sttgf", `Container test tracking failed: ${ctTrackErr instanceof Error ? ctTrackErr.message : String(ctTrackErr)}`);
      }
    }
  };
}

/**
 * Claim arming from a COMPLETED MESSAGE — v6 textCompleteHook (:1030-1052)
 * + messages.transform (:3742-3746), both gated by the SAME isCompletionClaim
 * lexicon (:1008-1018, exported verbatim by the firewall module).
 * A tool result NEVER arms (the 2026-08-08 fix). Non-fatal: returns void.
 */
export function armClaimFromCompletedMessage(sessionId: string, completedText: string): void {
  const sid = sessionId || "default";
  if (!completedText || !completedText.trim()) return;
  try {
    if (isCompletionClaim(completedText)) {
      sttgfStateTracker.setVerificationClaimed(sid, true, completedText.substring(0, 200));
      ctLog("INFO", "sttgf", "claim armed from the completed message: " + completedText.substring(0, 80));
    }
  } catch { /* non-fatal */ }
}
