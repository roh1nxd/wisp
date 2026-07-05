import { currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { WispMark } from '@/components/wisp-mark'
import { PromptBox } from '@/components/prompt-box'

export default async function DashboardPage() {
  const user = await currentUser()
  const name = user?.firstName ?? 'builder'

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <WispMark className="size-6 text-foreground" />
            <span className="text-[15px] font-semibold tracking-tight">Wisp</span>
          </Link>
          <UserButton appearance={{ elements: { avatarBox: 'size-8' } }} />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="label-caps">Welcome</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome, {name} — describe your first project.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
          Write what you want to build on Stellar. Wisp will generate the
          Soroban contract and a frontend to match.
        </p>

        <div className="mt-10">
          <PromptBox autofocus />
        </div>
      </section>
    </main>
  )
}
