import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models')
    const data = await res.json()
    const all = data.data || []

    const openrouterFree = all.find((m: any) => m.id === 'openrouter/free')
    const openrouterAutoBeta = all.find((m: any) => m.id === 'openrouter/auto-beta')

    return NextResponse.json({
      has_openrouter_free: !!openrouterFree,
      openrouter_free_object: openrouterFree || null,
      has_openrouter_auto_beta: !!openrouterAutoBeta,
      openrouter_auto_beta_pricing: openrouterAutoBeta ? openrouterAutoBeta.pricing : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
