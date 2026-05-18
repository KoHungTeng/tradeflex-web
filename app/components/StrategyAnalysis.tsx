'use client'

import { useState, useEffect, useRef } from 'react'
import { CompletedTrade } from '../page'
import { useLanguage } from '../LanguageContext'

type Props = {
  completed: CompletedTrade[]
}

type Strategy = {
  id: string
  name: string
  indicators: string[]
}

type Direction = 'all' | 'long' | 'short'

function TagDropdown({ allTags, selectedTags, onToggle, onClear }: {
  allTags: string[]
  selectedTags: string[]
  onToggle: (tag: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const filtered = allTags.filter(t => t.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen(prev => !prev)
  }

  const label = selectedTags.length === 0 ? '全部' : selectedTags.join(' ')

  return (
    <div className="relative">
      <button ref={btnRef} onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
        style={{
          background: selectedTags.length > 0 ? 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)' : '#1a1a1a',
          color: selectedTags.length > 0 ? '#000' : '#aaa',
          border: '1px solid #2a2a2a', width: 120, height: 38, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        <span className="truncate">{label}</span>
        <span>▾</span>
      </button>
      {open && (
        <div ref={dropRef} className="fixed z-50 rounded-lg shadow-xl"
          style={{ top: pos.top, left: pos.left, background: '#1a1a1a', border: '1px solid #2a2a2a', width: 200 }}>
          <div className="p-2 border-b border-[#2a2a2a]">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜尋標籤..."
              className="w-full bg-[#222222] border border-[#333] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#d4a843]" />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {allTags.length === 0 ? <div className="px-3 py-2 text-xs text-gray-600">尚無標籤</div>
              : filtered.length === 0 ? <div className="px-3 py-2 text-xs text-gray-600">無符合結果</div>
              : (() => {
                const groups: Record<string, string[]> = {}
                filtered.forEach(tag => {
                  const rawName = tag.startsWith('#') ? tag.slice(1) : tag
const prefix = rawName.includes('/') ? rawName.split('/')[0] : rawName
                  if (!groups[prefix]) groups[prefix] = []
                  groups[prefix].push(tag)
                })
                return Object.entries(groups).map(([prefix, groupTags]) => (
                  <div key={prefix}>
                    <div className="px-3 py-1 text-xs text-gray-500 bg-[#111]">{prefix}</div>
                    {groupTags.map(tag => (
                      <div key={tag} onMouseDown={e => { e.preventDefault(); onToggle(tag) }}
                        className="px-3 py-2 text-xs cursor-pointer flex items-center justify-between"
                        style={{ background: selectedTags.includes(tag) ? '#2a2000' : 'transparent', color: selectedTags.includes(tag) ? '#d4a843' : '#ccc' }}>
                        <span>{tag}</span>
                        {selectedTags.includes(tag) && <span>✓</span>}
                      </div>
                    ))}
                  </div>
                ))
              })()}
          </div>
          {selectedTags.length > 0 && (
            <div className="p-2 border-t border-[#2a2a2a]">
              <button onMouseDown={e => { e.preventDefault(); onClear(); setOpen(false) }}
                className="w-full text-xs py-1 rounded" style={{ background: '#2a1a1a', color: '#f87171' }}>
                清除標籤
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function calcStats(trades: CompletedTrade[]) {
  const wins = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl <= 0)
  const winRate = trades.length > 0 ? wins.length / trades.length * 100 : 0
  const totalPnL = trades.reduce((s, t) => s + t.pnl, 0)
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0
  const avgHoldMin = trades.length > 0
    ? trades.reduce((s, t) => {
        const diff = new Date(t.close_time).getTime() - new Date(t.open_time).getTime()
        return s + diff / 60000
      }, 0) / trades.length
    : 0
  const avgHoldDisplay = avgHoldMin < 60 ? `${avgHoldMin.toFixed(0)}m`
    : avgHoldMin < 1440 ? `${(avgHoldMin / 60).toFixed(1)}h`
    : `${(avgHoldMin / 1440).toFixed(1)}d`
  return { wins, losses, winRate, totalPnL, avgWin, avgLoss, profitFactor, avgHoldDisplay }
}

export default function StrategyAnalysis({ completed }: Props) {
  const { t } = useLanguage()
  const [mode, setMode] = useState<'single' | 'compare'>('single')

  // 單策略
  const [selected, setSelected] = useState<string>('__all__')
  const [direction, setDirection] = useState<Direction>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<string>('__all__')

  // 策略比較
  const [compareA, setCompareA] = useState<string>('__all__')
  const [compareB, setCompareB] = useState<string>('__all__')
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null)

  const printRef = useRef<HTMLDivElement>(null)

function exportPDF() {
  window.print()
}
  const [strategies, setStrategies] = useState<Strategy[]>([])

  useEffect(() => {
    fetch('/api/strategies').then(r => r.json()).then(data => {
      setStrategies(Array.isArray(data) ? data : [])
    })
  }, [])

  const allSymbols = Array.from(new Set(completed.map(t => t.symbol).filter(Boolean))).sort()
  const allTags = Array.from(new Set(
    completed.flatMap(trade => (trade.remark || '').split(' ').filter(w => w.startsWith('#')))
  )).sort()
  const strategyNames = Array.from(new Set(completed.map(t => t.strategy).filter(Boolean)))

  const cardStyle = { background: 'linear-gradient(160deg, #272727 0%, #1e1e1e 100%)', border: '1px solid #2a2a2a' }
  const selectStyle = "bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-3 pr-8 py-1.5 text-sm text-white focus:outline-none focus:border-[#d4a843] h-[38px] appearance-none"

  // 單策略篩選
  const byStrategy = selected === '__all__' ? completed : completed.filter(t => t.strategy === selected)
  const byDirection = direction === 'all' ? byStrategy : byStrategy.filter(t => t.direction === direction)
  const bySymbol = selectedSymbol === '__all__' ? byDirection : byDirection.filter(t => t.symbol === selectedSymbol)
  const filtered = selectedTags.length === 0 ? bySymbol : bySymbol.filter(t => selectedTags.every(tag => (t.remark || '').includes(tag)))

  const { wins, losses, winRate, totalPnL, avgWin, avgLoss, profitFactor, avgHoldDisplay } = calcStats(filtered)

  const currentStrategy = strategies.find(s => s.name === selected)
  const requiredIndicators = currentStrategy?.indicators || []
  const showMACD = selected === '__all__' || requiredIndicators.includes('MACD')
  const showRSI = selected === '__all__' || requiredIndicators.includes('RSI')
  const showKDJ = selected === '__all__' || requiredIndicators.includes('KDJ')

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  // 策略比較資料
  const tradesA = compareA === '__all__' ? completed : completed.filter(t => t.strategy === compareA)
  const tradesB = compareB === '__all__' ? completed : completed.filter(t => t.strategy === compareB)
  const statsA = calcStats(tradesA)
  const statsB = calcStats(tradesB)

  return (
    <div className="flex-1 overflow-auto p-6" ref={printRef}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('strategyAnalysis')}</h2>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #2a2a2a' }}>
            <button onClick={() => setMode('single')}
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={mode === 'single' ? { background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' } : { background: '#1a1a1a', color: '#888' }}>
              單策略
            </button>
            <button onClick={() => setMode('compare')}
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={mode === 'compare' ? { background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' } : { background: '#1a1a1a', color: '#888' }}>
              策略比較
            </button>
          </div>
          <button onClick={exportPDF}
            className="no-print px-4 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }}>
            ↓ 輸出 PDF
          </button>
        </div>
      </div>

      {mode === 'single' ? (
        <>
          {/* 篩選區塊 */}
          <div className="rounded-xl p-4 mb-6 flex gap-4 items-end flex-wrap" style={cardStyle}>
            <div className="flex flex-col">
              <p className="text-xs text-gray-500 mb-1">{t('strategyLabel')}</p>
              <div className="relative">
                <select value={selected} onChange={e => setSelected(e.target.value)} className={selectStyle}>
                  <option value="__all__">{t('allStrategies')}</option>
                  {strategyNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
              </div>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-gray-500 mb-1">{t('directionLong')}/{t('directionShort')}</p>
              <div className="relative">
                <select value={direction} onChange={e => setDirection(e.target.value as Direction)} className={selectStyle}>
                  <option value="all">{t('allDirections')}</option>
                  <option value="long">{t('directionLong')}</option>
                  <option value="short">{t('directionShort')}</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
              </div>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-gray-500 mb-1">{t('tagSettings')}</p>
              <TagDropdown allTags={allTags} selectedTags={selectedTags} onToggle={toggleTag} onClear={() => setSelectedTags([])} />
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-gray-500 mb-1">{t('symbol')}</p>
              <div className="relative">
                <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)} className={selectStyle}>
                  <option value="__all__">{t('allStrategies')}</option>
                  {allSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center text-gray-600 py-20">{t('noStrategyTrades')}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: t('totalTrades2'), value: `${filtered.length} ${t('trades2')}`, color: 'text-white' },
                  { label: t('winRate'), value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'text-green-400' : 'text-red-400' },
                  { label: t('totalPnl'), value: `${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}`, color: totalPnL >= 0 ? 'text-green-400' : 'text-red-400' },
                  { label: t('avgHoldTime'), value: avgHoldDisplay, color: 'text-[#d4a843]' },
                  { label: t('profitFactor'), value: profitFactor > 0 ? `${profitFactor.toFixed(2)}R` : '--', color: 'text-[#d4a843]' },
                  { label: `${wins.length} 勝 / ${losses.length} 敗`, value: `+${avgWin.toFixed(0)} / ${avgLoss.toFixed(0)}`, color: 'text-white' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl p-4" style={cardStyle}>
                    <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                    <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-5" style={cardStyle}>
  <div className="grid grid-cols-4 gap-6">
    {/* 獲利指標平均值 */}
    <div>
      <p className="text-xs font-semibold text-green-400 mb-3">獲利指標平均值（{wins.length} 筆）</p>
      {wins.length === 0 ? <p className="text-xs text-gray-600">無資料</p> : (
        <div className="space-y-1.5">
          {[
            ...(showMACD ? [{ label: 'MACD DIF', key: 'big_dif' }, { label: 'MACD DEA', key: 'big_dea' }, { label: 'MACD柱', key: 'big_hist' }] : []),
            ...(showRSI ? [{ label: 'RSI (14)', key: 'big_rsi' }] : []),
            ...(showKDJ ? [{ label: 'KDJ K', key: 'big_k' }, { label: 'KDJ D', key: 'big_d' }, { label: 'KDJ J', key: 'big_j' }] : []),
          ].map(row => {
            const vals = wins.map(t => t[row.key as keyof CompletedTrade] as number).filter(v => v != null && !isNaN(v))
            const avg = vals.length > 0 ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : '--'
            return (
              <div key={row.label} className="flex justify-between text-xs">
                <span className="text-gray-500">{row.label}</span>
                <span className="text-white font-medium">{avg}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>

    {/* 虧損指標平均值 */}
    <div>
      <p className="text-xs font-semibold text-red-400 mb-3">虧損指標平均值（{losses.length} 筆）</p>
      {losses.length === 0 ? <p className="text-xs text-gray-600">無資料</p> : (
        <div className="space-y-1.5">
          {[
            ...(showMACD ? [{ label: 'MACD DIF', key: 'big_dif' }, { label: 'MACD DEA', key: 'big_dea' }, { label: 'MACD柱', key: 'big_hist' }] : []),
            ...(showRSI ? [{ label: 'RSI (14)', key: 'big_rsi' }] : []),
            ...(showKDJ ? [{ label: 'KDJ K', key: 'big_k' }, { label: 'KDJ D', key: 'big_d' }, { label: 'KDJ J', key: 'big_j' }] : []),
          ].map(row => {
            const vals = losses.map(t => t[row.key as keyof CompletedTrade] as number).filter(v => v != null && !isNaN(v))
            const avg = vals.length > 0 ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : '--'
            return (
              <div key={row.label} className="flex justify-between text-xs">
                <span className="text-gray-500">{row.label}</span>
                <span className="text-white font-medium">{avg}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>

    {/* 獲利標籤頻率 */}
    <div>
      <p className="text-xs font-semibold text-green-400 mb-3">獲利標籤頻率</p>
      {(() => {
        const tagStats: Record<string, { count: number; wins: number }> = {}
        wins.forEach(trade => {
          const tags = (trade.open_remark || '').split(' ').filter(w => w.startsWith('#'))
          tags.forEach(tag => {
            if (!tagStats[tag]) tagStats[tag] = { count: 0, wins: 0 }
            tagStats[tag].count++
            tagStats[tag].wins++
          })
        })
        const list = Object.entries(tagStats).map(([tag, s]) => ({ tag, count: s.count, freq: s.count / (wins.length || 1) * 100 })).sort((a, b) => b.count - a.count)
        if (list.length === 0) return <p className="text-xs text-gray-600">無標籤</p>
        return (
          <div className="space-y-2">
            {list.map(({ tag, count, freq }) => (
              <div key={tag}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#d4a843]">{tag}</span>
                  <span className="text-green-400 font-semibold">{freq.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                  <div className="h-full rounded-full" style={{ width: `${freq}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)' }} />
                </div>
              </div>
            ))}
          </div>
        )
      })()}
    </div>

    {/* 虧損標籤頻率 */}
    <div>
      <p className="text-xs font-semibold text-red-400 mb-3">虧損標籤頻率</p>
      {(() => {
        const tagStats: Record<string, { count: number }> = {}
        losses.forEach(trade => {
          const tags = (trade.open_remark || '').split(' ').filter(w => w.startsWith('#'))
          tags.forEach(tag => {
            if (!tagStats[tag]) tagStats[tag] = { count: 0 }
            tagStats[tag].count++
          })
        })
        const list = Object.entries(tagStats).map(([tag, s]) => ({ tag, count: s.count, freq: s.count / (losses.length || 1) * 100 })).sort((a, b) => b.count - a.count)
        if (list.length === 0) return <p className="text-xs text-gray-600">無標籤</p>
        return (
          <div className="space-y-2">
            {list.map(({ tag, count, freq }) => (
              <div key={tag}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#d4a843]">{tag}</span>
                  <span className="text-red-400 font-semibold">{freq.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                  <div className="h-full rounded-full" style={{ width: `${freq}%`, background: 'linear-gradient(90deg, #ef4444, #dc2626)' }} />
                </div>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  </div>
</div>
              <div className="rounded-xl p-4" style={cardStyle}>
  <h3 className="text-sm font-semibold text-gray-400 mb-3">{t('tradeDetail')}</h3>
  <div className="space-y-2">
    {filtered.map(trade => (
      <div key={trade.id}>
        <div
          className="flex items-center justify-between py-2 border-b border-[#222222] cursor-pointer"
          onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}
        >
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded text-xs ${trade.direction === 'long' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
              {trade.direction === 'long' ? t('directionLong') : t('directionShort')}
            </span>
            <span className="font-semibold text-sm">{trade.symbol}</span>
            <span className="text-gray-400 text-xs">{trade.open_price} → {trade.close_price}</span>
            {trade.remark && <span className="text-gray-500 text-xs truncate max-w-xs">{trade.remark}</span>}
          </div>
          <div className="flex items-center gap-4">
            <span className={`font-semibold text-sm ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(0)}
            </span>
            <span className="text-gray-500 text-xs">{new Date(trade.close_time).toLocaleDateString('zh-TW')}</span>
            <span className="text-gray-600 text-xs">{expandedTrade === trade.id ? '▲' : '▼'}</span>
          </div>
        </div>
        {expandedTrade === trade.id && (
          <div className="rounded-b-lg px-4 pb-4 pt-3 -mt-0.5 mb-1" style={{ background: 'linear-gradient(160deg, #272727 0%, #1e1e1e 100%)', border: '1px solid #d4a843', borderTop: 'none' }}>
            <div className="rounded-lg overflow-hidden text-xs">
              <div className="grid grid-cols-6" style={{ borderBottom: '1px solid #1a1a1a' }}>
                {[
                  { label: '標的', value: trade.symbol },
                  { label: '口數', value: trade.quantity },
                  { label: '進場價', value: trade.open_price },
                  { label: '出場價', value: trade.close_price },
                  { label: '目標價', value: trade.tp || '--' },
                  { label: '停損價', value: trade.sl || '--' },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} className="px-3 py-2" style={{ borderRight: i < arr.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                    <p className="text-gray-500 mb-1">{label}</p>
                    <p className="text-white font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-6">
                <div className="px-3 py-2" style={{ borderRight: '1px solid #1a1a1a' }}>
                  <p className="text-gray-500 mb-1">開倉時間</p>
                  <p className="text-white">{new Date(trade.open_time).toLocaleString('zh-TW')}</p>
                </div>
                <div className="px-3 py-2" style={{ borderRight: '1px solid #1a1a1a' }}>
                  <p className="text-gray-500 mb-1">平倉時間</p>
                  <p className="text-white">{new Date(trade.close_time).toLocaleString('zh-TW')}</p>
                </div>
                <div className="px-3 py-2" style={{ borderRight: '1px solid #1a1a1a' }}>
                  <p className="text-gray-500 mb-1">手續費</p>
                  <p className="text-white">{(trade.open_fee || 0) + (trade.close_fee || 0)}</p>
                </div>
                <div className="px-3 py-2" style={{ borderRight: '1px solid #1a1a1a' }}>
                  <p className="text-gray-500 mb-1">盈虧比</p>
                  <p className="text-[#d4a843] font-semibold">
                    {trade.tp && trade.sl && trade.sl !== trade.open_price
                      ? `${Math.abs((trade.close_price - trade.open_price) / (trade.open_price - trade.sl)).toFixed(2)}R`
                      : '--'}
                  </p>
                </div>
                <div className="px-3 py-2 col-span-2">
                  <p className="text-gray-500 mb-1">標籤</p>
                  <p className="text-[#d4a843] leading-relaxed">{trade.remark || '--'}</p>
                </div>
              </div>
              {(trade.big_dif != null || trade.big_rsi != null || trade.small_dif != null) && (
                <div className="grid grid-cols-6" style={{ borderTop: '1px solid #1a1a1a' }}>
                  <div className="px-3 py-2 col-span-1" style={{ borderRight: '1px solid #1a1a1a' }}>
                    <p className="text-gray-500 mb-2">大時間框架</p>
                    <div className="space-y-1">
                      {trade.big_dif != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD DIF</span><span className="text-white">{trade.big_dif}</span></div>}
                      {trade.big_dea != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD DEA</span><span className="text-white">{trade.big_dea}</span></div>}
                      {trade.big_hist != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD柱</span><span className="text-white">{trade.big_hist}</span></div>}
                      {trade.big_rsi != null && <div className="flex gap-2"><span className="text-gray-600 w-16">RSI</span><span className="text-white">{trade.big_rsi}</span></div>}
                      {trade.big_k != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ K</span><span className="text-white">{trade.big_k}</span></div>}
                      {trade.big_d != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ D</span><span className="text-white">{trade.big_d}</span></div>}
                      {trade.big_j != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ J</span><span className="text-white">{trade.big_j}</span></div>}
                    </div>
                  </div>
                  <div className="px-3 py-2 col-span-1" style={{ borderRight: '1px solid #1a1a1a' }}>
                    <p className="text-gray-500 mb-2">小時間框架</p>
                    <div className="space-y-1">
                      {trade.small_dif != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD DIF</span><span className="text-white">{trade.small_dif}</span></div>}
                      {trade.small_dea != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD DEA</span><span className="text-white">{trade.small_dea}</span></div>}
                      {trade.small_hist != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD柱</span><span className="text-white">{trade.small_hist}</span></div>}
                      {trade.small_rsi != null && <div className="flex gap-2"><span className="text-gray-600 w-16">RSI</span><span className="text-white">{trade.small_rsi}</span></div>}
                      {trade.small_k != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ K</span><span className="text-white">{trade.small_k}</span></div>}
                      {trade.small_d != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ D</span><span className="text-white">{trade.small_d}</span></div>}
                      {trade.small_j != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ J</span><span className="text-white">{trade.small_j}</span></div>}
                    </div>
                  </div>
                  <div className="px-3 py-2 col-span-2">
                    <p className="text-gray-500 mb-2">開倉標籤</p>
                    <p className="text-[#d4a843] leading-relaxed mb-3">{trade.open_remark || '--'}</p>
                    <p className="text-gray-500 mb-2">平倉標籤</p>
                    <p className="text-[#d4a843] leading-relaxed">{trade.close_remark || '--'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
</div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* 策略比較模式 */}
          <div className="rounded-xl p-4 mb-6 flex gap-6 items-end flex-wrap" style={cardStyle}>
            <div>
              <p className="text-xs text-gray-500 mb-2">策略 A</p>
              <select value={compareA} onChange={e => setCompareA(e.target.value)} className={selectStyle}>
                <option value="__all__">全部</option>
                {strategyNames.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="text-gray-500 text-lg pb-1">vs</div>
            <div>
              <p className="text-xs text-gray-500 mb-2">策略 B</p>
              <select value={compareB} onChange={e => setCompareB(e.target.value)} className={selectStyle}>
                <option value="__all__">全部</option>
                {strategyNames.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 策略A標題 */}
            <div className="rounded-xl p-3 text-center" style={{ background: '#0f1a2a', border: '1px solid #1a3a5a' }}>
              <p className="text-sm font-semibold text-blue-400">{compareA === '__all__' ? '全部策略' : compareA}</p>
              <p className="text-xs text-gray-500">{tradesA.length} 筆</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: '#1a0f2a', border: '1px solid #3a1a5a' }}>
              <p className="text-sm font-semibold text-purple-400">{compareB === '__all__' ? '全部策略' : compareB}</p>
              <p className="text-xs text-gray-500">{tradesB.length} 筆</p>
            </div>
          </div>

          {/* 比較指標 */}
          <div className="space-y-3 mt-4">
            {[
              { label: '勝率', a: `${statsA.winRate.toFixed(1)}%`, b: `${statsB.winRate.toFixed(1)}%`, aVal: statsA.winRate, bVal: statsB.winRate, higherBetter: true },
              { label: '總盈虧', a: `${statsA.totalPnL >= 0 ? '+' : ''}${statsA.totalPnL.toFixed(0)}`, b: `${statsB.totalPnL >= 0 ? '+' : ''}${statsB.totalPnL.toFixed(0)}`, aVal: statsA.totalPnL, bVal: statsB.totalPnL, higherBetter: true },
              { label: '盈虧比', a: statsA.profitFactor > 0 ? `${statsA.profitFactor.toFixed(2)}R` : '--', b: statsB.profitFactor > 0 ? `${statsB.profitFactor.toFixed(2)}R` : '--', aVal: statsA.profitFactor, bVal: statsB.profitFactor, higherBetter: true },
              { label: '平均獲利', a: `+${statsA.avgWin.toFixed(0)}`, b: `+${statsB.avgWin.toFixed(0)}`, aVal: statsA.avgWin, bVal: statsB.avgWin, higherBetter: true },
              { label: '平均虧損', a: `${statsA.avgLoss.toFixed(0)}`, b: `${statsB.avgLoss.toFixed(0)}`, aVal: statsA.avgLoss, bVal: statsB.avgLoss, higherBetter: false },
              { label: '平均持倉', a: statsA.avgHoldDisplay, b: statsB.avgHoldDisplay, aVal: 0, bVal: 0, higherBetter: true },
            ].map(row => {
              const aWins = row.aVal !== 0 && row.bVal !== 0 && (row.higherBetter ? row.aVal > row.bVal : row.aVal < row.bVal)
              const bWins = row.aVal !== 0 && row.bVal !== 0 && (row.higherBetter ? row.bVal > row.aVal : row.bVal < row.aVal)
              return (
                <div key={row.label} className="rounded-xl p-4" style={cardStyle}>
                  <p className="text-xs text-gray-500 text-center mb-3">{row.label}</p>
                  <div className="grid grid-cols-3 items-center">
                    <div className={`text-center text-lg font-bold ${aWins ? 'text-blue-400' : 'text-gray-300'}`}>
                      {row.a}
                      {aWins && <span className="ml-1 text-xs">✓</span>}
                    </div>
                    <div className="text-center text-gray-600 text-xs">vs</div>
                    <div className={`text-center text-lg font-bold ${bWins ? 'text-purple-400' : 'text-gray-300'}`}>
                      {row.b}
                      {bWins && <span className="ml-1 text-xs">✓</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function IndicatorCard({ title, trades, color, bgColor, showMACD, showRSI, showKDJ, noData }: {
  title: string
  trades: CompletedTrade[]
  color: string
  bgColor: string
  showMACD: boolean
  showRSI: boolean
  showKDJ: boolean
  noData: string
}) {
  if (trades.length === 0) return (
    <div className={`${bgColor} rounded-xl p-4`}>
      <h3 className={`text-sm font-semibold ${color} mb-3`}>{title}</h3>
      <p className="text-gray-500 text-sm">{noData}</p>
    </div>
  )

  const avg = (key: keyof CompletedTrade) => {
    const vals = trades.map(t => t[key] as number).filter(v => v != null && !isNaN(v))
    if (vals.length === 0) return '--'
    return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)
  }

  const rows = [
    ...(showMACD ? [
      { label: 'MACD DIF', key: 'big_dif' as keyof CompletedTrade },
      { label: 'MACD DEA', key: 'big_dea' as keyof CompletedTrade },
      { label: 'MACD 柱', key: 'big_hist' as keyof CompletedTrade },
    ] : []),
    ...(showRSI ? [{ label: 'RSI (14)', key: 'big_rsi' as keyof CompletedTrade }] : []),
    ...(showKDJ ? [
      { label: 'KDJ K', key: 'big_k' as keyof CompletedTrade },
      { label: 'KDJ D', key: 'big_d' as keyof CompletedTrade },
      { label: 'KDJ J', key: 'big_j' as keyof CompletedTrade },
    ] : []),
  ]

  return (
    <div className={`${bgColor} rounded-xl p-4`}>
      <h3 className={`text-sm font-semibold ${color} mb-3`}>{title}（{trades.length} 筆）</h3>
      <div className="space-y-1.5">
        {rows.map(row => (
          <div key={row.label} className="flex gap-3 text-sm">
            <span className="text-gray-400 w-20">{row.label}</span>
            <span className="font-medium">{avg(row.key)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function IndicatorCompare({ label, wins, losses, field, winLabel, lossLabel }: {
  label: string
  wins: CompletedTrade[]
  losses: CompletedTrade[]
  field: keyof CompletedTrade
  winLabel: string
  lossLabel: string
}) {
  const avgOf = (trades: CompletedTrade[]) => {
    const vals = trades.map(t => t[field] as number).filter(v => v != null && !isNaN(v))
    if (vals.length === 0) return null
    return vals.reduce((s, v) => s + v, 0) / vals.length
  }

  const winAvg = avgOf(wins)
  const lossAvg = avgOf(losses)
  if (winAvg === null && lossAvg === null) return null

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <div className="flex gap-4">
          <span className="text-green-400">{winLabel}: {winAvg?.toFixed(2) ?? '--'}</span>
          <span className="text-red-400">{lossLabel}: {lossAvg?.toFixed(2) ?? '--'}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
        {winAvg !== null && (
          <div className="h-full bg-green-500 rounded-full"
            style={{ width: `${Math.min(Math.abs(winAvg) / (Math.abs(winAvg) + Math.abs(lossAvg ?? 1)) * 100, 100)}%` }} />
        )}
      </div>
    </div>
  )
}
function TagAnalysisCard({ trades, cardStyle }: {
  trades: CompletedTrade[]
  cardStyle: React.CSSProperties
}) {
  if (trades.length === 0) return null

  const total = trades.length

  function calcTagList(getField: (t: CompletedTrade) => string) {
    const tagStats: Record<string, { count: number; wins: number }> = {}
    trades.forEach(trade => {
      const tags = (getField(trade) || '').split(' ').filter(w => w.startsWith('#'))
      tags.forEach(tag => {
        if (!tagStats[tag]) tagStats[tag] = { count: 0, wins: 0 }
        tagStats[tag].count++
        if (trade.pnl > 0) tagStats[tag].wins++
      })
    })
    return Object.entries(tagStats)
      .map(([tag, s]) => ({
        tag,
        count: s.count,
        wins: s.wins,
        losses: s.count - s.wins,
        freq: s.count / total * 100,
        winRate: s.wins / s.count * 100,
      }))
      .sort((a, b) => b.count - a.count)
  }

  const openTags = calcTagList(t => t.open_remark || '')
  const closeTags = calcTagList(t => t.close_remark || '')

  if (openTags.length === 0 && closeTags.length === 0) return null

  function TagTable({ tagList }: { tagList: ReturnType<typeof calcTagList> }) {
    if (tagList.length === 0) return <p className="text-xs text-gray-600">無標籤</p>
    return (
      <div className="space-y-3">
        {tagList.map(({ tag, count, wins, losses, freq, winRate }) => (
          <div key={tag}>
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[#d4a843] font-medium">{tag}</span>
                <span className="text-gray-600">{count} 筆</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400">{wins}勝</span>
                <span className="text-red-400">{losses}敗</span>
                <span className={`font-semibold w-10 text-right ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  勝{winRate.toFixed(0)}%
                </span>
                <span className="text-[#d4a843] font-semibold w-12 text-right">
                  出現{freq.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: '#1a1a1a' }}>
              <div className="h-full rounded-full" style={{ width: `${freq}%`, background: 'linear-gradient(90deg, #d4a843, #b8892e)' }} />
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
              <div className="h-full rounded-full" style={{
                width: `${winRate}%`,
                background: winRate >= 50 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #ef4444, #dc2626)',
              }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl p-5" style={cardStyle}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400">標籤分析</h3>
        <span className="text-xs text-gray-600">共 {total} 筆</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-green-400 font-medium mb-3">開倉標籤</p>
          <TagTable tagList={openTags} />
        </div>
        <div>
          <p className="text-xs text-red-400 font-medium mb-3">平倉標籤</p>
          <TagTable tagList={closeTags} />
        </div>
      </div>
    </div>
  )
}