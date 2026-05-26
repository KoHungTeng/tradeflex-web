'use client'
import { useState, useEffect } from 'react'

type Subscription = {
  plan: 'free' | 'pro'
  status: 'active' | 'inactive'
  current_period_end?: string
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription>({ plan: 'pro', status: 'active' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subscription')
      .then(r => r.json())
      .then(data => { setSubscription(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const isPro = subscription.plan === 'pro' && subscription.status === 'active'

  async function upgrade() {
    const res = await fetch('/api/subscription/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  return { subscription, loading, isPro, upgrade }
}
