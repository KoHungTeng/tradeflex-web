'use client'

import { Portfolio } from '../page'

type Props = {
  page: string
  setPage: (p: any) => void
  portfolios: Portfolio[]
  activePortfolio: string
  setActivePortfolio: (id: string) => void
}

export default function Sidebar({ page, setPage, portfolios, activePortfolio, setActivePortfolio }: Props) {
const navItems = [
    { id: 'trade', label: '交易', icon: '📝' },
    { id: 'stats', label: '統計', icon: '📊' },
    { id: 'calendar', label: '日曆', icon: '📅' },
    { id: 'history', label: '歷史', icon: '🕐' },
    { id: 'strategy', label: '策略分析', icon: '🧠' },
  ]
  return (
    <div className="w-14 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-1">
      {/* Logo */}
      <div className="text-blue-400 font-bold text-xs mb-4">TF</div>

      {/* 導航 */}
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => setPage(item.id)}
          className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
            page === item.id ? 'bg-blue-600' : 'hover:bg-gray-800'
          }`}
          title={item.label}
        >
          <span className="text-base">{item.icon}</span>
        </button>
      ))}

      <div className="flex-1" />

      {/* 投資組合切換 */}
      <div className="flex flex-col gap-1">
        {portfolios.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePortfolio(p.id)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
              activePortfolio === p.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            title={p.name}
          >
            {p.name.slice(0, 2)}
          </button>
        ))}
      </div>
    </div>
  )
}