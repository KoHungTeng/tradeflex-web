'use client'

import { Trade } from '../page'
import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../LanguageContext'

type Props = {
  trades: Trade[]
  onDeleted: (id: string) => void
  onCompletedChanged: () => void
}

function DropdownEditCell({ value, tradeId, field, color, onSaved, options, placeholder }: {
  value: string
  tradeId: string
  field: string
  color: string
  onSaved: () => void
  options: string[]
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setVal(value) }, [value])
  useEffect(() => {
    if (editing && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [editing])

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    if (!editing) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setEditing(false)
        setShowDropdown(false)
        setSearch('')
        if (val !== value) {
          fetch(`/api/trades?id=${tradeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: val }),
          }).then(() => onSaved())
        }
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editing, val, value])

  function select(opt: string) {
    if (field === 'remark') {
      setVal(val ? `${val} ${opt}` : opt)
      setSearch('')
    } else {
      setVal(opt)
      setEditing(false)
      setShowDropdown(false)
      setSearch('')
      fetch(`/api/trades?id=${tradeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: opt }),
      }).then(() => onSaved())
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return
      setEditing(false)
      setShowDropdown(false)
      setSearch('')
      if (val !== value) {
        fetch(`/api/trades?id=${tradeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: val }),
        }).then(() => onSaved())
      }
    }
    if (e.key === 'Escape') {
      setEditing(false)
      setShowDropdown(false)
      setVal(value)
    }
  }

  if (editing) {
    return (
      <div ref={ref} className="relative">
        <input
          ref={inputRef}
          autoFocus
          value={field === 'remark' ? val : search}
          onChange={e => {
            if (field === 'remark') {
              setVal(e.target.value)
              setSearch(e.target.value.split(' ').pop() || '')
            } else {
              setSearch(e.target.value)
            }
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-[var(--bg-input)] border border-[var(--gold)] rounded px-1 py-0.5 text-xs text-[var(--text-primary)] w-full focus:outline-none"
        />
        {showDropdown && filtered.length > 0 && (
          <div
            className="fixed z-50 rounded-lg shadow-xl"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid #2a2a2a',
              minWidth: 150,
              maxHeight: 160,
              overflowY: 'auto',
              top: dropdownPos.top,
              left: dropdownPos.left,
            }}
          >
            {filtered.map(opt => {
              const isSelected = field === 'remark' ? val.split(' ').includes(opt) : val === opt
              return (
                <div
                  key={opt}
                  onMouseDown={e => { e.preventDefault(); select(opt) }}
                  className="px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between gap-2"
                  style={{
                    background: isSelected ? '#2a2000' : 'transparent',
                    color: isSelected ? 'var(--gold)' : '#ccc',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--border)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <span>{opt}</span>
                  {isSelected && <span style={{ color: 'var(--gold)' }}>✓</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={() => { setEditing(true); setShowDropdown(true); setSearch('') }}
      className={`cursor-pointer flex items-center gap-1 group ${color} overflow-hidden`}
      title={val || undefined}
    >
      {val
        ? <span className="truncate block w-full">{val}</span>
        : <span className="text-gray-600 group-hover:text-gray-400 flex-shrink-0">+</span>
      }
    </div>
  )
}

function IndicatorTooltip({ trade, pos, higherTF, lowerTF }: {
  trade: Trade
  pos: { x: number; y: number }
  higherTF: string
  lowerTF: string
}) {
  const hasData = trade.big_dif != null || trade.big_rsi != null || trade.small_dif != null || trade.small_rsi != null
  if (!hasData) return null
  return (
    <div
      className="fixed z-50 rounded-lg p-3 shadow-xl text-xs pointer-events-none"
      style={{ left: pos.x + 10, top: pos.y + 10, minWidth: 320, background: 'var(--bg-card)', border: '1px solid #2a2a2a' }}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400 font-semibold mb-2">{higherTF}</p>
          <div className="space-y-1">
            {trade.big_dif != null && <div className="flex gap-3"><span className="text-gray-500 w-16">MACD DIF</span><span className="text-[var(--text-primary)]">{trade.big_dif}</span></div>}
            {trade.big_dea != null && <div className="flex gap-3"><span className="text-gray-500 w-16">MACD DEA</span><span className="text-[var(--text-primary)]">{trade.big_dea}</span></div>}
            {trade.big_hist != null && <div className="flex gap-3"><span className="text-gray-500 w-16">MACD柱</span><span className="text-[var(--text-primary)]">{trade.big_hist}</span></div>}
            {trade.big_rsi != null && <div className="flex gap-3"><span className="text-gray-500 w-16">RSI</span><span className="text-[var(--text-primary)]">{trade.big_rsi}</span></div>}
            {trade.big_k != null && <div className="flex gap-3"><span className="text-gray-500 w-16">KDJ K</span><span className="text-[var(--text-primary)]">{trade.big_k}</span></div>}
            {trade.big_d != null && <div className="flex gap-3"><span className="text-gray-500 w-16">KDJ D</span><span className="text-[var(--text-primary)]">{trade.big_d}</span></div>}
            {trade.big_j != null && <div className="flex gap-3"><span className="text-gray-500 w-16">KDJ J</span><span className="text-[var(--text-primary)]">{trade.big_j}</span></div>}
          </div>
        </div>
        <div>
          <p className="text-gray-400 font-semibold mb-2">{lowerTF}</p>
          <div className="space-y-1">
            {trade.small_dif != null && <div className="flex gap-3"><span className="text-gray-500 w-16">MACD DIF</span><span className="text-[var(--text-primary)]">{trade.small_dif}</span></div>}
            {trade.small_dea != null && <div className="flex gap-3"><span className="text-gray-500 w-16">MACD DEA</span><span className="text-[var(--text-primary)]">{trade.small_dea}</span></div>}
            {trade.small_hist != null && <div className="flex gap-3"><span className="text-gray-500 w-16">MACD柱</span><span className="text-[var(--text-primary)]">{trade.small_hist}</span></div>}
            {trade.small_rsi != null && <div className="flex gap-3"><span className="text-gray-500 w-16">RSI</span><span className="text-[var(--text-primary)]">{trade.small_rsi}</span></div>}
            {trade.small_k != null && <div className="flex gap-3"><span className="text-gray-500 w-16">KDJ K</span><span className="text-[var(--text-primary)]">{trade.small_k}</span></div>}
            {trade.small_d != null && <div className="flex gap-3"><span className="text-gray-500 w-16">KDJ D</span><span className="text-[var(--text-primary)]">{trade.small_d}</span></div>}
            {trade.small_j != null && <div className="flex gap-3"><span className="text-gray-500 w-16">KDJ J</span><span className="text-[var(--text-primary)]">{trade.small_j}</span></div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TradeList({ trades, onDeleted, onCompletedChanged }: Props) {
  const { t } = useLanguage()
  const [hoveredTrade, setHoveredTrade] = useState<Trade | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [strategies, setStrategies] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/strategies').then(r => r.json()).then(data => {
      setStrategies(Array.isArray(data) ? data.map((s: any) => s.name).sort((a: string, b: string) => a.localeCompare(b, 'zh-TW')) : [])
    })
    fetch('/api/tags').then(r => r.json()).then(data => {
      setTags(Array.isArray(data) ? data.map((tag: any) => `#${tag.name}`).sort((a: string, b: string) => a.localeCompare(b, 'zh-TW')) : [])
    })
  }, [])

  async function deleteTrade(id: string) {
    const trade = trades.find(tr => tr.id === id)
    onDeleted(id)
    await fetch(`/api/trades?id=${id}`, { method: 'DELETE' })
    if (trade) {
      await fetch(`/api/completed?trade_time=${encodeURIComponent(trade.trade_time)}&symbol=${trade.symbol}&action=${trade.action}&portfolio_id=${trade.portfolio_id}`, {
        method: 'DELETE'
      })
    }
  }

  const actionMap: Record<string, { bg: string; label: string }> = {
    '做多': { bg: 'bg-green-700 text-white',    label: t('actionLong') },
    '做空': { bg: 'bg-red-700 text-white',      label: t('actionShort') },
    '平多': { bg: 'bg-green-600 text-white',    label: t('actionCloseLong') },
    '平空': { bg: 'bg-red-600 text-white',      label: t('actionCloseShort') },
  }

  const formatTime = (time: string) => {
    const d = new Date(time)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${y}/${mo}/${day} ${h}:${mi}`
  }

  const COLS = [
    { key: 'action',   label: t('colAction'),   width: '8%' },
    { key: 'symbol',   label: t('colSymbol'),   width: '7%' },
    { key: 'price',    label: t('colPrice'),    width: '8%' },
    { key: 'quantity', label: t('colQty'),      width: '5%' },
    { key: 'fee',      label: t('colFee'),      width: '6%' },
    { key: 'tp',       label: 'TP',             width: '7%' },
    { key: 'sl',       label: 'SL',             width: '7%' },
    { key: 'rr',       label: 'R:R',            width: '6%' },
    { key: 'strategy', label: t('colStrategy'), width: '12%' },
    { key: 'remark',   label: t('colRemark'),   width: '17%' },
    { key: 'time',     label: t('colTime'),     width: '13%' },
    { key: 'delete',   label: '',               width: '4%' },
  ]

  return (
    <div
      className="flex-1 overflow-auto p-6"
      onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <h2 className="text-sm font-semibold text-gray-400 mb-4">
        {t('tradeListTitle')}（{trades.length} {t('tradesUnit')}）
      </h2>

      {hoveredTrade && (
        <IndicatorTooltip
          trade={hoveredTrade}
          pos={mousePos}
          higherTF={t('higherTF')}
          lowerTF={t('lowerTF')}
        />
      )}

      {trades.length === 0 ? (
        <div className="text-center text-gray-600 py-20">{t('noTrades')}</div>
      ) : (
        <table className="text-sm border-collapse w-full" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {COLS.map(col => (
              <col key={col.key} style={{ width: col.width }} />
            ))}
          </colgroup>
          <thead>
            <tr className="text-gray-500 border-b border-[var(--border)] text-left">
              {COLS.map(col => (
                <th key={col.key} className="py-2 px-3 select-none whitespace-nowrap overflow-hidden font-medium text-center relative">
  {col.label}
  {col.key !== 'delete' && (
    <div className="absolute right-0 top-0 h-full w-[1px]" style={{ background: 'var(--border)' }} />
  )}
</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => {
              const actionInfo = actionMap[trade.action] ?? { bg: 'bg-gray-800 text-gray-400', label: trade.action }
              return (
                <tr
                  key={trade.id}
                  className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-card)]/50"
                  onMouseEnter={() => setHoveredTrade(trade)}
                  onMouseLeave={() => setHoveredTrade(null)}
                >
                  <td className="py-2 px-3 whitespace-nowrap overflow-hidden">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionInfo.bg}`}>
                      {actionInfo.label}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold whitespace-nowrap overflow-hidden">{trade.symbol}</td>
                  <td className="py-2 px-3 whitespace-nowrap overflow-hidden">{trade.price}</td>
                  <td className="py-2 px-3 whitespace-nowrap overflow-hidden">{trade.quantity}</td>
                  <td className="py-2 px-3 text-gray-400 whitespace-nowrap overflow-hidden">{trade.fee || '--'}</td>
                  <td className="py-2 px-3 text-gray-400 whitespace-nowrap overflow-hidden">{trade.tp || '--'}</td>
                  <td className="py-2 px-3 text-gray-400 whitespace-nowrap overflow-hidden">{trade.sl || '--'}</td>
                  <td className="py-2 px-3 whitespace-nowrap overflow-hidden">
                    {trade.tp && trade.sl ? (() => {
                      const isClose = trade.action === '平多' || trade.action === '平空'
                      if (!isClose) {
                        if (trade.sl === trade.price) return <span className="text-gray-500 text-xs">--</span>
                        const rr = Math.abs((trade.tp - trade.price) / (trade.price - trade.sl))
                        return <span className="text-[var(--gold)] text-xs">{rr.toFixed(2)}R</span>
                      }
                      const openAction = trade.action === '平多' ? '做多' : '做空'
                      const openTrade = trades.find(t =>
                        t.symbol === trade.symbol &&
                        t.action === openAction &&
                        (t as any).is_closed === true &&
                        new Date(t.trade_time) < new Date(trade.trade_time)
                      ) || trades.find(t =>
                        t.symbol === trade.symbol &&
                        t.action === openAction
                      )
                      const entryPrice = (trade as any).open_price || openTrade?.price
                      if (!entryPrice || trade.sl === entryPrice) return <span className="text-gray-500 text-xs">--</span>
                      const expectedRR = Math.abs((trade.tp - entryPrice) / (entryPrice - trade.sl))
                      const direction = trade.action === '平多' ? 1 : -1
                      const actualRR = direction * (trade.price - entryPrice) / Math.abs(entryPrice - trade.sl)
                      const achieved = actualRR >= expectedRR
                      return (
                        <span className={`text-xs font-medium ${achieved ? 'text-green-400' : 'text-red-400'}`}>
                          {Math.abs(actualRR).toFixed(2)}R
                        </span>
                      )
                    })() : '--'}
                  </td>
                  <td className="py-2 px-3 text-xs whitespace-nowrap overflow-hidden">
                    <DropdownEditCell
                      value={trade.strategy || ''}
                      tradeId={trade.id}
                      field="strategy"
                      color="text-[var(--gold)]"
                      onSaved={onCompletedChanged}
                      options={strategies}
                      placeholder={t('searchStrategy')}
                    />
                  </td>
                  <td
  className="py-2 px-3 text-xs overflow-hidden relative group/remark"
  style={{ maxWidth: 0 }}
  onMouseEnter={() => setHoveredTrade(null)}
>
  {trade.remark && (
    <div className="absolute z-50 hidden group-hover/remark:block bottom-full left-0 mb-1 px-2 py-1 rounded text-xs text-[var(--text-primary)] whitespace-nowrap pointer-events-none"
      style={{ background: 'var(--bg-card)', border: '1px solid #2a2a2a' }}>
      {trade.remark}
    </div>
  )}
                    <DropdownEditCell
                      value={trade.remark || ''}
                      tradeId={trade.id}
                      field="remark"
                      color="text-gray-400"
                      onSaved={onCompletedChanged}
                      options={tags}
                      placeholder={t('inputRemark')}
                    />
                  </td>
                  <td className="py-2 px-3 text-gray-500 text-xs whitespace-nowrap overflow-hidden">
                    {formatTime(trade.trade_time)}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap overflow-hidden">
                    <button
                      onClick={() => deleteTrade(trade.id)}
                      className="text-red-500 hover:text-red-400 text-sm px-1"
                    >✕</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}