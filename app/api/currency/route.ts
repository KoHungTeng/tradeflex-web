import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data } = await supabase
    .from('settings')
    .select('data')
    .eq('id', 'base_currency')
    .single()
  
  const currency = data?.data?.currency || 'USD'
  
  // 抓匯率
  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`)
    const rates = await res.json()
    return NextResponse.json({ currency, rates: rates.rates })
  } catch {
    return NextResponse.json({ currency, rates: { USD: 1, TWD: 32, EUR: 0.92, JPY: 149, CNY: 7.2 } })
  }
}

export async function POST(req: Request) {
  const { currency } = await req.json()
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 'base_currency', data: { currency } })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}