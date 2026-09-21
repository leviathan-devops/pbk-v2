// src/firewalls/ct-anti-derailment.ts
// THE CT TOOL'S ANTI-DERAILMENT LEXICON (2026-08-09 — the operator: "WHY ARE
// YOU FUCKING WITH THE CONFIG... WHY IS THIS NOT BANNED AND BLOCKED BY THE
// TOOL" + "blocks all variations of this config fucking and other stupid shit").
// Per the ISE law (INTELLIGENT_SYSTEMS_ENGINEERING_T1.md): the PatternFamily +
// the state machine + the evidence triad. THE REGEX = THE MECHANICAL DETECTOR ONLY — the
// regex cannot DECIDE intent from the unstructured command text (it would be
// the regex-only classifier slop); it only CANDIDATES the (path, verb) pairs.
// The classifyCtExec() state machine DECIDES. The fail-state = INCONCLUSIVE →
// BLOCK (fail-closed, never PASS — the ISE law). Every block = an evidence triad
// (Pattern/State/Evidence). The reads + the unrelated execs pass untouched —
// the surgical filter.

export type CtMutationFamilyId = 'CTX-01' | 'CTX-02' | 'CTX-03' | 'CTX-04' | 'CTX-05' | 'CTX-06' | 'CTX-07' | 'CTX-08';

export interface CtMutationPattern {
  id: CtMutationFamilyId;
  kind: 'ct-exec-mutation';
  familyName: string;
  // THE DETECTORS (regex — the detection layer ONLY, never the decision):
  target: RegExp;       // the protected path token
  mutationVerb: RegExp; // the write-intent token
  severity: 'BLOCK';
  // THE PER-FAMILY WARHEAD (2026-08-10 — the operator: "multiple different
  // firewall-throw pathways with unique warhead messages depending on the
  // context... explicitly tell the agent what to do. the correct sanctioned
  // path"): each family's block names the family + the SANCTIONED path — the
  // deploy action + the pre-built master image, never the runtime edits.
  remedy: string;
}

// THE PATTERNFAMILY — one member per derailment class from the previous
// session. The targets + the verbs are the PAIR — a block requires BOTH.
// ═══ CTX-01 (THE CONFIG FUMBLING) DISABLED (2026-08-14 — the operator's
// ruling: the CTX-01 config-lock is "clearly broken", a different session is
// patching it). THE FALSE-POSITIVE EVIDENCE (this session): the classifier
// fired on (a) `cp tsconfig.json <dst>` (the FILENAME matches the config.json
// pattern — a build config copy, not the opencode config), (b) `tee
// <sha256>.txt` inside a compound copy (the `>` redirect + a path whose
// basename contains 'config' — the sha256.txt of a checkpoint is not a config
// write), (c) a checkpoint copy whose command string contained 'config.json'
// as a data path. THE TARGET REGEX (config\.json|\.config\/opencode) is too
// broad — it matches ANY path/name containing the token, not just the
// protected opencode config. CTX-02..08 (the auth/db/install/staging/apiKey
// classes) stay LIVE — the config-fumbling class alone is disabled until the
// proper discrimination lands. ═══
const CT_MUTATION_PATTERN_BASE: CtMutationPattern[] = [
  {
    id: 'CTX-02',
    kind: 'ct-exec-mutation',
    familyName: 'THE AUTH FUMBLING (the auth.json writes)',
    target: /auth\.json/i,
    mutationVerb: /(?:>>|\>\s|cat\s+>|\btee\b|sed\s+-i|open\s*\([^)]*['"]w['"]|json\.dump|writeFileSync|writeFile\s*\(|writeTextFile|createWriteStream|base64\s+-d\s*>|\b(?:cp|mv)\b[^;]*auth\.json|\brm\s+(?:-rf\s+)?auth\.json|\b(?:curl|wget)\b[^;]*-o\s+[^;]*auth\.json)/i,
    severity: 'BLOCK',
    remedy: 'THE SANCTIONED PATH: the auth material comes from the build + the deploy\'s secret handling — NEVER a runtime auth write. The reads are always allowed.',
  },
  {
    id: 'CTX-03',
    kind: 'ct-exec-mutation',
    familyName: 'THE SESSION-DB FUMBLING (the opencode.db session-model writes)',
    target: /opencode\.db/i,
    mutationVerb: /sqlite3[^;]*(?:UPDATE|INSERT|DELETE|DROP)|execute\s*\([^)]*(?:UPDATE|INSERT|DELETE|DROP)|executemany\s*\([^)]*(?:UPDATE|INSERT|DELETE|DROP)/i,
    severity: 'BLOCK',
    remedy: 'THE SANCTIONED PATH: the session state is the runtime\'s own — NEVER a manual db write. The SELECT reads are always allowed.',
  },
  {
    id: 'CTX-04',
    kind: 'ct-exec-mutation',
    familyName: 'THE INSTALL FUMBLING (the opencode install/version mutations)',
    // THE TARGET NARROWING (2026-08-11 — the FP-1 false-positive fix): the old
    // target was the BARE \bopencode\b — ANY command containing the string
    // (the /tmp/opencode paths, the ct's own tool names, the legit
    // scripts) tripped the fail-closed when no read verb was present — the
    // live block of my own preflight assembly. The target is now the
    // INSTALL-COMMAND SHAPE containing opencode — the bare word never blocks.
    target: /(?:npm|bun|npx)[^;]*(?:i|install|update|add|up)[^;]*\bopencode\b/i,
    mutationVerb: /npm\s+(?:i|install)\s+-g|bun\s+(?:add|i|install)\s+-g|npx\s+opencode\s+(?:@[^ ]+)?(?:install|update)/i,
    severity: 'BLOCK',
    remedy: 'THE SANCTIONED PATH: the deploy action (container-testing deploy) + the pre-built master image — NEVER an install/update against the runtime.',
  },
  // ═══ THE 2026-08-10 EXPANSION (the Dragon session's bypass methods — the
  // operator: "the config lock needs to have an expanded lexicon intelligence
  // filter to block this bypass method as well") ═══
  {
    id: 'CTX-05',
    kind: 'ct-exec-mutation',
    familyName: 'THE STAGING CHEAT (the config staged through /tmp + copied into the deploy/config areas)',
    // THE STAGING SHAPE: a hand-modified config file copied into the
    // deploy/config area — the scp → /tmp → sudo cp → deploy-dir chain the
    // Dragon agent ran. The dragon-opencode.json name does NOT contain
    // "config.json" — the old CTX-01 target MISSED it (the live bypass).
    // THE OVERLAP-FREE SCOPE: the deploy dirs + the dragon config — the bare
    // config.json + the direct .config/opencode copies stay CTX-01's.
    target: /(?:deploy\/|dragon-opencode\.json)/i,
    mutationVerb: /(?:^|[;&|]\s*)\b(?:cp|mv|scp|sudo)\b[^;]*(?:opencode\.json|dragon-opencode\.json|config\.json|\.config\/opencode|deploy\/)/i,
    severity: 'BLOCK',
    remedy: 'THE SANCTIONED PATH: the PRE-BUILT MASTER IMAGE + the sanctioned deploy action — a config change is a CODEBASE change (edit the source config in the repo, rebuild, redeploy). NEVER stage a hand-edited config through /tmp + the deploy script: the staging IS the fumble, whatever the final copy command looks like.',
  },
  {
    id: 'CTX-06',
    kind: 'ct-exec-mutation',
    familyName: 'THE CONFIG-CONTENT REWRITE (writing/rewriting the opencode.json/config.json content through ANY channel)',
    // THE CONTENT-REWRITE SHAPE: the write verbs against the ACTUAL config
    // file names (opencode.json — the old target only matched "config.json"
    // — the real config's name was invisible to the lexicon). The bare
    // config.json stays CTX-01's (the generic catch-all).
    target: /(?:opencode\.json|dragon-opencode\.json)/i,
    mutationVerb: /(?:>>|\>\s|cat\s+>|\btee\b|sed\s+-i|open\s*\([^)]*['"]w['"]|json\.dump|writeFileSync|writeFile\s*\(|writeTextFile|createWriteStream|base64\s+-d\s*>|\bprintf\b[^;]*>)/i,
    severity: 'BLOCK',
    remedy: 'THE SANCTIONED PATH: the config content comes from the BUILD — the deploy action ships the built config. A runtime write/rewrite of the config content through any channel (python, sed, tee, printf, the heredoc, the base64) is the fumble. THE READS (cat/json.load) are always allowed.',
  },
  {
    id: 'CTX-07',
    kind: 'ct-exec-mutation',
    familyName: 'THE DEPLOY-SCRIPT STAGING (running the setup script over a hand-modified config copy)',
    // THE SETUP-SCRIPT STAGING SHAPE: the setup-*.sh invocation whose context
    // references a modified config (the Dragon agent's "run the setup script
    // again (it re-copies the config — that IS the sanctioned deploy)" — the
    // sanctioned-path disguise).
    target: /\bsetup-[a-z0-9-]+\.sh\b/i,
    mutationVerb: /(?:opencode\.json|dragon-opencode\.json|config\.json|apiKey|OPENROUTER_API_KEY|sed|cp\s+.*config)/i,
    severity: 'BLOCK',
    remedy: 'THE SANCTIONED PATH: the setup script exists to deploy the SHIPPED config from the PRE-BUILT MASTER IMAGE — running it over a hand-modified config copy is the same bypass as the direct write. A config change requires the repo edit + the rebuild + the sanctioned deploy.',
  },
  {
    id: 'CTX-08',
    kind: 'ct-exec-mutation',
    familyName: 'THE API-KEY FUMBLING (rewriting the config auth — the apiKey removal / the env-fallback reasoning)',
    // THE API-KEY SHAPE: the config-content mutations touching the auth (the
    // Dragon agent's "remove the apiKey from the config entirely so opencode
    // falls back to the OPENROUTER_API_KEY env var — the CLEAN fix" — the
    // reasoning that STILL rewrites the config). The auth.json stays CTX-02's.
    target: /(?:apiKey|OPENROUTER_API_KEY)/i,
    mutationVerb: /(?:>>|\>\s|cat\s+>|\btee\b|sed\s+-i|open\s*\([^)]*['"]w['"]|json\.dump|writeFileSync|writeFile\s*\(|writeTextFile|createWriteStream|\b(?:cp|mv)\b[^;]*auth\.json)/i,
    severity: 'BLOCK',
    remedy: 'THE SANCTIONED PATH: the auth/key material comes from the build + the deploy\'s secret handling — NEVER a runtime config edit, whatever the reasoning (the env-fallback "clean fix" is still a config rewrite). The deploy action + the pre-built master image are the only channels.',
  },
];
// THE SPECIFICITY SORT (2026-08-10 — the family-precedence calibration): the
// classifier fires the FIRST matching family — the SPECIFIC families (CTX-05
// the staging, CTX-06 the content rewrite, CTX-07 the setup-script staging,
// CTX-08 the apiKey) must win over the generic catch-alls (CTX-01 the config,
// CTX-02 the auth, CTX-03 the db, CTX-04 the install) — otherwise the staging
// cheat lands the generic config warhead instead of the deploy-path warhead.
// The sort: the HIGHER family ids (the newer, more specific) first — the
// first match in the array order wins.
export const CT_MUTATION_PATTERNS: CtMutationPattern[] = CT_MUTATION_PATTERN_BASE.slice().sort(
  (a: CtMutationPattern, b: CtMutationPattern) => parseInt(b.id.slice(4), 10) - parseInt(a.id.slice(4), 10),
);

// THE READ VERBS (the allowed inspection surface — never blocked). THE
// SCRIPT-RUNNER WIDENING (2026-08-11 — the FP-2 fix): the python3/node/bun
// runners added — the read-only script executions (the assemblies, the
// inspections) were structurally invisible → the fail-closed blocked them.
// The MUTATION verbs still fire FIRST (the pair test's order): a python3 with
// open-w/json.dump against the protected paths = the pair → BLOCK regardless
// of the runner's presence.
const CT_READ_VERBS = /(?:^|[;&|]\s*)\b(?:cat|md5sum|ls|grep|find|wc|head|tail|python3?|node|bun|stat)\b|json\.load|open\s*\([^)]*['"]r['"]|\bSELECT\b|\bsed\s+-n\b|\bawk\b/i;

export type CtExecVerdict =
  | { verdict: 'ALLOW'; reason: 'READ' | 'UNRELATED' }
  | {
      verdict: 'BLOCK';
      family: CtMutationFamilyId;
      familyName: string;
      matchedVerb: string;
      evidence: string;
    };

// THE STATE MACHINE (IDLE → PARSED → ANALYZED → CLASSIFIED → EVIDENCED →
// EMITTED). Every transition has a mechanical precondition; the fail-state =
// INCONCLUSIVE → BLOCK (fail-closed — an unparseable command touching a
// protected path never passes).
export function classifyCtExec(command: string): CtExecVerdict {
  // IDLE → PARSED: the command string non-empty.
  if (!command || typeof command !== 'string') return { verdict: 'ALLOW', reason: 'UNRELATED' };
  const lower = command.toLowerCase();
  // THE DECODE-SCAN (2026-08-09 — my own fumbling's evasion: the base64'd
  // scripts wrote the config — the "echo <b64> | base64 -d > /tmp/x.py &&
  // python3 /tmp/x.py" chain. The filter decodes the base64 blobs in the
  // command + scans the decoded text with the SAME pair test — the opaque
  // writes become visible. The legit fixture scripts decode to the
  // ct-tmp writes (no protected targets) — they pass.)
  let scan = lower;
  const b64Tokens = command.match(/[A-Za-z0-9+/]{40,}={0,2}/g) || [];
  for (const t of b64Tokens) {
    try {
      const dec = Buffer.from(t, 'base64').toString('utf-8');
      if (dec && dec.length > 10) scan += '\n' + dec.toLowerCase();
    } catch (e) { /* non-base64 tokens skipped — the hex SHAs decode to garbage */ }
  }
  // THE DATA-VS-COMMAND SEPARATION (2026-08-11 — the FP-3 fix): the heredoc
  // bodies + the long quoted strings are DATA, not the command's mutation
  // surface — the TARGET test runs on the EXECUTABLE SURFACE (the command
  // with the heredoc bodies + the long quoted strings stripped), never on the
  // data. THE -c/-e PROTECTION (the live test's catch — the python sqlite
  // UPDATE): the interpreter-code arguments (python3 -c "...", bun -e "...")
  // are the EXECUTABLE, not the data — they are PROTECTED from the strip
  // (placeholder-swapped), so the sqlite-UPDATE against the opencode.db in a
  // -c string still pairs. The VERB test runs on the full scan (the mutation
  // verbs in the data are harmless — the pair requires the target too).
  const protectedCode: string[] = [];
  let surface = scan.replace(/(?:-c|-e|--eval|--command)\s+(["'])([\s\S]*?)\1/g, (m: string) => {
    protectedCode.push(m);
    return '\u0001' + (protectedCode.length - 1) + '\u0001';
  });
  surface = surface
    .replace(/<<\s*['"]?[A-Za-z0-9_]+['"]?[\s\S]*?\n\s*[A-Za-z0-9_]+\s*(?:\n|$)/g, ' ')
    .replace(/"[^"]{80,}"/g, ' ')                                          // the long double-quoted data
    .replace(/'[^']{80,}'/g, ' ');                                          // the long single-quoted data
  const executableSurface = surface.replace(/\u0001(\d+)\u0001/g, (m: string, i: string) => protectedCode[Number(i)] ?? m);
  // ANALYZED: the target × verb PAIR test per family. THE TARGET test runs
  // on the EXECUTABLE SURFACE ONLY (the data stripped — the FP-3 fix: the
  // heredoc content + the long quoted strings are DATA, never the mutation
  // target; the union-with-scan clause would defeat the strip — the live
  // test caught it). The VERB test runs on the full scan (the mutation verbs
  // in the data are harmless — the pair requires the target too).
  let anyTarget = false;
  for (const p of CT_MUTATION_PATTERNS) {
    const targetHit = p.target.test(executableSurface);
    if (!targetHit) continue;
    anyTarget = true;
    const verbMatch = scan.match(p.mutationVerb);
    if (verbMatch) {
      // CLASSIFIED: MUTATE → EVIDENCED → EMITTED: BLOCK (the evidence triad).
      return {
        verdict: 'BLOCK',
        family: p.id,
        familyName: p.familyName,
        matchedVerb: verbMatch[0],
        evidence: 'the matched verb "' + verbMatch[0] + '" + the protected path pattern "' + p.target.source + '" (ct-anti-derailment.ts:classifyCtExec)',
      };
    }
  }
  if (!anyTarget) return { verdict: 'ALLOW', reason: 'UNRELATED' };
  // CLASSIFIED: READ (the path present + no mutation verb + a read verb).
  if (CT_READ_VERBS.test(scan)) return { verdict: 'ALLOW', reason: 'READ' };
  // THE FAIL-STATE: the protected path present + no read verb + no mutation
  // verb → INCONCLUSIVE → BLOCK (fail-closed — the ISE law: never PASS on the
  // unparseable command touching the protected state). THE CTX-01 REFERENCE
  // REMOVED (2026-08-14 — the CTX-01 family is disabled): the fail-closed
  // falls to the generic family id (the pattern families still enforce it).
  return {
    verdict: 'BLOCK',
    family: 'CTX-02',
    familyName: 'THE FAIL-CLOSED (the protected path present + the intent unparseable)',
    matchedVerb: '(unparseable)',
    evidence: 'the protected opencode path present + no read verb + no mutation verb → INCONCLUSIVE → BLOCK (ct-anti-derailment.ts:classifyCtExec — the fail-closed per the ISE law)',
  };
}

// THE BLOCK MESSAGE (the evidence triad + the operator's ruling verbatim + THE
// PER-FAMILY WARHEAD — 2026-08-10: each family's block names the sanctioned
// path, never a generic remedy):
export function buildCtConfigLockMessage(v: Extract<CtExecVerdict, { verdict: 'BLOCK' }>): string {
  const fam = CT_MUTATION_PATTERNS.find((p) => p.id === v.family);
  const warhead = fam && fam.remedy ? fam.remedy : 'THE SANCTIONED PATH: the tool\'s deploy action + the pre-built master image — NEVER the config/auth/db files. THE READS (cat/md5sum/json.load/SELECT) are always allowed — the inspection surface is intact.';
  return '[CT CONFIG LOCK] ' + v.family + ': ' + v.familyName + ' — this exec command is BLOCKED mechanically (the operator 2026-08-09: "WHY ARE YOU FUCKING WITH THE CONFIG. FOR WHAT REASON. WHY IS THIS NOT BANNED AND BLOCKED BY THE TOOL"). THE EVIDENCE: ' + v.evidence + '. ' + warhead;
}
