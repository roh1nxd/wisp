import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { shadcn } from '@clerk/ui/themes'
import { AuroraBackground } from '@/components/aurora-background'
import { WalletGuard } from '@/components/providers/WalletGuard'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Wisp — Describe your idea. Soroban builds it.',
  description:
    'Wisp turns a plain-English product idea into a working Stellar/Soroban smart contract and frontend, auto-deployed.',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#FAF9F6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] font-sans transition-colors duration-150">
        <WalletGuard />
        <ClerkProvider
          appearance={{
            theme: shadcn,
            variables: {
              fontFamily: 'var(--font-sans)',
              colorPrimary: '#C85C39',
              colorBackground: '#FAF9F6',
              colorText: '#1C1B17',
              colorTextSecondary: '#4E4B42',
              colorInputBackground: '#F4F3EE',
              colorInputText: '#1C1B17',
              borderRadius: '12px',
            },
            elements: {
              // Custom opaque background matching our cream theme and eliminating transparency
              card: {
                backgroundColor: '#FAF9F6',
                border: '1px solid rgba(28, 27, 23, 0.16)',
                boxShadow: '0 8px 30px rgba(28, 27, 23, 0.03)',
              },
              userButtonPopoverCard: {
                backgroundColor: '#FAF9F6',
                border: '1px solid rgba(28, 27, 23, 0.16)',
                boxShadow: '0 8px 30px rgba(28, 27, 23, 0.03)',
              },
              modalContent: {
                backgroundColor: '#FAF9F6',
                border: '1px solid rgba(28, 27, 23, 0.16)',
                boxShadow: '0 20px 40px rgba(28, 27, 23, 0.08)',
              },
              navbar: {
                backgroundColor: '#F4F3EE',
                borderRight: '1px solid rgba(28, 27, 23, 0.08)',
              },
              pageScrollable: {
                backgroundColor: '#FAF9F6',
              },
              profileSection: {
                borderBottom: '1px solid rgba(28, 27, 23, 0.08)',
              },
            }
          }}
        >
          <AuroraBackground />
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ClerkProvider>
      </body>
    </html>
  )
}
