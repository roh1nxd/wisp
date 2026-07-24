/**
 * lib/ai/contractContext.ts
 *
 * Detects whether a user's prompt is requesting Soroban/Rust smart contract generation,
 * and returns the full skill reference text to inject into the system prompt so the AI
 * generates correct, compilable Soroban contracts instead of relying on stale training data.
 *
 * IMPORTANT: The skill content is inlined as static strings here (not read from disk at
 * runtime) because Next.js API routes on Vercel run as serverless functions that cannot
 * reliably access arbitrary file paths outside the bundle. The source of truth for these
 * strings is .agents/skills/smart-contracts/. If those files are updated, sync here too.
 */

// ---------------------------------------------------------------------------
// Soroban intent detection
// ---------------------------------------------------------------------------

/** Keywords that strongly indicate the user wants a Soroban/Rust smart contract. */
const SOROBAN_KEYWORDS = [
  'soroban',
  'stellar contract',
  'smart contract',
  'soroban contract',
  'rust contract',
  '#[contract]',
  '#[contractimpl]',
  'soroban_sdk',
  'cargo.toml',
  'voting contract',
  'escrow contract',
  'token contract',
  'nft contract',
  'dao contract',
  'multisig contract',
  'staking contract',
  'vesting contract',
  'lending contract',
  'deploy contract',
  'write a contract',
  'build a contract',
  'create a contract',
  'soroban token',
  'sep-41',
  'sep41',
  'contracttype',
  'contractimpl',
  'env.storage',
  'require_auth',
  'soroban rust',
  'stellar rust',
  'stellar smart',
  'wasm contract',
]

/**
 * Returns true if the prompt is requesting Soroban/Rust smart contract generation.
 * Also checks if any open files are .rs or Cargo.toml to handle "edit this contract" requests.
 */
export function isSorobanContractRequest(
  prompt: string,
  currentFiles: Array<{ path: string; language?: string }> = []
): boolean {
  const lower = prompt.toLowerCase()
  if (SOROBAN_KEYWORDS.some((kw) => lower.includes(kw))) {
    return true
  }
  // If the user has a .rs or Cargo.toml file open and is asking for changes, treat as contract work
  const hasRustFile = currentFiles.some(
    (f) => f.path.endsWith('.rs') || f.path.toLowerCase().endsWith('cargo.toml')
  )
  if (hasRustFile) {
    return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Skill content — inlined from .agents/skills/smart-contracts/
// Source of truth: .agents/skills/smart-contracts/{development,security,testing}.md
//                  .agents/skills/standards/SKILL.md
//                  .agents/skills/openzeppelin-stellar/SKILL.md
// ---------------------------------------------------------------------------

const SOROBAN_DEVELOPMENT_GUIDELINES = `
## Soroban SDK Boilerplate & Syntax Rules (MANDATORY)

1. **Crate setup** — Always declare \`soroban-sdk\` in \`Cargo.toml\`:
   \`\`\`toml
   [package]
   name = "my_contract"
   version = "0.1.0"
   edition = "2021"

   [lib]
   crate-type = ["cdylib"]

   [dependencies]
   soroban-sdk = { version = "22", features = ["alloc"] }

   [dev-dependencies]
   soroban-sdk = { version = "22", features = ["testutils", "alloc"] }

   [profile.release]
   opt-level = "z"
   overflow-checks = true
   debug = 0
   strip = "symbols"
   debug-assertions = false
   panic = "abort"
   codegen-units = 1
   lto = true
   \`\`\`

2. **Contract macros** — Every contract MUST use the correct macros:
   \`\`\`rust
   use soroban_sdk::{contract, contractimpl, contracttype, Env, Address, Symbol, String, Vec, Map};

   #[contracttype]
   pub enum DataKey {
       Admin,
       Balance(Address),
   }

   #[contract]
   pub struct MyContract;

   #[contractimpl]
   impl MyContract {
       pub fn initialize(env: Env, admin: Address) {
           admin.require_auth();
           env.storage().instance().set(&DataKey::Admin, &admin);
       }
   }
   \`\`\`

3. **Types** — Prefer \`Symbol\`, \`String\`, \`Address\` over raw Rust primitives for on-chain safety and clarity.

4. **Storage tiers**:
   - \`env.storage().instance()\` — contract-lifetime data (e.g. admin, config). Bump TTL with \`extend_ttl\`.
   - \`env.storage().persistent()\` — per-user/per-key data (e.g. balances, votes). Bump TTL per entry.
   - \`env.storage().temporary()\` — short-lived, disposable state.

5. **TTL management** — Always extend TTLs for data that must survive across ledger closings:
   \`\`\`rust
   env.storage().instance().extend_ttl(100, 100);
   \`\`\`

6. **Events** — Emit events for all meaningful state changes:
   \`\`\`rust
   env.events().publish((Symbol::new(&env, "vote_cast"), voter.clone()), candidate.clone());
   \`\`\`

7. **lib.rs structure** — Use \`#![no_std]\` at the top when targeting WASM:
   \`\`\`rust
   #![no_std]
   use soroban_sdk::{contract, contractimpl, Env};
   \`\`\`
`

const SOROBAN_SECURITY_GUIDELINES = `
## Soroban Security Rules (MANDATORY)

1. **Auth checks first** — Every privileged function MUST call \`address.require_auth()\` before any state mutation:
   \`\`\`rust
   pub fn set_admin(env: Env, caller: Address, new_admin: Address) {
       caller.require_auth(); // ← ALWAYS first
       // then mutate state
       env.storage().instance().set(&DataKey::Admin, &new_admin);
   }
   \`\`\`

2. **No reentrancy by design** — Soroban call stack depth limits prevent reentrancy, but still follow check-effects-interactions: validate inputs, update state, then make cross-contract calls.

3. **Integer safety** — Use Rust's built-in overflow checks (enabled in release via \`overflow-checks = true\` in Cargo.toml). Use \`checked_add\`, \`checked_sub\` where overflow is a logical concern.

4. **No panics in production paths** — Prefer \`panic_with_error!\` or returning error codes over plain \`panic!()\` so errors are readable on-chain.
`

const SOROBAN_TESTING_GUIDELINES = `
## Soroban Testing Patterns (include a #[cfg(test)] module in every contract)

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_basic_flow() {
        let env = Env::default();
        env.mock_all_auths(); // skip real auth in unit tests

        let contract_id = env.register_contract(None, MyContract);
        let client = MyContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        // Assert state
        assert_eq!(client.get_admin(), admin);
    }
}
\`\`\`

Key rules:
- Use \`Env::default()\` for the test environment.
- Use \`env.mock_all_auths()\` to bypass auth in unit tests.
- Register with \`env.register_contract(None, MyContract)\` then create a typed client.
- Test success paths, rejection paths, and state updates separately.
`

const STELLAR_STANDARDS_GUIDELINES = `
## Stellar Standards (SEPs / CAPs)

- **SEP-41 Token Interface** — When writing a custom token contract, implement the standard SEP-41 interface (name, symbol, decimals, balance, transfer, mint, burn, approve, allowance) so wallets and dApps can interact with it.
- **SEP-10 Auth** — For user-facing authentication, prefer SEP-10 (Stellar Web Authentication) over custom auth schemes.
- **SEP-24/SEP-6** — For deposit/withdrawal integrations with anchors, follow these standard flows rather than custom implementations.
`

const OPENZEPPELIN_STELLAR_GUIDELINES = `
## OpenZeppelin Stellar / Soroban Access Control

- **Prefer audited patterns** — For ownership, pausability, or role-based access control, use OpenZeppelin Stellar's macros (ownable, pausable, roles) rather than writing custom equivalents from scratch.
- **Standard storage slots** — These macros use defined storage keys; do not shadow or conflict with them.
- Example ownable pattern:
  \`\`\`rust
  // With stellar-access-control crate (if available in project):
  // use stellar_access_control::Ownable;
  
  // Without crate — hand-write the canonical admin pattern:
  pub fn only_admin(env: &Env) -> Address {
      env.storage().instance().get(&DataKey::Admin).expect("not initialized")
  }
  pub fn assert_admin(env: &Env, caller: &Address) {
      caller.require_auth();
      let admin = only_admin(env);
      if *caller != admin {
          panic!("caller is not admin");
      }
  }
  \`\`\`
`

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the full Soroban skill context block to inject into the system prompt,
 * or an empty string if the request is not a smart contract request.
 */
export function getSorobanContextBlock(
  prompt: string,
  currentFiles: Array<{ path: string; language?: string }> = []
): string {
  if (!isSorobanContractRequest(prompt, currentFiles)) {
    return ''
  }

  return `
---
## SOROBAN SMART CONTRACT GENERATION — MANDATORY RULES
You are generating a Soroban Rust smart contract for the Stellar blockchain.
The following rules OVERRIDE any general knowledge you have about Soroban from training data.
Use EXACTLY these patterns. Do NOT invent alternative APIs.

${SOROBAN_DEVELOPMENT_GUIDELINES}
${SOROBAN_SECURITY_GUIDELINES}
${SOROBAN_TESTING_GUIDELINES}
${STELLAR_STANDARDS_GUIDELINES}
${OPENZEPPELIN_STELLAR_GUIDELINES}

## Output Format for Soroban Contracts
Return the same JSON structure as always, but the files array MUST include:
1. \`Cargo.toml\` — with correct soroban-sdk version and crate-type = ["cdylib"]
2. \`src/lib.rs\` — the contract implementation following ALL rules above
3. Optionally \`src/test.rs\` or inline \`#[cfg(test)]\` block
Do NOT output HTML, CSS, or JavaScript for a contract request. Output only Rust + TOML.
---
`.trim()
}
