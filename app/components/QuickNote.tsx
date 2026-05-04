'use client'

import { useEffect, useState } from 'react'

type Note = {
  id: string
  text: string
  note_date: string
  created_at: string
}

export default function QuickNote() {
  const [notes, setNotes] = useState<Note[]>([])
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadNotes() }, [])

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
    <div className="border-t border-[#222222] bg-[#111111] px-4 py-3">
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNote() } }}
          placeholder="📝 隨手筆記，按 Enter 儲存..."
          className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d4a843]"
        />
        <button
          onClick={addNote}
          disabled={submitting}
          className="px-3 py-1.5 bg-[#d4a843] hover:bg-[#b8892e] rounded text-xs text-white disabled:opacity-50"
        >
          新增
        </button>
      </div>

      {notes.length > 0 && (
        <div className="max-h-28 overflow-y-auto flex flex-col gap-1">
          {notes.map(n => (
            <div key={n.id} className="flex items-center justify-between bg-[#1a1a1a] rounded px-3 py-1.5 text-sm group">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs">•</span>
                <span className="text-white">{n.text}</span>
                <span className="text-gray-500 text-xs">{new Date(n.created_at).toLocaleString('zh-TW')}</span>
              </div>
              <button
                onClick={() => deleteNote(n.id)}
                className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-3"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}