import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import WorkspaceClient from './WorkspaceClient'

export default async function WorkspacePage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }
  return <WorkspaceClient />
}
