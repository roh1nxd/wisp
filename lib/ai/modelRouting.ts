export interface ModelRoutingConfig {
  SIMPLE: string
  MODERATE: string
  COMPLEX: string
}

export const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'deepseek-r1-distill-llama-70b',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
]

export function isGroqModel(modelName: string): boolean {
  return (
    GROQ_MODELS.includes(modelName) ||
    GROQ_MODELS.includes(modelName.replace(/^groq\//, '')) ||
    modelName.startsWith('groq/')
  )
}

export function isLightweightModel(modelName?: string): boolean {
  if (!modelName) return false
  const name = modelName.replace(/^groq\//, '').toLowerCase()
  return name.includes('8b') || name.includes('9b') || name.includes('instant') || name.includes('mini')
}

export function isDesignRequest(promptText?: string): boolean {
  if (!promptText) return false
  const p = promptText.toLowerCase()
  const designKeywords = [
    'css', 'style', 'styling', 'design', 'ui', 'beautiful', 'portfolio',
    'theme', 'animation', 'landing page', 'layout', 'responsive', 'glassmorphism',
    'hero', 'card', 'navbar', 'gradient', 'font', 'color'
  ]
  return designKeywords.some((kw) => p.includes(kw))
}

// Starting model per tier (verified models per provider)
export const TIER_STARTING_MODELS: ModelRoutingConfig = {
  SIMPLE: 'llama-3.1-8b-instant',
  MODERATE: 'llama-3.3-70b-versatile',
  COMPLEX: 'gemini-2.0-flash',
}

export const TIER_MAX_TOKENS = {
  SIMPLE: 4096,
  MODERATE: 8192,
  COMPLEX: 8192,
} as const

// Known TPM/context capacity limits per model
export const MODEL_TPM_LIMITS: Record<string, number> = {
  'llama-3.1-8b-instant': 6000,
  'groq/llama-3.1-8b-instant': 6000,
  'openai/gpt-oss-20b': 8000,
  'groq/compound-mini': 8000,
  'qwen/qwen-2.5-coder-32b-instruct:free': 32768,
  'llama-3.3-70b-versatile': 128000,
  'groq/llama-3.3-70b-versatile': 128000,
  'deepseek-r1-distill-llama-70b': 128000,
  'groq/deepseek-r1-distill-llama-70b': 128000,
  'meta-llama/llama-3.3-70b-instruct:free': 128000,
  'deepseek/deepseek-r1:free': 160000,
  'cohere/north-mini-code:free': 256000,
  'gemini-2.0-flash': 1000000,
  'gemini-3-flash-preview': 1000000,
  'google/gemini-2.0-flash-exp:free': 1000000,
}

/**
 * Roughly estimates prompt token count (~4 characters per token).
 */
export function estimatePromptTokens(prompt: string, currentFiles: any[] = []): number {
  let charCount = (prompt || '').length + 3500 // Base overhead for system prompt
  for (const f of currentFiles) {
    charCount += (f.path || '').length + (f.content || '').length
  }
  return Math.ceil(charCount / 4)
}

/**
 * Filters model pool to exclude models whose TPM limit is smaller than estimatedPromptTokens.
 * If all models are smaller than the estimate, falls back to the largest-capacity model available.
 */
export function filterModelsByTokenEstimate(models: string[], estimatedTokens: number): string[] {
  const suitable = models.filter((m) => {
    const limit = MODEL_TPM_LIMITS[m] || 100000
    return limit >= estimatedTokens
  })

  if (suitable.length > 0) {
    return suitable
  }

  // Edge case: if all pool models are below estimatedTokens, return the largest capacity model
  const sorted = [...models].sort(
    (a, b) => (MODEL_TPM_LIMITS[b] || 100000) - (MODEL_TPM_LIMITS[a] || 100000)
  )
  console.warn(
    `[Model Routing] All candidate models have TPM limits below ${estimatedTokens} estimated tokens. Using largest available: ${sorted[0]}`
  )
  return [sorted[0]]
}

/**
 * Returns the fallback pool of models for a given tier.
 * Only contains model IDs verified against live provider APIs (2026-07-21).
 */
export function getFallbackPool(
  tier: 'SIMPLE' | 'MODERATE' | 'COMPLEX',
  hasGroqKey: boolean = true
): string[] {
  const baseOpenRouterPool = [
    // Verified 2026-07-21: Gemini 2.0 Flash Exp (1.04M context, pricing: 0/0 free)
    'google/gemini-2.0-flash-exp:free',
    // Verified 2026-07-21: Llama 3.3 70B Instruct (128k context, pricing: 0/0 free)
    'meta-llama/llama-3.3-70b-instruct:free',
    // Verified 2026-07-21: Qwen 2.5 Coder 32B Instruct (32k context, pricing: 0/0 free)
    'qwen/qwen-2.5-coder-32b-instruct:free',
    // Verified 2026-07-21: DeepSeek R1 (160k context, pricing: 0/0 free)
    'deepseek/deepseek-r1:free',
    // Verified 2026-07-21: Cohere North Mini Code (256k context, pricing: 0/0 free)
    'cohere/north-mini-code:free',
  ]

  if (!hasGroqKey) {
    return baseOpenRouterPool
  }

  switch (tier) {
    case 'SIMPLE':
      return [
        // Verified 2026-07-21: Gemini 2.0 Flash (Direct Gemini API / 1M context)
        'gemini-2.0-flash',
        // Verified 2026-07-21: Groq Llama 3.1 8B Instant (Fast, 128k context)
        'llama-3.1-8b-instant',
        // Verified 2026-07-21: Groq Llama 3.3 70B Versatile (High quality, 128k context)
        'llama-3.3-70b-versatile',
        // Verified 2026-07-21: OpenRouter Llama 3.3 70B Instruct (pricing: 0/0 free)
        'meta-llama/llama-3.3-70b-instruct:free',
        // Verified 2026-07-21: OpenRouter Cohere North Mini Code (pricing: 0/0 free)
        'cohere/north-mini-code:free',
      ]
    case 'MODERATE':
      return [
        // Verified 2026-07-21: Gemini 2.0 Flash (Direct Gemini API / 1M context)
        'gemini-2.0-flash',
        // Verified 2026-07-21: Groq Llama 3.3 70B Versatile (128k context)
        'llama-3.3-70b-versatile',
        // Verified 2026-07-21: Groq DeepSeek R1 Distill Llama 70B
        'deepseek-r1-distill-llama-70b',
        // Verified 2026-07-21: OpenRouter Llama 3.3 70B Instruct (pricing: 0/0 free)
        'meta-llama/llama-3.3-70b-instruct:free',
        // Verified 2026-07-21: OpenRouter Qwen 2.5 Coder 32B (pricing: 0/0 free)
        'qwen/qwen-2.5-coder-32b-instruct:free',
      ]
    case 'COMPLEX':
      return [
        // Verified 2026-07-21: Gemini 2.0 Flash (Direct Gemini API / 1M context)
        'gemini-2.0-flash',
        // Verified 2026-07-21: Groq Llama 3.3 70B Versatile (128k context)
        'llama-3.3-70b-versatile',
        // Verified 2026-07-21: Groq DeepSeek R1 Distill Llama 70B
        'deepseek-r1-distill-llama-70b',
        // Verified 2026-07-21: OpenRouter Llama 3.3 70B Instruct (pricing: 0/0 free)
        'meta-llama/llama-3.3-70b-instruct:free',
        // Verified 2026-07-21: OpenRouter DeepSeek R1 (pricing: 0/0 free)
        'deepseek/deepseek-r1:free',
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
