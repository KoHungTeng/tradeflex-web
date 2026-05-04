'use client'

import { useState, useEffect } from 'react'
import { CompletedTrade } from '../page'

type Props = {
  completed: CompletedTrade[]
}

type Strategy = {
  id: string
  name: string
  indicators: string[]
}

export default function StrategyAnalysis({ completed }: Props) {
  const [selected, setSelected] = useState<string>('全部')
  const [strategies, setStrategies] = useState<Strategy[]>([])

  useEffect(() => {
    fetch('/api/strategies').then(r => r.json()).then(data => {
      setStrategies(Array.isArray(data) ? data : [])
    })
  }, [])

  const strategyNames = ['全部', ...Array.from(new Set(
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

  // 平均持倉時間
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

  // 取得當前策略的指標設定
  const currentStrategy = strategies.find(s => s.name === selected)
  const requiredIndicators = currentStrategy?.indicators || []
  const showMACD = selected === '全部' || requiredIndicators.includes('MACD')
  const showRSI = selected === '全部' || requiredIndicators.includes('RSI')
  const showKDJ = selected === '全部' || requiredIndicators.includes('KDJ')

  const cardStyle = { background: 'linear-gradient(160deg, #161616 0%, #0f0f0f 100%)', border: '1px solid #2a2a2a' }

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="text-lg font-semibold mb-4">策略分析</h2>

      <div className="flex gap-2 flex-wrap mb-6">
        {strategyNames.map(s => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={selected === s
              ? { background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }
              : { background: '#1a1a1a', color: '#888' }
            }
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
            {[
              { label: '總交易', value: `${filtered.length} 筆`, color: 'text-white' },
              { label: '勝率', value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'text-green-400' : 'text-red-400' },
              { label: '總盈虧', value: `${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}`, color: totalPnL >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: '平均持倉', value: avgHoldDisplay, color: 'text-[#d4a843]' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={cardStyle}>
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: `${wins.length} 勝 / ${losses.length} 敗`, value: null, win: avgWin, loss: avgLoss },
            ].map((item, i) => (
              <div key={i} className="rounded-xl p-4" style={cardStyle}>
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className="text-xl font-bold">
                  <span className="text-green-400">+{item.win.toFixed(0)}</span>
                  <span className="text-gray-500 text-lg"> / </span>
                  <span className="text-red-400">{item.loss.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 指標分析 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IndicatorCard
              title="獲勝時的指標平均值"
              trades={wins}
              color="text-green-400"
              bgColor="bg-green-900/20"
              showMACD={showMACD}
              showRSI={showRSI}
              showKDJ={showKDJ}
            />
            <IndicatorCard
              title="虧損時的指標平均值"
              trades={losses}
              color="text-red-400"
              bgColor="bg-red-900/20"
              showMACD={showMACD}
              showRSI={showRSI}
              showKDJ={showKDJ}
            />
          </div>

          {/* 指標與盈虧關聯分析（只在選擇特定策略時顯示） */}
          {selected !== '全部' && (showMACD || showRSI || showKDJ) && (
            <div className="rounded-xl p-5" style={cardStyle}>
              <h3 className="text-sm font-semibold text-gray-400 mb-4">指標數值分佈（獲勝 vs 虧損）</h3>
              <div className="space-y-4">
                {showMACD && (
                  <IndicatorCompare label="MACD DIF" wins={wins} losses={losses} field="big_dif" />
                )}
                {showRSI && (
                  <IndicatorCompare label="RSI" wins={wins} losses={losses} field="big_rsi" />
                )}
                {showKDJ && (
                  <IndicatorCompare label="KDJ K" wins={wins} losses={losses} field="big_k" />
                )}
              </div>
            </div>
          )}

          {/* 交易記錄 */}
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">交易明細</h3>
            <div className="space-y-2">
              {filtered.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-[#222222]">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      t.direction === 'long' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                    }`}>
                      {t.direction === 'long' ? '多' : '空'}
                    </span>
                    <span className="font-semibold text-sm">{t.symbol}</span>
                    <span className="text-gray-400 text-xs">{t.open_price} → {t.close_price}</span>
                    <span className="text-gray-500 text-xs">{avgHoldDisplay}</span>
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

function IndicatorCard({ title, trades, color, bgColor, showMACD, showRSI, showKDJ }: {
  title: string
  trades: CompletedTrade[]
  color: string
  bgColor: string
  showMACD: boolean
  showRSI: boolean
  showKDJ: boolean
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
    ...(showMACD ? [
      { label: 'MACD DIF', key: 'big_dif' as keyof CompletedTrade },
      { label: 'MACD DEA', key: 'big_dea' as keyof CompletedTrade },
      { label: 'MACD 柱', key: 'big_hist' as keyof CompletedTrade },
    ] : []),
    ...(showRSI ? [
      { label: 'RSI (14)', key: 'big_rsi' as keyof CompletedTrade },
    ] : []),
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

function IndicatorCompare({ label, wins, losses, field }: {
  label: string
  wins: CompletedTrade[]
  losses: CompletedTrade[]
  field: keyof CompletedTrade
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
          <span className="text-green-400">獲勝均值: {winAvg?.toFixed(2) ?? '--'}</span>
          <span className="text-red-400">虧損均值: {lossAvg?.toFixed(2) ?? '--'}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
        {winAvg !== null && (
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(Math.abs(winAvg) / (Math.abs(winAvg) + Math.abs(lossAvg ?? 1)) * 100, 100)}%` }} />
        )}
      </div>
    </div>
  )
}