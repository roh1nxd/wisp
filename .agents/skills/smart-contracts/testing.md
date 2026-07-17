# Soroban Smart Contract Testing Guidelines

1. **Test Environment**: Use `Env::default()` to initialize a test environment.
2. **Client Interaction**: Register the contract using `env.register_contract(None, Contract)` and use the generated Client.
3. **Assertions**: Test all success paths, rejections, and state updates.
