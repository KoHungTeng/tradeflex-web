'use client'

import { useState } from 'react'

type Props = {
  activePortfolio: string
  onAdded: (trade: any) => void
  onCompletedChanged: () => void
}

export default function TradeForm({ activePortfolio, onAdded, onCompletedChanged }: Props) {
  const [symbol, setSymbol] = useState('')
  const [action, setAction] = useState('做多')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [fee, setFee] = useState('0')
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')
  const [strategy, setStrategy] = useState('')
  const [remark, setRemark] = useState('')
  const [showIndicators, setShowIndicators] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [bigDIF, setBigDIF] = useState('')
  const [bigDEA, setBigDEA] = useState('')
  const [bigHist, setBigHist] = useState('')
  const [bigRSI, setBigRSI] = useState('')
  const [bigK, setBigK] = useState('')
  const [bigD, setBigD] = useState('')
  const [bigJ, setBigJ] = useState('')

  const [smallDIF, setSmallDIF] = useState('')
  const [smallDEA, setSmallDEA] = useState('')
  const [smallHist, setSmallHist] = useState('')
  const [smallRSI, setSmallRSI] = useState('')
  const [smallK, setSmallK] = useState('')
  const [smallD, setSmallD] = useState('')
  const [smallJ, setSmallJ] = useState('')

  const isOpen = action === '做多' || action === '做空'

async function submit(e: React.FormEvent) {
  e.preventDefault()
  if (!symbol || !price || submitting) return
  setSubmitting(true)

  const trade_time = new Date().toISOString()
  const newTrade: any = {
    id: crypto.randomUUID(),
    portfolio_id: activePortfolio,
    symbol: symbol.toUpperCase(),
    action,
    price: parseFloat(price),
    quantity: parseFloat(quantity),
    fee: parseFloat(fee) * parseFloat(quantity),
    strategy,
    remark,
    trade_time,
  }

  // 先更新畫面
  onAdded(newTrade)

  // 清空表單
  setSymbol(''); setPrice(''); setQuantity('1')
  setFee('0'); setTp(''); setSl('')
  setStrategy(''); setRemark('')
  setBigDIF(''); setBigDEA(''); setBigHist('')
  setBigRSI(''); setBigK(''); setBigD(''); setBigJ('')
  setSmallDIF(''); setSmallDEA(''); setSmallHist('')
  setSmallRSI(''); setSmallK(''); setSmallD(''); setSmallJ('')
  setSubmitting(false)

  // 背景執行 API
  fetch('/api/trades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...newTrade,
      tp: tp ? parseFloat(tp) : 0,
      sl: sl ? parseFloat(sl) : 0,
      big_dif: bigDIF ? parseFloat(bigDIF) : null,
      big_dea: bigDEA ? parseFloat(bigDEA) : null,
      big_hist: bigHist ? parseFloat(bigHist) : null,
      big_rsi: bigRSI ? parseFloat(bigRSI) : null,
      big_k: bigK ? parseFloat(bigK) : null,
      big_d: bigD ? parseFloat(bigD) : null,
      big_j: bigJ ? parseFloat(bigJ) : null,
      small_dif: smallDIF ? parseFloat(smallDIF) : null,
      small_dea: smallDEA ? parseFloat(smallDEA) : null,
      small_hist: smallHist ? parseFloat(smallHist) : null,
      small_rsi: smallRSI ? parseFloat(smallRSI) : null,
      small_k: smallK ? parseFloat(smallK) : null,
      small_d: smallD ? parseFloat(smallD) : null,
      small_j: smallJ ? parseFloat(smallJ) : null,
    }),
  }).then(() => onCompletedChanged())
}

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-400">新增交易</h2>

      <div className="grid grid-cols-4 gap-1">
        {['做多', '做空', '平多', '平空'].map(a => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className={`py-1.5 rounded text-xs font-medium transition-colors ${
              action === a
                ? a === '做多' || a === '平多'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="標的">
          <input value={symbol} onChange={e => setSymbol(e.target.value)}
            placeholder="MES, MNQ..." className="input" />
        </Field>

        <Field label="價格">
          <input value={price} onChange={e => setPrice(e.target.value)}
            placeholder="0.00" type="number" step="0.01" className="input" />
        </Field>

        <div className="flex gap-2">
          <Field label="口數" className="flex-1">
            <input value={quantity} onChange={e => setQuantity(e.target.value)}
              type="number" className="input" />
          </Field>
          <Field label="手續費/口" className="flex-1">
            <input value={fee} onChange={e => setFee(e.target.value)}
              type="number" step="0.01" className="input" />
          </Field>
        </div>

        {isOpen && (
          <div className="flex gap-2">
            <Field label="TP" className="flex-1">
              <input value={tp} onChange={e => setTp(e.target.value)}
                placeholder="選填" type="number" step="0.01" className="input" />
            </Field>
            <Field label="SL" className="flex-1">
              <input value={sl} onChange={e => setSl(e.target.value)}
                placeholder="選填" type="number" step="0.01" className="input" />
            </Field>
          </div>
        )}

        <Field label="策略">
          <input value={strategy} onChange={e => setStrategy(e.target.value)}
            placeholder="選填" className="input" />
        </Field>

        <Field label="備註">
          <input value={remark} onChange={e => setRemark(e.target.value)}
            placeholder="選填" className="input" />
        </Field>

        {isOpen && (
          <div>
            <button
              type="button"
              onClick={() => setShowIndicators(!showIndicators)}
              className="w-full text-xs text-blue-400 hover:text-blue-300 py-1.5 bg-gray-800 rounded-lg transition-colors"
            >
              {showIndicators ? '▲ 收起指標' : '▼ 填入進場指標'}
            </button>

            {showIndicators && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-2">大時間框架指標</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <MiniField label="MACD DIF" value={bigDIF} onChange={setBigDIF} />
                    <MiniField label="MACD DEA" value={bigDEA} onChange={setBigDEA} />
                    <MiniField label="MACD柱" value={bigHist} onChange={setBigHist} />
                    <MiniField label="RSI(14)" value={bigRSI} onChange={setBigRSI} />
                    <MiniField label="KDJ K" value={bigK} onChange={setBigK} />
                    <MiniField label="KDJ D" value={bigD} onChange={setBigD} />
                    <MiniField label="KDJ J" value={bigJ} onChange={setBigJ} />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">小時間框架指標</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <MiniField label="MACD DIF" value={smallDIF} onChange={setSmallDIF} />
                    <MiniField label="MACD DEA" value={smallDEA} onChange={setSmallDEA} />
                    <MiniField label="MACD柱" value={smallHist} onChange={setSmallHist} />
                    <MiniField label="RSI(14)" value={smallRSI} onChange={setSmallRSI} />
                    <MiniField label="KDJ K" value={smallK} onChange={setSmallK} />
                    <MiniField label="KDJ D" value={smallD} onChange={setSmallD} />
                    <MiniField label="KDJ J" value={smallJ} onChange={setSmallJ} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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

function Field({ label, children, className = '' }: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {children}
    </div>
  )
}

function MiniField({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs text-gray-600 mb-0.5 block">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        type="number"
        step="0.01"
        placeholder="--"
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 text-white text-center"
      />
    </div>
  )
}