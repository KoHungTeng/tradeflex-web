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
    .eq('id', 'initial_capital')
    .single()
  return NextResponse.json({ amount: data?.data?.amount || 10000 })
}

export async function POST(req: Request) {
  const { amount } = await req.json()
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 'initial_capital', data: { amount } })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}