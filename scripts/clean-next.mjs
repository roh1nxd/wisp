import { rmSync, existsSync } from 'fs'
import { join } from 'path'

const nextDir = join(process.cwd(), '.next')
if (existsSync(nextDir)) {
  try {
    rmSync(nextDir, { recursive: true, force: true })
    console.log('[CLEANUP] Successfully removed .next directory')
  } catch (err) {
    console.error('[CLEANUP] Error removing .next directory:', err)
  }
} else {
  console.log('[CLEANUP] .next directory does not exist')
}
