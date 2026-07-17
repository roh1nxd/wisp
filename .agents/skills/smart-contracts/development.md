# Soroban Smart Contract Development Guidelines

1. **Rust SDK Boilerplate**: Always use `soroban_sdk` macros (`#[contract]`, `#[contractimpl]`).
2. **Types**: Prefer `Symbol`, `String`, `Address` over raw types for security and clarity.
3. **Storage**: Declare storage keys as Enums with `#[contracttype]`. Use `env.storage().persistent()` or `env.storage().instance()` properly.
