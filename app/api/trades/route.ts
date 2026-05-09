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

export async function GET(request: NextRequest) {
  const { supabase, user } = await getSupabaseAndUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const portfolioId = searchParams.get('portfolio_id')
  let query = supabase.from('trades').select('*').eq('user_id', user.id).order('trade_time', { ascending: false })
  if (portfolioId) query = query.eq('portfolio_id', portfolioId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getSupabaseAndUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()

  const { data: trade, error } = await supabase.from('trades').insert({ ...body, user_id: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const isClose = body.action === '平多' || body.action === '平空'
  if (isClose) {
    const direction = body.action === '平多' ? 'long' : 'short'
    const openAction = direction === 'long' ? '做多' : '做空'
    const { data: openTrades } = await supabase
      .from('trades').select('*').eq('portfolio_id', body.portfolio_id).eq('symbol', body.symbol)
      .eq('action', openAction).eq('user_id', user.id).neq('is_closed', true).order('trade_time', { ascending: false }).limit(1)

    if (openTrades && openTrades.length > 0) {
      const openTrade = openTrades[0]
      const { data: symbolData } = await supabase.from('symbols').select('tick_size, tick_value').eq('name', body.symbol).single()
      let pnl = 0
      if (symbolData && symbolData.tick_size > 0) {
        const priceDiff = direction === 'long' ? body.price - openTrade.price : openTrade.price - body.price
        pnl = (priceDiff / symbolData.tick_size) * symbolData.tick_value * body.quantity
      } else {
        pnl = direction === 'long' ? (body.price - openTrade.price) * body.quantity : (openTrade.price - body.price) * body.quantity
      }
      pnl = pnl - (openTrade.fee || 0) - (body.fee || 0)

      await supabase.from('completed_trades').insert({
        portfolio_id: body.portfolio_id, symbol: body.symbol, direction,
        open_price: openTrade.price, close_price: body.price, quantity: body.quantity,
        open_fee: openTrade.fee || 0, close_fee: body.fee || 0,
        open_time: openTrade.trade_time, close_time: body.trade_time,
        strategy: body.strategy || openTrade.strategy || '',
        remark: body.remark || openTrade.remark || '',
        open_remark: openTrade.remark || '',
        close_remark: body.remark || '',
        tp: openTrade.tp || 0,
        sl: openTrade.sl || 0,
        pnl: Math.round(pnl * 100) / 100,
        big_dif: openTrade.big_dif, big_dea: openTrade.big_dea, big_hist: openTrade.big_hist,
        big_rsi: openTrade.big_rsi, big_k: openTrade.big_k, big_d: openTrade.big_d, big_j: openTrade.big_j,
        small_dif: openTrade.small_dif, small_dea: openTrade.small_dea, small_hist: openTrade.small_hist,
        small_rsi: openTrade.small_rsi, small_k: openTrade.small_k, small_d: openTrade.small_d, small_j: openTrade.small_j,
        user_id: user.id,
      })

      // 把開倉單的 tp/sl 更新到平倉單
      await supabase.from('trades').update({ tp: openTrade.tp || 0, sl: openTrade.sl || 0, open_price: openTrade.price || 0 })
  .eq('id', trade.id)
  .eq('user_id', user.id)

      // 標記開倉單為已平倉
      await supabase.from('trades').update({ is_closed: true })
        .eq('id', openTrade.id)
        .eq('user_id', user.id)
    }
  }

  return NextResponse.json(trade)
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getSupabaseAndUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    const { error } = await supabase.from('trades').delete().eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  const { data: trade } = await supabase.from('trades').select('*').eq('id', id).eq('user_id', user.id).single()
  const { error } = await supabase.from('trades').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (trade) {
    const tradeTime = new Date(trade.trade_time)
    const from = new Date(tradeTime.getTime() - 5000).toISOString()
    const to = new Date(tradeTime.getTime() + 5000).toISOString()
    if (trade.action === '平多' || trade.action === '平空') {
      await supabase.from('completed_trades').delete().eq('portfolio_id', trade.portfolio_id).eq('symbol', trade.symbol).eq('user_id', user.id).gte('close_time', from).lte('close_time', to)
    } else {
      await supabase.from('completed_trades').delete().eq('portfolio_id', trade.portfolio_id).eq('symbol', trade.symbol).eq('user_id', user.id).gte('open_time', from).lte('open_time', to)
    }
  }
  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getSupabaseAndUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const body = await request.json()
  const { error } = await supabase.from('trades').update(body).eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}