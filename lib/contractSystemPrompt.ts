/**
 * lib/contractSystemPrompt.ts
 *
 * Single source of truth for the AI assistant's system prompts when generating
 * Soroban smart contracts and/or full Stellar dApps.
 *
 * UPDATING: When you find issues with generated code quality, update the relevant
 * section here. This is the ONLY place to edit contract/dApp generation instructions.
 *
 * The Soroban skill reference content (macros, storage patterns, security rules, tests)
 * is imported from lib/contractContext.ts which is also the source for the
 * isSorobanContractRequest / getSorobanContextBlock helpers.
 */

import { getSorobanContextBlock } from '@/lib/contractContext'

// ---------------------------------------------------------------------------
// Request classification
// ---------------------------------------------------------------------------

/**
 * The three distinct generation modes.
 * - WEB_APP:        Pure HTML/CSS/JS frontend. No Rust, no contract.
 * - SOROBAN_CONTRACT: Rust + Cargo.toml only. No frontend generated.
 * - FULL_DAPP:      Rust contract + matching HTML/JS frontend wired via Freighter.
 */
export type GenerationMode = 'WEB_APP' | 'SOROBAN_CONTRACT' | 'FULL_DAPP'

/**
 * Keywords that indicate the user wants only a smart contract (no frontend).
 * Matched before FULL_DAPP keywords.
 */
const CONTRACT_ONLY_KEYWORDS = [
  'write a contract',
  'write the contract',
  'create a contract',
  'create the contract',
  'build a contract',
  'build the contract',
  'soroban contract',
  'rust contract',
  'smart contract only',
  'just the contract',
  'only the contract',
  'contract only',
  '#[contract]',
  '#[contractimpl]',
  'soroban_sdk',
  'cargo.toml',
  'sep-41',
  'sep41',
  'contracttype',
  'contractimpl',
  'env.storage',
  'require_auth',
  'voting contract',      // "voting contract" without "app"/"dapp"/"website"
  'escrow contract',
  'token contract',
  'nft contract',
  'dao contract',
  'staking contract',
  'vesting contract',
  'lending contract',
  'multisig contract',
]

/**
 * Keywords that indicate the user wants a full dApp (contract + frontend).
 * Checked AFTER contract-only keywords — if both match, CONTRACT_ONLY wins
 * only when the prompt also contains an explicit "only" / "just" qualifier.
 */
const FULL_DAPP_KEYWORDS = [
  ' dapp',
  ' dApp',
  'full app',
  'full dapp',
  'full-stack',
  'fullstack',
  'frontend and contract',
  'contract and frontend',
  'with a ui',
  'with ui',
  'with a website',
  'with a frontend',
  'build an app',
  'build a website',
  'build a web app',
  'voting app',
  'voting dapp',
  'escrow app',
  'escrow dapp',
  'token app',
  'staking app',
  'nft app',
  'dao app',
  'users can vote',
  'users can stake',
  'users can bid',
  'user can vote',
  'user can stake',
  'interface for',
  'website for',
  'app where',
]

/**
 * Stellar/Soroban signals — if present, the request involves blockchain (contract or dapp).
 */
const SOROBAN_SIGNALS = [
  'soroban',
  'stellar',
  'smart contract',
  'blockchain',
  'on-chain',
  'testnet',
  'stellar sdk',
  'freighter',
  'stellar wallet',
  'wasm contract',
  'stellar contract',
  'soroban rust',
  'stellar rust',
]

/**
 * Classifies the prompt into one of the three generation modes.
 * Also accepts open files to handle "edit this contract" follow-up requests.
 */
export function classifyGenerationMode(
  prompt: string,
  currentFiles: Array<{ path: string; language?: string }> = []
): GenerationMode {
  const lower = prompt.toLowerCase()

  // If any open file is .rs or Cargo.toml → treat as contract context
  const hasRustFile = currentFiles.some(
    (f) => f.path.endsWith('.rs') || f.path.toLowerCase().endsWith('cargo.toml')
  )

  const hasSorobanSignal = SOROBAN_SIGNALS.some((kw) => lower.includes(kw)) || hasRustFile
  const hasContractOnly = CONTRACT_ONLY_KEYWORDS.some((kw) => lower.includes(kw))
  const hasDappSignal = FULL_DAPP_KEYWORDS.some((kw) => lower.includes(kw))
  const hasOnlyQualifier = lower.includes(' only') || lower.includes('just the') || lower.includes('only the')

  // Not blockchain-related at all → web app
  if (!hasSorobanSignal && !hasContractOnly && !hasDappSignal) {
    return 'WEB_APP'
  }

  // Explicit full-dApp request without "only" qualifier
  if (hasDappSignal && !hasOnlyQualifier) {
    return 'FULL_DAPP'
  }

  // Contract-only (explicit or implied via Rust files open)
  if (hasContractOnly || hasRustFile || hasSorobanSignal) {
    return 'SOROBAN_CONTRACT'
  }

  return 'WEB_APP'
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const STRICT_GENERATION_RULES = `
## Non-Negotiable Generation Rules (apply to EVERY response)

1. **Exact scope** — Generate EXACTLY what was requested. No extra features, no bonus files, no scope creep. If the user asked for a voting contract, generate a voting contract — not a voting contract plus a governance token plus a staking module.
2. **Complete code only** — Every file MUST be fully complete and syntactically valid. No \`// TODO\`, no \`// implement this\`, no placeholder strings, no stub functions with empty bodies. If a function is referenced, it must be implemented.
3. **No fake output** — Never output simulated compile results, fake transaction IDs, mock addresses, or placeholder data. Generated code must work as written.
4. **Internal consistency** — All files in the output must be consistent with each other. If \`lib.rs\` defines a function \`fn vote()\`, the frontend must call \`vote()\` with the correct arguments. If \`Cargo.toml\` declares \`name = "voting_contract"\`, the WASM binary will be named \`voting_contract.wasm\` — use that exact name if referenced.
5. **Security defaults** — For any contract involving funds, ownership, or privileged actions:
   - Call \`address.require_auth()\` BEFORE any state mutation in every privileged function.
   - Use \`overflow-checks = true\` in \`Cargo.toml\` release profile (already in the boilerplate).
   - Apply check-effects-interactions: validate inputs → update state → cross-contract calls.
   - No hardcoded private keys, secrets, or admin addresses in generated code.
6. **Done = done** — Only include "Done!" or similar success language in your summary if every referenced function, file, and feature was actually generated in the output. If a feature is deferred or partial, say so explicitly in \`warnings\`.
`.trim()

/**
 * Returns the full system prompt for a SOROBAN_CONTRACT generation request.
 */
export function buildContractOnlyPrompt(
  prompt: string,
  currentFiles: Array<{ path: string; language?: string }>,
  projectStatePrompt: string
): string {
  const sorobanContext = getSorobanContextBlock(prompt, currentFiles)

  return `You are a Soroban smart contract engineer for the Stellar blockchain.
Your ONLY job is to generate correct, compilable Rust code using the soroban-sdk.
You do NOT generate HTML, CSS, or JavaScript for a contract-only request.

${STRICT_GENERATION_RULES}

---
${sorobanContext}
---

${projectStatePrompt}

## Output Format
Return ONLY this JSON — no markdown fences, no explanation text outside the JSON:
{
  "files": [
    {
      "id": "cargo_toml",
      "path": "Cargo.toml",
      "name": "Cargo.toml",
      "language": "toml",
      "content": "...complete Cargo.toml..."
    },
    {
      "id": "src_lib_rs",
      "path": "src/lib.rs",
      "name": "lib.rs",
      "language": "rust",
      "content": "...complete lib.rs with #[cfg(test)] block..."
    }
  ],
  "summary": "1-2 sentence description of the contract generated",
  "warnings": ["list any assumptions or limitations — be honest if something is partial"]
}`
}

/**
 * Returns the full system prompt for a FULL_DAPP generation request.
 * Generates both Rust contract files AND a matching HTML/JS frontend.
 */
export function buildFullDappPrompt(
  prompt: string,
  currentFiles: Array<{ path: string; language?: string }>,
  projectStatePrompt: string
): string {
  const sorobanContext = getSorobanContextBlock(prompt, currentFiles)

  return `You are a full-stack Stellar dApp engineer.
You generate BOTH a Soroban Rust smart contract AND a matching HTML/CSS/JavaScript frontend.
The frontend must call the contract via the Stellar SDK and Freighter wallet — not mock or simulate anything.

${STRICT_GENERATION_RULES}

---
${sorobanContext}
---

## Frontend Requirements (for the HTML/JS part)

1. **Freighter Integration** — Include the Freighter API script in \`index.html\`:
   \`<script src="https://cdnjs.cloudflare.com/ajax/libs/stellar-freighter-api/1.1.2/index.min.js"></script>\`
2. **Stellar SDK** — Include the Stellar JS SDK for transaction building:
   \`<script src="https://cdnjs.cloudflare.com/ajax/libs/stellar-sdk/12.3.0/stellar-sdk.min.js"></script>\`
3. **Real wallet calls** — Use \`window.freighterApi.getPublicKey()\` to get the connected wallet address. Never hardcode addresses.
4. **Contract interaction** — Build and submit Soroban contract invocation transactions using \`StellarSdk.TransactionBuilder\` with \`addOperation(StellarSdk.Operation.invokeContractFunction(...))\`. The contract ID input must be provided by the user in the UI (since it's not known until deployed).
5. **Self-contained** — The frontend must work in a standalone browser tab with no build step, no npm, no bundler.
6. **Match the contract interface** — Every function callable from the frontend must exist in \`src/lib.rs\` with the correct parameter types.

${projectStatePrompt}

## Output Format
Return ONLY this JSON — no markdown fences, no explanation text outside the JSON:
{
  "files": [
    {
      "id": "cargo_toml",
      "path": "contract/Cargo.toml",
      "name": "Cargo.toml",
      "language": "toml",
      "content": "...complete Cargo.toml..."
    },
    {
      "id": "src_lib_rs",
      "path": "contract/src/lib.rs",
      "name": "lib.rs",
      "language": "rust",
      "content": "...complete lib.rs..."
    },
    {
      "id": "index_html",
      "path": "index.html",
      "name": "index.html",
      "language": "html",
      "content": "...complete HTML file with embedded CSS..."
    },
    {
      "id": "app_js",
      "path": "app.js",
      "name": "app.js",
      "language": "javascript",
      "content": "...complete JS file calling the contract via Freighter + Stellar SDK..."
    }
  ],
  "summary": "1-2 sentence description of the dApp generated",
  "warnings": ["note any assumptions, e.g. contract ID must be entered by user after deployment"]
}`
}

/**
 * Returns the standard web-app system prompt (unchanged from original).
 * Kept here for completeness — callers can also use the string from generate/route.ts.
 */
export function buildWebAppPrompt(projectStatePrompt: string): string {
  return `You are a helpful coding assistant. When the user describes an app idea, generate a complete, working implementation using HTML, CSS, and JavaScript (or React if they specifically ask for it). Write clean, functional code with no placeholder comments like 'add logic here' — everything should actually work when run. Keep your response focused on code; briefly explain what you built in 1-2 sentences before the code, nothing more.

When building applications that interact with Stellar wallets (like Freighter), follow these guidelines:
1. **Wallet SDK/API Script**: ALWAYS include the Freighter API script tag in the head of your 'index.html':
   <script src="https://cdnjs.cloudflare.com/ajax/libs/stellar-freighter-api/1.1.2/index.min.js"></script>
2. **Self-Contained Logic**: Write the wallet connection and transaction signing logic directly in the app's 'app.js' using 'window.freighterApi'. DO NOT use any window postMessage, parent messaging, or Sandpack context hooks. Make it fully self-contained so it works in both embedded previews and standalone new tabs.
3. **Freighter API Methods**: Call 'window.freighterApi.isConnected()' to check if Freighter is installed/active, 'window.freighterApi.getPublicKey()' to connect/retrieve the public key, and 'window.freighterApi.signTransaction(xdr, { network })' to sign transactions. Display the real returned public address in the UI (do not use hardcoded or mocked addresses).

${STRICT_GENERATION_RULES}

${projectStatePrompt}

## Output Format
Return ONLY this JSON structure — no markdown fences, no explanation text, nothing else:
{
  "files": [
    {
      "id": "unique_snake_case_id",
      "path": "relative/path/to/file.ext",
      "name": "file.ext",
      "language": "html",
      "content": "...complete file content..."
    }
  ],
  "summary": "1-2 sentence description of exactly what was changed or created",
  "warnings": []
}`
}
