'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type CurrencyContextType = {
  currency: string
  rate: number
  symbol: string
  convert: (usdAmount: number) => string
  setCurrency: (currency: string) => void
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  rate: 1,
  symbol: '$',
  convert: (n) => n.toFixed(0),
  setCurrency: () => {},
})

const SYMBOLS: Record<string, string> = {
  USD: '$',
  TWD: 'NT$',
  EUR: '€',
  JPY: '¥',
  CNY: '¥',
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('USD')
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 })

  useEffect(() => {
    fetch('/api/currency').then(r => r.json()).then(data => {
      setCurrencyState(data.currency || 'USD')
      setRates(data.rates || { USD: 1 })
    })
  }, [])

  const rate = rates[currency] || 1
  const symbol = SYMBOLS[currency] || currency

  function convert(usdAmount: number): string {
    const converted = usdAmount * rate
    if (currency === 'JPY') return `${symbol}${Math.round(converted).toLocaleString()}`
    return `${symbol}${converted.toFixed(0)}`
  }

  async function setCurrency(newCurrency: string) {
    setCurrencyState(newCurrency)
    await fetch('/api/currency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: newCurrency }),
    })
  }

  return (
    <CurrencyContext.Provider value={{ currency, rate, symbol, convert, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}