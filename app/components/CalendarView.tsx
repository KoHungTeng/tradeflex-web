'use client'

import { useState, useEffect, useRef } from 'react'
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
  const isComposingRef = useRef(false)
  const compositionEndTimeRef = useRef(0)

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
      className="flex-1 overflow-auto p-6 relative"
      onClick={() => { setSelectedDay(null); setNoteInput('') }}
    >
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-colors"
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
          className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-colors"
        >→</button>
      </div>

      {/* 星期標題 */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs text-gray-500 py-2">{d}</div>
        ))}
      </div>

      {/* 日曆格子 */}
      <div className="grid grid-cols-7 gap-6">
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
                className={`rounded-lg p-2 aspect-square flex flex-col cursor-pointer transition-colors ${
                  isToday ? 'ring-2 ring-[#d4a843]' : ''
                } ${isSelected ? 'ring-2 ring-yellow-500' : ''}`}
                style={hasTrade ? {
                  background: pnl > 0 ? 'rgba(20,83,45,0.5)' : 'rgba(127,29,29,0.5)',
                  border: pnl > 0 ? '1px solid #166534' : '1px solid #7f1d1d',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.4)',
                } : {
                  background: 'linear-gradient(160deg, var(--bg-card3) 0%, var(--bg-card4) 100%)',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-[#d4a843]' : 'text-gray-400'}`}>
                  {day}
                </span>
                {hasTrade && (
                  <div className="mt-auto flex flex-col gap-0.5">
                    <span className={`text-xs font-bold ${pnl > 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {pnl > 0 ? '+' : ''}{pnl.toFixed(2)} P&L
                    </span>
                    <span className="text-xs text-gray-400">
                      {completed.filter(tr => {
                        const d = new Date(tr.close_time)
                        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
                      }).length} Trades
                    </span>
                  </div>
                )}
                {notes.length > 0 && (
                  <span className="text-xs text-[#d4a843] mt-1">筆記 {notes.length}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    {selectedDay !== null && (
  <div
    className="fixed inset-0 z-40 flex items-center justify-center"
    style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.4)' }}
    onClick={() => { setSelectedDay(null); setNoteInput('') }}
  >
    <div
      onClick={e => e.stopPropagation()}
      className="rounded-2xl p-6 w-80 shadow-2xl"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        animation: 'modalPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {year}/{month + 1}/{selectedDay}
        </p>
        <button
          onClick={() => { setSelectedDay(null); setNoteInput('') }}
          className="text-gray-500 hover:text-[var(--text-primary)] text-lg leading-none"
        >×</button>
      </div>

      {dailyPnL[selectedDay.toString()] !== undefined && (
        <div className={`text-2xl font-bold mb-4 ${dailyPnL[selectedDay.toString()] > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {dailyPnL[selectedDay.toString()] > 0 ? '+' : ''}{dailyPnL[selectedDay.toString()].toFixed(0)}
        </div>
      )}

      {/* 當天交易明細 */}
      {(() => {
        const dayTrades = completed.filter(t => {
          const d = new Date(t.close_time)
          return d.getFullYear() === year && d.getMonth() === month && d.getDate() === selectedDay
        })
        if (dayTrades.length === 0) return null
        return (
          <div className="mb-4 space-y-1">
            {dayTrades.map((t, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-400">{t.symbol}</span>
                <span className={t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        )
      })()}

      {getNoteForDay(selectedDay).map(n => (
        <div key={n.id} className="flex items-center justify-between text-sm text-[var(--text-primary)] mb-2 group">
          <span className="text-gray-300">• {n.text}</span>
          <button
            onClick={() => deleteNote(n.id)}
            className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100"
          >✕</button>
        </div>
      ))}

      <div className="flex gap-2 mt-3">
        <input
          value={noteInput}
          onChange={e => setNoteInput(e.target.value)}
          onCompositionStart={() => { isComposingRef.current = true }}
          onCompositionEnd={() => { isComposingRef.current = false; compositionEndTimeRef.current = Date.now() }}
          onKeyDown={e => { if (e.key === 'Enter' && !isComposingRef.current && Date.now() - compositionEndTimeRef.current > 50) { e.preventDefault(); saveNote() } }}
          placeholder={t('calendarNotePlaceholder')}
          autoFocus
          className="flex-1 bg-[var(--bg-input)] border border-gray-600 rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#d4a843]"
        />
        <button
          onClick={saveNote}
          disabled={saving}
          className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }}
        >
          {t('calendarSave')}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}