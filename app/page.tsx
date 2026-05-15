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
import { useLanguage } from './LanguageContext'

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
  tp?: number
  sl?: number
  open_price?: number
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
  remark?: string
  open_remark?: string
  close_remark?: string
  tp?: number
  sl?: number
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
  const { t } = useLanguage()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [activePortfolio, setActivePortfolio] = useState<string>('')
  const [trades, setTrades] = useState<Trade[]>([])
  const [completed, setCompleted] = useState<CompletedTrade[]>([])
  const [page, setPage] = useState<'trade' | 'stats' | 'history' | 'calendar' | 'strategy' | 'settings'>('trade')
  const [loading, setLoading] = useState(true)
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [historySymbol, setHistorySymbol] = useState<string>('__all__')
  const [historyStrategy, setHistoryStrategy] = useState<string>('__all__')
  const [historyDirection, setHistoryDirection] = useState<string>('all')
  const [historyDateFrom, setHistoryDateFrom] = useState<string>('')
  const [historyDateTo, setHistoryDateTo] = useState<string>('')

  useEffect(() => { loadPortfolios() }, [])
  useEffect(() => { if (activePortfolio) { loadTrades(); loadCompleted() } }, [activePortfolio])
  useEffect(() => { if (activePortfolio) { loadTrades(); loadCompleted() } }, [page])

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

  function optimisticAddTrade(trade: Trade) {
    setTrades(prev => [trade, ...prev])
  }

  function optimisticDeleteTrade(id: string) {
    setTrades(prev => prev.filter(t => t.id !== id))
    loadCompleted()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-white text-lg" style={{ background: '#0a0a0a' }}>
      載入中...
    </div>
  )

  const selectStyle = "bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#d4a843] h-[38px]"

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', color: 'white', padding: 8, gap: 8, overflow: 'hidden' }}>

      <div style={{ display: 'flex', flex: 1, gap: 8, minHeight: 0 }}>

        <div className="gold-border flex-shrink-0 no-print" style={{ overflow: 'hidden' }}>
          <div className="gold-border-inner" style={{ height: '100%', overflowY: 'auto' }}>
            <Sidebar
              page={page}
              setPage={setPage}
              portfolios={portfolios}
              activePortfolio={activePortfolio}
              setActivePortfolio={setActivePortfolio}
            />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, overflow: 'hidden' }}>

          {page === 'trade' && (
            <div style={{ display: 'flex', flex: 1, gap: 8, minHeight: 0 }}>
              <div className="gold-border flex-shrink-0 no-print" style={{ alignSelf: 'stretch', overflow: 'hidden' }}>
                <div className="gold-border-inner" style={{ height: '100%', overflowY: 'auto' }}>
                  <TradeForm
  activePortfolio={activePortfolio}
  onAdded={optimisticAddTrade}
  onCompletedChanged={loadCompleted}
  loadAfterAdd={loadTrades}
/>
                </div>
              </div>
              <div className="gold-border" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div className="gold-border-inner" style={{ height: '100%', overflow: 'auto' }}>
                  <TradeList
                    trades={trades}
                    onDeleted={optimisticDeleteTrade}
                    onCompletedChanged={loadCompleted}
                  />
                </div>
              </div>
            </div>
          )}

          {page === 'stats' && (
            <div className="gold-border" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="gold-border-inner" style={{ height: '100%', overflowY: 'auto' }}>
                <StatsPanel completed={completed} trades={trades} />
              </div>
            </div>
          )}

          {page === 'calendar' && (
            <div className="gold-border" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="gold-border-inner" style={{ height: '100%', overflowY: 'auto' }}>
                <CalendarView completed={completed} />
              </div>
            </div>
          )}

          {page === 'strategy' && (
            <div className="gold-border" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="gold-border-inner" style={{ height: '100%', overflowY: 'auto' }}>
                <StrategyAnalysis completed={completed} />
              </div>
            </div>
          )}

          {page === 'settings' && (
            <div className="gold-border" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="gold-border-inner" style={{ height: '100%', overflowY: 'auto' }}>
                <SettingsPanel onImported={loadCompleted} />
              </div>
            </div>
          )}

          {page === 'history' && (
            <div className="gold-border" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="gold-border-inner" style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
                <h2 className="text-lg font-semibold mb-4">{t('historyTitle')}</h2>

                <div className="rounded-xl p-4 mb-4 flex gap-4 flex-wrap items-end"
                  style={{ background: 'linear-gradient(160deg, #161616 0%, #0f0f0f 100%)', border: '1px solid #2a2a2a' }}>
                  <div className="flex flex-col">
                    <p className="text-xs text-gray-500 mb-1">{t('symbol')}</p>
                    <select value={historySymbol} onChange={e => setHistorySymbol(e.target.value)} className={selectStyle}>
                      <option value="__all__">{t('allStrategies')}</option>
                      {Array.from(new Set(completed.map(ct => ct.symbol))).sort().map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-gray-500 mb-1">{t('strategyLabel')}</p>
                    <select value={historyStrategy} onChange={e => setHistoryStrategy(e.target.value)} className={selectStyle}>
                      <option value="__all__">{t('allStrategies')}</option>
                      {Array.from(new Set(completed.map(ct => ct.strategy).filter(Boolean))).sort().map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-gray-500 mb-1">{t('directionLong')}/{t('directionShort')}</p>
                    <select value={historyDirection} onChange={e => setHistoryDirection(e.target.value)} className={selectStyle}>
                      <option value="all">{t('allDirections')}</option>
                      <option value="long">{t('directionLong')}</option>
                      <option value="short">{t('directionShort')}</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-gray-500 mb-1">{t('startDate')}</p>
                    <input type="date" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} className={selectStyle} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-gray-500 mb-1">{t('endDate')}</p>
                    <input type="date" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} className={selectStyle} />
                  </div>
                  {(historySymbol !== '__all__' || historyStrategy !== '__all__' || historyDirection !== 'all' || historyDateFrom || historyDateTo) && (
                    <button
                      onClick={() => { setHistorySymbol('__all__'); setHistoryStrategy('__all__'); setHistoryDirection('all'); setHistoryDateFrom(''); setHistoryDateTo('') }}
                      className="px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: '#2a1a1a', color: '#f87171', border: '1px solid #3a1a1a' }}
                    >
                      清除篩選
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {completed
                    .filter(ct => {
                      if (historySymbol !== '__all__' && ct.symbol !== historySymbol) return false
                      if (historyStrategy !== '__all__' && ct.strategy !== historyStrategy) return false
                      if (historyDirection !== 'all' && ct.direction !== historyDirection) return false
                      if (historyDateFrom && ct.close_time < historyDateFrom) return false
                      if (historyDateTo && ct.close_time > historyDateTo + 'T23:59:59') return false
                      return true
                    })
                    .map(ct => (
                      <div key={ct.id}>
                        <div
                          className="rounded-lg p-4 flex items-center justify-between cursor-pointer"
                          style={{ background: 'linear-gradient(160deg, #161616 0%, #0f0f0f 100%)', border: `1px solid ${expandedHistory === ct.id ? '#d4a843' : '#2a2a2a'}` }}
                          onClick={() => setExpandedHistory(expandedHistory === ct.id ? null : ct.id)}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`w-12 text-center px-2 py-0.5 rounded text-xs font-medium ${ct.direction === 'long' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                              {ct.direction === 'long' ? t('long') : t('short')}
                            </span>
                            <span className="w-12 font-semibold">{ct.symbol}</span>
                            <span className="w-36 text-gray-400 text-sm">{ct.open_price} → {ct.close_price}</span>
                            <span className="w-12 text-gray-400 text-sm">{ct.quantity} {t('lots')}</span>
                            {ct.strategy && <span className="text-[#d4a843] text-xs">{ct.strategy}</span>}
                          </div>
                          <div className="flex items-center gap-6">
                            <span className={`font-semibold ${ct.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {ct.pnl >= 0 ? '+' : ''}{ct.pnl.toFixed(0)}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {new Date(ct.close_time).toLocaleDateString('zh-TW')}
                            </span>
                            <span className="text-gray-600 text-xs">{expandedHistory === ct.id ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        {expandedHistory === ct.id && (
                          <div className="rounded-b-lg px-4 pb-4 pt-3 -mt-1"
                            style={{ background: '#0f0f0f', borderTop: 'none' }}>
                            <div className="rounded-lg overflow-hidden text-xs">
                              {/* 第一行 */}
                              <div className="grid grid-cols-6" style={{ borderBottom: '1px solid #1a1a1a' }}>
                                {[
                                  { label: '標的', value: ct.symbol },
                                  { label: '口數', value: ct.quantity },
                                  { label: '進場價', value: ct.open_price },
                                  { label: '出場價', value: ct.close_price },
                                  { label: '目標價', value: ct.tp || '--' },
                                  { label: '停損價', value: ct.sl || '--' },
                                ].map(({ label, value }, i, arr) => (
                                  <div key={label} className="px-3 py-2" style={{ borderRight: i < arr.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                                    <p className="text-gray-500 mb-1">{label}</p>
                                    <p className="text-white font-semibold">{value}</p>
                                  </div>
                                ))}
                              </div>
                              {/* 第二行 */}
                              <div className="grid grid-cols-6" style={{ borderBottom: '1px solid #1a1a1a' }}>
                                 <div className="px-3 py-2" style={{ borderBottom: 'none' }}>
                                   <p className="text-gray-500 mb-1">開倉時間</p>
                                   <p className="text-white">{new Date(ct.open_time).toLocaleString('zh-TW')}</p>
                                </div>
                                <div className="px-3 py-2" style={{ borderBottom: 'none' }}>
                                  <p className="text-gray-500 mb-1">平倉時間</p>
                                  <p className="text-white">{new Date(ct.close_time).toLocaleString('zh-TW')}</p>
                                </div>
                                <div className="px-3 py-2" style={{ borderBottom: 'none' }}>
                                  <p className="text-gray-500 mb-1">手續費</p>
                                  <p className="text-white">{(ct.open_fee || 0) + (ct.close_fee || 0)}</p>
                                </div>
                                <div className="px-3 py-2" style={{ borderBottom: 'none' }}>
                                  <p className="text-gray-500 mb-1">盈虧比</p>
                                  <p className="text-[#d4a843] font-semibold">
                                    {ct.sl && ct.sl !== ct.open_price
                                      ? `${Math.abs((ct.close_price - ct.open_price) / (ct.open_price - ct.sl)).toFixed(2)}R`
                                      : '--'}
                                  </p>
                                </div>
                              </div>
                              {/* 第三行：指標 */}
                              {(ct.big_dif != null || ct.big_rsi != null || ct.small_dif != null) && (
                                <div className="grid grid-cols-6">
                                  <div className="px-3 py-2 col-span-1" style={{ borderBottom: 'none' }}>
                                    <p className="text-gray-500 mb-2">大時間框架</p>
                                    <div className="space-y-1">
                                      {ct.big_dif != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD DIF</span><span className="text-white">{ct.big_dif}</span></div>}
                                      {ct.big_dea != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD DEA</span><span className="text-white">{ct.big_dea}</span></div>}
                                      {ct.big_hist != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD柱</span><span className="text-white">{ct.big_hist}</span></div>}
                                      {ct.big_rsi != null && <div className="flex gap-2"><span className="text-gray-600 w-16">RSI</span><span className="text-white">{ct.big_rsi}</span></div>}
                                      {ct.big_k != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ K</span><span className="text-white">{ct.big_k}</span></div>}
                                      {ct.big_d != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ D</span><span className="text-white">{ct.big_d}</span></div>}
                                      {ct.big_j != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ J</span><span className="text-white">{ct.big_j}</span></div>}
                                    </div>
                                  </div>
                                  <div className="px-3 py-2 col-span-1" style={{ borderBottom: 'none' }}>
                                    <p className="text-gray-500 mb-2">小時間框架</p>
                                    <div className="space-y-1">
                                      {ct.small_dif != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD DIF</span><span className="text-white">{ct.small_dif}</span></div>}
                                      {ct.small_dea != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD DEA</span><span className="text-white">{ct.small_dea}</span></div>}
                                      {ct.small_hist != null && <div className="flex gap-2"><span className="text-gray-600 w-16">MACD柱</span><span className="text-white">{ct.small_hist}</span></div>}
                                      {ct.small_rsi != null && <div className="flex gap-2"><span className="text-gray-600 w-16">RSI</span><span className="text-white">{ct.small_rsi}</span></div>}
                                      {ct.small_k != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ K</span><span className="text-white">{ct.small_k}</span></div>}
                                      {ct.small_d != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ D</span><span className="text-white">{ct.small_d}</span></div>}
                                      {ct.small_j != null && <div className="flex gap-2"><span className="text-gray-600 w-16">KDJ J</span><span className="text-white">{ct.small_j}</span></div>}
                                    </div>
                                  </div>
                                  <div className="px-3 py-2 col-span-4">
                                    <p className="text-gray-500 mb-2">開倉標籤</p>
                                    <p className="text-[#d4a843] leading-relaxed mb-3">{ct.open_remark || '--'}</p>
                                    <p className="text-gray-500 mb-2">平倉標籤</p>
                                    <p className="text-[#d4a843] leading-relaxed">{ct.close_remark || '--'}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  {completed.length === 0 && (
                    <div className="text-center text-gray-600 py-20">{t('noHistory')}</div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="gold-border no-print">
        <div className="gold-border-inner">
          <QuickNote />
        </div>
      </div>

    </div>
  )
}