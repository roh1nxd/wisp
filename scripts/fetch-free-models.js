async function main() {
  try {
    console.log('Fetching OpenRouter models...')
    const res = await fetch('https://openrouter.ai/api/v1/models')
    if (!res.ok) {
      throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    const freeModels = data.data.filter(m => {
      const pricing = m.pricing || {}
      return pricing.prompt === "0" && pricing.completion === "0"
    })
    
    console.log('\n--- CURRENT LIVE FREE MODELS ON OPENROUTER ---')
    freeModels.forEach(m => {
      console.log(`- ${m.name} (Slug: ${m.id})`)
    })
    console.log('----------------------------------------------\n')
  } catch (e) {
    console.error('Error fetching free models:', e.message)
  }
}

main()
