const fs = require('fs')
const path = require('path')

// Read .env.local manually
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf8')
  const env = {}
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      env[key] = val
    }
  })
  return env
}

async function verifyAllModels() {
  const env = loadEnv()
  const openrouterKey = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || ''
  const groqKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY || ''
  const geminiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''

  console.log('====================================================')
  console.log('   WISP AI MODEL PROVIDER LIVE VERIFICATION LOG   ')
  console.log('====================================================\n')

  // 1. Verify Groq Models
  console.log('--- 1. GROQ PROVIDER MODELS ---')
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${groqKey}` }
      })
      if (res.ok) {
        const data = await res.json()
        const ids = (data.data || []).map((m) => m.id)
        console.log(`[Groq] Successfully fetched ${ids.length} models:`)
        ids.forEach((id) => console.log(`  ✓ groq/${id}`))
      } else {
        console.log(`[Groq] Failed to fetch models: HTTP ${res.status} ${res.statusText}`)
      }
    } catch (err) {
      console.log(`[Groq] Exception fetching models: ${err.message}`)
    }
  } else {
    console.log('[Groq] GROQ_API_KEY not configured.')
  }

  console.log('\n--- 2. OPENROUTER FREE MODELS ---')
  if (openrouterKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models')
      if (res.ok) {
        const data = await res.json()
        const allModels = data.data || []
        const freeModels = allModels.filter((m) => {
          const isFreeId = m.id.endsWith(':free')
          const isZeroPricing = m.pricing && m.pricing.prompt === '0' && m.pricing.completion === '0'
          return isFreeId || isZeroPricing
        }).map(m => ({ id: m.id, name: m.name, context: m.context_length }))

        console.log(`[OpenRouter] Successfully fetched ${freeModels.length} free models:`)
        freeModels.forEach((m) => console.log(`  ✓ ${m.id} (${m.name} | Context: ${m.context})`))
      } else {
        console.log(`[OpenRouter] Failed: HTTP ${res.status}`)
      }
    } catch (err) {
      console.log(`[OpenRouter] Exception: ${err.message}`)
    }
  } else {
    console.log('[OpenRouter] OPENROUTER_API_KEY not configured.')
  }

  console.log('\n--- 3. GEMINI PROVIDER MODELS ---')
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`)
      if (res.ok) {
        const data = await res.json()
        const models = (data.models || []).map((m) => m.name.replace('models/', ''))
        console.log(`[Gemini] Successfully fetched ${models.length} models:`)
        models.forEach((m) => console.log(`  ✓ ${m}`))
      } else {
        console.log(`[Gemini] Failed: HTTP ${res.status} ${res.statusText}`)
      }
    } catch (err) {
      console.log(`[Gemini] Exception: ${err.message}`)
    }
  } else {
    console.log('[Gemini] GEMINI_API_KEY not configured.')
  }
}

verifyAllModels()
