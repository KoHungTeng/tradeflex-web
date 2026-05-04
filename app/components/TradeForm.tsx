'use client'

import { useState, useEffect } from 'react'

type Props = {
  activePortfolio: string
  onAdded: (trade: any) => void
  onCompletedChanged: () => void
}

type Strategy = {
  id: string
  name: string
  indicators: string[]
}

export default function TradeForm({ activePortfolio, onAdded, onCompletedChanged }: Props) {
  const [symbol, setSymbol] = useState('')
  const [action, setAction] = useState('做多')
  const [price, setPrice] = useState('')
  const [extraPrices, setExtraPrices] = useState<string[]>([])
  const [quantity, setQuantity] = useState('1')
  const [fee, setFee] = useState('0')
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')
  const [strategy, setStrategy] = useState('')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [strategies, setStrategies] = useState<Strategy[]>([])

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

  useEffect(() => {
    fetch('/api/strategies').then(r => r.json()).then(data => {
      setStrategies(Array.isArray(data) ? data : [])
    })
  }, [])

  const selectedStrategy = strategies.find(s => s.name === strategy)
  const requiredIndicators = selectedStrategy?.indicators || []
  const showMACD = requiredIndicators.includes('MACD')
  const showRSI = requiredIndicators.includes('RSI')
  const showKDJ = requiredIndicators.includes('KDJ')
  const showIndicators = isOpen && (showMACD || showRSI || showKDJ)
  const [tags, setTags] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(data => {
      setTags(Array.isArray(data) ? data : [])
    })
  }, [])

  function addExtraPrice() {
    setExtraPrices(prev => [...prev, ''])
  }

  function updateExtraPrice(index: number, value: string) {
    setExtraPrices(prev => prev.map((p, i) => i === index ? value : p))
  }

  function removeExtraPrice(index: number) {
    setExtraPrices(prev => prev.filter((_, i) => i !== index))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!symbol || !price || submitting) return
    setSubmitting(true)

    const trade_time = new Date().toISOString()

    // 計算所有價格（主要價格 + 分倉價格）的平均
    const allPrices = [parseFloat(price), ...extraPrices.filter(p => p !== '').map(p => parseFloat(p))]
    const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length
    const totalQuantity = parseFloat(quantity) * allPrices.length

    const newTrade: any = {
      id: crypto.randomUUID(),
      portfolio_id: activePortfolio,
      symbol: symbol.toUpperCase(),
      action,
      price: Math.round(avgPrice * 100) / 100,
      quantity: totalQuantity,
      fee: parseFloat(fee) * totalQuantity,
      strategy,
      remark,
      trade_time,
    }

    onAdded(newTrade)

    setSymbol(''); setPrice(''); setQuantity('1')
    setFee('0'); setTp(''); setSl('')
    setStrategy(''); setRemark('')
    setExtraPrices([])
    setBigDIF(''); setBigDEA(''); setBigHist('')
    setBigRSI(''); setBigK(''); setBigD(''); setBigJ('')
    setSmallDIF(''); setSmallDEA(''); setSmallHist('')
    setSmallRSI(''); setSmallK(''); setSmallD(''); setSmallJ('')
    setSubmitting(false)

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
    <div className="w-64 bg-[#111111] border-r border-[#222222] p-4 overflow-y-auto flex flex-col gap-3">
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
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222222]'
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

        {/* 進場價格 + 分倉按鈕 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-500">進場價格</label>
            <button
              type="button"
              onClick={addExtraPrice}
              className="text-xs px-1.5 py-0.5 rounded transition-colors"
              style={{ background: '#1a1a1a', color: '#d4a843', border: '1px solid #2a2a2a' }}
              title="新增分倉價格"
            >
              ＋ 分倉
            </button>
          </div>
          <input value={price} onChange={e => setPrice(e.target.value)}
            placeholder="0.00" type="number" step="0.01" className="input" />

          {/* 分倉價格列表 */}
          {extraPrices.map((p, i) => (
            <div key={i} className="flex gap-1 mt-1.5">
              <input
                value={p}
                onChange={e => updateExtraPrice(i, e.target.value)}
                placeholder={`分倉 ${i + 1}`}
                type="number"
                step="0.01"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => removeExtraPrice(i)}
                className="text-xs px-2 rounded transition-colors"
                style={{ background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* 有分倉時顯示平均價格提示 */}
          {extraPrices.filter(p => p !== '').length > 0 && price && (
            <p className="text-xs text-[#d4a843] mt-1">
              均價：{(
                [parseFloat(price), ...extraPrices.filter(p => p !== '').map(Number)]
                  .reduce((a, b) => a + b, 0) /
                (1 + extraPrices.filter(p => p !== '').length)
              ).toFixed(2)}
              ／共 {(1 + extraPrices.filter(p => p !== '').length) * parseFloat(quantity || '1')} 口
            </p>
          )}
        </div>

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
          <select value={strategy} onChange={e => setStrategy(e.target.value)} className="input">
            <option value="">-- 不選策略 --</option>
            {strategies.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </Field>

        <Field label="備註">
          <input value={remark} onChange={e => setRemark(e.target.value)}
            placeholder="選填" className="input mb-1" />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRemark(prev => prev ? `${prev} #${t.name}` : `#${t.name}`)}
                  className="text-xs px-2 py-0.5 rounded-full transition-colors"
                  style={{ background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' }}
                >
                  #{t.name}
                </button>
              ))}
            </div>
          )}
        </Field>

        {showIndicators && (
          <div className="space-y-3">
            {showMACD && (
              <div>
                <p className="text-xs text-gray-500 mb-2">MACD 大時間框架</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <MiniField label="DIF" value={bigDIF} onChange={setBigDIF} />
                  <MiniField label="DEA" value={bigDEA} onChange={setBigDEA} />
                  <MiniField label="柱" value={bigHist} onChange={setBigHist} />
                </div>
                <p className="text-xs text-gray-500 mb-2 mt-2">MACD 小時間框架</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <MiniField label="DIF" value={smallDIF} onChange={setSmallDIF} />
                  <MiniField label="DEA" value={smallDEA} onChange={setSmallDEA} />
                  <MiniField label="柱" value={smallHist} onChange={setSmallHist} />
                </div>
              </div>
            )}
            {showRSI && (
              <div>
                <p className="text-xs text-gray-500 mb-2">RSI 大時間框架</p>
                <MiniField label="RSI(14)" value={bigRSI} onChange={setBigRSI} />
                <p className="text-xs text-gray-500 mb-2 mt-2">RSI 小時間框架</p>
                <MiniField label="RSI(14)" value={smallRSI} onChange={setSmallRSI} />
              </div>
            )}
            {showKDJ && (
              <div>
                <p className="text-xs text-gray-500 mb-2">KDJ 大時間框架</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <MiniField label="K" value={bigK} onChange={setBigK} />
                  <MiniField label="D" value={bigD} onChange={setBigD} />
                  <MiniField label="J" value={bigJ} onChange={setBigJ} />
                </div>
                <p className="text-xs text-gray-500 mb-2 mt-2">KDJ 小時間框架</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <MiniField label="K" value={smallK} onChange={setSmallK} />
                  <MiniField label="D" value={smallD} onChange={setSmallD} />
                  <MiniField label="J" value={smallJ} onChange={setSmallJ} />
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
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#d4a843] text-white text-center"
      />
    </div>
  )
}