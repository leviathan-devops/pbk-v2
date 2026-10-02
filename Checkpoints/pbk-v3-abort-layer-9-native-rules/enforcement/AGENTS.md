# AGENTS.md — THE TERRAIN

**What this file is:** the MAP. Where things live, what owns what, which artifact is the
ground truth. It names PATHS and CONTRACTS.

**What this file is NOT:** a law. No enforcement mechanism lives here. The laws are
`APPEND_SYSTEM.md` (the doctrine) and `RULES.md` (the invariants); the mid-stream abort lives
in `rules/` (TTSR); the runtime gates live in `extensions/`. This file tells a fresh session
where to look — it does not tell it what to do.

---

## 1 · THE OMP HOME (`~/.omp/agent/`)

```
~/.omp/agent/
  SYSTEM.md              the identity (replaces block-0 on every request)
  APPEND_SYSTEM.md       the doctrine — the numbered law sections
  RULES.md               the sticky invariants (numbered, every request)
  AGENTS.md              THIS FILE — the terrain
  config.yml             the runtime config (ttsr.*, terminal.*, providers, extensions)
  mcp.json               the MCP servers (context7, jev-manager, obscura, plutus-au,
                         semantica, serena)
  rules/                 THE TTSR RULES — the abort carrier. `omp ttsr list` reads THIS.
  extensions/            the runtime gates (hot-loaded; see §3)
  agents/                the subagent bodies (reviewer, scout, security-reviewer, sonic, task)
  skills/                the user-authored skills (read-only for managed writers)
  managed-skills/        the agent-authored skills (the ONLY writable skill dir)
  sessions/              the session transcripts + per-session `local/` dirs
  memories/              the memory banks
```

**The load order on a session start:** `SYSTEM.md` → `APPEND_SYSTEM.md` → `RULES.md` →
`AGENTS.md` → the skills catalog → the MCP tool surface. The first four are the identity;
the rest is capability.

**Why the order matters:** a doctrine line that contradicts a skill's instruction is resolved
by the doctrine — the identity layer sits above the capability layer in the prompt.

---

## 2 · THE ENFORCEMENT SURFACES (which artifact carries which job)

```
SURFACE              CARRIER                              WHEN IT FIRES
-------------------  -----------------------------------  --------------------------------
the doctrine         APPEND_SYSTEM.md                     every request (in the prompt)
the invariants       RULES.md                             every request (in the prompt)
the abort            rules/*.md  (TTSR)                   mid-stream, on a condition match
the runtime gates    extensions/*  (hot-loaded)           on the hook event
the tool surface     mcp.json + extensions' registerTool  on the call
the subagent bodies  agents/*.md                          on the spawn
```

**The division of labour that matters most:**
- **TTSR owns the PROSE stream.** A rule's `condition:` regex is tested against the stream; a
  match aborts/rewinds. An EXTENSION CANNOT DO THIS — `message_update` carries no result type.
- **An extension owns the TOOL channels.** `tool_call` can `{block: true, reason}`;
  `tool_result` can rewrite `{content, isError}`. An extension cannot cancel a TTSR trigger
  (`ttsr_triggered` is notification-only).
- **Therefore:** a prose failure class belongs in `rules/`; a tool/artifact failure class
  belongs in an extension. Putting one in the other's carrier is the wiring mistake.

---

## 3 · THE EXTENSIONS (`~/.omp/agent/extensions/`)

```
extensions/<name>/index.ts     a SUBDIRECTORY package — only index.ts loads
extensions/<name>.ts           a DIRECT FILE — loads as an extension
extensions/<name>/lib.ts       imported by index.ts; NOT auto-loaded
extensions/<name>/*.test.ts    NEVER auto-loaded from a subdir (only index.ts is taken)
```

**THE DIRECT-FILE TRAP:** a `*.ts` directly inside `extensions/` IS loaded as an extension. A
test file placed there would execute as an extension. That is why every package here is a
SUBDIRECTORY with an `index.ts` entry.

**The live set (measured 2026-09-23):**
```
code-retrieval/            the ripwire/grep/opengrok routing helpers
graph-intelligence/        the GI kernel (index.js) — the typed graph store
lexicon-gate/              THE PBK v3 ADJUDICATOR (index.ts + lib.ts + lib.test.ts)
omp-ct/dist.js             the STAGED bundle — NOTE: .js directly in extensions/ loads
thanatos/                  the parked kernel
jarvis-discord-manager.js  the Discord bridge
jarvis-manager.js          the manager
orca-*.ts                  the Orca seat integrations
```

**Hot-reload:** a file drop-in takes effect on the next turn — but this is a per-host
observation, not a guarantee. The only reliable proof is the extension's own log line.

**The discovery rules (from the loader):** a direct `*.ts`/`*.js` file in `extensions/` loads;
a subdirectory loads its `index.ts` (or `index.js`); a subdirectory with a `package.json`
carrying an `omp`/`pi` manifest field loads the declared paths. There is NO recursion beyond
one level — a nested package needs its own manifest.

---

## 4 · THE TTSR RULES (`~/.omp/agent/rules/`)

```
~/.omp/agent/rules/<slug>.md
```

**The path is load-bearing.** The discovery provider `native` reads `getAgentDir()/rules` —
i.e. `~/.omp/agent/rules`. A rule written anywhere else (an `assets/` dir, `~/.agent/rules`,
`~/.omp/rules`, `~/.config/omp/rules`) is INERT: `omp ttsr list` will not show it.

**The frontmatter the engine reads:** `description`, `condition` (string | string[]),
`astCondition`, `scope`, and the per-rule interrupt key. Extra keys are ACCEPTED by the parser
but do NOT survive into the resolved rule object — a consumer that needs extra data must read
the file from disk.

**The scope tokens:** `text` · `thinking` · `tool:<name>` · `tool:edit(<glob>)`. A rule scoped
to `text, thinking` NEVER sees a tool call — which is why a real `bun build` command cannot
trip a prose rule.

**The compile trap:** only a LEADING `(?i)` / `(?m)` / `(?s)` group is translated to native
RegExp flags. Any other inline flag group throws at compile and the rule is SILENTLY DROPPED.
Verify with `omp ttsr list | grep -c '[native]'` after every write.

**The registration check:** `omp ttsr list | head -1` → `TTSR rules (N)`;
`omp ttsr list | grep -c '\[native\]'` → the count of rules THIS host contributed.

**The binding moment:** TTSR binds at SESSION CONSTRUCTION. A rule written mid-session is not
armed until the session restarts. A write without a restart is a file, not enforcement.

**The lexicon companion:** a rule MAY also carry a `lexicon:` block (the scored PatternFamily:
`descriptive` / `suggestive` / `substitute` / `use`) and a `band:`. The engine ignores those
keys; the `lexicon-gate` extension reads them from disk.

---

## 5 · THE GRAPH STORE

```
extensions/graph-intelligence/index.js     the deployed kernel
the store: project-root-relative, registry-discovered (NOT under ~/.omp)
```

The GI store is per-project. A query that returns zero rows may be reading the wrong tree —
assert the store's scope and build time before believing an empty answer. A missing store is a
NAMED refusal, never an empty result.

**The symbols to grep when checking a deploy:** `registerGraphGate` · `GI_NO_STORE` ·
`hasStore` · `runKernelV2` · `fire-ledger` · `policy-store`.

---

## 6 · THE RUNTIME STATE (`~/.omp/run/`)

```
~/.omp/run/daemons/              the supervised processes
~/.omp/run/lexicon-ledger.jsonl  THE PBK LEDGER — one row per lexicon decision
~/.omp/run/jarvis-*              the seat handles
```

**The ledger row shape:**
```json
{"Pattern":"<rule-id>","State":{"confidence":0.667,"source_kind":"own_utterance"},
 "Evidence":{"span":"<the matched text>","jev":null}}
```
`source_kind` ∈ `own_utterance | quotation | table | doc | rule_source`. Only `own_utterance`
is actionable; the other four are recorded and never acted on.

**Reading the ledger:** `wc -l ~/.omp/run/lexicon-ledger.jsonl` is the decision count;
`grep -c '"source_kind":"own_utterance"'` is the actionable subset; a `"jev":null` on a `gray`
band row means the judge was skipped (name the reason).

---

## 7 · THE PROJECT TREES

```
~/JARVIS_WORKSPACE/OMP/pbk-v2/                     THE PBK SOURCE
  src/middleware/*.ts                              the 11 regex gates (the candidates)
  src/ext/kernel-judge.ts                          the L1 judge
  context_management/                              the canon docs
  .trident/wave-audit/                             the per-wave verdicts

~/JARVIS_WORKSPACE/OMP/OMP_ENFORCEMENT_KNOWLEDGE/  THE REFERENCE PACKAGE
  reports/57_FAILURE_PATTERNS_ENFORCEMENT_STACK.md THE 57 patterns + the 9 rule bodies
  reports/PBK_V3_MASTER_BLUEPRINT.md               the design authority
  PBK_V3_DPL1_SPEC.md                              the build contract
  PBK_V3_WAVE_PLAN.md                              the wave order

~/JARVIS_WORKSPACE/Shared_Workspace/TTSR-Lexicons-Master-Blueprint.md
                                                   the lexicon architecture + the Jev wire
```

**The corpus section map** (`57_FAILURE_PATTERNS_ENFORCEMENT_STACK.md`):
§0 the measured status · §1 the lineage inventory · §2 the 57-pattern map ·
§3.1-§3.9 the nine rule bodies · §4 the anti-false-positive engineering + the negative set ·
§5 the deploy plan · §6 the honest gaps · §8 the live recurrence.

---

## 8 · THE VERIFICATION COMMANDS

```
omp ttsr list                       the rule registry (head -1 = the count)
omp ttsr test "<snippet>" --source text -r <rule.md>   one rule, one snippet
omp config get ttsr.contextMode     keep | discard
ls -A ~/.omp/agent/rules | wc -l    the rule file count
bun test ~/.omp/agent/extensions/lexicon-gate/          the extension suite
```

**The pattern for a new rule:** write it → `omp ttsr list | grep -c '[native]'` → run the
positive/negative matrix → restart → observe a real firing. A rule that has not been observed
firing is an untested rule.

**The pattern for a new extension:** write the subdirectory → `bun build <dir>/index.ts` →
restart → read the extension's own log line. A silent extension is an unloaded extension.

---

## 9 · THE TERRAIN RULES (how to read this map)

- **A path in this file is a claim about where a thing lives. Verify it before acting on it.**
  The host moves; this file is a snapshot.
- **When two carriers could hold a job, ask which one can actually observe the failure.**
  Prose failures → `rules/`. Tool/artifact failures → an extension.
- **An artifact that exists but has no consumer is UNCONSUMED.** Existence is not wiring.
- **The deployed thing is the truth.** A source tree, a checkpoint name, and a spec section are
  all claims about the deployed thing; the deployed thing is the evidence.
- **A rule count is not a rule's teeth.** The count says the file loaded; only a firing says
  the regex bites.
