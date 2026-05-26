import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature')
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''

  if (secret) {
    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    if (hmac !== signature) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const eventName = event.meta?.event_name
  const userId = event.meta?.custom_data?.user_id
  const subscriptionId = event.data?.id
  const customerId = event.data?.attributes?.customer_id?.toString()
  const status = event.data?.attributes?.status
  const endsAt = event.data?.attributes?.ends_at

  if (!userId) return NextResponse.json({ ok: true })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const upsertData = ['subscription_created', 'subscription_updated', 'subscription_resumed'].includes(eventName)
    ? { user_id: userId, lemonsqueezy_subscription_id: subscriptionId, lemonsqueezy_customer_id: customerId, status: status === 'active' ? 'active' : 'inactive', plan: status === 'active' ? 'pro' : 'free', current_period_end: endsAt, updated_at: new Date().toISOString() }
    : ['subscription_cancelled', 'subscription_expired'].includes(eventName)
    ? { user_id: userId, status: 'inactive', plan: 'free', updated_at: new Date().toISOString() }
    : null

  if (upsertData) {
    await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(upsertData)
    })
  }

  return NextResponse.json({ ok: true })
}
