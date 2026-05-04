import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function getSupabaseAndUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getSupabaseAndUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const portfolioId = searchParams.get('portfolio_id')
  let query = supabase.from('completed_trades').select('*').eq('user_id', user.id).order('close_time', { ascending: false })
  if (portfolioId) query = query.eq('portfolio_id', portfolioId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getSupabaseAndUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { data, error } = await supabase.from('completed_trades').insert({ ...body, user_id: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getSupabaseAndUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const trade_time = searchParams.get('trade_time')
  const symbol = searchParams.get('symbol')
  const action = searchParams.get('action')
  const portfolio_id = searchParams.get('portfolio_id')
  if (!trade_time || !symbol || !action || !portfolio_id) return NextResponse.json({ error: 'missing params' }, { status: 400 })
  const tradeTime = new Date(trade_time)
  const from = new Date(tradeTime.getTime() - 10000).toISOString()
  const to = new Date(tradeTime.getTime() + 10000).toISOString()
  if (action === '平多' || action === '平空') {
    await supabase.from('completed_trades').delete().eq('portfolio_id', portfolio_id).eq('symbol', symbol).eq('user_id', user.id).gte('close_time', from).lte('close_time', to)
  } else {
    await supabase.from('completed_trades').delete().eq('portfolio_id', portfolio_id).eq('symbol', symbol).eq('user_id', user.id).gte('open_time', from).lte('open_time', to)
  }
  return NextResponse.json({ success: true })
}