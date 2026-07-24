import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/db/prisma'

export async function GET(_req: NextRequest) {
  try {
    let userId: string | null = null
    try {
      const authData = await auth()
      userId = authData.userId || null
    } catch {
      userId = null
    }

    // Group by slug to count likes per skill
    const likeCountsGroup = await prisma.skillLike.groupBy({
      by: ['slug'],
      _count: {
        slug: true,
      },
    })

    const likesMap: Record<string, number> = {}
    likeCountsGroup.forEach((item) => {
      likesMap[item.slug] = item._count.slug
    })

    // Fetch user's own liked skills if signed in
    let userLikes: string[] = []
    if (userId) {
      const userLikesRecords = await prisma.skillLike.findMany({
        where: { userId },
        select: { slug: true },
      })
      userLikes = userLikesRecords.map((r) => r.slug)
    }

    return NextResponse.json({
      likes: likesMap,
      userLikes,
    })
  } catch (error: any) {
    console.error('[API - Skill Likes] Error fetching skill likes:', error)
    return NextResponse.json(
      { likes: {}, userLikes: [] },
      { status: 200 }
    )
  }
}
