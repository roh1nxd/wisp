// lib/api.ts
// Single source of truth for all Wisp API calls.
// An IDE agent should read this file first to infer the backend contract.
// Every function below maps 1:1 to an endpoint under /api/*.

export type PlanId = 'free' | 'pro' | 'team'

export interface Project {
  id: string
  name: string
  prompt: string
  status: 'draft' | 'generating' | 'deployed'
  network: 'testnet' | 'mainnet'
  createdAt: string
}

export interface GenerateProjectResponse {
  projectId: string
  status: Project['status']
}

export interface CheckoutResponse {
  url: string
}

/**
 * Kick off generation of a Soroban contract + frontend from a prompt.
 * POST /api/projects/generate  body: { prompt: string }
 */
export async function generateProject(prompt: string): Promise<GenerateProjectResponse> {
  // TODO: connect to POST /api/projects/generate
  const res = await fetch('/api/projects/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) throw new Error('Failed to generate project')
  return res.json()
}

/**
 * Start a billing checkout for the selected plan.
 * POST /api/billing/checkout  body: { plan: PlanId }
 */
export async function checkout(plan: PlanId): Promise<CheckoutResponse> {
  // TODO: connect to POST /api/billing/checkout
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  })
  if (!res.ok) throw new Error('Failed to start checkout')
  return res.json()
}

/**
 * List the current user's projects.
 * GET /api/projects
 */
export async function getProjects(): Promise<Project[]> {
  // TODO: connect to GET /api/projects
  const res = await fetch('/api/projects')
  if (!res.ok) throw new Error('Failed to load projects')
  return res.json()
}

/**
 * Fetch a single project by id.
 * GET /api/projects/[id]
 */
export async function getProject(id: string): Promise<Project> {
  // TODO: connect to GET /api/projects/[id]
  const res = await fetch(`/api/projects/${id}`)
  if (!res.ok) throw new Error('Failed to load project')
  return res.json()
}

/**
 * Join the Wisp waitlist / contact list.
 * POST /api/waitlist  body: { email: string }
 */
export async function joinWaitlist(email: string): Promise<{ ok: true }> {
  // TODO: connect to POST /api/waitlist
  const res = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error('Failed to join waitlist')
  return res.json()
}
