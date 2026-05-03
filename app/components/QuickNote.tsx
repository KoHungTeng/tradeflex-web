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

  useEffect(() => { loadNotes() }, [])

  async function loadNotes() {
    const res = await fetch('/api/notes')
    const data = await res.json()
    setNotes(Array.isArray(data) ? data : [])
  }

  async function addNote() {
    if (!input.trim()) return
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim() }),
    })
    setInput('')
    loadNotes()
  }

  async function deleteNote(id: string) {
    await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    loadNotes()
  }

  return (
    <div className="border-t border-gray-800 bg-gray-900 px-4 py-3">
      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addNote()}
          placeholder="📝 隨手筆記，按 Enter 儲存..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={addNote}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white"
        >
          新增
        </button>
      </div>

      {notes.length > 0 && (
        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
          {notes.map(n => (
            <div key={n.id} className="flex items-center gap-2 bg-gray-800 rounded px-3 py-1.5 text-sm group">
              <span className="text-white">{n.text}</span>
              <span className="text-gray-500 text-xs">{new Date(n.created_at).toLocaleString('zh-TW')}</span>
              <button
                onClick={() => deleteNote(n.id)}
                className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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