import { rmSync, existsSync } from 'fs'
import { join } from 'path'

const clerkDir = join(process.cwd(), '.clerk')
if (existsSync(clerkDir)) {
  try {
    rmSync(clerkDir, { recursive: true, force: true })
    console.log('[CLEANUP] Successfully removed .clerk directory')
  } catch (err) {
    console.error('[CLEANUP] Error removing .clerk directory:', err)
  }
} else {
  console.log('[CLEANUP] .clerk directory does not exist')
}
