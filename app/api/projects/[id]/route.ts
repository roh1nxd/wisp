import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/db/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'asc' }
        },
        generatedFiles: {
          orderBy: { filePath: 'asc' }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (err: any) {
    console.error('[API - Projects GET ID] Error loading project:', err)
    return NextResponse.json({
      error: 'Database connection or query error during project load.',
      details: err.message || err
    }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    await prisma.project.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API - Projects DELETE ID] Error deleting project:', err)
    return NextResponse.json({
      error: 'Database error during project deletion.',
      details: err.message || err
    }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(status && { status }),
      }
    })

    return NextResponse.json({ project: updated })
  } catch (err: any) {
    console.error('[API - Projects PATCH ID] Error patching project:', err)
    return NextResponse.json({
      error: 'Database error during project update.',
      details: err.message || err
    }, { status: 500 })
  }
}
