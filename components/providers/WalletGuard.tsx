'use client'

import { useEffect } from 'react'

/**
 * WalletGuard — Client-side component mounted in root layout to guard against
 * unhandled runtime errors & promise rejections injected by browser extensions
 * (specifically EVM/MetaMask window.ethereum auto-connect noise).
 *
 * Ensures only Stellar/Freighter wallet providers are handled by the app.
 */
export function WalletGuard() {
  useEffect(() => {
    const isWalletExtensionNoise = (msg: string) => {
      if (!msg) return false
      const lower = msg.toLowerCase()
      return (
        lower.includes('metamask') ||
        lower.includes('failed to connect to metamask') ||
        lower.includes('chrome-extension://') ||
        lower.includes('inpage.js') ||
        lower.includes('ethereum')
      )
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const reasonStr = typeof reason === 'string'
        ? reason
        : reason?.message || JSON.stringify(reason || '')

      if (isWalletExtensionNoise(reasonStr)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const handleError = (event: ErrorEvent) => {
      const msg = event.message || ''
      if (isWalletExtensionNoise(msg)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  return null
}
