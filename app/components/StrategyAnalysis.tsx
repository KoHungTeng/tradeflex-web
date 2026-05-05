'use client'

import { useState, useEffect } from 'react'
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

export default function StrategyAnalysis({ completed }: Props) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState<string>('__all__')
  const [direction, setDirection] = useState<Direction>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])

  useEffect(() => {
    fetch('/api/strategies').then(r => r.json()).then(data => {
      setStrategies(Array.isArray(data) ? data : [])
    })
  }, [])

  // 從所有交易的 remark 抽出所有標籤
  const allTags = Array.from(new Set(
    completed.flatMap(trade =>
      (trade.remark || '').split(' ').filter(w => w.startsWith('#'))
    )
  )).sort()

  const strategyNames = ['__all__', ...Array.from(new Set(
    completed.map(t => t.strategy).filter(Boolean)
  ))]

  // 三層篩選
  const byStrategy = selected === '__all__'
    ? completed
    : completed.filter(t => t.strategy === selected)

  const byDirection = direction === 'all'
    ? byStrategy
    : byStrategy.filter(t => t.direction === direction)

  const filtered = selectedTags.length === 0
    ? byDirection
    : byDirection.filter(t =>
        selectedTags.every(tag => (t.remark || '').includes(tag))
      )

  const wins = filtered.filter(t => t.pnl > 0)
  const losses = filtered.filter(t => t.pnl <= 0)
  const winRate = filtered.length > 0 ? wins.length / filtered.length * 100 : 0
  const totalPnL = filtered.reduce((s, t) => s + t.pnl, 0)
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0

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

  const btnStyle = (active: boolean) => active
    ? { background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }
    : { background: '#1a1a1a', color: '#888' }

  const tagBtnStyle = (active: boolean) => active
    ? { background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }
    : { background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="text-lg font-semibold mb-4">{t('strategyAnalysis')}</h2>

      {/* 策略篩選 */}
      <div className="flex gap-2 flex-wrap mb-3">
        {strategyNames.map(s => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={btnStyle(selected === s)}
          >
            {s === '__all__' ? t('allStrategies') : s}
          </button>
        ))}
      </div>

      {/* 方向篩選 */}
      <div className="flex gap-2 mb-3">
        {(['all', 'long', 'short'] as Direction[]).map(d => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={btnStyle(direction === d)}
          >
            {d === 'all' ? t('allDirections') : d === 'long' ? t('directionLong') : t('directionShort')}
          </button>
        ))}
      </div>

      {/* 標籤篩選（多選） */}
      <div className="flex gap-2 flex-wrap mb-6">
  {allTags.length === 0 && (
    <span className="text-xs text-gray-600">尚無標籤</span>
  )}
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={tagBtnStyle(selectedTags.includes(tag))}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{ background: '#2a1a1a', color: '#f87171', border: '1px solid #3a1a1a' }}
            >
              清除標籤
            </button>
          )}
        </div>
      
      {filtered.length === 0 ? (
        <div className="text-center text-gray-600 py-20">{t('noStrategyTrades')}</div>
      ) : (
        <div className="space-y-4">
          {/* 總覽 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('totalTrades2'), value: `${filtered.length} ${t('trades2')}`, color: 'text-white' },
              { label: t('winRate'), value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'text-green-400' : 'text-red-400' },
              { label: t('totalPnl'), value: `${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}`, color: totalPnL >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: t('avgHoldTime'), value: avgHoldDisplay, color: 'text-[#d4a843]' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={cardStyle}>
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* 勝/敗平均 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl p-4" style={cardStyle}>
              <div className="text-xs text-gray-500 mb-1">
                {wins.length} 勝 / {losses.length} 敗
              </div>
              <div className="text-xl font-bold">
                <span className="text-green-400">+{avgWin.toFixed(0)}</span>
                <span className="text-gray-500 text-lg"> / </span>
                <span className="text-red-400">{avgLoss.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* 指標分析 */}
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

          {/* 指標分佈 */}
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

          {/* 交易明細 */}
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