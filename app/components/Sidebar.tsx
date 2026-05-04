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
    { id: 'settings', label: '設定', icon: '⚙️' },
  ]

  return (
    <div className="w-14 flex flex-col items-center py-4 gap-1"
      style={{ background: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)', borderRight: '1px solid #222' }}>

      {/* Logo */}
      <div className="font-bold text-xs mb-4" style={{ color: '#d4a843' }}>TF</div>

      {/* 導航 */}
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => setPage(item.id)}
          title={item.label}
          className="w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all"
          style={page === item.id ? {
            background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)',
            boxShadow: '0 0 12px rgba(212,168,67,0.3)',
          } : {}}
          onMouseEnter={e => {
            if (page !== item.id) (e.currentTarget as HTMLElement).style.background = '#1a1a1a'
          }}
          onMouseLeave={e => {
            if (page !== item.id) (e.currentTarget as HTMLElement).style.background = ''
          }}
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
            title={p.name}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
            style={activePortfolio === p.id ? {
              background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)',
              color: '#000',
              boxShadow: '0 0 12px rgba(212,168,67,0.3)',
            } : { background: '#1a1a1a', color: '#888' }}
          >
            {p.name.slice(0, 2)}
          </button>
        ))}
      </div>
    </div>
  )
}