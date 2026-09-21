# TTSR-MISFIRE-FAILURE-LOG — live kernel defects (append-only, numbered in discovery order)

Campaign: the TTSR behavioral kernels at ~/.agent/rules/ (6 files, 61 lines).
Companion: derailment-data-log.md (the incident corpus). Both live at the project root.
Extraction method: `ttsr_injection` records in the session transcript + `omp ttsr test` probes.
Captured: 2026-09-20 22:19 

---

### TTSR-BUG-1 — the kernel fires on host-authored envelopes (FIRE-ON-HOST-TEXT)
- **Discovery:** extracting the 39 `ttsr_injection` records; 4 of 22 behavioral firings carried a
  resolvable trigger, and all 4 were host text.
- **Verbatim evidence (MECHANICAL — from the transcript's firing ledger):**
  `17:52:14 verification-before-declaration <- "<system-reminder> … mark it done now …"`;
  `18:08:40 verification-before-declaration <- "<task-result … status=\"completed\">"`;
  `18:13:56 red-team-default <- "<task-result … status=\"completed\">"`;
  `17:41:01 verification-before-declaration <- "<system-notice> xd:// device inventory changed …"`.
- **Mechanism:** `~/.agent/rules/verification-before-declaration.md` — condition
  `\b(?:done|complete|fixed|verified|it works)\b`, scope `[text, thinking]`, no speaker-role test.
- **Root-cause class:** missing ROLE dimension in the detector's input model.
- **Work order:** WO-1. **Misfire control:** host envelopes never carry agent claims.

### TTSR-BUG-2 — use/mention blindness: quoting a kernel's vocabulary fires it
- **Discovery:** three kernels fired at once while a report QUOTED each detector's alternatives.
- **Verbatim (MECHANICAL):** `18:01:41 anti-scope-shrink, anti-theatrical` (one message, two rules).
- **Mechanism:** same files; no quotation/code-span exclusion anywhere in the state builder.
- **Root-cause class:** missing USE/MENTION dimension.
- **Work order:** WO-2. **Misfire control:** the offending act is always in the agent's own voice.

### TTSR-BUG-3 — the firing deletes its own evidence (contextMode: discard)
- **Discovery:** attempting to reconstruct all 22 behavioral firings.
- **Verbatim (MECHANICAL):** `behavioral firings extracted: 22` / `4 resolved` / `18 unresolved`.
- **Mechanism:** `contextMode: discard` removes the aborted partial from history at fire time; the
  `ttsr_injection` record stores rule + timestamp but NOT the matched span.
- **Root-cause class:** observability defect — enforcement without an audit trail.
- **Work order:** WO-3. **Misfire control:** recording the span is a read; zero behavioral effect.

### TTSR-BUG-4 — polarity blindness (fires on the negation of the act)
- **Discovery:** probe.
- **Verbatim (MECHANICAL):** `"the manifest records what is not verified" -> Triggered (1)`.
- **Mechanism:** token presence with no polarity test.
- **Work order:** WO-5. **Misfire control:** a judged question cannot be satisfied by a token.

### TTSR-BUG-5 — the kernel misses the inflected form and hits the bare form
- **Verbatim (MECHANICAL):** `"### bg_25 [bash] - completed" -> No rules triggered`.
- **Mechanism:** `\bcomplete\b` does not match "completed" — the boundary is accidental.
- **Work order:** WO-5.

### TTSR-BUG-6 — naming an interface fires the interface's own enforcement
- **Verbatim (MECHANICAL):** `"the claim firewall intercepts goal.complete" -> Triggered (1)`.
- **Work order:** WO-2.

### TTSR-BUG-7 — firing rate: 22 behavioral firings in 37 minutes, one per ~100s
- **Verbatim (MECHANICAL):** first `17:41:01`, last `18:18:45`; 22 records.
- **Root-cause class:** a layer at this false-positive density cannot be a background guardrail; it
  becomes the session's main event.
- **Work order:** WO-7 (telemetry), then re-measure after WO-1/WO-2/WO-5 land.

---

**Running count: 7 bugs. Next available id: TTSR-BUG-8.**

### TTSR-BUG-8 — the kernel fires on a quotation of its own accusation body
- **Discovery (2026-09-20 22:23):** the layer interrupted the design document that was quoting its rendered
  verdict sentence as a worked example (class B2).
- **Verbatim (MECHANICAL):** `2026-09-20T18:23:05 verification-before-declaration` — the 42nd
  `ttsr_injection` row, the 24th behavioral one; the paused message quoted
  `You are declaring work complete` as its subject.
- **Mechanism:** `~/.agent/rules/verification-before-declaration.md` — the rule BODY contains the
  word "complete"; no quoted-region exclusion exists in the state builder.
- **Root-cause class:** USE/MENTION, sub-class: quotation of the accusation itself.
- **Impact:** the incident corpus, the calibration reports and the teaching material for this very
  layer are all targets — the layer punishes its own audit trail.
- **Work order:** WO-2 (extended to rule bodies). **Misfire control:** agent assertions are never
  inside quoted regions; the regression probe is the quoted sentence itself.
- **Secondary datum (MECHANICAL):** the census moved 39→42 rows / 22→24 behavioral during the ten
  minutes of documentation — rate 24 / 42 min ~ 1 per 105 s.

**Running count: 8 bugs. Next available id: TTSR-BUG-9.**
