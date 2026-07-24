const fs = require('fs')
const path = require('path')

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

async function fetchRawModelIds() {
  const env = loadEnv()
  const openrouterKey = env.OPENROUTER_API_KEY || ''
  const groqKey = env.GROQ_API_KEY || ''
  const geminiKey = env.GEMINI_API_KEY || ''

  const output = {
    groq_raw_ids: [],
    openrouter_free_raw_ids: [],
    openrouter_all_raw_ids: [],
    gemini_raw_ids: [],
  }

  // 1. Groq
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${groqKey}` }
      })
      if (res.ok) {
        const data = await res.json()
        output.groq_raw_ids = (data.data || []).map((m) => m.id)
      }
    } catch (e) {}
  }

  // 2. OpenRouter
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models')
    if (res.ok) {
      const data = await res.json()
      const all = data.data || []
      output.openrouter_all_raw_ids = all.map((m) => m.id)
      output.openrouter_free_raw_ids = all
        .filter((m) => {
          const isFreeId = m.id.endsWith(':free')
          const isZero = m.pricing && m.pricing.prompt === '0' && m.pricing.completion === '0'
          return isFreeId || isZero
        })
        .map((m) => m.id)
    }
  } catch (e) {}

  // 3. Gemini
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`)
      if (res.ok) {
        const data = await res.json()
        output.gemini_raw_ids = (data.models || []).map((m) => m.name.replace('models/', ''))
      }
    } catch (e) {}
  }

  fs.writeFileSync(path.join(process.cwd(), 'raw_models_output.json'), JSON.stringify(output, null, 2))
  console.log('Saved raw model IDs to raw_models_output.json')
}

fetchRawModelIds()
