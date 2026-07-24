/**
 * app/api/plan/route.ts
 *
 * Thin REST wrapper around app/lib/planFile.ts helpers.
 * Client code must use these endpoints instead of importing planFile directly
 * because fs is only available on the server.
 *
 * POST   /api/plan  { projectId, content }      → { id, path }
 * GET    /api/plan?path=<absolute>               → { content }
 * PUT    /api/plan  { path, content }            → { ok: true }
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { savePlan, getPlan, updatePlan } from '@/app/lib/planFile'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, content } = body

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'content must be a string' }, { status: 400 })
    }

    const result = savePlan(projectId, content)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[API /api/plan POST]', err)
    return NextResponse.json({ error: err.message || 'Failed to save plan' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'path query param is required' }, { status: 400 })
    }

    const content = getPlan(filePath)
    return NextResponse.json({ content })
  } catch (err: any) {
    console.error('[API /api/plan GET]', err)
    return NextResponse.json({ error: err.message || 'Failed to read plan' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { path: filePath, content } = body

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'content must be a string' }, { status: 400 })
    }

    updatePlan(filePath, content)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[API /api/plan PUT]', err)
    return NextResponse.json({ error: err.message || 'Failed to update plan' }, { status: 500 })
  }
}
