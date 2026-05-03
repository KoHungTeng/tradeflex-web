'use client'

import { Trade } from '../page'
import { useState, useRef } from 'react'

type Props = {
  trades: Trade[]
  onDeleted: (id: string) => void
  onCompletedChanged: () => void
}

const DEFAULT_WIDTHS = {
  action: 80,
  symbol: 80,
  price: 90,
  quantity: 70,
  fee: 90,
  strategy: 120,
  remark: 120,
  time: 160,
  delete: 40,
}

export default function TradeList({ trades, onDeleted, onCompletedChanged }: Props) {
  const [widths, setWidths] = useState<typeof DEFAULT_WIDTHS>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTHS
    try {
      const saved = localStorage.getItem('tradeListWidths')
      return saved ? { ...DEFAULT_WIDTHS, ...JSON.parse(saved) } : DEFAULT_WIDTHS
    } catch { return DEFAULT_WIDTHS }
  })

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const dragging = useRef<{ col: string; startX: number; startWidth: number } | null>(null)

  function onResizeStart(e: React.MouseEvent, col: string) {
    e.preventDefault()
    dragging.current = { col, startX: e.clientX, startWidth: widths[col as keyof typeof widths] }

    function onMove(e: MouseEvent) {
      if (!dragging.current) return
      const diff = e.clientX - dragging.current.startX
      const newWidth = Math.max(50, dragging.current.startWidth + diff)
      setWidths((prev: typeof DEFAULT_WIDTHS) => {
        const next = { ...prev, [dragging.current!.col]: newWidth }
        localStorage.setItem('tradeListWidths', JSON.stringify(next))
        return next
      })
    }

    function onUp() {
      dragging.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  async function deleteTrade(id: string) {
    const trade = trades.find(t => t.id === id)
    onDeleted(id)
    await fetch(`/api/trades?id=${id}`, { method: 'DELETE' })
    if (trade) {
      await fetch(`/api/completed?trade_time=${encodeURIComponent(trade.trade_time)}&symbol=${trade.symbol}&action=${trade.action}&portfolio_id=${trade.portfolio_id}`, {
        method: 'DELETE'
      })
    }
  }

  const actionColor = (action: string) => {
    if (action === '做多') return 'bg-green-900 text-green-400'
    if (action === '做空') return 'bg-red-900 text-red-400'
    if (action === '平多') return 'bg-green-800/50 text-green-500'
    return 'bg-red-800/50 text-red-500'
  }

  const cols = [
    { key: 'action', label: '動作', align: 'left' },
    { key: 'symbol', label: '標的', align: 'left' },
    { key: 'price', label: '價格', align: 'right' },
    { key: 'quantity', label: '口數', align: 'right' },
    { key: 'fee', label: '手續費', align: 'right' },
    { key: 'strategy', label: '策略', align: 'left' },
    { key: 'remark', label: '備註', align: 'left' },
    { key: 'time', label: '時間', align: 'left' },
    { key: 'delete', label: '', align: 'left' },
  ]

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="text-sm font-semibold text-gray-400 mb-4">
        交易記錄（{trades.length} 筆）
      </h2>

      {trades.length === 0 ? (
        <div className="text-center text-gray-600 py-20">尚無交易記錄</div>
      ) : (
        <table className="text-sm border-collapse" style={{ tableLayout: 'fixed', width: 'max-content' }}>
          <colgroup>
            {cols.map(col => (
              <col key={col.key} style={{ width: widths[col.key as keyof typeof widths] }} />
            ))}
          </colgroup>
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 text-left">
              {cols.map(col => (
                <th
                  key={col.key}
                  className={`py-2 px-3 select-none relative ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.label}
                  {col.key !== 'delete' && (
                    <div
                      onMouseDown={e => onResizeStart(e, col.key)}
                      className="absolute right-0 top-0 h-full w-3 cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                      style={{ zIndex: 10 }}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr
                key={t.id}
                className="border-b border-gray-800/50 hover:bg-gray-900/50 relative"
                onMouseEnter={() => setHoveredId(t.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor(t.action)}`}>
                    {t.action}
                  </span>
                </td>
                <td className="py-2 px-3 font-semibold">{t.symbol}</td>
                <td className="py-2 px-3 text-right">{t.price}</td>
                <td className="py-2 px-3 text-right">{t.quantity}</td>
                <td className="py-2 px-3 text-right text-gray-400">{t.fee || '--'}</td>
                <td className="py-2 px-3 text-blue-400 text-xs">{t.strategy || '--'}</td>
                <td className="py-2 px-3 text-gray-400 text-xs">{t.remark || '--'}</td>
                <td className="py-2 px-3 text-gray-500 text-xs">
                  {new Date(t.trade_time).toLocaleString('zh-TW')}
                </td>
                <td className="py-2 px-3">
                  <button
                    onClick={() => deleteTrade(t.id)}
                    className="text-red-500 hover:text-red-400 text-sm px-1"
                  >
                    ✕
                  </button>
                </td>

                {/* 指標浮動表格 */}
                {hoveredId === t.id && (t.big_dif || t.big_rsi || t.big_k || t.small_dif || t.small_rsi || t.small_k) && (
                  <td
                    colSpan={0}
                    className="absolute left-0 top-full z-50 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl text-xs"
                    style={{ minWidth: 320 }}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 font-semibold mb-2">大時間框架</p>
                        <div className="space-y-1">
                          {t.big_dif != null && <div className="flex justify-between gap-4"><span className="text-gray-500">MACD DIF</span><span className="text-white">{t.big_dif}</span></div>}
                          {t.big_dea != null && <div className="flex justify-between gap-4"><span className="text-gray-500">MACD DEA</span><span className="text-white">{t.big_dea}</span></div>}
                          {t.big_hist != null && <div className="flex justify-between gap-4"><span className="text-gray-500">MACD柱</span><span className="text-white">{t.big_hist}</span></div>}
                          {t.big_rsi != null && <div className="flex justify-between gap-4"><span className="text-gray-500">RSI</span><span className="text-white">{t.big_rsi}</span></div>}
                          {t.big_k != null && <div className="flex justify-between gap-4"><span className="text-gray-500">KDJ K</span><span className="text-white">{t.big_k}</span></div>}
                          {t.big_d != null && <div className="flex justify-between gap-4"><span className="text-gray-500">KDJ D</span><span className="text-white">{t.big_d}</span></div>}
                          {t.big_j != null && <div className="flex justify-between gap-4"><span className="text-gray-500">KDJ J</span><span className="text-white">{t.big_j}</span></div>}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400 font-semibold mb-2">小時間框架</p>
                        <div className="space-y-1">
                          {t.small_dif != null && <div className="flex justify-between gap-4"><span className="text-gray-500">MACD DIF</span><span className="text-white">{t.small_dif}</span></div>}
                          {t.small_dea != null && <div className="flex justify-between gap-4"><span className="text-gray-500">MACD DEA</span><span className="text-white">{t.small_dea}</span></div>}
                          {t.small_hist != null && <div className="flex justify-between gap-4"><span className="text-gray-500">MACD柱</span><span className="text-white">{t.small_hist}</span></div>}
                          {t.small_rsi != null && <div className="flex justify-between gap-4"><span className="text-gray-500">RSI</span><span className="text-white">{t.small_rsi}</span></div>}
                          {t.small_k != null && <div className="flex justify-between gap-4"><span className="text-gray-500">KDJ K</span><span className="text-white">{t.small_k}</span></div>}
                          {t.small_d != null && <div className="flex justify-between gap-4"><span className="text-gray-500">KDJ D</span><span className="text-white">{t.small_d}</span></div>}
                          {t.small_j != null && <div className="flex justify-between gap-4"><span className="text-gray-500">KDJ J</span><span className="text-white">{t.small_j}</span></div>}
                        </div>
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}