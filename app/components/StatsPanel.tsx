'use client'

import { CompletedTrade, Trade } from '../page'
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
}

export default function StatsPanel({ completed, trades }: Props) {
  const totalPnL = completed.reduce((s, t) => s + t.pnl, 0)
  const wins = completed.filter(t => t.pnl > 0)
  const losses = completed.filter(t => t.pnl < 0)
  const winRate = completed.length > 0 ? (wins.length / completed.length * 100) : 0
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0

  const today = new Date().toDateString()
  const todayPnL = completed
    .filter(t => new Date(t.close_time).toDateString() === today)
    .reduce((s, t) => s + t.pnl, 0)

  const thisMonth = new Date().getMonth()
  const monthPnL = completed
    .filter(t => new Date(t.close_time).getMonth() === thisMonth)
    .reduce((s, t) => s + t.pnl, 0)

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
    { id: 'monthPnL', label: '本月盈虧', value: monthPnL, isPrice: true },
    { id: 'winRate', label: '勝率', value: winRate, suffix: '%' },
    { id: 'total', label: '總交易數', value: completed.length },
    { id: 'avgWin', label: '平均獲利', value: avgWin, isPrice: true },
    { id: 'avgLoss', label: '平均虧損', value: avgLoss, isPrice: true },
  ]

  const [cards, setCards] = useState<CardItem[]>(initialCards)
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)

  function handleDragStart(index: number) {
    dragIndex.current = index
  }

  function handleDragEnter(index: number) {
    dragOverIndex.current = index
    if (dragIndex.current === null || dragIndex.current === index) return
    setCards(prev => {
      const next = [...prev]
      const dragged = next.splice(dragIndex.current!, 1)[0]
      next.splice(index, 0, dragged)
      dragIndex.current = index
      return next
    })
  }

  function handleDragEnd() {
    dragIndex.current = null
    dragOverIndex.current = null
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="text-lg font-semibold mb-6">統計總覽</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => {
          const isPos = card.value >= 0
          const color = card.isPrice
            ? card.value === 0 ? 'text-gray-400' : isPos ? 'text-green-400' : 'text-red-400'
            : 'text-white'
          return (
            <div
              key={card.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className="bg-gray-900 rounded-xl p-4 cursor-grab active:cursor-grabbing h-24 flex flex-col justify-between select-none"
            >
              <div className="text-xs text-gray-500">{card.label}</div>
              <div className={`text-xl font-bold ${color}`}>
                {card.isPrice && card.value !== 0 && isPos ? '+' : ''}
                {card.isPrice ? card.value.toFixed(0) : card.value.toFixed(card.suffix ? 1 : 0)}
                {card.suffix}
              </div>
            </div>
          )
        })}
      </div>

      {/* 近7天盈虧圖 */}
      <div className="bg-gray-900 rounded-xl p-5 mb-4">
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
                  {d.pnl === 0 && <div className="w-full h-0.5 bg-gray-700 mt-auto" />}
                </div>
                <span className="text-xs text-gray-500">{d.date}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 策略勝率 */}
      {Object.keys(strategyMap).length > 0 && (
        <div className="bg-gray-900 rounded-xl p-5">
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
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
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

      {completed.length === 0 && (
        <div className="text-center text-gray-600 py-20">尚無已平倉交易</div>
      )}
    </div>
  )
}