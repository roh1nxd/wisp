const fs = require('fs')
const path = require('path')

async function checkOpenRouterFree() {
  const res = await fetch('https://openrouter.ai/api/v1/models')
  const data = await res.json()
  const all = data.data || []

  const openrouterFree = all.find(m => m.id === 'openrouter/free')
  const openrouterAutoBeta = all.find(m => m.id === 'openrouter/auto-beta')
  const openrouterAuto = all.find(m => m.id === 'openrouter/auto')

  console.log('=== OPENROUTER FREE ENTRY CHECK ===')
  console.log('openrouter/free exists in catalog?:', !!openrouterFree)
  if (openrouterFree) {
    console.log('RAW JSON for openrouter/free:')
    console.log(JSON.stringify(openrouterFree, null, 2))
  } else {
    console.log('openrouter/free is NOT in raw /api/v1/models catalog!')
  }

  console.log('\n=== OPENROUTER AUTO BETA CHECK ===')
  console.log('openrouter/auto-beta exists in catalog?:', !!openrouterAutoBeta)
  if (openrouterAutoBeta) {
    console.log('Pricing for openrouter/auto-beta:', JSON.stringify(openrouterAutoBeta.pricing, null, 2))
  }

  console.log('\n=== OPENROUTER AUTO CHECK ===')
  console.log('openrouter/auto exists in catalog?:', !!openrouterAuto)
  if (openrouterAuto) {
    console.log('Pricing for openrouter/auto:', JSON.stringify(openrouterAuto.pricing, null, 2))
  }
}

checkOpenRouterFree()
