'use client'

import { useState } from 'react'
import { CompletedTrade } from '../page'

type Props = {
  completed: CompletedTrade[]
}

type IndicatorStats = {
  macd_dif: number[]
  macd_dea: number[]
  macd_hist: number[]
  rsi: number[]
  kdj_k: number[]
  kdj_d: number[]
  kdj_j: number[]
}

export default function StrategyAnalysis({ completed }: Props) {
  const [selected, setSelected] = useState<string>('全部')

  const strategies = ['全部', ...Array.from(new Set(
    completed.map(t => t.strategy).filter(Boolean)
  ))]

  const filtered = selected === '全部'
    ? completed
    : completed.filter(t => t.strategy === selected)

  const wins = filtered.filter(t => t.pnl > 0)
  const losses = filtered.filter(t => t.pnl <= 0)
  const winRate = filtered.length > 0 ? wins.length / filtered.length * 100 : 0
  const totalPnL = filtered.reduce((s, t) => s + t.pnl, 0)
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="text-lg font-semibold mb-4">策略分析</h2>

      {/* 策略選擇 */}
      <div className="flex gap-2 flex-wrap mb-6">
        {strategies.map(s => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selected === s
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-600 py-20">尚無此策略的交易記錄</div>
      ) : (
        <div className="space-y-4">
          {/* 總覽 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">總交易</div>
              <div className="text-2xl font-bold">{filtered.length} 筆</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">勝率</div>
              <div className={`text-2xl font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {winRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">總盈虧</div>
              <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(0)}
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">{wins.length} 勝 / {losses.length} 敗</div>
              <div className="text-2xl font-bold">
                <span className="text-green-400">+{avgWin.toFixed(0)}</span>
                <span className="text-gray-500 text-lg"> / </span>
                <span className="text-red-400">{avgLoss.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* 指標分析 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IndicatorCard
              title="獲勝時的指標平均值"
              trades={wins}
              color="text-green-400"
              bgColor="bg-green-900/20"
            />
            <IndicatorCard
              title="虧損時的指標平均值"
              trades={losses}
              color="text-red-400"
              bgColor="bg-red-900/20"
            />
          </div>

          {/* 交易記錄 */}
          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">交易明細</h3>
            <div className="space-y-2">
              {filtered.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      t.direction === 'long' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                    }`}>
                      {t.direction === 'long' ? '多' : '空'}
                    </span>
                    <span className="font-semibold text-sm">{t.symbol}</span>
                    <span className="text-gray-400 text-xs">{t.open_price} → {t.close_price}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-semibold text-sm ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(0)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(t.close_time).toLocaleDateString('zh-TW')}
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

function IndicatorCard({ title, trades, color, bgColor }: {
  title: string
  trades: CompletedTrade[]
  color: string
  bgColor: string
}) {
  if (trades.length === 0) return (
    <div className={`${bgColor} rounded-xl p-4`}>
      <h3 className={`text-sm font-semibold ${color} mb-3`}>{title}</h3>
      <p className="text-gray-500 text-sm">無資料</p>
    </div>
  )

  const avg = (key: keyof CompletedTrade) => {
    const vals = trades.map(t => t[key] as number).filter(v => v != null && !isNaN(v))
    if (vals.length === 0) return '--'
    return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)
  }

  const rows = [
    { label: 'MACD DIF', key: 'big_dif' as keyof CompletedTrade },
    { label: 'MACD DEA', key: 'big_dea' as keyof CompletedTrade },
    { label: 'MACD 柱', key: 'big_hist' as keyof CompletedTrade },
    { label: 'RSI (14)', key: 'big_rsi' as keyof CompletedTrade },
    { label: 'KDJ K', key: 'big_k' as keyof CompletedTrade },
    { label: 'KDJ D', key: 'big_d' as keyof CompletedTrade },
    { label: 'KDJ J', key: 'big_j' as keyof CompletedTrade },
  ]

  return (
    <div className={`${bgColor} rounded-xl p-4`}>
      <h3 className={`text-sm font-semibold ${color} mb-3`}>{title}（{trades.length} 筆）</h3>
      <div className="space-y-1.5">
        {rows.map(row => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-gray-400">{row.label}</span>
            <span className="font-medium">{avg(row.key)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}