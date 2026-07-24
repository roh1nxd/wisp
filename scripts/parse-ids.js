const fs = require('fs')
const path = require('path')

const openrouterContent = fs.readFileSync(
  path.join(process.env.USERPROFILE, '.gemini', 'antigravity-ide', 'brain', '76f623de-ac5d-4df2-a869-d28e36730f79', '.system_generated', 'steps', '569', 'content.md'),
  'utf8'
)

// Extract JSON line
const jsonLine = openrouterContent.split('\n').find(l => l.startsWith('{"data":'))
if (!jsonLine) {
  console.log('Could not find JSON line')
  process.exit(1)
}

const data = JSON.parse(jsonLine)
const allModels = data.data || []
const allIds = allModels.map(m => m.id)
const freeModels = allModels.filter(m => {
  const isFreeId = m.id.endsWith(':free')
  const isZero = m.pricing && m.pricing.prompt === '0' && m.pricing.completion === '0'
  return isFreeId || isZero
}).map(m => m.id)

console.log('TOTAL OPENROUTER MODELS:', allIds.length)
console.log('FREE OPENROUTER MODEL IDs:')
console.log(JSON.stringify(freeModels, null, 2))

console.log('\nCHECKING SPECIFIC IDs:')
console.log('cohere/north-mini-code:free IN OPENROUTER API?:', allIds.includes('cohere/north-mini-code:free'))
console.log('openrouter/free IN OPENROUTER API?:', allIds.includes('openrouter/free'))
console.log('openrouter/auto-beta IN OPENROUTER API?:', allIds.includes('openrouter/auto-beta'))
console.log('openrouter/auto IN OPENROUTER API?:', allIds.includes('openrouter/auto'))
