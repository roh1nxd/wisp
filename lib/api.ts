export type PlanId = 'free' | 'pro' | 'team'

export interface CheckoutResponse {
  url: string
}

/**
 * Start a billing checkout for the selected plan.
 * POST /api/billing/checkout  body: { plan: PlanId }
 */
export async function checkout(plan: PlanId): Promise<CheckoutResponse> {
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  })
  if (!res.ok) throw new Error('Failed to start checkout')
  return res.json()
}
