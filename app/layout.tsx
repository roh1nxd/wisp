import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { AuroraBackground } from '@/components/aurora-background'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Wisp — Describe your idea. Soroban builds it.',
  description:
    'Wisp turns a plain-English product idea into a working Stellar/Soroban smart contract and frontend, auto-deployed.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#070710',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        theme: dark,
        variables: {
          colorBackground: '#0b1020',
          colorPrimary: '#6c4cf0',
          borderRadius: '0.9rem',
        },
        elements: {
          card: 'border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl',
          formButtonPrimary:
            'bg-white text-black hover:bg-white/90 normal-case font-medium',
        },
      }}
    >
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
        <body className="font-sans antialiased">
          <AuroraBackground />
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </body>
      </html>
    </ClerkProvider>
  )
}
