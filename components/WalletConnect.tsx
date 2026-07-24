'use client'

import { useState, useEffect } from 'react'

declare global {
  interface Window {
    freighterApi?: {
      isConnected: () => Promise<boolean>
      getPublicKey: () => Promise<string>
      signTransaction: (xdr: string, opts?: { network?: string }) => Promise<{ signedTxXdr?: string; error?: string }>
      signBlob: (hex: string) => Promise<string>
    }
  }
}

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check initial connection status with Freighter ONLY
    if (typeof window !== 'undefined' && window.freighterApi) {
      window.freighterApi
        .isConnected()
        .then((connected) => {
          if (connected && window.freighterApi) {
            return window.freighterApi.getPublicKey()
          }
          return null
        })
        .then((pk) => {
          if (pk) setAddress(pk)
        })
        .catch(() => {
          // Ignore connection check errors silently
        })
    }
  }, [])

  const connectFreighter = async () => {
    setLoading(true)
    setError(null)
    try {
      if (typeof window === 'undefined' || !window.freighterApi) {
        throw new Error('Freighter extension not detected. Please install Freighter for Stellar.')
      }

      const isConnected = await window.freighterApi.isConnected()
      if (!isConnected) {
        throw new Error('Please unlock your Freighter wallet.')
      }

      const pk = await window.freighterApi.getPublicKey()
      if (pk) {
        setAddress(pk)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to Freighter')
    } finally {
      setLoading(false)
    }
  }

  if (address) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-primary)]">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span>{address.slice(0, 4)}...{address.slice(-4)}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={connectFreighter}
        disabled={loading}
        className="inline-flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading ? 'Connecting...' : 'Connect Freighter'}
      </button>
      {error && <span className="text-3xs text-[var(--danger)]">{error}</span>}
    </div>
  )
}

