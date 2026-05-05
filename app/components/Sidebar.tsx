'use client'

import { Portfolio } from '../page'
import { useLanguage } from '../LanguageContext'

type Props = {
  page: string
  setPage: (p: any) => void
  portfolios: Portfolio[]
  activePortfolio: string
  setActivePortfolio: (id: string) => void
}

export default function Sidebar({ page, setPage, portfolios, activePortfolio, setActivePortfolio }: Props) {
  const { t } = useLanguage()

  const NAV_ITEMS = [
    {
      id: 'trade',
      label: t('trade'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path d="M9 12h6M9 16h4"/>
        </svg>
      ),
    },
    {
      id: 'stats',
      label: t('stats'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
      ),
    },
    {
      id: 'calendar',
      label: t('calendar'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
      ),
    },
    {
      id: 'history',
      label: t('history'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 7v5l3 3"/>
        </svg>
      ),
    },
    {
      id: 'strategy',
      label: t('strategy'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12h4l3-9 4 18 3-9h6"/>
        </svg>
      ),
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      ),
    },
  ]

  return (
    <div
      className="w-14 flex flex-col items-center py-4 gap-1"
      style={{ background: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)' }}
    >
      <div className="font-bold text-xs mb-4" style={{ color: '#d4a843' }}>TF</div>

      {NAV_ITEMS.map(item => {
        const isActive = page === item.id
        return (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            title={item.label}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
            style={isActive ? {
              background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)',
              color: '#000',
              boxShadow: '0 0 12px rgba(212,168,67,0.25)',
            } : { color: '#666' }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = '#1a1a1a'
                ;(e.currentTarget as HTMLElement).style.color = '#d4a843'
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = ''
                ;(e.currentTarget as HTMLElement).style.color = '#666'
              }
            }}
          >
            {item.icon}
          </button>
        )
      })}

      <div className="flex-1" />

      <div className="flex flex-col gap-1">
        {portfolios.map(p => {
          const isActive = activePortfolio === p.id
          return (
            <button
              key={p.id}
              onClick={() => setActivePortfolio(p.id)}
              title={p.name}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
              style={isActive ? {
                background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)',
                color: '#000',
                boxShadow: '0 0 12px rgba(212,168,67,0.25)',
              } : { background: '#1a1a1a', color: '#666' }}
            >
              {p.name.slice(0, 2)}
            </button>
          )
        })}
      </div>
    </div>
  )
}