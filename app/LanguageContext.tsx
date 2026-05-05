'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { Language, translations, TranslationKey } from './i18n/translations'

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'zh-TW',
  setLanguage: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh-TW')

  useEffect(() => {
    const saved = localStorage.getItem('tradeflex-language') as Language
    if (saved && translations[saved]) setLanguageState(saved)
  }, [])

  function setLanguage(lang: Language) {
    setLanguageState(lang)
    localStorage.setItem('tradeflex-language', lang)
  }

  function t(key: TranslationKey): string {
    return translations[language][key] || translations['zh-TW'][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}