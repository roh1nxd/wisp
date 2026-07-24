import { NextRequest, NextResponse } from 'next/server'
import { listSkills, getSkill } from '@/lib/skills'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (slug) {
    const skill = getSkill(slug)
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }
    return NextResponse.json({ skill })
  }

  const skills = listSkills()
  return NextResponse.json({ skills })
}
