'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useLanguage } from '../LanguageContext'

export default function LoginPage() {
  const { t, language, setLanguage } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isRecovery, setIsRecovery] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [inputLang, setInputLang] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      setIsRecovery(true)
    }
  }, [])

  function detectInputLang(value: string) {
    if (!value) { setInputLang(''); return }
    const hasChinese = /[\u4e00-\u9fff]/.test(value)
    const hasEnglish = /[a-zA-Z]/.test(value)
    const hasNumber = /[0-9]/.test(value)
    if (hasChinese) setInputLang('⚠️ 中文輸入')
    else if (hasEnglish || hasNumber) setInputLang('EN')
    else setInputLang('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isRecovery) {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) setError(error.message)
      else { setMessage('密碼已更新！正在跳轉...'); setTimeout(() => window.location.href = '/', 1500) }
    } else if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      })
      if (error) setError(error.message)
      else setMessage('重設信已寄出，請檢查信箱！')
    } else if (isSignUp) {
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

  const title = isRecovery ? '設定新密碼' : isForgot ? '忘記密碼' : isSignUp ? '建立帳號' : '登入'

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm">
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

        <div className="rounded-xl p-6" style={{ background: 'linear-gradient(160deg, var(--bg-card2) 0%, var(--bg-base) 100%)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-6 text-[var(--text-primary)]">{title}</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isRecovery && (
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
            )}

            {!isForgot && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">{isRecovery ? '新密碼' : '密碼'}</label>
                  {inputLang && (
                    <span className={`text-xs ${inputLang.includes('中文') ? 'text-[var(--color-loss)]' : 'text-gray-500'}`}>
                      {inputLang}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    value={isRecovery ? newPassword : password}
                    onChange={e => {
                      const val = e.target.value
                      isRecovery ? setNewPassword(val) : setPassword(val)
                      detectInputLang(val)
                    }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="至少6位"
                    required
                    className="input w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-[var(--color-loss)] text-xs">{error}</p>}
            {message && <p className="text-[var(--color-profit)] text-xs">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }}
            >
              {loading ? '處理中...' : isRecovery ? '更新密碼' : isForgot ? '寄送重設信' : isSignUp ? '註冊' : '登入'}
            </button>
          </form>

          {!isRecovery && (
            <div className="flex flex-col gap-2 mt-4">
              {!isForgot && (
                <button
                  onClick={() => { setIsForgot(true); setError(''); setMessage('') }}
                  className="w-full text-xs text-gray-500 hover:text-gray-300"
                >
                  忘記密碼？
                </button>
              )}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setIsForgot(false); setError(''); setMessage('') }}
                className="w-full text-xs text-gray-500 hover:text-gray-300"
              >
                {isForgot ? '返回登入' : isSignUp ? '已有帳號？登入' : '還沒有帳號？註冊'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
