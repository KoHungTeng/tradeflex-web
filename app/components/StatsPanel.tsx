'use client'

import { CompletedTrade, Trade } from '../page'
import { useCurrency } from '../CurrencyContext'
import { useState, useRef } from 'react'

type Props = {
  completed: CompletedTrade[]
  trades: Trade[]
}

type CardItem = {
  id: string
  label: string
  value: number
  isPrice?: boolean
  suffix?: string
  empty?: boolean
  custom?: string
}

type BlockItem = {
  id: string
  type: 'cards' | 'chart' | 'strategy'
}

export default function StatsPanel({ completed, trades }: Props) {
  const { convert, symbol } = useCurrency()
  const totalPnL = completed.reduce((s, t) => s + t.pnl, 0)
  const wins = completed.filter(t => t.pnl > 0)
  const losses = completed.filter(t => t.pnl < 0)
  const winRate = completed.length > 0 ? (wins.length / completed.length * 100) : 0
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0

  const today = new Date()
  const todayPnL = completed
    .filter(t => new Date(t.close_time).toDateString() === today.toDateString())
    .reduce((s, t) => s + t.pnl, 0)

  const thisMonth = today.getMonth()
  const monthPnL = completed
    .filter(t => new Date(t.close_time).getMonth() === thisMonth)
    .reduce((s, t) => s + t.pnl, 0)

  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const weekPnL = completed
    .filter(t => new Date(t.close_time) >= startOfWeek)
    .reduce((s, t) => s + t.pnl, 0)

  const avgHoldMin = completed.length > 0
    ? completed.reduce((s, t) => {
        const diff = new Date(t.close_time).getTime() - new Date(t.open_time).getTime()
        return s + diff / 60000
      }, 0) / completed.length
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
  completed.forEach(t => {
    const s = t.strategy || '無策略'
    if (!strategyMap[s]) strategyMap[s] = { wins: 0, total: 0, pnl: 0 }
    strategyMap[s].total++
    strategyMap[s].pnl += t.pnl
    if (t.pnl > 0) strategyMap[s].wins++
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

  const initialCards: CardItem[] = [
    { id: 'totalPnL', label: '總盈虧', value: totalPnL, isPrice: true },
    { id: 'todayPnL', label: '今日盈虧', value: todayPnL, isPrice: true },
    { id: 'weekPnL', label: '本週盈虧', value: weekPnL, isPrice: true },
    { id: 'monthPnL', label: '本月盈虧', value: monthPnL, isPrice: true },
    { id: 'winRate', label: '勝率', value: winRate, suffix: '%' },
    { id: 'total', label: '總交易數', value: completed.length },
    { id: 'avgWin', label: '平均獲利', value: avgWin, isPrice: true },
    { id: 'avgLoss', label: '平均虧損', value: avgLoss, isPrice: true },
    { id: 'rrRate', label: '盈虧比', value: rrAchieveRate, custom: `${rrAchieveRate.toFixed(2)}R` },
    { id: 'holdTime', label: '平均持倉', value: 0, custom: avgHoldDisplay },
    { id: 'empty1', label: '', value: 0, empty: true },
    { id: 'empty2', label: '', value: 0, empty: true },
  ]

  const [cards, setCards] = useState<CardItem[]>(initialCards)
  const [blocks, setBlocks] = useState<BlockItem[]>([
    { id: 'cards', type: 'cards' },
    { id: 'chart', type: 'chart' },
    { id: 'strategy', type: 'strategy' },
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

  const blockStyle = { background: 'linear-gradient(160deg, #161616 0%, #0f0f0f 100%)', border: '1px solid #2a2a2a' }

  function renderBlock(block: BlockItem, index: number) {
    const isDragging = draggingBlockId === block.id
    return (
      <div
        key={block.id}
        onMouseDown={() => onBlockMouseDown(index, block.id)}
        onMouseEnter={() => onBlockMouseEnter(index)}
        onMouseUp={onBlockMouseUp}
        className={`rounded-xl select-none transition-all ${isDragging ? 'ring-2 ring-[#d4a843] opacity-70 scale-95' : ''}`}
        style={blockStyle}
      >
        {block.type === 'cards' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 cursor-grab">⠿ 數據卡片</span>
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
                    style={{ background: '#0f0f0f', border: '1px solid #222' }}
                  >
                    {!card.empty && (
                      <>
                        <div className="text-xs text-gray-500">{card.label}</div>
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

        {block.type === 'chart' && (
          <div className="p-5 cursor-grab">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">近 7 天盈虧</h3>
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
                      {d.pnl === 0 && <div className="w-full h-0.5 mt-auto" style={{ background: '#2a2a2a' }} />}
                    </div>
                    <span className="text-xs text-gray-500">{d.date}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {block.type === 'strategy' && Object.keys(strategyMap).length > 0 && (
          <div className="p-5 cursor-grab">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">策略勝率</h3>
            <div className="space-y-3">
              {Object.entries(strategyMap).map(([name, data]) => {
                const rate = data.wins / data.total * 100
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{name}</span>
                      <div className="flex gap-4">
                        <span className={data.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {data.pnl >= 0 ? '+' : ''}{data.pnl.toFixed(0)}
                        </span>
                        <span className="text-gray-400">{data.total} 筆</span>
                        <span className={rate >= 50 ? 'text-green-400' : 'text-red-400'}>
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
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-auto p-6"
      onMouseUp={() => { onCardMouseUp(); onBlockMouseUp() }}
      onMouseLeave={() => { onCardMouseUp(); onBlockMouseUp() }}
    >
      <h2 className="text-lg font-semibold mb-6">統計總覽</h2>

      <div className="flex flex-col gap-4">
        {blocks.map((block, index) => renderBlock(block, index))}
      </div>

      {completed.length === 0 && (
        <div className="text-center text-gray-600 py-20">尚無已平倉交易</div>
      )}
    </div>
  )
}