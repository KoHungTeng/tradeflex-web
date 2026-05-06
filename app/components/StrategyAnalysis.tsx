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
      ) {
        setOpen(false)
        setSearch('')
      }
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

  const label = selectedTags.length === 0
    ? '全部'
    : selectedTags.join(' ')

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
        style={{
          background: selectedTags.length > 0
            ? 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)'
            : '#1a1a1a',
          color: selectedTags.length > 0 ? '#000' : '#aaa',
          border: '1px solid #2a2a2a',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <span className="truncate">{label}</span>
        <span>▾</span>
      </button>

      {open && (
        <div
          ref={dropRef}
          className="fixed z-50 rounded-lg shadow-xl"
          style={{
            top: pos.top,
            left: pos.left,
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            width: 200,
          }}
        >
          {/* 搜尋框 */}
          <div className="p-2 border-b border-[#2a2a2a]">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋標籤..."
              className="w-full bg-[#222222] border border-[#333] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#d4a843]"
            />
          </div>

          {/* 標籤列表 */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {allTags.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-600">尚無標籤</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-600">無符合結果</div>
            ) : (
              (() => {
  const groups: Record<string, string[]> = {}
  filtered.forEach(tag => {
    const rawName = tag.startsWith('#') ? tag.slice(1) : tag
    const prefix = rawName.includes(' ') ? rawName.split(' ')[0] : rawName
    if (!groups[prefix]) groups[prefix] = []
    groups[prefix].push(tag)
  })
  return Object.entries(groups).map(([prefix, groupTags]) => (
    <div key={prefix}>
      <div className="px-3 py-1 text-xs text-gray-500 bg-[#111]">{prefix}</div>
      {groupTags.map(tag => (
        <div
          key={tag}
          onMouseDown={e => { e.preventDefault(); onToggle(tag) }}
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

          {/* 清除 */}
          {selectedTags.length > 0 && (
            <div className="p-2 border-t border-[#2a2a2a]">
              <button
                onMouseDown={e => { e.preventDefault(); onClear(); setOpen(false) }}
                className="w-full text-xs py-1 rounded"
                style={{ background: '#2a1a1a', color: '#f87171' }}
              >
                清除標籤
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function StrategyAnalysis({ completed }: Props) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState<string>('__all__')
  const [direction, setDirection] = useState<Direction>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<string>('__all__')
  const [strategies, setStrategies] = useState<Strategy[]>([])

  useEffect(() => {
    fetch('/api/strategies').then(r => r.json()).then(data => {
      setStrategies(Array.isArray(data) ? data : [])
    })
  }, [])

  const allSymbols = Array.from(new Set(
  completed.map(t => t.symbol).filter(Boolean)
)).sort()
const allTags = Array.from(new Set(
    completed.flatMap(trade =>
      (trade.remark || '').split(' ').filter(w => w.startsWith('#'))
    )
  )).sort()

  const strategyNames = ['__all__', ...Array.from(new Set(
    completed.map(t => t.strategy).filter(Boolean)
  ))]

  const byStrategy = selected === '__all__'
    ? completed
    : completed.filter(t => t.strategy === selected)

const byDirection = direction === 'all'
  ? byStrategy
  : byStrategy.filter(t => t.direction === direction)

const bySymbol = selectedSymbol === '__all__'
  ? byDirection
  : byDirection.filter(t => t.symbol === selectedSymbol)

  const filtered = selectedTags.length === 0
  ? bySymbol
  : bySymbol.filter(t =>
        selectedTags.every(tag => (t.remark || '').includes(tag))
      )

  const wins = filtered.filter(t => t.pnl > 0)
  const losses = filtered.filter(t => t.pnl <= 0)
  const winRate = filtered.length > 0 ? wins.length / filtered.length * 100 : 0
  const totalPnL = filtered.reduce((s, t) => s + t.pnl, 0)
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0

  const avgHoldMin = filtered.length > 0
    ? filtered.reduce((s, t) => {
        const diff = new Date(t.close_time).getTime() - new Date(t.open_time).getTime()
        return s + diff / 60000
      }, 0) / filtered.length
    : 0
  const avgHoldDisplay = avgHoldMin < 60
    ? `${avgHoldMin.toFixed(0)}m`
    : avgHoldMin < 1440
    ? `${(avgHoldMin / 60).toFixed(1)}h`
    : `${(avgHoldMin / 1440).toFixed(1)}d`

  const currentStrategy = strategies.find(s => s.name === selected)
  const requiredIndicators = currentStrategy?.indicators || []
  const showMACD = selected === '__all__' || requiredIndicators.includes('MACD')
  const showRSI = selected === '__all__' || requiredIndicators.includes('RSI')
  const showKDJ = selected === '__all__' || requiredIndicators.includes('KDJ')

  const cardStyle = {
    background: 'linear-gradient(160deg, #161616 0%, #0f0f0f 100%)',
    border: '1px solid #2a2a2a'
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-4">
  <h2 className="text-lg font-semibold">{t('strategyAnalysis')}</h2>
  <button
    onClick={() => window.print()}
    className="no-print px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
    style={{ background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }}
  >
    ↓ 輸出 PDF
  </button>
</div>

     {/* 篩選區塊 */}
<div className="rounded-xl p-4 mb-6 flex gap-6 items-end" style={cardStyle}>
  {/* 策略 */}
  <div>
    <p className="text-xs text-gray-500 mb-2">{t('strategyLabel')}</p>
    <select
      value={selected}
      onChange={e => setSelected(e.target.value)}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#d4a843]"
    >
      <option value="__all__">{t('allStrategies')}</option>
      {strategyNames.filter(s => s !== '__all__').map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  </div>

  {/* 多/空 */}
  <div>
    <p className="text-xs text-gray-500 mb-2">
      {t('directionLong')}/{t('directionShort')}
    </p>
    <select
      value={direction}
      onChange={e => setDirection(e.target.value as Direction)}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#d4a843]"
    >
      <option value="all">{t('allDirections')}</option>
      <option value="long">{t('directionLong')}</option>
      <option value="short">{t('directionShort')}</option>
    </select>
  </div>

  {/* ✅ 商品 Symbol（補上這塊） */}
  <div>
    <p className="text-xs text-gray-500 mb-2">{t('symbol') || 'Symbol'}</p>
    <select
      value={selectedSymbol}
      onChange={e => setSelectedSymbol(e.target.value)}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#d4a843]"
    >
      <option value="__all__">{t('allStrategies') || '全部'}</option>
      {allSymbols.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  </div>

  {/* 標籤 */}
  <div>
    <p className="text-xs text-gray-500 mb-2">{t('tagSettings')}</p>
    <TagDropdown
      allTags={allTags}
      selectedTags={selectedTags}
      onToggle={toggleTag}
      onClear={() => setSelectedTags([])}
    />
  </div>
</div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-600 py-20">{t('noStrategyTrades')}</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t('totalTrades2'), value: `${filtered.length} ${t('trades2')}`, color: 'text-white' },
              { label: t('winRate'), value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'text-green-400' : 'text-red-400' },
              { label: t('totalPnl'), value: `${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}`, color: totalPnL >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: t('avgHoldTime'), value: avgHoldDisplay, color: 'text-[#d4a843]' },
{ label: t('profitFactor'), value: profitFactor > 0 ? `${profitFactor.toFixed(2)}R` : '--', color: 'text-[#d4a843]' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={cardStyle}>
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={cardStyle}>
              <div className="text-xs text-gray-500 mb-1">{wins.length} 勝 / {losses.length} 敗</div>
              <div className="text-xl font-bold">
                <span className="text-green-400">+{avgWin.toFixed(0)}</span>
                <span className="text-gray-500"> / </span>
                <span className="text-red-400">{avgLoss.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IndicatorCard
              title={t('indicatorWin')}
              trades={wins}
              color="text-green-400"
              bgColor="bg-green-900/20"
              showMACD={showMACD}
              showRSI={showRSI}
              showKDJ={showKDJ}
              noData={t('noData')}
            />
            <IndicatorCard
              title={t('indicatorLoss')}
              trades={losses}
              color="text-red-400"
              bgColor="bg-red-900/20"
              showMACD={showMACD}
              showRSI={showRSI}
              showKDJ={showKDJ}
              noData={t('noData')}
            />
          </div>

          {selected !== '__all__' && (showMACD || showRSI || showKDJ) && (
            <div className="rounded-xl p-5" style={cardStyle}>
              <h3 className="text-sm font-semibold text-gray-400 mb-4">{t('indicatorDist')}</h3>
              <div className="space-y-4">
                {showMACD && <IndicatorCompare label="MACD DIF" wins={wins} losses={losses} field="big_dif" winLabel={t('winAvgLabel')} lossLabel={t('lossAvgLabel')} />}
                {showRSI && <IndicatorCompare label="RSI" wins={wins} losses={losses} field="big_rsi" winLabel={t('winAvgLabel')} lossLabel={t('lossAvgLabel')} />}
                {showKDJ && <IndicatorCompare label="KDJ K" wins={wins} losses={losses} field="big_k" winLabel={t('winAvgLabel')} lossLabel={t('lossAvgLabel')} />}
              </div>
            </div>
          )}

          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">{t('tradeDetail')}</h3>
            <div className="space-y-2">
              {filtered.map(trade => (
                <div key={trade.id} className="flex items-center justify-between py-2 border-b border-[#222222]">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      trade.direction === 'long' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                    }`}>
                      {trade.direction === 'long' ? t('directionLong') : t('directionShort')}
                    </span>
                    <span className="font-semibold text-sm">{trade.symbol}</span>
                    <span className="text-gray-400 text-xs">{trade.open_price} → {trade.close_price}</span>
                    {trade.remark && (
                      <span className="text-gray-500 text-xs">{trade.remark}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-semibold text-sm ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(0)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(trade.close_time).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${Math.min(Math.abs(winAvg) / (Math.abs(winAvg) + Math.abs(lossAvg ?? 1)) * 100, 100)}%` }}
          />
        )}
      </div>
    </div>
  )
}