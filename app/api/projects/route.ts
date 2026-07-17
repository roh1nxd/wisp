import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
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
    const body = await req.json()
    const { userId, name = 'Untitled Project', status = 'draft' } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required to create a project' }, { status: 400 })
    }

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
