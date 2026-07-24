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

async function run() {
  const env = loadEnv()
  const openrouterKey = env.OPENROUTER_API_KEY || ''
  const groqKey = env.GROQ_API_KEY || ''
  const geminiKey = env.GEMINI_API_KEY || ''

  // 1. Groq
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${groqKey}` }
      })
      const data = await res.json()
      fs.writeFileSync(path.join(process.cwd(), 'groq_raw.json'), JSON.stringify(data, null, 2))
    } catch (e) {
      fs.writeFileSync(path.join(process.cwd(), 'groq_raw.json'), JSON.stringify({ error: e.message }))
    }
  }

  // 2. OpenRouter
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models')
    const data = await res.json()
    fs.writeFileSync(path.join(process.cwd(), 'openrouter_raw.json'), JSON.stringify(data, null, 2))
  } catch (e) {
    fs.writeFileSync(path.join(process.cwd(), 'openrouter_raw.json'), JSON.stringify({ error: e.message }))
  }

  // 3. Gemini
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`)
      const data = await res.json()
      fs.writeFileSync(path.join(process.cwd(), 'gemini_raw.json'), JSON.stringify(data, null, 2))
    } catch (e) {
      fs.writeFileSync(path.join(process.cwd(), 'gemini_raw.json'), JSON.stringify({ error: e.message }))
    }
  }
}

run()
