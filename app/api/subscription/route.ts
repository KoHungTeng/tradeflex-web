import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const ENABLE_BILLING = process.env.ENABLE_BILLING === 'true'

export async function GET() {
  if (!ENABLE_BILLING) {
    return NextResponse.json({ plan: 'pro', status: 'active' })
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ plan: 'free', status: 'inactive' })

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (!data) return NextResponse.json({ plan: 'free', status: 'inactive' })
  return NextResponse.json({ plan: data.plan, status: data.status, current_period_end: data.current_period_end })
}
