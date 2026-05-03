'use client'

import { Trade } from '../page'
import { useState, useRef, useEffect } from 'react'

type Props = {
  trades: Trade[]
  onDeleted: (id: string) => void
  onCompletedChanged: () => void
}

const DEFAULT_WIDTHS = {
  action: 80,
  symbol: 80,
  price: 80,
  quantity: 60,
  fee: 80,
  strategy: 100,
  remark: 100,
  time: 140,
  delete: 60,
}

export default function TradeList({ trades, onDeleted, onCompletedChanged }: Props) {
  const [widths, setWidths] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTHS
    try {
      const saved = localStorage.getItem('tradeListWidths')
      return saved ? { ...DEFAULT_WIDTHS, ...JSON.parse(saved) } : DEFAULT_WIDTHS
    } catch { return DEFAULT_WIDTHS }
  })

  const dragging = useRef<{ col: string; startX: number; startWidth: number } | null>(null)

  function onResizeStart(e: React.MouseEvent, col: string) {
    e.preventDefault()
    dragging.current = { col, startX: e.clientX, startWidth: widths[col as keyof typeof widths] }

    function onMove(e: MouseEvent) {
      if (!dragging.current) return
      const diff = e.clientX - dragging.current.startX
      const newWidth = Math.max(50, dragging.current.startWidth + diff)
      setWidths(prev => {
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
    { key: 'action', label: '動作' },
    { key: 'symbol', label: '標的' },
    { key: 'price', label: '價格' },
    { key: 'quantity', label: '口數' },
    { key: 'fee', label: '手續費' },
    { key: 'strategy', label: '策略' },
    { key: 'remark', label: '備註' },
    { key: 'time', label: '時間' },
    { key: 'delete', label: '' },
  ]

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="text-sm font-semibold text-gray-400 mb-4">
        交易記錄（{trades.length} 筆）
      </h2>

      {trades.length === 0 ? (
        <div className="text-center text-gray-600 py-20">尚無交易記錄</div>
      ) : (
        <table className="text-sm" style={{ tableLayout: 'fixed', width: 'max-content' }}>
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 text-left">
              {cols.map(col => (
                <th
                  key={col.key}
                  style={{ width: widths[col.key as keyof typeof widths], position: 'relative' }}
                  className="py-2 px-3 select-none"
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
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                <td className="py-2 px-3" style={{ width: widths.action }}>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor(t.action)}`}>
                    {t.action}
                  </span>
                </td>
                <td className="py-2 px-3 font-semibold" style={{ width: widths.symbol }}>{t.symbol}</td>
                <td className="py-2 px-3 text-right" style={{ width: widths.price }}>{t.price}</td>
                <td className="py-2 px-3 text-right" style={{ width: widths.quantity }}>{t.quantity}</td>
                <td className="py-2 px-3 text-right text-gray-400" style={{ width: widths.fee }}>{t.fee || '--'}</td>
                <td className="py-2 px-3 text-blue-400 text-xs" style={{ width: widths.strategy }}>{t.strategy || '--'}</td>
                <td className="py-2 px-3 text-gray-400 text-xs" style={{ width: widths.remark }}>{t.remark || '--'}</td>
                <td className="py-2 px-3 text-gray-500 text-xs" style={{ width: widths.time }}>
                  {new Date(t.trade_time).toLocaleString('zh-TW')}
                </td>
                <td className="py-2 px-3" style={{ width: widths.delete }}>
                  <button
                    onClick={() => deleteTrade(t.id)}
                    className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-950"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}