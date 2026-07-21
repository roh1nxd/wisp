export interface ModelRoutingConfig {
  SIMPLE: string
  MODERATE: string
  COMPLEX: string
}

export const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3-32b',
  'groq/compound',
  'groq/compound-mini',
  'moonshotai/kimi-k2-instruct',
]

export function isGroqModel(modelName: string): boolean {
  return GROQ_MODELS.includes(modelName) || modelName.startsWith('groq/')
}

// Starting model per tier (Groq distributed for task-based load balancing)
export const TIER_STARTING_MODELS: ModelRoutingConfig = {
  SIMPLE: 'groq/compound-mini',
  MODERATE: 'qwen/qwen3-32b',
  COMPLEX: 'openai/gpt-oss-120b',
}

export const TIER_MAX_TOKENS = {
  SIMPLE: 4096,
  MODERATE: 8192,
  COMPLEX: 8192,
} as const

/**
 * Returns the fallback pool of models for a given tier.
 * Priority: Gemini (primary) -> Groq models -> OpenRouter free models -> openrouter/free (catch-all).
 */
export function getFallbackPool(
  tier: 'SIMPLE' | 'MODERATE' | 'COMPLEX',
  hasGroqKey: boolean = true
): string[] {
  const baseOpenRouterPool = [
    'gemini-3-flash-preview',
    'qwen/qwen3-coder:free',
    'cohere/north-mini-code:free',
    'poolside/laguna-xs-2.1:free',
    'poolside/laguna-m.1:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'openrouter/free',
  ]

  if (!hasGroqKey) {
    return baseOpenRouterPool
  }

  switch (tier) {
    case 'SIMPLE':
      return [
        'gemini-3-flash-preview',
        'groq/compound-mini',
        'openai/gpt-oss-20b',
        'qwen/qwen3-32b',
        'qwen/qwen3-coder:free',
        'cohere/north-mini-code:free',
        'poolside/laguna-xs-2.1:free',
        'poolside/laguna-m.1:free',
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'openrouter/free',
      ]
    case 'MODERATE':
      return [
        'gemini-3-flash-preview',
        'qwen/qwen3-32b',
        'openai/gpt-oss-20b',
        'openai/gpt-oss-120b',
        'groq/compound',
        'qwen/qwen3-coder:free',
        'cohere/north-mini-code:free',
        'poolside/laguna-xs-2.1:free',
        'poolside/laguna-m.1:free',
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'openrouter/free',
      ]
    case 'COMPLEX':
      return [
        'gemini-3-flash-preview',
        'openai/gpt-oss-120b',
        'qwen/qwen3-32b',
        'groq/compound',
        'moonshotai/kimi-k2-instruct',
        'qwen/qwen3-coder:free',
        'cohere/north-mini-code:free',
        'poolside/laguna-xs-2.1:free',
        'poolside/laguna-m.1:free',
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'openrouter/free',
      ]
  }
}

/**
 * Classifies the complexity of a user prompt into a SIMPLE, MODERATE, or COMPLEX tier
 * using a zero-latency, rule-based heuristic.
 */
export function classifyRequest(
  prompt: string,
  currentFiles: any[] = [],
  isRestart: boolean = false
): 'SIMPLE' | 'MODERATE' | 'COMPLEX' {
  const cleanPrompt = prompt.toLowerCase().trim()
  const promptLength = cleanPrompt.length

  // 1. COMPLEX indicators
  const complexKeywords = [
    'auth', 'login', 'signup', 'signin', 'database', 'backend', 'db',
    'stripe', 'payment', 'checkout', 'integration', 'oauth', 'jwt',
    'security', 'middleware', 'supabase', 'firebase', 'api route',
    'full app', 'entire app', 'complete app', 'application architecture',
    // Soroban / smart contract indicators — always COMPLEX
    'soroban', 'smart contract', 'stellar contract', 'rust contract',
    'soroban_sdk', '#[contract]', '#[contractimpl]', 'contractimpl',
    'voting contract', 'escrow contract', 'token contract', 'nft contract',
    'dao contract', 'staking contract', 'vesting contract', 'multisig',
    'deploy contract', 'write a contract', 'build a contract', 'create a contract',
    'cargo.toml', 'soroban rust', 'stellar rust', 'wasm contract', 'sep-41',
    // Full dApp indicators — also always COMPLEX
    'voting dapp', 'escrow dapp', 'stellar dapp', 'voting app', 'escrow app',
    'full-stack stellar', 'fullstack stellar', 'dapp on stellar',
  ]
  const hasComplexKeyword = complexKeywords.some(kw => cleanPrompt.includes(kw))
  const isFreshBuild = currentFiles.length === 0 || isRestart

  if (hasComplexKeyword || (isFreshBuild && promptLength > 150) || promptLength > 600) {
    return 'COMPLEX'
  }

  // 2. SIMPLE indicators
  const moderateKeywords = [
    'component', 'add page', 'new page', 'new feature', 'chart', 'graph',
    'form', 'validation', 'modal', 'dialog', 'sidebar', 'dropdown', 'button',
    'table', 'list', 'grid', 'card', 'state', 'hook', 'function', 'class', 'create', 'add'
  ]
  const hasModerateKeyword = moderateKeywords.some(kw => cleanPrompt.includes(kw))

  const simpleKeywords = [
    'color', 'bg-', 'style', 'font', 'text', 'label', 'padding', 'margin',
    'border', 'spacing', 'typo', 'button color', 'align', 'css', 'hover',
    'explain', 'what does', 'how to', 'why', 'question', 'comment', 'docstring',
    'rename', 'tweak', 'wording', 'copy change'
  ]
  const hasSimpleKeyword = simpleKeywords.some(kw => cleanPrompt.includes(kw))

  if (hasSimpleKeyword || (promptLength < 80 && !isFreshBuild && !hasModerateKeyword)) {
    return 'SIMPLE'
  }

  // 3. Default
  return 'MODERATE'
}
