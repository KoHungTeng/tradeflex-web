'use client'

import { CompletedTrade, Trade } from '../page'
import { useCurrency } from '../CurrencyContext'
import { useLanguage } from '../LanguageContext'
import { useState, useRef, useEffect } from 'react'

type Props = {
  completed: CompletedTrade[]
  trades: Trade[]
}

type CardItem = {
  id: string
  labelKey: string
  value: number
  isPrice?: boolean
  suffix?: string
  empty?: boolean
  custom?: string
}

type BlockItem = {
  id: string
  type: 'cards' | 'chart' | 'strategy' | 'growth' | 'pie'
}

export default function StatsPanel({ completed, trades }: Props) {
  const { convert } = useCurrency()
  const { t } = useLanguage()
  const [initialCapital, setInitialCapital] = useState(10000)
  const [selectedSymbol, setSelectedSymbol] = useState<string>('__all__')

  useEffect(() => {
    fetch('/api/capital').then(r => r.json()).then(data => {
      setInitialCapital(data.amount || 10000)
    })
  }, [])

  const allSymbols = Array.from(new Set(completed.map(t => t.symbol))).sort()
  const filteredCompleted = selectedSymbol === '__all__' ? completed : completed.filter(t => t.symbol === selectedSymbol)
  const totalPnL = filteredCompleted.reduce((s, t) => s + t.pnl, 0)
  const wins = filteredCompleted.filter(t => t.pnl > 0)
  const losses = filteredCompleted.filter(t => t.pnl < 0)
  const winRate = filteredCompleted.length > 0 ? (wins.length / filteredCompleted.length * 100) : 0
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0

  const today = new Date()
  const todayPnL = filteredCompleted
    .filter(t => new Date(t.close_time).toDateString() === today.toDateString())
    .reduce((s, t) => s + t.pnl, 0)

  const thisMonth = today.getMonth()
  const monthPnL = filteredCompleted
    .filter(t => new Date(t.close_time).getMonth() === thisMonth)
    .reduce((s, t) => s + t.pnl, 0)

  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const weekPnL = filteredCompleted
    .filter(t => new Date(t.close_time) >= startOfWeek)
    .reduce((s, t) => s + t.pnl, 0)

  const avgHoldMin = filteredCompleted.length > 0
    ? filteredCompleted.reduce((s, t) => {
        const diff = new Date(t.close_time).getTime() - new Date(t.open_time).getTime()
        return s + diff / 60000
      }, 0) / filteredCompleted.length
    : 0
  const avgHoldDisplay = avgHoldMin < 60
    ? `${avgHoldMin.toFixed(0)}m`
    : avgHoldMin < 1440
    ? `${(avgHoldMin / 60).toFixed(1)}h`
    : `${(avgHoldMin / 1440).toFixed(1)}d`

  const rrAchieveRate = wins.length > 0 && losses.length > 0
    ? Math.abs(avgWin / avgLoss)
    : 0

  const strategyMap: Record<string, { wins: number; total: number; pnl: number }> = {}
  filteredCompleted.forEach(trade => {
    if (!trade.strategy) return  // 只統計有填開倉策略的
    const s = trade.strategy
    if (!strategyMap[s]) strategyMap[s] = { wins: 0, total: 0, pnl: 0 }
    strategyMap[s].total++
    strategyMap[s].pnl += trade.pnl
    if (trade.pnl > 0) strategyMap[s].wins++
  })

  const last7: { date: string; pnl: number; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toDateString()
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const dayTrades = filteredCompleted.filter(t => new Date(t.close_time).toDateString() === dateStr)
    const pnl = dayTrades.reduce((s, t) => s + t.pnl, 0)
    const count = dayTrades.length
    last7.push({ date: label, pnl, count })
  }
  const maxAbsPnl = Math.max(...last7.map(d => Math.abs(d.pnl)), 1)

  // 只抓有獲利的交易計算盈虧比
  const winTrades = filteredCompleted.filter(t => t.pnl > 0)
  const rrList = winTrades
    .filter(t => t.sl && t.open_price && t.sl !== t.open_price)
    .map(t => {
      const risk = Math.abs(t.open_price - t.sl)
      return Math.abs(t.pnl) / (risk * t.quantity)
    })
    .filter(r => r > 0 && r < 100)
  const maxRR = rrList.length > 0 ? Math.max(...rrList) : 0
  const minRR = rrList.length > 0 ? Math.min(...rrList) : 0
  const maxWin = winTrades.length > 0 ? Math.max(...winTrades.map(t => t.pnl)) : 0
  const lossTrades = filteredCompleted.filter(t => t.pnl < 0)
  const maxLoss = lossTrades.length > 0 ? Math.min(...lossTrades.map(t => t.pnl)) : 0
  const maxCount = Math.max(...last7.map(d => d.count), 1)

  const sortedTrades = [...filteredCompleted].sort((a, b) =>
    new Date(a.close_time).getTime() - new Date(b.close_time).getTime()
  )
  const growthData: { date: string; capital: number }[] = []
  let capital = initialCapital
  growthData.push({ date: t('initialCapitalLabel').replace('：', '').replace(': ', '').replace('：', ''), capital })
  sortedTrades.forEach(trade => {
    capital += trade.pnl
    growthData.push({
      date: new Date(trade.close_time).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
      capital,
    })
  })
  const maxCapital = Math.max(...growthData.map(d => d.capital))
  const minCapital = Math.min(...growthData.map(d => d.capital))
  const capitalRange = maxCapital - minCapital || 1

  const initialCards: CardItem[] = [
    { id: 'totalPnL',  labelKey: 'totalPnl',    value: totalPnL,          isPrice: true },
    { id: 'todayPnL',  labelKey: 'todayPnl',    value: todayPnL,          isPrice: true },
    { id: 'weekPnL',   labelKey: 'weekPnl',     value: weekPnL,           isPrice: true },
    { id: 'monthPnL',  labelKey: 'monthPnl',    value: monthPnL,          isPrice: true },
    { id: 'winRate',   labelKey: 'winRate',     value: winRate,           suffix: '%' },
    { id: 'total',     labelKey: 'totalTrades', value: filteredCompleted.length },
    { id: 'avgWin',    labelKey: 'avgWin',      value: avgWin,            isPrice: true },
    { id: 'avgLoss',   labelKey: 'avgLoss',     value: avgLoss,           isPrice: true },
    { id: 'rrRate',    labelKey: 'avgRR',       value: rrAchieveRate,     custom: `${rrAchieveRate.toFixed(2)}R` },
    { id: 'holdTime',  labelKey: 'avgHoldTime', value: 0,                 custom: avgHoldDisplay },
    { id: 'maxRR',     labelKey: 'maxRR',       value: maxRR,             custom: maxRR > 0 ? `${maxRR.toFixed(2)}R` : '--' },
    { id: 'minRR',     labelKey: 'minRR',       value: minRR,             custom: minRR > 0 ? `${minRR.toFixed(2)}R` : '--' },
    { id: 'maxWin',    labelKey: 'maxWin',      value: maxWin,            isPrice: true },
    { id: 'maxLoss',   labelKey: 'maxLoss',     value: maxLoss,           isPrice: true },
  ]

  const [cards, setCards] = useState<CardItem[]>(initialCards)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    setCards(prev => prev.map(card => {
      switch (card.id) {
        case 'totalPnL':  return { ...card, value: totalPnL }
        case 'todayPnL':  return { ...card, value: todayPnL }
        case 'weekPnL':   return { ...card, value: weekPnL }
        case 'monthPnL':  return { ...card, value: monthPnL }
        case 'winRate':   return { ...card, value: winRate }
        case 'total':     return { ...card, value: filteredCompleted.length }
        case 'avgWin':    return { ...card, value: avgWin }
        case 'avgLoss':   return { ...card, value: avgLoss }
        case 'rrRate':    return { ...card, value: rrAchieveRate, custom: `${rrAchieveRate.toFixed(2)}R` }
        case 'holdTime':  return { ...card, value: 0, custom: avgHoldDisplay }
        case 'maxRR':     return { ...card, value: maxRR, custom: maxRR > 0 ? `${maxRR.toFixed(2)}R` : '--' }
        case 'minRR':     return { ...card, value: minRR, custom: minRR > 0 ? `${minRR.toFixed(2)}R` : '--' }
        case 'maxWin':    return { ...card, value: maxWin }
        case 'maxLoss':   return { ...card, value: maxLoss }
        default: return card
      }
    }))
    setAnimKey(k => k + 1)
  }, [selectedSymbol, totalPnL, todayPnL, weekPnL, monthPnL, winRate, avgWin, avgLoss, rrAchieveRate, avgHoldDisplay])
  const [blocks, setBlocks] = useState<BlockItem[]>([
    { id: 'cards',    type: 'cards' },
    { id: 'chart',    type: 'chart' },
    { id: 'growth',   type: 'growth' },
    { id: 'strategy', type: 'strategy' },
    { id: 'pie',      type: 'pie' },
  ])

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const draggingCardIndex = useRef<number | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const draggingBlockIndex = useRef<number | null>(null)

  function onCardMouseDown(index: number, id: string) {
    draggingCardIndex.current = index
    setDraggingCardId(id)
  }

  function onCardMouseEnter(index: number) {
    if (draggingCardIndex.current === null || draggingCardIndex.current === index) return
    setCards(prev => {
      const next = [...prev]
      const temp = next[draggingCardIndex.current!]
      next[draggingCardIndex.current!] = next[index]
      next[index] = temp
      draggingCardIndex.current = index
      return next
    })
  }

  function onCardMouseUp() {
    draggingCardIndex.current = null
    setDraggingCardId(null)
  }

  function onBlockMouseDown(index: number, id: string) {
    draggingBlockIndex.current = index
    setDraggingBlockId(id)
  }

  function onBlockMouseEnter(index: number) {
    if (draggingBlockIndex.current === null || draggingBlockIndex.current === index) return
    setBlocks(prev => {
      const next = [...prev]
      const temp = next[draggingBlockIndex.current!]
      next[draggingBlockIndex.current!] = next[index]
      next[index] = temp
      draggingBlockIndex.current = index
      return next
    })
  }

  function onBlockMouseUp() {
    draggingBlockIndex.current = null
    setDraggingBlockId(null)
  }

  const blockStyle = {
  background: 'linear-gradient(160deg, #272727 0%, #1e1e1e 100%)',
  border: '1px solid #333333',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
}

  const PIE_COLORS = ['#d4a843', '#4ade80', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#34d399']

  function renderBlock(block: BlockItem, index: number) {
    const isDragging = draggingBlockId === block.id
    return (
      <div
        key={block.id}
        onMouseDown={() => onBlockMouseDown(index, block.id)}
        onMouseEnter={() => onBlockMouseEnter(index)}
        onMouseUp={onBlockMouseUp}
        className={`rounded-xl select-none transition-all h-full ${isDragging ? 'ring-2 ring-[#d4a843] opacity-70 scale-95' : ''}`}
        style={blockStyle}
      >
        {/* 數據卡片 */}
        {block.type === 'cards' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 cursor-grab">⠿ {t('dataCards')}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" onMouseUp={onCardMouseUp}>
              {cards.map((card, ci) => {
                const isPos = card.value >= 0
                const color = card.isPrice
                  ? card.value === 0 ? 'text-gray-400' : isPos ? 'text-green-400' : 'text-red-400'
                  : 'text-white'
                const isCardDragging = draggingCardId === card.id
                return (
                  <div
                    key={card.id}
                    onMouseDown={e => { e.stopPropagation(); !card.empty && onCardMouseDown(ci, card.id) }}
                    onMouseEnter={() => onCardMouseEnter(ci)}
                    onMouseUp={e => { e.stopPropagation(); onCardMouseUp() }}
                    className={`rounded-lg p-3 h-20 flex flex-col justify-between select-none transition-all ${
                      card.empty ? 'opacity-10 cursor-default' : 'cursor-grab active:cursor-grabbing'
                    } ${isCardDragging ? 'ring-2 ring-[#d4a843] opacity-70 scale-95' : ''}`}
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
                  >
                    {!card.empty && (
                      <>
                        <div className="text-xs text-gray-500">
                          {card.labelKey ? t(card.labelKey as any) : ''}
                        </div>
                        {card.custom ? (
                          <div className="text-lg font-bold text-[#d4a843]">{card.custom}</div>
                        ) : (
                          <div className={`text-lg font-bold ${color}`}>
                            {card.isPrice ? (
                              <>{card.value > 0 ? '+$' : card.value < 0 ? '-$' : '$'}{Math.abs(card.value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</>
                            ) : (
                              <>{card.value.toFixed(card.suffix ? 1 : 0)}{card.suffix}</>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 近 7 天盈虧圖 */}
        {block.type === 'chart' && (
          <div className="p-4 cursor-grab flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-1">{t('recentPnl')} {selectedSymbol !== '__all__' && <span className="text-xs text-[#d4a843] ml-1">{selectedSymbol}</span>}</h3>
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-800" />
                  <span className="text-xs text-gray-500">盈虧</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5" style={{ background: '#d4a843' }} />
                  <span className="text-xs text-gray-500">次數</span>
                </div>
              </div>
            </div>
            {/* 盈虧金額 */}
            <div className="flex gap-2 flex-shrink-0">
              {last7.map(d => {
                const isPos = d.pnl >= 0
                return (
                  <div key={d.date} className="flex-1 text-center">
                    <span className={`font-medium ${isPos ? 'text-green-400' : 'text-red-400'}`} style={{ fontSize: 10 }}>
                      {d.pnl !== 0 ? (isPos ? '+' : '') + d.pnl.toFixed(0) : '-'}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* 柱狀圖 + 折線疊加 */}
            <div className="relative flex items-end gap-2" style={{ height: 120 }}>
              {last7.map(d => {
                const height = Math.abs(d.pnl) / maxAbsPnl * 100
                const isPos = d.pnl >= 0
                return (
                  <div key={d.date} className="flex-1 flex flex-col justify-end h-full" style={{ maxWidth: 60 }}>
                    {d.pnl !== 0 ? (
                      <div
                        className={`w-full rounded-t ${isPos ? 'bg-green-800' : 'bg-red-800'}`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    ) : (
                      <div className="w-full h-0.5" style={{ background: '#2a2a2a' }} />
                    )}
                  </div>
                )
              })}
              {/* 折線疊在柱狀圖上 */}
              <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 700 160" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
                <polyline
                  points={last7.map((d, i) => {
                    const x = (i + 0.5) / last7.length * 700
                    const y = 160 - (d.count / maxCount) * 150
                    return `${x},${y}`
                  }).join(' ')}
                  fill="none"
                  stroke="#d4a843"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

            </div>
            {/* 日期 */}
            <div className="flex gap-2 mt-1 flex-shrink-0">
              {last7.map(d => (
                <div key={d.date} className="flex-1 text-center">
                  <span className="text-xs text-gray-500">{d.date}</span>
                </div>
              ))}
            </div>
            {/* 次數 */}
            <div className="flex gap-2 flex-shrink-0">
              {last7.map(d => (
                <div key={d.date} className="flex-1 text-center">
                  <span style={{ fontSize: 10, color: d.count > 0 ? '#d4a843' : '#666' }}>{d.count > 0 ? d.count + '筆' : '-'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* 資金成長曲線 */}
        {block.type === 'growth' && (
          <div className="pt-5 px-5 pb-5 cursor-grab" style={{ height: 280 }}>
            <h3 className="text-sm font-semibold text-gray-400 mb-1 flex items-center gap-1">{t('growthCurve')} {selectedSymbol !== '__all__' && <span className="text-xs text-[#d4a843] ml-1">{selectedSymbol}</span>}</h3>
            <p className="text-xs text-gray-600 mb-4">{t('initialCapitalLabel')}{convert(initialCapital)}</p>
            {growthData.length <= 1 ? (
              <div className="text-center text-gray-600 py-8">{t('noCompletedTrades')}</div>
            ) : (
              <>
              <div className="relative" style={{ height: 140 }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${growthData.length * 40} 160`} preserveAspectRatio="none" style={{ display: 'block' }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4a843" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#d4a843" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    points={growthData.map((d, i) => {
                      const x = i * 40 + 20
                      const y = 160 - ((d.capital - minCapital) / capitalRange) * 140 - 10
                      return `${x},${y}`
                    }).join(' ')}
                    fill="none"
                    stroke="#d4a843"
                    strokeWidth="2"
                  />
                  <polygon
                    points={[
                      ...growthData.map((d, i) => {
                        const x = i * 40 + 20
                        const y = 160 - ((d.capital - minCapital) / capitalRange) * 140 - 10
                        return `${x},${y}`
                      }),
                      `${(growthData.length - 1) * 40 + 20},160`,
                      `20,160`,
                    ].join(' ')}
                    fill="url(#growthGrad)"
                  />
                </svg>
                {(() => {
                  const lastPct = capitalRange === 0 ? 0 : (capital - minCapital) / capitalRange
                  return (
                    <div className="absolute right-0 text-right" style={{ bottom: `calc(${lastPct * 100}% - 10px)` }}>
                      <div className="text-xs text-[#d4a843] font-semibold">{convert(capital)}</div>
                      <div className="text-xs text-gray-600">
                        {capital >= initialCapital ? '+' : ''}
                        {((capital - initialCapital) / initialCapital * 100).toFixed(1)}%
                      </div>
                    </div>
                  )
                })()}
              </div>
              <div className="flex justify-between mt-2 mb-1">
                  {growthData
                    .filter((_, i) =>
                      i === 0 ||
                      i === growthData.length - 1 ||
                      i % Math.ceil(growthData.length / 5) === 0
                    )
                    .map((d, i) => (
                      <span key={i} className="text-xs text-gray-600">{d.date}</span>
                    ))}
              </div>
              </>
            )}
          </div>
        )}

        {/* 策略勝率 */}
        {block.type === 'strategy' && Object.keys(strategyMap).length > 0 && (
          <div className="p-5 cursor-grab h-full">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-1">{t('strategyWinRate')} {selectedSymbol !== '__all__' && <span className="text-xs text-[#d4a843] ml-1">{selectedSymbol}</span>}</h3>
            <div className="space-y-3">
              {Object.entries(strategyMap).map(([name, data]) => {
                const rate = data.wins / data.total * 100
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{name}</span>
                      <div className="flex gap-2">
                        <span className={`w-16 text-right ${data.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {data.pnl >= 0 ? '+' : ''}{data.pnl.toFixed(0)}
                        </span>
                        <span className="w-12 text-right text-gray-400">{data.total} {t('tradesCount')}</span>
                        <span className={`w-10 text-right ${rate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {rate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                      <div
                        className={`h-full rounded-full ${rate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 各策略交易佔比柱狀圖 */}
        {block.type === 'pie' && Object.keys(strategyMap).length > 0 && (
          <div className="p-4 cursor-grab flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-1">各策略交易佔比 {selectedSymbol !== '__all__' && <span className="text-xs text-[#d4a843] ml-1">{selectedSymbol}</span>}</h3>
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-800" />
                  <span className="text-xs text-gray-500">次數</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5" style={{ background: '#d4a843' }} />
                  <span className="text-xs text-gray-500">勝率</span>
                </div>
              </div>
            </div>
            {(() => {
              const entries = Object.entries(strategyMap)
              const maxTotal = Math.max(...entries.map(([, d]) => d.total), 1)
              const maxWinRate = 100
              return (
                <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
                  {/* 次數標籤 */}
                  <div className="flex gap-2 flex-shrink-0">
                    {entries.map(([name, data]) => (
                      <div key={name} className="flex-1 text-center">
                        <span className="text-gray-400" style={{ fontSize: 10 }}>{data.total}筆</span>
                      </div>
                    ))}
                  </div>
                  {/* 柱狀圖 + 折線 */}
                  <div className="flex-1 relative flex items-end gap-2" style={{ minHeight: 0 }}>
                    {entries.map(([name, data], i) => {
                      const height = data.total / maxTotal * 100
                      return (
                        <div key={name} className="flex-1 flex flex-col justify-end h-full">
                          <div
                            className="w-full rounded-t"
                            style={{ height: `${Math.max(height, 4)}%`, background: '#166534', opacity: 0.9 }}
                          />
                        </div>
                      )
                    })}
                    {/* 勝率折線 */}
                    <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 700 160" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
                      <polyline
                        points={entries.map(([, data], i) => {
                          const x = (i + 0.5) / entries.length * 700
                          const winRate = data.total > 0 ? data.wins / data.total : 0
                          const y = 160 - winRate * 150
                          return `${x},${y}`
                        }).join(' ')}
                        fill="none"
                        stroke="#d4a843"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                  {/* 策略名稱 */}
                  <div className="flex gap-2 mt-1 flex-shrink-0">
                    {entries.map(([name]) => (
                      <div key={name} className="flex-1 text-center overflow-hidden">
                        <span className="text-gray-500 truncate block" style={{ fontSize: 10 }}>{name}</span>
                      </div>
                    ))}
                  </div>
                  {/* 勝率 */}
                  <div className="flex gap-2 flex-shrink-0">
                    {entries.map(([name, data]) => {
                      const rate = data.total > 0 ? (data.wins / data.total * 100).toFixed(0) : '0'
                      return (
                        <div key={name} className="flex-1 text-center">
                          <span className="text-green-400" style={{ fontSize: 10 }}>{rate}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-auto p-6"
      onMouseUp={() => { onCardMouseUp(); onBlockMouseUp() }}
      onMouseLeave={() => { onCardMouseUp(); onBlockMouseUp() }}
    >
      <div className="flex items-center justify-between mb-6">
        <style>{`
        @keyframes statsFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <h2 className="text-lg font-semibold">{t('statsOverview')}</h2>
        <div className="relative">
          <select
            value={selectedSymbol}
            onChange={e => setSelectedSymbol(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-3 pr-8 py-1.5 text-sm text-white focus:outline-none focus:border-[#d4a843] h-[38px] appearance-none"
          >
            <option value="__all__">全部標的</option>
            {allSymbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
        </div>
      </div>

      <div key={animKey} className="flex flex-col gap-4" style={{ animation: 'statsFadeIn 1s cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {(() => {
          const result = []
          let i = 0
          while (i < blocks.length) {
            const block = blocks[i]
            const next = blocks[i + 1]
            if (
              (block.type === 'strategy' || block.type === 'pie') &&
              next && (next.type === 'strategy' || next.type === 'pie')
            ) {
              result.push(
                <div key={`row-${i}`} className="flex gap-4">
                  <div className="flex-1 min-w-0">{renderBlock(block, i)}</div>
                  <div className="flex-1 min-w-0">{renderBlock(next, i + 1)}</div>
                </div>
              )
              i += 2
            } else {
              result.push(renderBlock(block, i))
              i++
            }
          }
          return result
        })()}
      </div>

      {filteredCompleted.length === 0 && (
        <div className="text-center text-gray-600 py-20">{t('noCompletedTrades')}</div>
      )}
    </div>
  )
}