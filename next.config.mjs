import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dir = dirname(fileURLToPath(import.meta.url))

// Remove legacy keyless .clerk directory if it exists to prevent credentials conflict
try {
  const clerkDir = join(__dir, '.clerk')
  if (existsSync(clerkDir)) {
    rmSync(clerkDir, { recursive: true, force: true })
    console.log('[STARTUP] Cleaned up legacy .clerk folder to prevent credentials conflict.')
  }
} catch (e) {
  console.error('[STARTUP] Failed to remove .clerk folder:', e)
}

// Auto extract the zip on start (dev only)
if (process.env.NODE_ENV === 'development') {
  try {
    const zipPath = join(__dir, 'temp_unzip', 'code-interface-redesign.zip')
    const destPath = join(__dir, 'temp_unzip')
    if (existsSync(zipPath) && !existsSync(join(destPath, 'extracted'))) {
      mkdirSync(destPath, { recursive: true })
      console.log(`[STARTUP] Extracting components from ${zipPath}...`)
      execSync(`powershell.exe -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force"`, { stdio: 'inherit' })
      console.log(`[STARTUP] Extraction complete!`)
    }
  } catch (error) {
    console.error('[STARTUP] Zip extraction failed:', error)
  }
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
        source: '/workspace(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
      {
        source: '/api/preview/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
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
