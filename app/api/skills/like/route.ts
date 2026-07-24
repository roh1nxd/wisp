import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Sign in to like skills' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { slug } = body

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    const cleanSlug = slug.replace(/^\//, '')

    // Check if user already liked this skill
    const existingLike = await prisma.skillLike.findUnique({
      where: {
        slug_userId: {
          slug: cleanSlug,
          userId,
        },
      },
    })

    let liked = false

    if (existingLike) {
      // Unlike
      await prisma.skillLike.delete({
        where: {
          id: existingLike.id,
        },
      })
      liked = false
    } else {
      // Like
      await prisma.skillLike.create({
        data: {
          slug: cleanSlug,
          userId,
        },
      })
      liked = true
    }

    // Fetch updated count
    const count = await prisma.skillLike.count({
      where: { slug: cleanSlug },
    })

    return NextResponse.json({ liked, count, slug: cleanSlug })
  } catch (error: any) {
    console.error('[API - Skill Like] Error toggling skill like:', error)
    return NextResponse.json(
      { error: 'Failed to toggle like', details: error?.message },
      { status: 500 }
    )
  }
}
