'use client'

import { useState } from 'react'

type Props = {
  activePortfolio: string
  onAdded: () => void
}

export default function TradeForm({ activePortfolio, onAdded }: Props) {
  const [symbol, setSymbol] = useState('')
  const [action, setAction] = useState('做多')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [fee, setFee] = useState('0')
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')
  const [strategy, setStrategy] = useState('')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!symbol || !price) return
    setSubmitting(true)

    await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: activePortfolio,
        symbol: symbol.toUpperCase(),
        action,
        price: parseFloat(price),
        quantity: parseFloat(quantity),
        fee: parseFloat(fee) * parseFloat(quantity),
        tp: tp ? parseFloat(tp) : 0,
        sl: sl ? parseFloat(sl) : 0,
        strategy,
        remark,
        trade_time: new Date().toISOString(),
      }),
    })

    setSymbol(''); setPrice(''); setQuantity('1')
    setFee('0'); setTp(''); setSl('')
    setStrategy(''); setRemark('')
    setSubmitting(false)
    onAdded()
  }

  const isOpen = action === '做多' || action === '做空'

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-400">新增交易</h2>

      {/* 動作切換 */}
      <div className="grid grid-cols-4 gap-1">
        {['做多', '做空', '平多', '平空'].map(a => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className={`py-1.5 rounded text-xs font-medium transition-colors ${
              action === a
                ? a === '做多' || a === '平多' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="標的">
          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            placeholder="MES, MNQ..."
            className="input"
          />
        </Field>

        <Field label="價格">
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.00"
            type="number"
            step="0.01"
            className="input"
          />
        </Field>

        <div className="flex gap-2">
          <Field label="口數" className="flex-1">
            <input
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              type="number"
              className="input"
            />
          </Field>
          <Field label="手續費/口" className="flex-1">
            <input
              value={fee}
              onChange={e => setFee(e.target.value)}
              type="number"
              step="0.01"
              className="input"
            />
          </Field>
        </div>

        {isOpen && (
          <div className="flex gap-2">
            <Field label="TP" className="flex-1">
              <input
                value={tp}
                onChange={e => setTp(e.target.value)}
                placeholder="選填"
                type="number"
                step="0.01"
                className="input"
              />
            </Field>
            <Field label="SL" className="flex-1">
              <input
                value={sl}
                onChange={e => setSl(e.target.value)}
                placeholder="選填"
                type="number"
                step="0.01"
                className="input"
              />
            </Field>
          </div>
        )}

        <Field label="策略">
          <input
            value={strategy}
            onChange={e => setStrategy(e.target.value)}
            placeholder="選填"
            className="input"
          />
        </Field>

        <Field label="備註">
          <input
            value={remark}
            onChange={e => setRemark(e.target.value)}
            placeholder="選填"
            className="input"
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            action === '做多' || action === '平多'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {submitting ? '新增中...' : `確認${action}`}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {children}
    </div>
  )
}