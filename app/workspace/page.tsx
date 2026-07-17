import { auth } from '@clerk/nextjs/server'
import WorkspaceClient from './WorkspaceClient'

export default async function Page() {
  const { userId, redirectToSignIn } = await auth()
  if (!userId) return redirectToSignIn()
  return <WorkspaceClient />
}
