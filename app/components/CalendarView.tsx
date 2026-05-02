'use client'

import { useState } from 'react'
import { CompletedTrade } from '../page'

type Props = {
  completed: CompletedTrade[]
}

export default function CalendarView({ completed }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // 計算每天的盈虧
  const dailyPnL: Record<string, number> = {}
  completed.forEach(t => {
    const d = new Date(t.close_time)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate().toString()
      dailyPnL[key] = (dailyPnL[key] || 0) + t.pnl
    }
  })

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  // 本月統計
  const monthTrades = completed.filter(t => {
    const d = new Date(t.close_time)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const monthPnL = monthTrades.reduce((s, t) => s + t.pnl, 0)
  const monthWins = monthTrades.filter(t => t.pnl > 0).length
  const monthWinRate = monthTrades.length > 0 ? monthWins / monthTrades.length * 100 : 0

  const today = new Date()

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* 月份導航 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
          ←
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold">{year} 年 {monthNames[month]}</h2>
          <div className="flex gap-4 mt-1 text-sm justify-center">
            <span className={monthPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
              {monthPnL >= 0 ? '+' : ''}{monthPnL.toFixed(0)}
            </span>
            <span className="text-gray-400">{monthTrades.length} 筆</span>
            <span className={monthWinRate >= 50 ? 'text-green-400' : 'text-red-400'}>
              勝率 {monthWinRate.toFixed(0)}%
            </span>
          </div>
        </div>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
          →
        </button>
      </div>

      {/* 星期標題 */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs text-gray-500 py-2">{d}</div>
        ))}
      </div>

      {/* 日曆格子 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 空格 */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* 日期 */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const pnl = dailyPnL[day.toString()]
          const isToday = today.getDate() === day &&
            today.getMonth() === month &&
            today.getFullYear() === year
          const hasTrade = pnl !== undefined

          return (
            <div
              key={day}
              className={`rounded-lg p-2 min-h-16 flex flex-col transition-colors ${
                isToday ? 'ring-2 ring-blue-500' : ''
              } ${
                hasTrade
                  ? pnl > 0
                    ? 'bg-green-900/30 hover:bg-green-900/50'
                    : 'bg-red-900/30 hover:bg-red-900/50'
                  : 'bg-gray-900 hover:bg-gray-800'
              }`}
            >
              <span className={`text-xs font-medium ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                {day}
              </span>
              {hasTrade && (
                <span className={`text-xs font-semibold mt-auto ${pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pnl > 0 ? '+' : ''}{pnl.toFixed(0)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}