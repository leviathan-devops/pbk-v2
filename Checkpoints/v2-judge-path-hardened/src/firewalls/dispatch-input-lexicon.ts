// src/firewalls/dispatch-input-lexicon.ts — THE T.E.B. INPUT CLASSIFIER
// (2026-08-15 — the #25 Part-1 implementation, the operator's exact spec:
// "there should be an intelligent lexcion filter for this that detects
// filepaths based on workspace root in the first 3 branches of the string
// and whether the input is 1 long string token or a bunhc of tokens (prompt)
// and reject the prompt").
//
// THE CANONICAL SHAPE (the bible §1.2 — the PatternFamily): the matchers
// DETECT the shape (the workspace-root anchor + the token-count shape); the
// classifier DECIDES the class (PATH / PROMPT / MIXED). The regex is the
// mechanical DETECTOR ONLY (the ISE law's named exception — the shape IS
// mechanical: a path is a single slash-delimited token anchored in the
// workspace root; a prompt is a bunch of whitespace tokens). THE DECISION
// lives in the classifier, never the regex.
//
// THE INTENT CLASSES:
//   PATH    — the input is ONE LONG STRING TOKEN (a single slash-delimited
//             token — no internal whitespace) anchored in the workspace root
//             (the first 3 branches: /<root>/<user>/OPENCODE_WORKSPACE/).
//             This is the promptFile path — the ONLY sanctioned dispatch input.
//   MIXED   — the input contains the workspace-root-anchored path + trailing
//             prose (the path PLUS the prompt text) — the derailment fuel —
//             BLOCK (pass the path ONLY).
//   PROMPT  — the input is a bunch of tokens with NO workspace-root-anchored
//             path (a written prompt or a non-workspace path) — BLOCK with
//             the PATH remedy bullet.
//
// THE DECISION (the classifier): PATH → ALLOW (the T.E.B. loader injects the
// file byte-exact). MIXED / PROMPT → BLOCK with the simple remedy bullet:
// "pass the ACTUAL PATH of the prompt file — input is a filepath and
// nothing else. Do NOT write the prompt text."

// ── THE DETECTORS (the mechanical frames) ───────────────────────────────
// THE WORKSPACE-ROOT ANCHOR — the path's first branches:
//   the host shape: /home/<user>/OPENCODE_WORKSPACE/ (the first 3 branches)
//   the container shape: /root/OPENCODE_WORKSPACE/ (root + the workspace — no
//     user segment) — both are the ct-tmp's parent.
const WORKSPACE_ROOT_RE = /^\/(?:home\/[^/\s]+\/OPENCODE_WORKSPACE|root\/OPENCODE_WORKSPACE)\//i;
// THE TOKEN-SHAPE — the whitespace-separated token count (a path = 1 long
// slash-delimited token; a prompt = many whitespace tokens):
const TOKEN_SPLIT_RE = /\s+/;

// ── THE CLASSIFIER (the DECISION layer) ────────────────────────────────
export type DispatchInputClass = 'PATH' | 'PROMPT' | 'MIXED';

export interface DispatchInputDecision {
  cls: DispatchInputClass;
  action: 'ALLOW' | 'BLOCK';
  message: string;
}

export function classifyDispatchInput(input: string): DispatchInputDecision {
  const trimmed = (typeof input === 'string' ? input : '').trim();
  if (!trimmed) {
    return { cls: 'PROMPT', action: 'BLOCK', message: 'empty dispatch input' };
  }
  const tokens = trimmed.split(TOKEN_SPLIT_RE).filter((t) => t.length > 0);
  const isRootAnchored = WORKSPACE_ROOT_RE.test(trimmed);
  const isSingleToken = tokens.length === 1;
  if (isRootAnchored && isSingleToken) {
    return { cls: 'PATH', action: 'ALLOW', message: 'the promptFile path — the loader injects the file byte-exact' };
  }
  if (isRootAnchored) {
    return {
      cls: 'MIXED',
      action: 'BLOCK',
      message: 'the workspace path PLUS trailing prose — the input is a FILEPATH and nothing else; pass the path ONLY',
    };
  }
  return {
    cls: 'PROMPT',
    action: 'BLOCK',
    message: 'the written prompt text (a bunch of tokens, not a path) — pass the ACTUAL PATH of the prompt file the wave manager generated; input is a filepath and nothing else. Do NOT write the prompt text.',
  };
}

// THE REMEDY BULLET (the operator's exact words — the universal simple form):
export const PROMPTFILE_REMEDY_BULLET =
  'YOUR INPUT WAS A PROMPT, NOT A PATH. The task input is a FILEPATH and nothing else — pass the ACTUAL PATH of the prompt file the wave manager generated (the promptFile); do NOT write the prompt text. The wave manager already generated the payload; you only pass its path.';
