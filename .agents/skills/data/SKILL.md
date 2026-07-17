---
name: stellar-rpc-data
description: Guidelines for reading chain state, transaction history, balances, or contract events.
---

# Stellar RPC and Data Guidelines

1. **Horizon API & RPC**: Use the appropriate Horizon endpoint for reading public balances, trustlines, and transactions.
2. **Contract State / Events**: Query Soroban RPC `getTransaction` or `getEvents` to track state changes post-deployment.
