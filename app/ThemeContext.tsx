'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Theme = 'dark' | 'light'
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // 先從 localStorage 快速套用，避免閃爍
    const local = localStorage.getItem('tradeflex-theme') as Theme
    if (local) {
      setTheme(local)
      document.documentElement.setAttribute('data-theme', local)
    }

    // 再從 Supabase 讀取同步
    supabase.from('settings').select('data').eq('id', 'theme').single().then(({ data }) => {
      if (data?.data?.theme) {
        const t = data.data.theme as Theme
        setTheme(t)
        localStorage.setItem('tradeflex-theme', t)
        document.documentElement.setAttribute('data-theme', t)
      }
    })
  }, [])

  async function toggle() {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('tradeflex-theme', next)
      document.documentElement.setAttribute('data-theme', next)

      // 同步到 Supabase
      supabase.from('settings').upsert({ id: 'theme', data: { theme: next } })

      return next
    })
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
