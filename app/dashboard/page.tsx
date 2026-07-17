import { auth } from '@clerk/nextjs/server'
import DashboardClient from './DashboardClient'

export default async function Page() {
  const { userId, redirectToSignIn } = await auth()
  if (!userId) return redirectToSignIn()
  return <DashboardClient />
}
