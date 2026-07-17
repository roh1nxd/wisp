---
name: openzeppelin-stellar
description: Guidelines for contract access control, pausability, and ownership.
---

# OpenZeppelin Stellar (Soroban) Guidelines

1. **Access Control**: Prefer audited macros and modules (e.g. paused/pausability, ownable/ownership, roles/access control) over writing custom controls from scratch.
2. **Audit Gating**: Ensure these macros are integrated correctly, respecting standard storage patterns (e.g., standard admin and pause storage slots).
