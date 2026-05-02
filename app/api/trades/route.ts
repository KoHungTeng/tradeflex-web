import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const portfolioId = searchParams.get('portfolio_id')

  let query = supabase
    .from('trades')
    .select('*')
    .order('trade_time', { ascending: false })

  if (portfolioId) query = query.eq('portfolio_id', portfolioId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // 1. 儲存交易記錄
  const { data: trade, error } = await supabase
    .from('trades')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 2. 如果是平倉，自動配對開倉並計算盈虧
  const isClose = body.action === '平多' || body.action === '平空'
  if (isClose) {
    const direction = body.action === '平多' ? 'long' : 'short'
    const openAction = direction === 'long' ? '做多' : '做空'

    // 找最近一筆對應的開倉
    const { data: openTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('portfolio_id', body.portfolio_id)
      .eq('symbol', body.symbol)
      .eq('action', openAction)
      .order('trade_time', { ascending: false })
      .limit(10)

    if (openTrades && openTrades.length > 0) {
      const openTrade = openTrades[0]

      // 計算盈虧（簡單計算，之後可以加 tick 計算）
      let pnl = 0
      if (direction === 'long') {
        pnl = (body.price - openTrade.price) * body.quantity
      } else {
        pnl = (openTrade.price - body.price) * body.quantity
      }
      pnl = pnl - (openTrade.fee || 0) - (body.fee || 0)

      // 建立已平倉記錄
      await supabase.from('completed_trades').insert({
        portfolio_id: body.portfolio_id,
        symbol: body.symbol,
        direction,
        open_price: openTrade.price,
        close_price: body.price,
        quantity: body.quantity,
        open_fee: openTrade.fee || 0,
        close_fee: body.fee || 0,
        open_time: openTrade.trade_time,
        close_time: body.trade_time,
        strategy: body.strategy || openTrade.strategy || '',
        remark: body.remark || openTrade.remark || '',
        pnl: Math.round(pnl * 100) / 100,
      })
    }
  }

  return NextResponse.json(trade)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('trades').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}