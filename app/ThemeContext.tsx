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
    const local = localStorage.getItem('tradeflex-theme') as Theme
    if (local) {
      setTheme(local)
      document.documentElement.setAttribute('data-theme', local)
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from('settings')
        .select('data')
        .eq('id', 'theme')
        .eq('user_id', data.user.id)
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
    const { data } = await supabase.auth.getUser()
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('tradeflex-theme', next)
      document.documentElement.setAttribute('data-theme', next)
      if (data.user) {
        supabase.from('settings').upsert({
          id: `theme_${data.user.id}`,
          user_id: data.user.id,
          data: { theme: next }
        })
      }
      return next
    })
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
