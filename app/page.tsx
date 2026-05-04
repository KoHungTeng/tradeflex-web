'use client'

import { useEffect, useState } from 'react'
import TradeForm from './components/TradeForm'
import TradeList from './components/TradeList'
import StatsPanel from './components/StatsPanel'
import CalendarView from './components/CalendarView'
import StrategyAnalysis from './components/StrategyAnalysis'
import SettingsPanel from './components/SettingsPanel'
import Sidebar from './components/Sidebar'
import QuickNote from './components/QuickNote'

export type Portfolio = {
  id: string
  name: string
  asset_type: string
  currency: string
}

export type Trade = {
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
  big_dif?: number
  big_dea?: number
  big_hist?: number
  big_rsi?: number
  big_k?: number
  big_d?: number
  big_j?: number
  small_dif?: number
  small_dea?: number
  small_hist?: number
  small_rsi?: number
  small_k?: number
  small_d?: number
  small_j?: number
}

export type CompletedTrade = {
  id: string
  portfolio_id: string
  symbol: string
  direction: string
  open_price: number
  close_price: number
  quantity: number
  open_fee: number
  close_fee: number
  open_time: string
  close_time: string
  strategy: string
  pnl: number
  big_dif?: number
  big_dea?: number
  big_hist?: number
  big_rsi?: number
  big_k?: number
  big_d?: number
  big_j?: number
  small_dif?: number
  small_dea?: number
  small_hist?: number
  small_rsi?: number
  small_k?: number
  small_d?: number
  small_j?: number
}

export default function Home() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [activePortfolio, setActivePortfolio] = useState<string>('')
  const [trades, setTrades] = useState<Trade[]>([])
  const [completed, setCompleted] = useState<CompletedTrade[]>([])
  const [page, setPage] = useState<'trade' | 'stats' | 'history' | 'calendar' | 'strategy' | 'settings'>('trade')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPortfolios() }, [])
  useEffect(() => { if (activePortfolio) { loadTrades(); loadCompleted() } }, [activePortfolio])

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
    setTrades(Array.isArray(data) ? data : [])
  }

  async function loadCompleted() {
    const res = await fetch(`/api/completed?portfolio_id=${activePortfolio}`)
    const data = await res.json()
    setCompleted(Array.isArray(data) ? data : [])
  }

  // 樂觀新增交易
  function optimisticAddTrade(trade: Trade) {
    setTrades(prev => [trade, ...prev])
  }

  // 樂觀刪除交易
  function optimisticDeleteTrade(id: string) {
    setTrades(prev => prev.filter(t => t.id !== id))
    loadCompleted()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-white text-lg">
      載入中...
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar
        page={page}
        setPage={setPage}
        portfolios={portfolios}
        activePortfolio={activePortfolio}
        setActivePortfolio={setActivePortfolio}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {page === 'trade' && (
          <div className="flex flex-1 overflow-hidden">
            <TradeForm
              activePortfolio={activePortfolio}
              onAdded={optimisticAddTrade}
              onCompletedChanged={loadCompleted}
            />
            <TradeList
              trades={trades}
              onDeleted={optimisticDeleteTrade}
              onCompletedChanged={loadCompleted}
            />
          </div>
        )}
        {page === 'stats' && (
          <StatsPanel completed={completed} trades={trades} />
        )}
        {page === 'calendar' && (
          <CalendarView completed={completed} />
        )}
        {page === 'strategy' && (
          <StrategyAnalysis completed={completed} />
        )}
        {page === 'settings' && (
          <SettingsPanel />
        )}
        {page === 'history' && (
          <div className="flex-1 overflow-auto p-6">
            <h2 className="text-lg font-semibold mb-4">歷史記錄</h2>
            <div className="space-y-2">
              {completed.map(ct => (
                <div key={ct.id} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ct.direction === 'long' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                      {ct.direction === 'long' ? '多' : '空'}
                    </span>
                    <span className="font-semibold">{ct.symbol}</span>
                    <span className="text-gray-400 text-sm">{ct.open_price} → {ct.close_price}</span>
                    <span className="text-gray-400 text-sm">{ct.quantity} 口</span>
                    {ct.strategy && <span className="text-amber-400 text-xs">{ct.strategy}</span>}
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={`font-semibold ${ct.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {ct.pnl >= 0 ? '+' : ''}{ct.pnl.toFixed(0)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(ct.close_time).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                </div>
              ))}
              {completed.length === 0 && (
                <div className="text-center text-gray-600 py-20">尚無歷史記錄</div>
              )}
            </div>
          </div>
        )}
        <QuickNote />
      </div>
    </div>
  )
}