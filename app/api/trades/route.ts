import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 取得所有交易
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const portfolioId = searchParams.get('portfolio_id')

  let query = supabase
    .from('trades')
    .select('*')
    .order('trade_time', { ascending: false })

  if (portfolioId) {
    query = query.eq('portfolio_id', portfolioId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// 新增交易
export async function POST(request: NextRequest) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('trades')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// 刪除交易
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}