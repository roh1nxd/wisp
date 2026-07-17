import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-6">
      <SignIn />
    </main>
  )
}
