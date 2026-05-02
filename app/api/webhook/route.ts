import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // TradingView 傳來的格式：
    // {
    //   "symbol": "MES",
    //   "action": "做多",
    //   "price": 5800,
    //   "quantity": 1,
    //   "strategy": "60k CISD",
    //   "big_macd_dif": 12.5,
    //   "big_macd_dea": 10.2,
    //   "big_macd_hist": 2.3,
    //   "big_rsi": 65.4,
    //   "big_kdj_k": 72.1,
    //   "big_kdj_d": 68.3,
    //   "big_kdj_j": 79.7,
    //   "small_macd_dif": 3.2,
    //   "small_macd_dea": 2.8,
    //   "small_macd_hist": 0.4,
    //   "small_rsi": 58.2,
    //   "small_kdj_k": 61.4,
    //   "small_kdj_d": 59.8,
    //   "small_kdj_j": 64.2,
    //   "portfolio_id": "your-portfolio-uuid"
    // }

    // 取得預設投資組合
    let portfolioId = body.portfolio_id
    if (!portfolioId) {
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id')
        .limit(1)
        .single()
      portfolioId = portfolios?.id
    }

    if (!portfolioId) {
      return NextResponse.json({ error: 'No portfolio found' }, { status: 400 })
    }

    const tradeData = {
      portfolio_id: portfolioId,
      symbol: body.symbol?.toUpperCase() || '',
      action: body.action || '做多',
      price: parseFloat(body.price) || 0,
      quantity: parseFloat(body.quantity) || 1,
      fee: parseFloat(body.fee) || 0,
      strategy: body.strategy || '',
      remark: body.remark || 'TradingView 自動匯入',
      trade_time: new Date().toISOString(),
      big_dif: body.big_macd_dif || null,
      big_dea: body.big_macd_dea || null,
      big_hist: body.big_macd_hist || null,
      big_rsi: body.big_rsi || null,
      big_k: body.big_kdj_k || null,
      big_d: body.big_kdj_d || null,
      big_j: body.big_kdj_j || null,
      small_dif: body.small_macd_dif || null,
      small_dea: body.small_macd_dea || null,
      small_hist: body.small_macd_hist || null,
      small_rsi: body.small_rsi || null,
      small_k: body.small_kdj_k || null,
      small_d: body.small_kdj_d || null,
      small_j: body.small_kdj_j || null,
    }

    // 儲存交易
    const { data: trade, error } = await supabase
      .from('trades')
      .insert(tradeData)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 平倉時自動計算盈虧
    const isClose = tradeData.action === '平多' || tradeData.action === '平空'
    if (isClose) {
      const direction = tradeData.action === '平多' ? 'long' : 'short'
      const openAction = direction === 'long' ? '做多' : '做空'

      const { data: openTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('symbol', tradeData.symbol)
        .eq('action', openAction)
        .order('trade_time', { ascending: false })
        .limit(1)

      if (openTrades && openTrades.length > 0) {
        const openTrade = openTrades[0]
        let pnl = direction === 'long'
          ? (tradeData.price - openTrade.price) * tradeData.quantity
          : (openTrade.price - tradeData.price) * tradeData.quantity
        pnl = pnl - (openTrade.fee || 0) - (tradeData.fee || 0)

        await supabase.from('completed_trades').insert({
          portfolio_id: portfolioId,
          symbol: tradeData.symbol,
          direction,
          open_price: openTrade.price,
          close_price: tradeData.price,
          quantity: tradeData.quantity,
          open_fee: openTrade.fee || 0,
          close_fee: tradeData.fee || 0,
          open_time: openTrade.trade_time,
          close_time: tradeData.trade_time,
          strategy: tradeData.strategy || openTrade.strategy || '',
          pnl: Math.round(pnl * 100) / 100,
          big_dif: openTrade.big_dif,
          big_dea: openTrade.big_dea,
          big_hist: openTrade.big_hist,
          big_rsi: openTrade.big_rsi,
          big_k: openTrade.big_k,
          big_d: openTrade.big_d,
          big_j: openTrade.big_j,
          small_dif: openTrade.small_dif,
          small_dea: openTrade.small_dea,
          small_hist: openTrade.small_hist,
          small_rsi: openTrade.small_rsi,
          small_k: openTrade.small_k,
          small_d: openTrade.small_d,
          small_j: openTrade.small_j,
        })
      }
    }

    return NextResponse.json({ success: true, trade })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}