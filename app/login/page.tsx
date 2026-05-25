'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useLanguage } from '../LanguageContext'

export default function LoginPage() {
  const { t, language, setLanguage } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('註冊成功！請檢查信箱確認帳號後再登入。')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('帳號或密碼錯誤')
      else window.location.href = '/'
    }
    setLoading(false)
  }

  const LANGUAGES = [
    { code: 'zh-TW', label: '繁中' },
    { code: 'zh-CN', label: '简中' },
    { code: 'en', label: 'EN' },
    { code: 'ja', label: '日本語' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm">
        {/* 語言切換 */}
        <div className="flex justify-center gap-2 mb-6">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code as any)}
              className="px-3 py-1 rounded text-xs font-medium transition-colors"
              style={language === lang.code
                ? { background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }
                : { background: 'var(--bg-card)', color: '#666' }
              }
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div className="text-center mb-8">
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--gold)' }}>TradeFlex</div>
          <div className="text-gray-500 text-sm">Trading Journal</div>
        </div>

        <div className="rounded-xl p-6" style={{ background: 'linear-gradient(160deg, #161616 0%, #0f0f0f 100%)', border: '1px solid #2a2a2a' }}>
          <h2 className="text-white font-semibold mb-6">{isSignUp ? '建立帳號' : '登入'}</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                placeholder="your@email.com"
                required
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">密碼</label>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                placeholder="至少6位"
                required
                className="input w-full"
              />
            </div>

            {error && <p className="text-[var(--color-loss)] text-xs">{error}</p>}
            {message && <p className="text-[var(--color-profit)] text-xs">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }}
            >
              {loading ? '處理中...' : isSignUp ? '註冊' : '登入'}
            </button>
          </form>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
            className="w-full mt-4 text-xs text-gray-500 hover:text-gray-300"
          >
            {isSignUp ? '已有帳號？登入' : '還沒有帳號？註冊'}
          </button>
        </div>
      </div>
    </div>
  )
}