# COMPACTION_SURVIVAL
- Read order after compaction: CURRENT_STATE → TASK_QUEUE → this file → spec
- The spec (specs/CT_PORT_DPL1_SPEC.md) is the single source of truth for scope
- The v6 source tree path is in the spec §3 (do not lose it)
- The janitor blocker is documented in RUNNING_DEBUG_LOG
- Kill-switches are operator-owned; never flip without explicit order
