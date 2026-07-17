# Soroban Smart Contract Security Guidelines

1. **Access Control**: Always check caller address using `address.require_auth()`.
2. **Reentrancy**: Soroban does not support reentrancy as call stack depth limits prevent it, but follow check-effects-interactions pattern.
3. **Integer Overflow**: Use safe math functions or standard Rust overflow handling.
