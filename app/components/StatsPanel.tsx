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

  const last7: { date: string; pnl: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toDateString()
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const pnl = completed
      .filter(t => new Date(t.close_time).toDateString() === dateStr)
      .reduce((s, t) => s + t.pnl, 0)
    last7.push({ date: label, pnl })
  }
  const maxAbsPnl = Math.max(...last7.map(d => Math.abs(d.pnl)), 1)

  const sortedTrades = [...completed].sort((a, b) =>
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
    { id: 'rrRate',    labelKey: 'profitFactor',value: rrAchieveRate,     custom: `${rrAchieveRate.toFixed(2)}R` },
    { id: 'holdTime',  labelKey: 'avgHoldTime', value: 0,                 custom: avgHoldDisplay },
    { id: 'empty1',    labelKey: '',            value: 0,                 empty: true },
    { id: 'empty2',    labelKey: '',            value: 0,                 empty: true },
  ]

  const [cards, setCards] = useState<CardItem[]>(initialCards)
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
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
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
                              <>{card.value > 0 ? '+' : ''}{convert(card.value)}</>
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
          <div className="p-5 cursor-grab">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">{t('recentPnl')}</h3>
            <div className="flex items-end gap-2 h-32">
              {last7.map(d => {
                const height = Math.abs(d.pnl) / maxAbsPnl * 100
                const isPos = d.pnl >= 0
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-xs font-medium ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                      {d.pnl !== 0 ? (isPos ? '+' : '') + d.pnl.toFixed(0) : ''}
                    </span>
                    <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                      {d.pnl !== 0 && (
                        <div
                          className={`w-full rounded-t ${isPos ? 'bg-green-600' : 'bg-red-600'}`}
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                      )}
                      {d.pnl === 0 && (
                        <div className="w-full h-0.5 mt-auto" style={{ background: '#2a2a2a' }} />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{d.date}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 資金成長曲線 */}
        {block.type === 'growth' && (
          <div className="pt-5 px-5 pb-5 cursor-grab">
            <h3 className="text-sm font-semibold text-gray-400 mb-1">{t('growthCurve')}</h3>
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
                <div className="absolute right-0 top-0 text-right">
                  <div className="text-xs text-[#d4a843] font-semibold">{convert(capital)}</div>
                  <div className="text-xs text-gray-600">
                    {capital >= initialCapital ? '+' : ''}
                    {((capital - initialCapital) / initialCapital * 100).toFixed(1)}%
                  </div>
                </div>
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
            <h3 className="text-sm font-semibold text-gray-400 mb-4">{t('strategyWinRate')}</h3>
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

        {/* 各策略交易佔比圓餅圖 */}
        {block.type === 'pie' && Object.keys(strategyMap).length > 0 && (
          <div className="p-5 cursor-grab h-full">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">各策略交易佔比</h3>
            <div className="flex items-center gap-6">
              <svg width="160" height="160" viewBox="0 0 160 160">
                {(() => {
                  const total = Object.values(strategyMap).reduce((s, d) => s + d.total, 0)
                  let angle = -90
                  return Object.entries(strategyMap).map(([name, data], i) => {
                    const pct = data.total / total
                    const startAngle = angle
                    const endAngle = angle + pct * 360
                    angle = endAngle
                    const r = 70
                    const cx = 80
                    const cy = 80
                    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180)
                    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180)
                    const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180)
                    const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180)
                    const largeArc = pct > 0.5 ? 1 : 0
                    return (
                      <path
                        key={name}
                        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        opacity={0.85}
                        stroke="#0f0f0f"
                        strokeWidth="2"
                      />
                    )
                  })
                })()}
                <circle cx="80" cy="80" r="35" fill="#0f0f0f" />
                <text x="80" y="76" textAnchor="middle" fill="#888" fontSize="10">總計</text>
                <text x="80" y="92" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">
                  {Object.values(strategyMap).reduce((s, d) => s + d.total, 0)}
                </text>
              </svg>
              <div className="space-y-2 flex-1">
                {(() => {
                  const total = Object.values(strategyMap).reduce((s, d) => s + d.total, 0)
                  return Object.entries(strategyMap).map(([name, data], i) => (
                    <div key={name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm text-gray-300 truncate flex-1">{name}</span>
                      <span className="text-xs text-gray-500 w-10 text-right">{data.total}筆</span>
                      <span className="text-xs font-medium w-8 text-right" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>
                        {(data.total / total * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))
                })()}
              </div>
            </div>
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

      <div className="flex flex-col gap-4">
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