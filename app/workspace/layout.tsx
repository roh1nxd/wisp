import { Suspense } from 'react'

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <Suspense fallback={
        <div>
          Loading workspace...
        </div>
      }>
        {children}
      </Suspense>
    </div>
  )
}
