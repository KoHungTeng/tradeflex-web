'use client'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Portfolio = {
  id: string
  name: string
  asset_type: string
  currency: string
}

type Trade = {
  id: string
  portfolio_id: string
  symbol: string
  action: string
  price: number
  quantity: number
  fee: number
  strategy: string
  remark: string
  trade_time: string
}

export default function Home() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [activePortfolio, setActivePortfolio] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // 新增交易的表單狀態
  const [symbol, setSymbol] = useState('')
  const [action, setAction] = useState('做多')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [fee, setFee] = useState('0')
  const [strategy, setStrategy] = useState('')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 載入投資組合
  useEffect(() => {
    loadPortfolios()
  }, [])

  // 切換投資組合時載入交易
  useEffect(() => {
    if (activePortfolio) loadTrades()
  }, [activePortfolio])

  async function loadPortfolios() {
    const res = await fetch('/api/portfolios')
    const data = await res.json()
    setPortfolios(data)
    if (data.length > 0) setActivePortfolio(data[0].id)
    setLoading(false)
  }

  async function loadTrades() {
    const res = await fetch(`/api/trades?portfolio_id=${activePortfolio}`)
    const data = await res.json()
    setTrades(data)
  }

  async function addTrade(e: React.FormEvent) {
    e.preventDefault()
    if (!symbol || !price) return
    setSubmitting(true)

    await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: activePortfolio,
        symbol: symbol.toUpperCase(),
        action,
        price: parseFloat(price),
        quantity: parseFloat(quantity),
        fee: parseFloat(fee),
        strategy,
        remark,
        trade_time: new Date().toISOString(),
      }),
    })

    setSymbol(''); setPrice(''); setQuantity('1')
    setFee('0'); setStrategy(''); setRemark('')
    setSubmitting(false)
    loadTrades()
  }

  async function deleteTrade(id: string) {
    await fetch(`/api/trades?id=${id}`, { method: 'DELETE' })
    loadTrades()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
      載入中...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 頂部導航 */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-400">TradeFlex</h1>
        <div className="flex gap-2">
          {portfolios.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePortfolio(p.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activePortfolio === p.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)]">
        {/* 左側：新增交易表單 */}
        <div className="w-72 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">新增交易</h2>
          <form onSubmit={addTrade} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">標的</label>
              <input
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                placeholder="MES, MNQ..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">動作</label>
              <select
                value={action}
                onChange={e => setAction(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option>做多</option>
                <option>做空</option>
                <option>平多</option>
                <option>平空</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">價格</label>
              <input
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">口數</label>
                <input
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">手續費</label>
                <input
                  value={fee}
                  onChange={e => setFee(e.target.value)}
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">策略</label>
              <input
                value={strategy}
                onChange={e => setStrategy(e.target.value)}
                placeholder="選填"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">備註</label>
              <input
                value={remark}
                onChange={e => setRemark(e.target.value)}
                placeholder="選填"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-semibold transition-colors mt-2"
            >
              {submitting ? '新增中...' : `確認${action}`}
            </button>
          </form>
        </div>

        {/* 右側：交易列表 */}
        <div className="flex-1 overflow-auto p-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">
            交易記錄（{trades.length} 筆）
          </h2>
          {trades.length === 0 ? (
            <div className="text-center text-gray-600 mt-20">尚無交易記錄</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2 px-3">動作</th>
                  <th className="text-left py-2 px-3">標的</th>
                  <th className="text-right py-2 px-3">價格</th>
                  <th className="text-right py-2 px-3">口數</th>
                  <th className="text-left py-2 px-3">策略</th>
                  <th className="text-left py-2 px-3">時間</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {trades.map(t => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-900">
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        t.action === '做多' ? 'bg-green-900 text-green-400' :
                        t.action === '做空' ? 'bg-red-900 text-red-400' :
                        t.action === '平多' ? 'bg-green-800/50 text-green-500' :
                        'bg-red-800/50 text-red-500'
                      }`}>{t.action}</span>
                    </td>
                    <td className="py-2 px-3 font-semibold">{t.symbol}</td>
                    <td className="py-2 px-3 text-right">{t.price}</td>
                    <td className="py-2 px-3 text-right">{t.quantity}</td>
                    <td className="py-2 px-3 text-gray-400">{t.strategy || '--'}</td>
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
      </div>
    </div>
  )
}