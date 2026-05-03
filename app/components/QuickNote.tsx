'use client'

import { useEffect, useState } from 'react'

type Note = {
  id: string
  content: string
  created_at: string
}

export default function QuickNote() {
  const [notes, setNotes] = useState<Note[]>([])
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)

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
    <div className="border-t border-gray-800 bg-gray-900">
      {/* 標題列 */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-800"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs text-gray-400 font-medium">📝 隨手筆記 ({notes.length})</span>
        <span className="text-gray-600 text-xs">{expanded ? '▼' : '▲'}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-3">
          {/* 輸入區 */}
          <div className="flex gap-2 mb-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNote()}
              placeholder="輸入筆記，按 Enter 儲存..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={addNote}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white"
            >
              新增
            </button>
          </div>

          {/* 筆記列表 */}
          {notes.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {notes.map(n => (
                <div key={n.id} className="flex items-start gap-2 bg-gray-800 rounded px-3 py-1.5 text-sm group">
                  <div>
                    <span className="text-white">{n.content}</span>
                    <span className="text-gray-600 text-xs ml-2">
                      {new Date(n.created_at).toLocaleString('zh-TW')}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteNote(n.id)}
                    className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}