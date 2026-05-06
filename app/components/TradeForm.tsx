'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../LanguageContext'

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

type OpenTrade = {
  id: string
  symbol: string
  action: string
  price: number
  quantity: number
  trade_time: string
}

type SymbolInfo = {
  id: string
  name: string
  category: string
  tick_size: number
  tick_value: number
  currency: string
  default_fee: number
}

function SearchDropdown({ options, value, onChange, placeholder }: {
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) {
      const rect = btnRef.current!.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
      inputRef.current.focus()
    }
  }, [open])

  return (
    <div ref={btnRef} className="relative">
      <div
        onClick={() => setOpen(prev => !prev)}
        className="input cursor-pointer flex items-center justify-between"
        style={{ minHeight: 32 }}
      >
        <span className={value ? 'text-white' : 'text-gray-600'}>
          {value || placeholder || '選填'}
        </span>
        <span className="text-gray-500 text-xs">▾</span>
      </div>

      {open && (
        <div
          ref={dropRef}
          className="fixed z-50 rounded-lg shadow-xl"
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
          }}
        >
          <div className="p-2 border-b border-[#2a2a2a]">
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
              placeholder="搜尋..."
              className="w-full bg-[#222222] border border-[#333] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#d4a843]"
            />
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-600">無符合結果</div>
            ) : (
              filtered.map(opt => (
                <div
                  key={opt}
                  onMouseDown={e => {
                    e.preventDefault()
                    onChange(opt)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="px-3 py-2 text-xs cursor-pointer hover:bg-[#2a2a2a]"
                  style={{ color: value === opt ? '#d4a843' : '#ccc' }}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TagDropdown({ tags, value, onChange, placeholder }: {
  tags: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = tags.filter(t => t.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) {
      const rect = btnRef.current!.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
      inputRef.current.focus()
    }
  }, [open])

  function selectTag(tag: string) {
    const current = value.trim()
    if (current.includes(tag)) {
      onChange(current.replace(tag, '').replace(/\s+/g, ' ').trim())
    } else {
      onChange(current ? `${current} ${tag}` : tag)
    }
  }

  const selectedTags = value.split(' ').filter(w => w.startsWith('#'))

  return (
    <div ref={btnRef} className="relative">
      <div
        onClick={() => setOpen(prev => !prev)}
        className="input cursor-pointer flex items-center justify-between"
        style={{ minHeight: 32 }}
      >
        <span className={value ? 'text-white' : 'text-gray-600'} style={{ fontSize: 12 }}>
          {value || placeholder || '選填'}
        </span>
        <span className="text-gray-500 text-xs">▾</span>
      </div>

      {open && (
        <div
          ref={dropRef}
          className="fixed z-50 rounded-lg shadow-xl"
          style={{
            top: pos.top,
            left: pos.left,
            width: Math.max(pos.width, 160),
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
          }}
        >
          <div className="p-2 border-b border-[#2a2a2a]">
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
              placeholder="搜尋標籤..."
              className="w-full bg-[#222222] border border-[#333] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#d4a843]"
            />
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {tags.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-600">尚無標籤</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-600">無符合結果</div>
            ) : (
              (() => {
  const groups: Record<string, string[]> = {}
  filtered.forEach(tag => {
    const rawName = tag.startsWith('#') ? tag.slice(1) : tag
    const prefix = rawName.includes('-') ? rawName.split('-')[0] : '其他'
    if (!groups[prefix]) groups[prefix] = []
    groups[prefix].push(tag)
  })
  return Object.entries(groups).map(([prefix, groupTags]) => (
    <div key={prefix}>
      <div className="px-3 py-1 text-xs text-gray-500 bg-[#111]">{prefix}</div>
      {groupTags.map(tag => (
        <div
          key={tag}
          onMouseDown={e => { e.preventDefault(); selectTag(tag) }}
          className="px-3 py-2 text-xs cursor-pointer flex items-center justify-between"
          style={{
            background: selectedTags.includes(tag) ? '#2a2000' : 'transparent',
            color: selectedTags.includes(tag) ? '#d4a843' : '#ccc',
          }}
        >
          <span>{tag}</span>
          {selectedTags.includes(tag) && <span>✓</span>}
        </div>
      ))}
    </div>
  ))
})()
            )}
          </div>
          {value && (
            <div className="p-2 border-t border-[#2a2a2a]">
              <button
                onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false) }}
                className="w-full text-xs py-1 rounded"
                style={{ background: '#2a1a1a', color: '#f87171' }}
              >
                清除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TradeForm({ activePortfolio, onAdded, onCompletedChanged }: Props) {
  const { t } = useLanguage()
  const [symbol, setSymbol] = useState('')
  const [action, setAction] = useState('做多')
  const [price, setPrice] = useState('')
  const [extraPrices, setExtraPrices] = useState<{price: string, quantity: string}[]>([])
  const [quantity, setQuantity] = useState('1')
  const [fee, setFee] = useState('0')
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')
  const [strategy, setStrategy] = useState('')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [openTrades, setOpenTrades] = useState<OpenTrade[]>([])
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [customTime, setCustomTime] = useState('')
  const [symbolList, setSymbolList] = useState<SymbolInfo[]>([])
  const [tags, setTags] = useState<{id: string, name: string}[]>([])

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
  const isClose = action === '平多' || action === '平空'

  useEffect(() => {
    fetch('/api/strategies').then(r => r.json()).then(data => {
      setStrategies(Array.isArray(data) ? data : [])
    })
    fetch('/api/symbols').then(r => r.json()).then(data => {
      setSymbolList(Array.isArray(data) ? data : [])
    })
    fetch('/api/tags').then(r => r.json()).then(data => {
      setTags(Array.isArray(data) ? data : [])
    })
  }, [])

  useEffect(() => {
    if (isClose) {
      fetch('/api/trades').then(r => r.json()).then(data => {
        setOpenTrades(Array.isArray(data) ? data : [])
      })
    }
  }, [isClose])

  // 選標的時自動帶入預設手續費
  function handleSymbolChange(name: string) {
    setSymbol(name)
    const info = symbolList.find(s => s.name === name)
    if (info && info.default_fee) {
      setFee(String(info.default_fee))
    }
  }

  const relevantOpenTrades = openTrades.filter(t => {
    if (!symbol) return false
    const matchSymbol = t.symbol.toUpperCase() === symbol.toUpperCase()
    if (action === '平多') return matchSymbol && t.action === '做多'
    if (action === '平空') return matchSymbol && t.action === '做空'
    return false
  })

  const totalOpenQty = relevantOpenTrades.reduce((sum, t) => sum + t.quantity, 0)
  const avgOpenPrice = relevantOpenTrades.length > 0
    ? relevantOpenTrades.reduce((sum, t) => sum + t.price * t.quantity, 0) / totalOpenQty
    : 0

  const selectedStrategy = strategies.find(s => s.name === strategy)
  const requiredIndicators = selectedStrategy?.indicators || []
  const showMACD = requiredIndicators.includes('MACD')
  const showRSI = requiredIndicators.includes('RSI')
  const showKDJ = requiredIndicators.includes('KDJ')
  const showIndicators = isOpen && (showMACD || showRSI || showKDJ)

  function addExtraPrice() {
    setExtraPrices(prev => [...prev, { price: '', quantity: quantity }])
  }

  function updateExtraPrice(index: number, field: 'price' | 'quantity', value: string) {
    setExtraPrices(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  function removeExtraPrice(index: number) {
    setExtraPrices(prev => prev.filter((_, i) => i !== index))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!symbol || !price || submitting) return
    setSubmitting(true)

    let trade_time: string
    if (useCustomTime && customTime) {
      trade_time = new Date(customTime).toISOString()
    } else {
      trade_time = new Date().toISOString()
    }

    const mainQty = parseFloat(quantity) || 0
    const validExtras = extraPrices.filter(p => p.price !== '')
    const allEntries = [
      { price: parseFloat(price), quantity: mainQty },
      ...validExtras.map(p => ({ price: parseFloat(p.price), quantity: parseFloat(p.quantity) || mainQty }))
    ]
    const totalQuantity = allEntries.reduce((a, b) => a + b.quantity, 0)
    const avgPrice = allEntries.reduce((a, b) => a + b.price * b.quantity, 0) / totalQuantity

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
    setUseCustomTime(false); setCustomTime('')
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

  const actionLabels = [t('long'), t('short'), t('closeLong'), t('closeShort')]
  const actionValues = ['做多', '做空', '平多', '平空']

  return (
    <div className="w-64 bg-[#111111] border-r border-[#222222] p-4 flex flex-col gap-3" style={{ height: '100vh', overflowY: 'auto' }}>
      <h2 className="text-sm font-semibold text-gray-400">{t('newTrade')}</h2>

      <div className="grid grid-cols-4 gap-1">
        {actionValues.map((a, i) => (
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
            {actionLabels[i]}
          </button>
        ))}
      </div>

      <form
        onSubmit={submit}
        autoComplete="off"
        className="flex flex-col gap-3"
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            if ((e.target as HTMLElement).tagName !== 'BUTTON') {
              e.preventDefault()
            }
          }
        }}
      >
        {/* 標的 */}
        <Field label={t('symbol')}>
          <SearchDropdown
            options={symbolList.map(s => s.name)}
            value={symbol}
            onChange={handleSymbolChange}
            placeholder="選擇標的"
          />
        </Field>

        {/* 平倉庫存 */}
        {isClose && symbol && (
          <div className="rounded-lg p-3" style={{ background: '#0f1a0f', border: '1px solid #1a3a1a' }}>
            <p className="text-xs text-gray-500 mb-2">
              {action === '平多' ? t('longInventory') : t('shortInventory')}
            </p>
            {relevantOpenTrades.length === 0 ? (
              <p className="text-xs text-gray-600">{t('noPosition')} {symbol.toUpperCase()} {t('position')}</p>
            ) : (
              <>
                <div className="space-y-1.5 mb-2">
                  {relevantOpenTrades.map((t2, i) => (
                    <div key={t2.id} className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">
                        #{i + 1} {new Date(t2.trade_time).toLocaleDateString('zh-TW')}
                      </span>
                      <span className="text-white">
                        {t2.price} × {t2.quantity}{t('lots')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#1a3a1a] pt-2 flex justify-between text-xs">
                  <span className="text-gray-400">{t('avgPriceQty')}</span>
                  <span className="text-green-400 font-semibold">
                    {avgOpenPrice.toFixed(2)} / {totalOpenQty}{t('lots')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity(String(totalOpenQty))}
                  className="mt-2 w-full text-xs py-1 rounded transition-colors"
                  style={{ background: '#1a3a1a', color: '#4ade80', border: '1px solid #2a4a2a' }}
                >
                  {t('fillAllQty')} ({totalOpenQty}{t('lots')})
                </button>
              </>
            )}
          </div>
        )}

        {/* 價格 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-500">{isClose ? t('closePrice') : t('entryPrice')}</label>
            {isOpen && (
              <button
                type="button"
                onClick={addExtraPrice}
                className="text-xs px-1.5 py-0.5 rounded transition-colors"
                style={{ background: '#1a1a1a', color: '#d4a843', border: '1px solid #2a2a2a' }}
              >
                {t('splitPosition')}
              </button>
            )}
          </div>
          <input value={price} onChange={e => setPrice(e.target.value)}
            placeholder="0.00" type="number" step="0.01" className="input" />

          {extraPrices.map((p, i) => (
            <div key={i} className="mt-1.5">
              <div className="flex gap-1">
                <input
                  value={p.price}
                  onChange={e => updateExtraPrice(i, 'price', e.target.value)}
                  placeholder="0.00" type="number" step="0.01" className="input flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeExtraPrice(i)}
                  className="text-xs px-2 rounded flex-shrink-0"
                  style={{ background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' }}
                >✕</button>
              </div>
              <input
                value={p.quantity}
                onChange={e => updateExtraPrice(i, 'quantity', e.target.value)}
                placeholder={t('quantity')} type="number" className="input w-full mt-1"
              />
            </div>
          ))}

          {extraPrices.filter(p => p.price !== '').length > 0 && price && (
            <p className="text-xs text-[#d4a843] mt-1">
              {t('avgPrice')}：{(() => {
                const mainQty = parseFloat(quantity) || 1
                const entries = [
                  { price: parseFloat(price), quantity: mainQty },
                  ...extraPrices.filter(p => p.price !== '').map(p => ({
                    price: parseFloat(p.price),
                    quantity: parseFloat(p.quantity) || mainQty
                  }))
                ]
                const total = entries.reduce((a, b) => a + b.quantity, 0)
                const avg = entries.reduce((a, b) => a + b.price * b.quantity, 0) / total
                return `${avg.toFixed(2)} ／${t('totalQty')} ${total} ${t('lots')}`
              })()}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Field label={t('quantity')} className="flex-1">
            <input value={quantity} onChange={e => setQuantity(e.target.value)}
              type="number" className="input" />
          </Field>
          <Field label={t('fee')} className="flex-1">
            <input value={fee} onChange={e => setFee(e.target.value)}
              type="number" step="0.01" className="input" />
          </Field>
        </div>

        {isOpen && (
          <div className="flex gap-2">
            <Field label={t('tp')} className="flex-1">
              <input value={tp} onChange={e => setTp(e.target.value)}
                placeholder="選填" type="number" step="0.01" className="input" />
            </Field>
            <Field label={t('sl')} className="flex-1">
              <input value={sl} onChange={e => setSl(e.target.value)}
                placeholder="選填" type="number" step="0.01" className="input" />
            </Field>
          </div>
        )}

        {/* 時間 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-500">{t('time')}</label>
            <button
              type="button"
              onClick={() => {
                setUseCustomTime(!useCustomTime)
                if (!useCustomTime) {
                  const now = new Date()
                  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                  setCustomTime(local.toISOString().slice(0, 16))
                }
              }}
              className="text-xs px-1.5 py-0.5 rounded transition-colors"
              style={useCustomTime
                ? { background: '#2a1a00', color: '#d4a843', border: '1px solid #3a2a00' }
                : { background: '#1a1a1a', color: '#666', border: '1px solid #2a2a2a' }
              }
            >
              {useCustomTime ? t('customTime') : t('currentTime')}
            </button>
          </div>
          {useCustomTime ? (
            <input value={customTime} onChange={e => setCustomTime(e.target.value)}
              type="datetime-local" className="input" />
          ) : (
            <p className="text-xs text-gray-600 px-1">{t('autoTime')}</p>
          )}
        </div>

        {/* 策略 */}
        <Field label={t('strategyLabel')}>
          <select value={strategy} onChange={e => setStrategy(e.target.value)} className="input">
            <option value="">-</option>
            {strategies.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </Field>

        {/* 備注 */}
        <Field label={t('remark')}>
          <TagDropdown
            tags={tags.map(tag => `#${tag.name}`)}
            value={remark}
            onChange={setRemark}
            placeholder="選填"
          />
        </Field>

        {/* 指標 */}
        {showIndicators && (
          <div className="space-y-3">
            {showMACD && (
              <div>
                <p className="text-xs text-gray-500 mb-2">MACD {t('bigTimeframe')}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <MiniField label="DIF" value={bigDIF} onChange={setBigDIF} />
                  <MiniField label="DEA" value={bigDEA} onChange={setBigDEA} />
                  <MiniField label="柱" value={bigHist} onChange={setBigHist} />
                </div>
                <p className="text-xs text-gray-500 mb-2 mt-2">MACD {t('smallTimeframe')}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <MiniField label="DIF" value={smallDIF} onChange={setSmallDIF} />
                  <MiniField label="DEA" value={smallDEA} onChange={setSmallDEA} />
                  <MiniField label="柱" value={smallHist} onChange={setSmallHist} />
                </div>
              </div>
            )}
            {showRSI && (
              <div>
                <p className="text-xs text-gray-500 mb-2">RSI {t('bigTimeframe')}</p>
                <MiniField label="RSI(14)" value={bigRSI} onChange={setBigRSI} />
                <p className="text-xs text-gray-500 mb-2 mt-2">RSI {t('smallTimeframe')}</p>
                <MiniField label="RSI(14)" value={smallRSI} onChange={setSmallRSI} />
              </div>
            )}
            {showKDJ && (
              <div>
                <p className="text-xs text-gray-500 mb-2">KDJ {t('bigTimeframe')}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <MiniField label="K" value={bigK} onChange={setBigK} />
                  <MiniField label="D" value={bigD} onChange={setBigD} />
                  <MiniField label="J" value={bigJ} onChange={setBigJ} />
                </div>
                <p className="text-xs text-gray-500 mb-2 mt-2">KDJ {t('smallTimeframe')}</p>
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
          {submitting ? t('submitting') : `${t('confirm')}${actionLabels[actionValues.indexOf(action)]}`}
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
        type="number" step="0.01" placeholder="--"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#d4a843] text-white text-center"
      />
    </div>
  )
}