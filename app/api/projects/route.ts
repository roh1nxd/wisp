import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/db/prisma'

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({ projects })
  } catch (err: any) {
    console.error('[API - Projects GET] Error querying database:', err)
    return NextResponse.json({
      error: 'Database connection or query error during project lookup.',
      details: err.message || err
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name = 'Untitled Project', status = 'draft' } = body

    const newProject = await prisma.project.create({
      data: {
        userId,
        name,
        status,
      }
    })

    return NextResponse.json({ project: newProject })
  } catch (err: any) {
    console.error('[API - Projects POST] Error creating project in database:', err)
    return NextResponse.json({
      error: 'Database error while trying to create the project.',
      details: err.message || err
    }, { status: 500 })
  }
}
