'use client'

import { CompletedTrade, Trade } from '../page'
import { useCurrency } from '../CurrencyContext'
import { useLanguage } from '../LanguageContext'
import { useState, useRef, useEffect, useCallback } from 'react'

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
  const holdMins = wins.map(t => (new Date(t.close_time).getTime() - new Date(t.open_time).getTime()) / 60000)
  const maxHoldMin = holdMins.length > 0 ? Math.max(...holdMins) : 0

  // 最大連勝/連敗
  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0
  filteredCompleted.forEach(t => {
    if (t.pnl > 0) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin) }
    else { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss) }
  })
  const minHoldMin = holdMins.length > 0 ? Math.min(...holdMins) : 0

  function formatHold(min: number) {
    if (min === 0) return '--'
    if (min < 60) return `${min.toFixed(0)}m`
    if (min < 1440) return `${(min / 60).toFixed(1)}h`
    return `${(min / 1440).toFixed(1)}d`
  }

  const avgHoldDisplay = formatHold(avgHoldMin)

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
    .filter(t => t.sl != null && t.open_price != null && t.sl !== t.open_price)
    .map(t => {
      const risk = Math.abs((t.open_price as number) - (t.sl as number))
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
    { id: 'totalPnL',      labelKey: 'totalPnl',      value: totalPnL,          isPrice: true },
    { id: 'todayPnL',      labelKey: 'todayPnl',      value: todayPnL,          isPrice: true },
    { id: 'weekPnL',       labelKey: 'weekPnl',       value: weekPnL,           isPrice: true },
    { id: 'monthPnL',      labelKey: 'monthPnl',      value: monthPnL,          isPrice: true },
    { id: 'winRate',       labelKey: 'winRate',       value: winRate,           suffix: '%' },
    { id: 'total',         labelKey: 'totalTrades',   value: filteredCompleted.length },
    { id: 'maxWinStreak',  labelKey: 'maxWinStreak',  value: maxWinStreak,      custom: `${maxWinStreak}` },
    { id: 'maxLossStreak', labelKey: 'maxLossStreak', value: maxLossStreak,     custom: `${maxLossStreak}` },
    { id: 'maxHoldTime',   labelKey: 'maxHoldTime',   value: 0,                 custom: formatHold(maxHoldMin) },
    { id: 'minHoldTime',   labelKey: 'minHoldTime',   value: 0,                 custom: formatHold(minHoldMin) },
    { id: 'holdTime',      labelKey: 'avgHoldTime',   value: 0,                 custom: avgHoldDisplay },
    { id: 'empty1',        labelKey: '',              value: 0,                 empty: true },
    { id: 'maxWin',        labelKey: 'maxWin',        value: maxWin,            isPrice: true },
    { id: 'maxLoss',       labelKey: 'maxLoss',       value: maxLoss,           isPrice: true },
    { id: 'avgWin',        labelKey: 'avgWin',        value: avgWin,            isPrice: true },
    { id: 'avgLoss',       labelKey: 'avgLoss',       value: avgLoss,           isPrice: true },
    { id: 'maxRR',         labelKey: 'maxRR',         value: maxRR,             custom: maxRR > 0 ? `${maxRR.toFixed(2)}R` : '--' },
    { id: 'minRR',         labelKey: 'minRR',         value: minRR,             custom: minRR > 0 ? `${minRR.toFixed(2)}R` : '--' },
    { id: 'rrRate',        labelKey: 'avgRR',         value: rrAchieveRate,     custom: `${rrAchieveRate.toFixed(2)}R` },
    { id: 'empty2',        labelKey: '',              value: 0,                 empty: true },
  ]

  const [cards, setCards] = useState<CardItem[]>(() => {
    try {
      const saved = localStorage.getItem('tradeflex-cards-order')
      if (saved) {
        const savedIds: string[] = JSON.parse(saved)
        const sorted = savedIds.map(id => initialCards.find(c => c.id === id)).filter(Boolean) as CardItem[]
        const newCards = initialCards.filter(c => !savedIds.includes(c.id))
        return [...sorted, ...newCards]
      }
    } catch {}
    return initialCards
  })
  const [animKey, setAnimKey] = useState(0)
  const [visibleBlocks, setVisibleBlocks] = useState<Set<string>>(new Set())
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLDivElement).dataset.blockId
            if (id) setVisibleBlocks(prev => new Set([...prev, id]))
          }
        })
      },
      { threshold: 0.2 }
    )
    Object.values(blockRefs.current).forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

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
        case 'maxHoldTime': return { ...card, value: 0, custom: formatHold(maxHoldMin) }
        case 'minHoldTime': return { ...card, value: 0, custom: formatHold(minHoldMin) }
        case 'maxWinStreak':  return { ...card, value: maxWinStreak, custom: `${maxWinStreak}` }
        case 'maxLossStreak': return { ...card, value: maxLossStreak, custom: `${maxLossStreak}` }
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
  const [hoverCardIndex, setHoverCardIndex] = useState<number | null>(null)
  const draggingCardIndex = useRef<number | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const draggingBlockIndex = useRef<number | null>(null)

  function onCardMouseDown(index: number, id: string) {
    draggingCardIndex.current = index
    setDraggingCardId(id)
  }

  const draggingCardTarget = useRef<number | null>(null)

  function onCardMouseEnter(index: number) {
    if (draggingCardIndex.current === null || draggingCardIndex.current === index) return
    setCards(prev => {
      if (prev[draggingCardIndex.current!]?.empty) return prev
      const next = [...prev]
      const temp = next[draggingCardIndex.current!]
      next[draggingCardIndex.current!] = next[index]
      next[index] = temp
      draggingCardIndex.current = index
      return next
    })
    setHoverCardIndex(index)
  }

  function onCardMouseUp() {
    draggingCardIndex.current = null
    draggingCardTarget.current = null
    setDraggingCardId(null)
    setHoverCardIndex(null)
    setCards(prev => {
      try { localStorage.setItem('tradeflex-cards-order', JSON.stringify(prev.map(c => c.id))) } catch {}
      return prev
    })
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
  background: 'linear-gradient(160deg, var(--bg-card3) 0%, var(--bg-card4) 100%)',
  border: '1px solid var(--border-light)',
  boxShadow: 'var(--shadow-inset), var(--shadow-card)',
}

  const PIE_COLORS = ['var(--gold)', '#4ade80', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#34d399']

  function renderBlock(block: BlockItem, index: number) {
    const isDragging = draggingBlockId === block.id
    return (
      <div
        key={block.id}
        ref={el => { blockRefs.current[block.id] = el }}
        data-block-id={block.id}
        onMouseDown={() => onBlockMouseDown(index, block.id)}
        onMouseEnter={() => onBlockMouseEnter(index)}
        onMouseUp={onBlockMouseUp}
        className={`rounded-xl select-none transition-all h-full ${isDragging ? 'ring-2 ring-[var(--gold)] opacity-70 scale-95' : ''}`}
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
                  ? card.value === 0 ? 'text-gray-400' : isPos ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'
                  : 'text-[var(--text-primary)]'
                const isCardDragging = draggingCardId === card.id
                return (
                  <div
                    key={card.id}
                    onMouseDown={e => { e.stopPropagation(); !card.empty && onCardMouseDown(ci, card.id) }}
                    onMouseEnter={() => onCardMouseEnter(ci)}
                    onMouseUp={e => { e.stopPropagation(); draggingCardTarget.current = (draggingCardIndex.current !== null && draggingCardIndex.current !== ci) ? ci : draggingCardTarget.current; onCardMouseUp() }}
                    className={`rounded-lg p-3 h-20 flex flex-col justify-between select-none transition-all ${
                      card.empty ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                    } ${isCardDragging ? 'ring-2 ring-[var(--gold)] opacity-70 scale-95' : hoverCardIndex === ci && draggingCardId ? 'ring-2 ring-[var(--gold)] opacity-90' : ''}`}
                    style={card.empty ? { background: 'transparent', border: '1px dashed var(--border-light)' } : { background: 'var(--bg-card)', border: '1px solid #3a3a3a', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.4)' }}
                  >
                    {!card.empty && (
                      <>
                        <div className="text-xs text-gray-500">
                          {card.labelKey ? t(card.labelKey as any) : ''}
                        </div>
                        {card.custom ? (
                          <div key={card.custom} className="text-lg font-bold text-[var(--gold)] num-anim">{card.custom}</div>
                        ) : (
                          <div key={card.value} className={`text-lg font-bold ${color} num-anim`}>
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
          <div className="p-4 cursor-grab flex flex-col" style={{ height: 280 }}>
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-1">{t('recentPnl')} {selectedSymbol !== '__all__' && <span className="text-xs text-[var(--gold)] ml-1">{selectedSymbol}</span>}</h3>
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-800" />
                  <span className="text-xs text-gray-500">盈虧</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5" style={{ background: 'var(--gold)' }} />
                  <span className="text-xs text-gray-500">次數</span>
                </div>
              </div>
            </div>
            {/* 盈虧金額 */}
            <div className="flex gap-2 flex-shrink-0">
              {last7.map((d, i) => {
                const isPos = d.pnl >= 0
                return (
                  <div key={d.date} className="flex-1 text-center">
                    <span className={`font-medium ${isPos ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}`} style={{ fontSize: 10 }}>
                      {d.pnl !== 0 ? (isPos ? '+' : '') + d.pnl.toFixed(0) : '-'}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* 柱狀圖 + 折線疊加 */}
            <div className="relative flex items-end gap-8 px-4" style={{ height: 120 }}>
              {last7.map((d, i) => {
                const height = Math.abs(d.pnl) / maxAbsPnl * 100
                const isPos = d.pnl >= 0
                return (
                  <div key={d.date} className="flex-1 flex flex-col justify-end h-full items-center">
                    {d.pnl !== 0 ? (
                      <div
                        className={`w-full rounded-t ${isPos ? 'bg-green-800' : 'bg-red-800'} ${visibleBlocks.has(block.id) ? 'bar-grow' : ''}`}
                        style={{ height: `${Math.max(height, 4)}%`, animationDelay: `${i * 0.08}s` }}
                      />
                    ) : (
                      <div className="w-full h-0.5" style={{ background: 'var(--border)' }} />
                    )}
                  </div>
                )
              })}
              {/* 折線疊在柱狀圖上 */}
              <svg className="absolute inset-0" width="100%" height="100%" style={{ pointerEvents: 'none', overflow: 'visible' }}>
                {last7.map((d, i) => {
                  const next = last7[i + 1]
                  if (!next) return null
                  const x1 = `${(i + 0.5) / last7.length * 100}%`
                  const y1 = `${100 - (d.count / maxCount) * 95}%`
                  const x2 = `${(i + 1.5) / last7.length * 100}%`
                  const y2 = `${100 - (next.count / maxCount) * 95}%`
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
                })}
                {last7.map((d, i) => (
                  <circle
                    key={i}
                    cx={`${(i + 0.5) / last7.length * 100}%`}
                    cy={`${100 - (d.count / maxCount) * 95}%`}
                    r="3"
                    fill="var(--gold)"
                  />
                ))}
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
                  <span style={{ fontSize: 10, color: d.count > 0 ? 'var(--gold)' : '#666' }}>{d.count > 0 ? d.count + '筆' : '-'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* 資金成長曲線 */}
        {block.type === 'growth' && (
          <div className="pt-5 px-5 pb-5 cursor-grab" style={{ height: 280 }}>
            <h3 className="text-sm font-semibold text-gray-400 mb-1 flex items-center gap-1">{t('growthCurve')} {selectedSymbol !== '__all__' && <span className="text-xs text-[var(--gold)] ml-1">{selectedSymbol}</span>}</h3>
            <p className="text-xs text-gray-600 mb-4">{t('initialCapitalLabel')}{convert(initialCapital)}</p>
            {growthData.length <= 1 ? (
              <div className="text-center text-gray-600 py-8">{t('noCompletedTrades')}</div>
            ) : (
              <>
              <div className="relative" style={{ height: 140 }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${growthData.length * 40} 160`} preserveAspectRatio="none" style={{ display: 'block' }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    points={growthData.map((d, i) => {
                      const x = i * 40 + 20
                      const y = 160 - ((d.capital - minCapital) / capitalRange) * 140 - 10
                      return `${x},${y}`
                    }).join(' ')}
                    fill="none"
                    stroke="var(--gold)"
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
                      <div className="text-xs text-[var(--gold)] font-semibold">{convert(capital)}</div>
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
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-1">{t('strategyWinRate')} {selectedSymbol !== '__all__' && <span className="text-xs text-[var(--gold)] ml-1">{selectedSymbol}</span>}</h3>
            <div className="space-y-3">
              {Object.entries(strategyMap).map(([name, data]) => {
                const rate = data.wins / data.total * 100
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text-primary)]">{name}</span>
                      <div className="flex gap-2">
                        <span className={`w-16 text-right ${data.pnl >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}`}>
                          {data.pnl >= 0 ? '+' : ''}{data.pnl.toFixed(0)}
                        </span>
                        <span className="w-12 text-right text-gray-400">{data.total} {t('tradesCount')}</span>
                        <span className={`w-10 text-right ${rate >= 50 ? '' : 'text-[var(--color-loss)]'}`} style={rate >= 50 ? { color: 'var(--gold)' } : {}}>
                          {rate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div
                        className={`h-full rounded-full ${visibleBlocks.has(block.id) ? 'bar-expand-x' : ''} ${rate >= 50 ? '' : 'bg-red-500'}`}
                        style={rate >= 50 ? { background: 'var(--gold-gradient)', width: `${rate}%` } : { width: `${rate}%` }}
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
          <div className="p-4 cursor-grab flex flex-col" style={{ height: 280 }}>
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-1">各策略交易佔比 {selectedSymbol !== '__all__' && <span className="text-xs text-[var(--gold)] ml-1">{selectedSymbol}</span>}</h3>
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-800" />
                  <span className="text-xs text-gray-500">次數</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5" style={{ background: 'var(--gold)' }} />
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
                  <div className="relative flex items-end gap-2" style={{ height: 140 }}>
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
                    <svg className="absolute inset-0" width="100%" height="100%" style={{ pointerEvents: 'none', overflow: 'visible' }}>
                      {entries.map(([, data], i) => {
                        const next = entries[i + 1]
                        if (!next) return null
                        const winRate1 = data.total > 0 ? data.wins / data.total : 0
                        const winRate2 = next[1].total > 0 ? next[1].wins / next[1].total : 0
                        const x1 = `${(i + 0.5) / entries.length * 100}%`
                        const y1 = `${100 - winRate1 * 95}%`
                        const x2 = `${(i + 1.5) / entries.length * 100}%`
                        const y2 = `${100 - winRate2 * 95}%`
                        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
                      })}
                      {entries.map(([, data], i) => {
                        const winRate = data.total > 0 ? data.wins / data.total : 0
                        return (
                          <circle
                            key={i}
                            cx={`${(i + 0.5) / entries.length * 100}%`}
                            cy={`${100 - winRate * 95}%`}
                            r="3"
                            fill="var(--gold)"
                          />
                        )
                      })}
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
                          <span className="text-[var(--color-profit)]" style={{ fontSize: 10 }}>{rate}%</span>
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
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg pl-3 pr-8 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)] h-[38px] appearance-none"
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
              block.type === 'strategy' &&
              next && next.type === 'strategy'
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