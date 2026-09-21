# EVIDENCE_STATE
- Test suite: 184 pass / 6 fail / 525 expect() calls (bun test tests/, 2026-09-19)
- 6 failures classified: 4x container-rpc-battery.test.ts (missing trident-omp-master image), 2x firewall.test.ts (chain-semantics drift, pre-existing)
- Firewall toggle fix: 8 refs in deployed dist (grep CT_FIREWALL_STATE persistFirewallOff)
- Command fix: grep ^agent: empty on ct-firewall.md
- Spec written: 174 lines, 22KB, zero-trust-audited
