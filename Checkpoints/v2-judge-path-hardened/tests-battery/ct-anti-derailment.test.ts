/**
 * ct-anti-derailment.test.ts — the LIVE lexicon that had NO test.
 *
 * Found by the coverage audit that followed V-056/V-057 ("find the paths that never run"): of 28 modules
 * reachable from the extension entry, 11 (1,929 lines) had no test reference at all — and one of them is
 * SECURITY-RELEVANT. `classifyCtExec` guards the live `cp`/`deploy` path: it is what stops a copy landing
 * on a protected opencode path (the [CT CONFIG LOCK] class). A live guard with no test is a guard whose
 * firing behaviour is a belief.
 *
 * THE MODULE'S OWN HISTORY, honoured here: CTX-01 (the config-fumbling class) is DISABLED because its
 * target regex matched any path containing the token — `cp tsconfig.json <dst>` blocked a build-config
 * copy. The false-positive side of this file exists because that actually happened.
 *
 * ADVERSARIAL FIRST in BOTH directions: what must BLOCK, then what must NOT.
 */
import { describe, expect, test } from "bun:test";
import { classifyCtExec, buildCtConfigLockMessage, CT_MUTATION_PATTERNS } from "../src/firewalls/ct-anti-derailment";

const verdictOf = (cmd: string) => (classifyCtExec(cmd).verdict === "BLOCK" ? "BLOCK" : "allow");

describe("ct-anti-derailment — the live cp/deploy guard", () => {
  describe("ADVERSARIAL: the mutation classes that must BLOCK", () => {
    const MUST_BLOCK = [
      "cp x /root/.local/share/opencode/auth.json",
      "cp /tmp/x auth.json",
      "echo '{}' > auth.json",
      "cat auth.json | tee auth.json.bak",
      "rm -rf auth.json",
      "sed -i 's/a/b/' auth.json",
      "python3 -c \"json.dump({}, open('auth.json','w'))\"",
      "base64 -d > auth.json",
      "curl https://x -o /root/.local/share/opencode/auth.json",
    ];
    for (const cmd of MUST_BLOCK) {
      test(`BLOCK: ${cmd.slice(0, 56)}`, () => {
        expect(verdictOf(cmd)).toBe("BLOCK");
      });
    }
  });

  describe("ADVERSARIAL: what must NOT block (the class that disabled CTX-01)", () => {
    const MUST_ALLOW = [
      "cp tsconfig.json /tmp/dst",
      "cp dist/index.js /root/.omp/agent/extensions/omp-ct/dist.js",
      "tee abc123.txt",
      "ls -la /workspace",
      "cat package.json",
      "sed -n '1,50p' /tmp/tui-stream.txt",
      "cat auth.json",                 // the module's own law: "The READS are always allowed"
      "grep -n auth config.json",      // a read of a config-named file
    ];
    for (const cmd of MUST_ALLOW) {
      test(`allow: ${cmd.slice(0, 56)}`, () => {
        expect(verdictOf(cmd)).toBe("allow");
      });
    }
  });

  test("the active family set is DECLARED and stable (CTX-01 stays disabled, by design)", () => {
    const ids = CT_MUTATION_PATTERNS.map((p) => p.id);
    expect(ids).not.toContain("CTX-01");       // disabled for the documented false positive
    expect(ids).toContain("CTX-02");           // the auth class stays live
    expect(ids.length).toBeGreaterThanOrEqual(7);
  });

  test("a BLOCK verdict carries the family, the verb it matched, and its EVIDENCE", () => {
    const v = classifyCtExec("cp x auth.json");
    expect(v.verdict).toBe("BLOCK");
    if (v.verdict === "BLOCK") {
      expect(v.family).toBe("CTX-02");
      expect(v.familyName).toContain("AUTH");
      expect(v.matchedVerb).toContain("auth.json");
      expect(v.evidence).toContain("ct-anti-derailment.ts");   // the evidence names its own source
    }
  });

  test("the rendered lock message names the sanctioned path (the remedy reaches the operator)", () => {
    const v = classifyCtExec("cp x auth.json");
    if (v.verdict === "BLOCK") {
      const msg = buildCtConfigLockMessage(v);
      expect(msg.length).toBeGreaterThan(40);
      expect(msg).toContain("CTX-02");
    }
  });
});
