/**
 * shell-strip — a SHELL-AWARE view of a command for the enforcement detectors.
 *
 * The naive regex strips (`replace(/"[^"]*"/g, '""')`) ignored backslash escapes, backticks,
 * `$()` command substitution and heredoc variants — so crafted quoting could hide an inline
 * execution from the verb check (a false NEGATIVE) or a literal mention bled into the action
 * (a false POSITIVE). This is a single-pass tokenizer that separates DATA from ACTION the way
 * the shell itself does:
 *
 *   · single-quoted spans      → DATA  (no escapes inside; blanked)
 *   · double-quoted spans      → DATA  (backslash-escaped chars respected; blanked)
 *   · heredoc BODIES           → DATA  (`<<DELIM … DELIM`; blanked, delimiter-matched)
 *   · `$( … )` / backticks     → ACTION (command substitution EXECUTES; kept)
 *   · everything else          → ACTION (kept)
 *
 * A caller that needs the wrapper case (`bash -c '<verb>'` — the quoted payload IS the action
 * there) tests the RAW command with a dedicated wrapper regex; this function is the ACTION view.
 */

/** Strip DATA spans, preserving the ACTION. Never throws on malformed input. */
export function stripShellData(cmd: string): string {
  const s = String(cmd ?? "");
  const n = s.length;
  let out = "";
  let i = 0;
  while (i < n) {
    const c = s[i];

    // single-quoted span — no escapes inside a shell single-quote.
    if (c === "'") {
      out += "''";
      i++;
      while (i < n && s[i] !== "'") i++;
      i++; // consume the closing quote (or run to end)
      continue;
    }

    // double-quoted span — a backslash escapes the next char (`\"` does not close). A span that
    // contains `$(` or a backtick is NOT pure data: the shell EXPANDS it, so the substitution
    // executes — keep the content; a substitution-free span is DATA (blanked).
    if (c === '"') {
      let raw = "";
      i++;
      while (i < n && s[i] !== '"') {
        if (s[i] === "\\" && i + 1 < n) { raw += s[i + 1]; i += 2; }
        else { raw += s[i]; i++; }
      }
      i++; // consume the closing quote
      out += /[$`]/.test(raw) ? " " + raw + " " : '""';
      continue;
    }

    // heredoc: `<<` / `<<-` + optional quote + delimiter word — blank the body up to the terminator.
    if (c === "<" && s[i + 1] === "<") {
      const m = /^<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(s.slice(i));
      if (m) {
        const delim = m[2];
        out += " <<HEREDOC";
        i += m[0].length;
        const esc = delim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const term = new RegExp("\\n[ \\t]*" + esc + "[ \\t]*(?:\\r?\\n|$)");
        const mm = term.exec(s.slice(i));
        if (mm) {
          i += mm.index + mm[0].length;
          out += "\n";
        } else {
          i = n; // unterminated heredoc — consume the rest as DATA
        }
        continue;
      }
    }

    // command substitution / backticks EXECUTE — kept verbatim.
    out += c;
    i++;
  }
  return out;
}
