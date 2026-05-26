import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature')
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''

  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  if (hmac !== signature) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  const event = JSON.parse(rawBody)
  const eventName = event.meta?.event_name
  const userId = event.meta?.custom_data?.user_id
  const subscriptionId = event.data?.id
  const customerId = event.data?.attributes?.customer_id?.toString()
  const status = event.data?.attributes?.status
  const endsAt = event.data?.attributes?.ends_at

  if (!userId) return NextResponse.json({ ok: true })

  if (['subscription_created', 'subscription_updated', 'subscription_resumed'].includes(eventName)) {
    await supabase.from('subscriptions').upsert({
      user_id: userId,
      lemonsqueezy_subscription_id: subscriptionId,
      lemonsqueezy_customer_id: customerId,
      status: status === 'active' ? 'active' : 'inactive',
      plan: status === 'active' ? 'pro' : 'free',
      current_period_end: endsAt,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
  }

  if (['subscription_cancelled', 'subscription_expired'].includes(eventName)) {
    await supabase.from('subscriptions').upsert({
      user_id: userId,
      status: 'inactive',
      plan: 'free',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
  }

  return NextResponse.json({ ok: true })
}
