'use client'

import { Trade } from '../page'

type Props = {
  trades: Trade[]
  onDeleted: () => void
  onCompletedChanged: () => void
}

export default function TradeList({ trades, onDeleted, onCompletedChanged }: Props) {
  async function deleteTrade(id: string) {
    const trade = trades.find(t => t.id === id)
    
    await fetch(`/api/trades?id=${id}`, { method: 'DELETE' })
    
    if (trade) {
      await fetch(`/api/completed?trade_time=${encodeURIComponent(trade.trade_time)}&symbol=${trade.symbol}&action=${trade.action}&portfolio_id=${trade.portfolio_id}`, { 
        method: 'DELETE' 
      })
    }
    
    onDeleted()
    onCompletedChanged()
  }

  const actionColor = (action: string) => {
    if (action === '做多') return 'bg-green-900 text-green-400'
    if (action === '做空') return 'bg-red-900 text-red-400'
    if (action === '平多') return 'bg-green-800/50 text-green-500'
    return 'bg-red-800/50 text-red-500'
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="text-sm font-semibold text-gray-400 mb-4">
        交易記錄（{trades.length} 筆）
      </h2>

      {trades.length === 0 ? (
        <div className="text-center text-gray-600 py-20">尚無交易記錄</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 text-left">
              <th className="py-2 px-3">動作</th>
              <th className="py-2 px-3">標的</th>
              <th className="py-2 px-3 text-right">價格</th>
              <th className="py-2 px-3 text-right">口數</th>
              <th className="py-2 px-3 text-right">手續費</th>
              <th className="py-2 px-3">策略</th>
              <th className="py-2 px-3">備註</th>
              <th className="py-2 px-3">時間</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
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