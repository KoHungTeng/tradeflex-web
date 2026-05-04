import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

async function getSupabaseAndUser(request: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.headers.get('cookie')?.split(';')
            .find(c => c.trim().startsWith(name + '='))
            ?.split('=')[1]
        },
        set() {},
        remove() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getSupabaseAndUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trades } = await request.json()
  if (!Array.isArray(trades) || trades.length === 0) {
    return NextResponse.json({ error: 'No trades provided' }, { status: 400 })
  }

  const payload = trades.map((t: any) => ({ ...t, user_id: user.id }))

  const { error } = await supabase
  .from('completed_trades')
  .insert(payload)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ count: trades.length })
}