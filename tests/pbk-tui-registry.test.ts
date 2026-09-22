import { describe, expect, test } from "bun:test";
import { formatTuiCatalog, listTuiIds, resolveTui, TUI_PRESETS } from "../src/tools/pbk-tui-registry";

describe("pbk-tui-registry", () => {
  test("lists omp pi opencode mimo mimocode qwen qwen-code grok grok-build", () => {
    const ids = listTuiIds();
    for (const need of ["omp", "pi", "opencode", "mimo", "mimocode", "qwen", "qwen-code", "grok", "grok-build"]) {
      expect(ids).toContain(need);
    }
  });

  test("omitting tui defaults to omp, never a silent other TUI", () => {
    const r = resolveTui({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id).toBe("omp");
      expect(r.value.command).toContain("omp");
      expect(r.value.source).toBe("preset");
    }
  });

  test("aliases resolve: pi->omp binary, mimocode->mimo image, qwen-code, grok-build", () => {
    const pi = resolveTui({ tui: "pi" });
    const mimo = resolveTui({ tui: "mimocode" });
    const qwen = resolveTui({ tui: "qwen-code" });
    const grok = resolveTui({ tui: "grok-build" });
    expect(pi.ok && pi.value.command.includes("omp")).toBe(true);
    expect(mimo.ok && mimo.value.image.includes("mimo-ct")).toBe(true);
    expect(qwen.ok && qwen.value.id === "qwen-code").toBe(true);
    expect(grok.ok && grok.value.command === "grok").toBe(true);
  });

  test("tuiCommand wins over tui name — custom is not forced to omp", () => {
    const r = resolveTui({ tui: "omp", tuiCommand: "my-headed-tui --flag" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id).toBe("custom");
      expect(r.value.command).toBe("my-headed-tui --flag");
      expect(r.value.source).toBe("custom-command");
    }
  });

  test("unknown tui without host binary is a loud fail listing presets", () => {
    const r = resolveTui({ tui: "not-a-real-tui" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("unknown tui");
      expect(r.error).toContain("omp");
      expect(r.error).toContain("mimo");
      expect(r.error).toContain("grok");
    }
  });

  test("unknown tui with host binary bind-mounts instead of falling back to omp", () => {
    const r = resolveTui({ tui: "exotic-tui", hostBinary: "/opt/exotic-tui" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.source).toBe("host-binary");
      expect(r.value.id).toBe("exotic-tui");
      expect(r.value.binds[0]?.host).toBe("/opt/exotic-tui");
      expect(r.value.command).not.toContain("omp");
    }
  });

  test("catalog names every preset id", () => {
    const cat = formatTuiCatalog();
    expect(cat.startsWith("CT TUIS")).toBe(true);
    for (const id of Object.keys(TUI_PRESETS)) expect(cat).toContain(id);
  });

  test("image= override does not change the command", () => {
    const r = resolveTui({ tui: "mimo", image: "custom-mimo:dev" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.image).toBe("custom-mimo:dev");
      expect(r.value.command).toBe("mimo");
    }
  });
});
