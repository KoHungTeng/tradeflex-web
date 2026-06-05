'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Theme = 'dark' | 'light'
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // 先從 localStorage 快速套用避免閃爍
    const local = localStorage.getItem('tradeflex-theme') as Theme
    if (local) {
      setTheme(local)
      document.documentElement.setAttribute('data-theme', local)
    }

    // 從 Supabase 讀取
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      supabase
        .from('settings')
        .select('data')
        .eq('id', `theme_${data.user.id}`)
        .single()
        .then(({ data: setting }) => {
          if (setting?.data?.theme) {
            const t = setting.data.theme as Theme
            setTheme(t)
            localStorage.setItem('tradeflex-theme', t)
            document.documentElement.setAttribute('data-theme', t)
          }
        })
    })
  }, [])

  async function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('tradeflex-theme', next)
    document.documentElement.setAttribute('data-theme', next)

    if (userId) {
      await supabase.from('settings').upsert({
        id: `theme_${userId}`,
        user_id: userId,
        data: { theme: next }
      })
    }
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
