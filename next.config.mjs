import { readFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dir = dirname(fileURLToPath(import.meta.url))

// Auto extract the zip on start
try {
  const zipPath = 'C:\\Users\\Rohan Verma\\OneDrive\\Desktop\\code-interface-redesign (1).zip'
  const destPath = join(__dir, 'temp_unzip')
  if (existsSync(zipPath) && !existsSync(destPath)) {
    mkdirSync(destPath, { recursive: true })
    console.log(`[STARTUP] Extracting components from ${zipPath}...`)
    execSync(`powershell.exe -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force"`, { stdio: 'inherit' })
    console.log(`[STARTUP] Extraction complete!`)
  }
} catch (error) {
  console.error('[STARTUP] Zip extraction failed:', error)
}




try {
  const envContent = readFileSync(resolve(__dir, '.env.local'), 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (key) {
      process.env[key] = value
    }
  }
  
  console.log(`[STARTUP] GROQ_API_KEY read check: present = ${!!process.env.GROQ_API_KEY}, length = ${process.env.GROQ_API_KEY?.length || 0}`)
} catch {
  // .env.local not found — env vars may come from the host environment
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Expose ONLY public env vars to the client bundle.
  // CLERK_SECRET_KEY is server-side only and must NOT appear here.
  env: {
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet',
    NEXT_PUBLIC_STELLAR_HORIZON_URL: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
  },
  async headers() {
    return [
      {
        source: '/workspace',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ]
  },
  // Fix turbopack workspace root inference
  turbopack: {
    root: __dir,
  },
}

export default nextConfig
