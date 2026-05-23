'use client'

import { useEffect, useState, useRef } from 'react'
import { useLanguage } from '../LanguageContext'

type Note = {
  id: string
  text: string
  note_date: string
  created_at: string
}

export default function QuickNote() {
  const { t } = useLanguage()
  const [notes, setNotes] = useState<Note[]>([])
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadNotes() }, [])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [notes])

  async function loadNotes() {
    const res = await fetch('/api/notes')
    const data = await res.json()
    setNotes(Array.isArray(data) ? data : [])
  }

  async function addNote() {
    if (!input.trim() || submitting) return
    setSubmitting(true)
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim() }),
    })
    setInput('')
    setSubmitting(false)
    loadNotes()
  }

  async function deleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id))
    await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
  }

  return (
    <div className="bg-[#111111] px-4 py-3" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="flex gap-2 items-center flex-shrink-0 justify-between">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('notePlaceholder')}
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none px-3 py-1.5"
        />
        <div style={{ width: 155, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={addNote}
            disabled={submitting}
            className="px-3 py-1.5 bg-[#d4a843] hover:bg-[#b8892e] rounded text-xs text-white disabled:opacity-50 flex-shrink-0"
          >
            {t('noteAdd')}
          </button>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto flex flex-col gap-1"
        style={{ minHeight: 0 }}
      >
        {notes.length === 0 ? (
          <p className="text-gray-600 text-xs px-1">{t('noNotes')}</p>
        ) : (
          notes.map(n => (
            <div key={n.id} className="flex items-center px-3 py-1.5 text-sm group flex-shrink-0 rounded-lg transition-colors hover:bg-[#1a1a1a] gap-2">
              <span className="text-gray-500 text-xs flex-shrink-0">•</span>
              <span className="text-white flex-1 min-w-0 truncate">{n.text}</span>
              <span className="text-gray-500 text-xs flex-shrink-0" style={{ width: 155, fontVariantNumeric: 'tabular-nums' }}>{(() => {
                const d = new Date(n.created_at)
                const date = d.toLocaleDateString('zh-TW')
                const hours = d.getHours()
                const minutes = String(d.getMinutes()).padStart(2, '0')
                const seconds = String(d.getSeconds()).padStart(2, '0')
                const ampm = hours < 12 ? '上午' : '下午'
                const h = String(hours % 12 || 12).padStart(2, '0')
                return `${date} ${ampm}${h}:${minutes}:${seconds}`
              })()}</span>
              <button
                onClick={() => deleteNote(n.id)}
                className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}