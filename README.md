# ✦ Wisp

**Describe your idea. Soroban builds it.**

Wisp is an AI-powered builder for the [Stellar](https://stellar.org) network. Tell it what you want to build — a crowdfund, a marketplace, a membership pass — in plain English, and it generates the Soroban smart contract, the frontend, and deploys it to Stellar. No Rust knowledge required.

> Think "Replit for Stellar" — describe it, and Wisp ships it.

---

## Why Wisp

Building on Stellar today means learning Rust, the Soroban SDK, and a fairly unusual smart contract dialect before you can ship anything. Wisp collapses that gap: you describe the product in a sentence, and Wisp handles the contract logic, testing, and deployment — while keeping non-technical builders away from unaudited, from-scratch financial code.

## Features

- 🗣️ **Natural language intent parsing** — describe your idea, Wisp turns it into a structured spec (roles, conditions, parameters)
- 🧱 **Audited template library** — every contract starts from a reviewed base (crowdfund, escrow, subscription vault, membership NFT, payroll stream, token-gated access) instead of AI-generated Rust from scratch
- ✅ **Test-gated deploys** — contracts run through Soroban's local sandbox test suite before anything reaches testnet or mainnet
- 🌐 **Testnet by default** — mainnet deployment is a separate, explicit, confirmed step
- 🎨 **Generated frontend included** — a working React UI with wallet connect ships alongside every contract
- 🔐 **Wallet-native** — built for Freighter and other Stellar wallets from the start

## How it works

```
1. Describe it   → plain-language prompt, Wisp asks clarifying questions
2. Generate & test → matches an audited template, fills it in, runs the sandbox test suite
3. Deploy        → ships to testnet automatically; promote to mainnet only once tests pass
```

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | Next.js, React, Tailwind CSS |
| Backend / orchestration | Node.js (NestJS/Express) or FastAPI, PostgreSQL, Redis, BullMQ/Celery |
| AI | Claude API (intent parsing + code generation), RAG over the template library and Soroban docs |
| Smart contracts | Soroban Rust SDK, Soroban CLI, OpenZeppelin Soroban Contracts (audited base templates) |
| Wallets | Freighter, Stellar Wallets Kit |
| Infra | Docker (isolated per-project compile sandboxes) |

## Roadmap

- [ ] Template library: crowdfund, escrow, subscription vault, membership NFT, payroll stream, token-gated access
- [ ] Natural language → structured spec pipeline
- [ ] One-click testnet deploy
- [ ] Mainnet promotion flow with test-suite gating
- [ ] From-scratch contract generation for cases outside the template library
- [ ] In-browser iteration ("make the refund window 30 days")

## Getting started

> 🚧 Wisp is early — the setup steps below will fill in as the project matures.

```bash
git clone https://github.com/your-org/wisp.git
cd wisp
# setup instructions coming soon
```

## Safety by design

Financial smart contracts with subtle bugs cause real losses. Wisp is built around defaults that make that harder to do by accident:

- Testnet-first, always
- Tests must pass before mainnet promotion is allowed
- Contract logic starts from a reviewed template, not a blank slate
- Anything outside the template library is visibly labeled **unaudited**

## Contributing

Contributions, issues, and template proposals are welcome. Open an issue to discuss what you'd like to add before submitting a PR.

## License

MIT © Wisp

---

*Built on [Stellar](https://stellar.org)
