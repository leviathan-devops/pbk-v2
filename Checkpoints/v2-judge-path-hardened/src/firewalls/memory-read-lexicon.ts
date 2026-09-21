// src/firewalls/memory-read-lexicon.ts — THE MEMORY-READ LEXICON
// (2026-08-15 — THE RAM-BOMB PREVENTION, rebuilt per the
// Lexicon_Grade_Intelligent_Systems_Engineering_Bible.md + the Poseidon
// intent-gate standard. The operator: "why did you engineer some dumb
// garbage... this needs a proper intent savvy lexicon per the bible like the
// poseidon intent gate does and doesnt start misfiring constantly").
//
// THE CANONICAL SHAPE (the bible §1.2 — the PatternFamily): the typed
// members (id, kind, matcher, triggerCondition, severity, messageTemplate,
// remediationHook) where the matcher is a mechanical DETECTOR ONLY and the
// DECISION lives in a STATE MACHINE driven by the classified intent. The
// Poseidon model: the frames (GOD_LOOP/PERMISSIONS) run in PRIORITY ORDER +
// the continuation context decides the class — never a single regex tower.
// THE REGEX-AS-DETECTOR RATIONALE (the ISE law + the bible §1.3's named
// exception — "the REGEX is the lexicon's DETECTOR mechanism"): the matchers
// here are the DETECTION layer ONLY — they flag the candidate commands; the
// DECISION (BLOCK vs ALLOW) is the state machine's classifyMemoryRead (the
// priority order + the triggerConditions + the safe-context exclusions). A
// regex body without the machine would be slop; the machine + the typed
// members + the evidence triads make it the canon's sanctioned form.
//
// THE INTENT CLASSES:
//   RAM_BOMB      — an inline interpreter read on an UNSIZED file (the
//                   measured incident: .readlines() on 7.9GB → 14.6GB RSS).
//   OUTPUT_BOMB   — a recursive grep on a BUILT ARTIFACT (a minified bundle):
//                   grep -rn on a single-line minified file outputs the ENTIRE
//                   line per match → tens of GB of stream (the 2026-08-15 live
//                   incident: the dispatched subagent ran `grep -rn "export"`
//                   on the 16MB dist → the RAM blow).
//   BUNDLE_EXEC   — executing a BUILT ARTIFACT (bun/node on a dist/bundle):
//                   running the plugin bundle initializes the whole plugin on
//                   the host (437 modules, sqlite, the aether brain) — never
//                   sanctioned in a dispatch prompt.
//   SIZED_READ    — the read has a prior stat/size check on the same file.
//   LAZY_ITERATE  — `for line in open()` — the ONLY safe in-memory read.
//   STREAM_TOOLS  — grep/tail/sed/awk/rg — constant-memory by construction
//                   (the BOUNDED forms: grep -c/-o/-l, wc -l, head/tail caps).
//   NON_READ      — no inline interpreter file read at all.
//
// THE DECISION (the state machine): RAM_BOMB / OUTPUT_BOMB / BUNDLE_EXEC →
// BLOCK. SIZED_READ / LAZY_ITERATE / STREAM_TOOLS / NON_READ → ALLOW. The
// remediation hook names the WARHEAD 21 rules + the bounded rewrite.

// ── THE LEXICON — the typed frames (the detection layer) ────────────────
interface MemoryReadPattern {
  id: string;                                        // the vocabulary word
  kind: string;                                      // the evidence class
  matcher: (cmd: string) => boolean;                 // the mechanical DETECTOR
  triggerCondition: (cmd: string) => boolean;        // the contextual gate
  severity: 'INFO' | 'HIGH' | 'CRITICAL';
  messageTemplate: string;
  remediationHook: string;
}

// THE INTERPRETER FRAME — an inline python/node/bun execution:
const INTERPRETER_RE = /(?:python3?|node|bun)\s+(?:-c|-e|--eval|--command)/i;
// THE MATERIALIZING-READ FRAMES — the RAM-bomb family (.readlines()/.read()/
// .readall()/readFileSync() materialize the WHOLE file into memory):
const MATERIALIZE_RE = /\.readlines\s*\(|\.readall\s*\(|\.read\s*\(|\.readfilesync\s*\(/i;
// THE UNGUARDED-OPEN FRAME — open(path) with no iteration guard. THE FUNCTION-CALL
// FORM ONLY (2026-08-15 — the sqlite3 false-positive fix): the old bare-word
// alternative matched ANY "open" preceded by a non-alpha — including the
// "opencode" component of a path (e.g. sqlite3.connect('/.../opencode/opencode.db')
// → "/opencode" → the "open" matched → a DB-handle connect (NOT a RAM bomb)
// blocked as a false positive). The frame now requires the open( function-call
// with a quoted path — the actual materializing-open shape.
const UNGUARDED_OPEN_RE = /(?:^|[^a-z])open\s*\([^)]*['"][^'"]+['"]/i;
// THE OUTPUT-BOMB FRAMES — a RECURSIVE grep (-r/-R, with or without -n) on a
// BUILT ARTIFACT. On a minified single-file bundle the matched "lines" are the
// ENTIRE 16MB line — each match re-emits the whole file's content. The
// matcher DETECTS the recursive-grep + the built-artifact path; the
// triggerCondition EXCLUDES the bounded-output forms (grep -c/-o/-l, wc -l,
// head/tail caps) — a bounded grep is constant-memory and sanctioned.
const RECURSIVE_GREP_RE = /\bgrep\s+-(?:[a-zA-Z]*r[a-zA-Z]*n?|[a-zA-Z]*n[a-zA-Z]*r)[a-zA-Z]*\s+/i;
const BUILT_ARTIFACT_RE = /(?:dist|bundle|build|out|target)[/\\][\w./-]*\.(?:js|mjs|cjs|map)\b|\.(?:bundle|min)\.js\b/i;
const BOUNDED_GREP_RE = /\bgrep\s+-(?:[a-zA-Z]*c[a-zA-Z]*|[a-zA-Z]*o[a-zA-Z]*|[a-zA-Z]*l[a-zA-Z]*)|\bwc\s+-l\b|\bhead\s+-\d+|\btail\s+-\d+/i;
// THE BUNDLE-EXECUTION FRAME — running a BUILT ARTIFACT (the plugin bundle):
// `bun dist/index.js` initializes the WHOLE plugin on the host. The safe
// forms (bun test/build/x/install, node -e/--check/--version) are excluded.
const BUNDLE_EXEC_RE = /\b(?:bun|node)\s+(?!test\b|build\b|x\b|install\b|run\s|--?[a-z])(?:[^;|&"']*\/)?(?:dist|bundle|build)[^;|&"']*\.(?:js|mjs|cjs)\b/i;
const BUNDLE_SAFE_RE = /\bbun\s+(?:test|build|x|install|run)\b|\bnode\s+(?:-e|-c|--eval|--check|--version|-v)\b/i;
// THE SAFE-PATTERN FRAMES (never blocked — the WARHEAD 21's sanctioned reads):
const LAZY_ITERATE_RE = /for\s+\w+\s+in\s+open\s*\(/i;
const SIZE_CHECK_RE = /\bstat\b|\bgetsize\b|os\.path\.getsize|\.size\b|wc\s+-c|ls\s+-l/i;
const STREAM_TOOL_RE = /(?:\bgrep\b|\btail\b|\bsed\b|\bawk\b|\brg\b|\bhead\b|\bsort\b|\buniq\b)/i;
// THE STRUCTURED-DOCUMENT READ FRAME (2026-08-24 — the operator's "basic
// logic" fix): `json.load(open(f))` / `json.loads(open(f).read())` /
// `yaml.safe_load` / `toml.load` parse ONE structured document — a config,
// spec, plan, or manifest — bounded by the document, small by construction.
// This is NOT the RAM-bomb class: the measured incident was `.readlines()` /
// `.read()` of a possibly-giant *raw* file (a 7.9GB log → 14.6GB RSS). A
// structured parse is a deliberate, size-appropriate read — requiring a
// `stat` before it is pointless ceremony on a file that is self-evidently a
// config/spec. The struct read is now a SANCTIONED class; the raw materializer
// (readlines/read) stays hard-blocked. */
const STRUCTURED_READ_RE = /(?:json\.load|json\.loads|yaml\.safe_load|toml\.load|pickle\.load)\s*\(/i;

// THE CONTINUATION-CONTEXT — the file is KNOWN sized if the SAME command
// carries a size check BEFORE the read (the ordered chain: stat → then read).
// The triggerCondition tests the presence of the safe-context frames.

const MEMORY_READ_PATTERNS: MemoryReadPattern[] = [
  {
    id: 'RAM_BOMB_READLINES',
    kind: 'memory-evidence',
    matcher: (cmd) => INTERPRETER_RE.test(cmd) && MATERIALIZE_RE.test(cmd),
    triggerCondition: (cmd) => !LAZY_ITERATE_RE.test(cmd) && !SIZE_CHECK_RE.test(cmd),
    severity: 'CRITICAL',
    messageTemplate: 'inline read on an UNSIZED file (the RAM-bomb risk)',
    remediationHook: 'SIZE FIRST: `stat -c %s <path>`; if >100MB use grep/tail/awk (streaming); python: `for line in open()` only.',
  },
  {
    id: 'RAM_BOMB_UNGUARDED_OPEN',
    kind: 'memory-evidence',
    matcher: (cmd) => INTERPRETER_RE.test(cmd) && UNGUARDED_OPEN_RE.test(cmd) && !LAZY_ITERATE_RE.test(cmd),
    triggerCondition: (cmd) => !SIZE_CHECK_RE.test(cmd) && !STRUCTURED_READ_RE.test(cmd),
    severity: 'CRITICAL',
    messageTemplate: 'inline open() on an UNSIZED file (the RAM-bomb risk)',
    remediationHook: 'SIZE FIRST: `stat -c %s <path>`; if >100MB use grep/tail/awk (streaming); python: `for line in open()` only.',
  },
  {
    id: 'OUTPUT_BOMB_RECURSIVE_GREP',
    kind: 'memory-evidence',
    matcher: (cmd) => RECURSIVE_GREP_RE.test(cmd) && BUILT_ARTIFACT_RE.test(cmd),
    triggerCondition: (cmd) => !BOUNDED_GREP_RE.test(cmd),
    severity: 'CRITICAL',
    messageTemplate: 'a RECURSIVE grep on a BUILT ARTIFACT (the output bomb — the minified single-line bundle re-emits the whole line per match, tens of GB of stream)',
    remediationHook: 'BOUND THE OUTPUT: `grep -c <pat> <file>` (the count), `grep -o <pat> <file> | wc -l`, `grep -l <pat> <dir>`, or `head`/`tail`-capped output — never the raw recursive grep on a bundle.',
  },
  {
    id: 'BUNDLE_EXEC_RUN_ARTIFACT',
    kind: 'memory-evidence',
    matcher: (cmd) => BUNDLE_EXEC_RE.test(cmd),
    triggerCondition: (cmd) => !BUNDLE_SAFE_RE.test(cmd),
    severity: 'CRITICAL',
    messageTemplate: 'executing a BUILT ARTIFACT (bun/node on a dist/bundle) — the plugin bundle initialization on the host (437 modules, sqlite, the aether brain)',
    remediationHook: 'NEVER execute the artifact. READ it instead (the sized read or the streaming tools) — the runtime behavior is verified IN THE CONTAINER, never by running the bundle on the host.',
  },
];

// ── THE STATE MACHINE — the intent classification (the DECISION layer) ──
// The machine runs the patterns in PRIORITY ORDER (the bomb classes first),
// tests each pattern's triggerCondition (the contextual gate — the safe
// frames EXCLUDE the trigger), and selects the action. The evidence triad:
// { Pattern: the matched id, State: the decision, Evidence: the command }.
export type MemoryReadIntent =
  | 'RAM_BOMB'
  | 'OUTPUT_BOMB'
  | 'BUNDLE_EXEC'
  | 'SIZED_READ'
  | 'LAZY_ITERATE'
  | 'STREAM_TOOLS'
  | 'NON_READ';

export interface MemoryReadDecision {
  intent: MemoryReadIntent;
  pattern?: string;
  action: 'BLOCK' | 'ALLOW';
  message: string;
}

export function classifyMemoryRead(command: string): MemoryReadDecision {
  if (!command || typeof command !== 'string') {
    return { intent: 'NON_READ', action: 'ALLOW', message: 'no command' };
  }
  // THE PRIORITY FRAMES — the bomb classes first (the bible's priority
  // order — the explicit bomb frames win over the safe-context reads):
  for (const p of MEMORY_READ_PATTERNS) {
    if (p.matcher(command) && p.triggerCondition(command)) {
      return {
        intent: p.id === 'OUTPUT_BOMB_RECURSIVE_GREP' ? 'OUTPUT_BOMB' : p.id === 'BUNDLE_EXEC_RUN_ARTIFACT' ? 'BUNDLE_EXEC' : 'RAM_BOMB',
        pattern: p.id,
        action: 'BLOCK',
        message: '[MEMORY GATE] ' + p.messageTemplate + '. ' + p.remediationHook,
      };
    }
  }
  // THE SAFE-CONTEXT CLASSES (the triggerCondition excluded them from the
  // bomb frames — now they classify as the sanctioned reads):
  if (STRUCTURED_READ_RE.test(command)) {
    return { intent: 'SIZED_READ', action: 'ALLOW', message: 'a structured-document read (json/yaml/toml — a config/spec/manifest parse, bounded by the document)' };
  }
  if (LAZY_ITERATE_RE.test(command)) {
    return { intent: 'LAZY_ITERATE', action: 'ALLOW', message: 'the lazy iteration — one line at a time (the WARHEAD 21 safe read)' };
  }
  if (SIZE_CHECK_RE.test(command)) {
    return { intent: 'SIZED_READ', action: 'ALLOW', message: 'the file was sized first (the WARHEAD 21 pre-flight)' };
  }
  if (STREAM_TOOL_RE.test(command)) {
    return { intent: 'STREAM_TOOLS', action: 'ALLOW', message: 'the streaming tools — constant-memory by construction' };
  }
  return { intent: 'NON_READ', action: 'ALLOW', message: 'no inline interpreter file read' };
}

// ── THE DISPATCH SCREEN (2026-08-15 — the operator: "what do we need to
// enhance so that subagents are not dispatched w/ ram bombs" — the live
// incident: the wave-generated prompt carried `grep -rn "export"` on the
// 16MB dist → the subagent's run blew the host RAM). The SAME lexicon now
// screens the DISPATCH PROMPT before it ships: a prompt whose verification
// commands carry the bomb classes (the recursive grep on a built artifact /
// the bundle execution) is BLOCKED with the named command + the bounded
// rewrite. The matchers DETECT across the prompt's text; the machine DECIDES
// (the same classifyMemoryRead — the single source of truth). ──
export function classifyDispatchMemoryRisk(prompt: string): MemoryReadDecision {
  if (!prompt || typeof prompt !== 'string') {
    return { intent: 'NON_READ', action: 'ALLOW', message: 'no prompt' };
  }
  // THE LINE SCAN — the machine over each command-like line: the bomb class
  // found in ANY line blocks the dispatch. The message names the offending
  // command (the evidence) + the remediation (the rewrite).
  var lines = prompt.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.length < 8) continue;
    var d = classifyMemoryRead(line);
    if (d.action === 'BLOCK') {
      return {
        intent: d.intent,
        pattern: d.pattern,
        action: 'BLOCK',
        message: '[DISPATCH MEMORY SCREEN] line ' + (i + 1) + ': ' + line.substring(0, 160) + '... — ' + d.message,
      };
    }
  }
  return { intent: 'NON_READ', action: 'ALLOW', message: 'the dispatch prompt carries no memory-bomb command' };
}

// ── THE MEMORY-BOMB REPAIR MACHINE (2026-08-16 — the W4 fix, the M23 2a
// design: the screen's BLOCK becomes a REPAIR — "the wave's OWN payload is
// cleaned, never rejected" (the operator). The SAME classifyMemoryRead state
// machine detects the bomb lines; the repair rewrites each BLOCKed line to its
// bounded form (the EXACT rewrites the remediationHook fields already name),
// DIRECTLY IN THE PROMPT, and returns the mutated string + the changed lines.
// THE SELF-CONSISTENCY RULE (the one-pass guarantee): each rewritten line MUST
// re-classify as ALLOW (SIZED_READ via wc -l / STREAM_TOOLS via grep -c /
// NON_READ via node --check) — a repaired prompt never re-trips the screen,
// never a repair loop. The matchers + the state machine stay byte-identical —
// ONLY the rejection path becomes a rewrite path. ──
export interface MemoryBombRepair {
  prompt: string;      // the mutated prompt (the bounded rewrites applied)
  changed: string[];   // the changed lines surfaced for the report
}

// THE QUOTED-ARG EXTRACTOR — the first quoted token that looks like a file
// path (contains a '/' or a file extension). Returns '' when nothing fits.
function extractQuotedPath(cmd: string): string {
  var quoted = cmd.match(/(['"])([^'"]+)\1/g) || [];
  for (var i = 0; i < quoted.length; i++) {
    var token = quoted[i].substring(1, quoted[i].length - 1);
    if (token.indexOf('/') !== -1 || /\.\w+$/.test(token)) return token;
  }
  return '';
}

export function repairMemoryBomb(prompt: string): MemoryBombRepair {
  if (!prompt || typeof prompt !== 'string') {
    return { prompt: prompt || '', changed: [] };
  }
  var lines = prompt.split('\n');
  var changed: string[] = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.length < 8) continue;
    var d = classifyMemoryRead(line);
    if (d.action !== 'BLOCK') continue;   // the ALLOWed lines pass byte-identical
    var repaired = '';
    if (d.pattern === 'OUTPUT_BOMB_RECURSIVE_GREP') {
      // THE BOUNDED GREP (the remediationHook): strip the recursive -r/-n
      // flags (and every flag group after grep) → the -c count. Constant
      // memory by construction — BOUNDED_GREP_RE satisfies the trigger.
      repaired = line.replace(/\bgrep\b(?:\s+-[a-zA-Z]+|\s+--[a-zA-Z-]+)+/, 'grep -c');
    } else if (d.pattern === 'BUNDLE_EXEC_RUN_ARTIFACT') {
      // NEVER execute the artifact (the remediationHook): the syntax-only
      // check reads the file WITHOUT initializing the plugin — BUNDLE_SAFE_RE
      // (`node --check`) excludes the trigger.
      var artifactMatch = line.match(/(?:dist|bundle|build)[^;|&"']*\.(?:js|mjs|cjs)\b/i);
      var artifactPath = artifactMatch ? artifactMatch[0] : extractQuotedPath(line);
      repaired = artifactPath ? 'node --check ' + artifactPath : '# (the bundle execution was removed by the memory-bomb repair)';
    } else {
      // THE BOMB CLASSES RAM_BOMB_READLINES / RAM_BOMB_UNGUARDED_OPEN (the
      // remediationHook): SIZE FIRST — the bounded `wc -l` size read (the
      // streaming counter, constant memory — SIZE_CHECK_RE classifies ALLOW).
      var path = extractQuotedPath(line);
      repaired = path ? 'wc -l ' + path : '# (the unsized file read was removed by the memory-bomb repair)';
    }
    if (repaired.length > 0 && repaired !== line) {
      lines[i] = repaired;
      changed.push('line ' + (i + 1) + ': ' + line.substring(0, 80) + ' → ' + repaired.substring(0, 80));
    }
  }
  return { prompt: lines.join('\n'), changed: changed };
}
