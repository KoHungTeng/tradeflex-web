'use client'

import { useState, useEffect } from 'react'
import { CompletedTrade } from '../page'
import { useLanguage } from '../LanguageContext'

type Props = {
  completed: CompletedTrade[]
}

type DayNote = {
  id: string
  note_date: string
  text: string
}

export default function CalendarView({ completed }: Props) {
  const { t } = useLanguage()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dayNotes, setDayNotes] = useState<DayNote[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [saving, setSaving] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => { loadDayNotes() }, [year, month])

  async function loadDayNotes() {
    const res = await fetch('/api/calendar-notes')
    const data = await res.json()
    setDayNotes(Array.isArray(data) ? data : [])
  }

  async function saveNote() {
    if (!noteInput.trim() || saving) return
    setSaving(true)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    await fetch('/api/calendar-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteInput.trim(), date: dateStr }),
    })
    setNoteInput('')
    setSaving(false)
    loadDayNotes()
  }

  async function deleteNote(id: string) {
    setDayNotes(prev => prev.filter(n => n.id !== id))
    await fetch(`/api/calendar-notes?id=${id}`, { method: 'DELETE' })
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const dailyPnL: Record<string, number> = {}
  completed.forEach(trade => {
    const d = new Date(trade.close_time)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate().toString()
      dailyPnL[key] = (dailyPnL[key] || 0) + trade.pnl
    }
  })

  const getNoteForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dayNotes.filter(n => n.note_date === dateStr)
  }

  const prevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null) }
  const nextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null) }

  const weekDays = t('weekDays') as unknown as string[]
  const monthNames = t('calendarMonth') as unknown as string[]

  const monthTrades = completed.filter(trade => {
    const d = new Date(trade.close_time)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const monthPnL = monthTrades.reduce((s, trade) => s + trade.pnl, 0)
  const monthWins = monthTrades.filter(trade => trade.pnl > 0).length
  const monthWinRate = monthTrades.length > 0 ? monthWins / monthTrades.length * 100 : 0

  const today = new Date()

  // 年份顯示：英文不需要 "年"，直接拼接
  const calendarYear = t('calendarYear')
  const headerTitle = calendarYear
    ? `${year} ${calendarYear} ${monthNames[month]}`
    : `${monthNames[month]} ${year}`

  return (
    <div
      className="flex-1 overflow-auto p-6"
      onClick={() => { setSelectedDay(null); setNoteInput('') }}
    >
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
        >←</button>

        <div className="text-center">
          <h2 className="text-xl font-bold">{headerTitle}</h2>
          <div className="flex gap-4 mt-1 text-sm justify-center">
            <span className={monthPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
              {monthPnL >= 0 ? '+' : ''}{monthPnL.toFixed(0)}
            </span>
            <span className="text-gray-400">{monthTrades.length} {t('calendarTrades')}</span>
            <span className={monthWinRate >= 50 ? 'text-green-400' : 'text-red-400'}>
              {t('calendarWinRate')} {monthWinRate.toFixed(0)}%
            </span>
          </div>
        </div>

        <button
          onClick={nextMonth}
          className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
        >→</button>
      </div>

      {/* 星期標題 */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs text-gray-500 py-2">{d}</div>
        ))}
      </div>

      {/* 日曆格子 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const pnl = dailyPnL[day.toString()]
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
          const hasTrade = pnl !== undefined
          const notes = getNoteForDay(day)
          const isSelected = selectedDay === day

          return (
            <div key={day}>
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedDay(isSelected ? null : day)
                  setNoteInput('')
                }}
                className={`rounded-lg p-2 min-h-24 flex flex-col cursor-pointer transition-colors ${
                  isToday ? 'ring-2 ring-[#d4a843]' : ''
                } ${isSelected ? 'ring-2 ring-yellow-500' : ''} ${
                  hasTrade
                    ? pnl > 0
                      ? 'bg-green-900/30 hover:bg-green-900/50'
                      : 'bg-red-900/30 hover:bg-red-900/50'
                    : 'bg-[#111111] hover:bg-[#1a1a1a]'
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-[#d4a843]' : 'text-gray-400'}`}>
                  {day}
                </span>
                {hasTrade && (
                  <span className={`text-xs font-semibold mt-1 ${pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pnl > 0 ? '+' : ''}{pnl.toFixed(0)}
                  </span>
                )}
                {notes.length > 0 && (
                  <span className="text-xs text-yellow-400 mt-1">📝 {notes.length}</span>
                )}
              </div>

              {isSelected && (
                <div
                  onClick={e => e.stopPropagation()}
                  className="mt-1 bg-[#1a1a1a] rounded-lg p-3"
                >
                  <p className="text-xs text-gray-400 mb-2">
                    {year}/{month + 1}/{day} {t('calendarNote')}
                  </p>
                  {notes.map(n => (
                    <div key={n.id} className="flex items-center justify-between text-sm text-white mb-1 group">
                      <span>• {n.text}</span>
                      <button
                        onClick={() => deleteNote(n.id)}
                        className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100"
                      >✕</button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveNote() } }}
                      placeholder={t('calendarNotePlaceholder')}
                      autoFocus
                      className="flex-1 bg-[#222222] border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#d4a843]"
                    />
                    <button
                      onClick={saveNote}
                      disabled={saving}
                      className="px-2 py-1 bg-[#d4a843] hover:bg-[#b8892e] rounded text-xs text-white disabled:opacity-50"
                    >
                      {t('calendarSave')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}