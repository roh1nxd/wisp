# Stellar Skill Routing Rules

- ALWAYS load `.agents/skills/smart-contracts/SKILL.md` (and its companion development.md, testing.md, security.md if present) for any task that writes, edits, or reviews a Soroban Rust contract
- ALWAYS load `.agents/skills/dapp/SKILL.md` for any task touching the frontend's wallet connection, JS SDK usage, or transaction signing
- ALWAYS load `.agents/skills/data/SKILL.md` when the app needs to read chain state, transaction history, balances, or contract events after deployment
- Load `.agents/skills/assets/SKILL.md` when the request involves tokens, payments, trustlines, or asset issuance
- Load `.agents/skills/standards/SKILL.md` when a requested feature maps to an existing SEP/CAP (authentication, deposits/withdrawals, KYC) — use the matching standard pattern instead of inventing a custom one
- Load `.agents/skills/openzeppelin-stellar/SKILL.md` whenever a contract needs access control, pausability, or ownership logic — prefer these audited macros over hand-written equivalents

- ALWAYS cross-check any version numbers you use against what the loaded skill file's 'Versions' section actually says — do not default to web search results or your own training knowledge if the skill file specifies a version range.
