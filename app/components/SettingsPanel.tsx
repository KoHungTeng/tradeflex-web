'use client'
import { createBrowserClient } from '@supabase/ssr'

import { useEffect, useState, useRef } from 'react'
import { useCurrency } from '../CurrencyContext'
import { useLanguage } from '../LanguageContext'

type Symbol = {
  id: string
  name: string
  category: string
  tick_size: number
  tick_value: number
  currency: string
  default_fee: number
}

type Category = {
  id: string
  name: string
}

type Strategy = {
  id: string
  name: string
  indicators: string[]
}

type Tag = {
  id: string
  name: string
}

const INDICATOR_OPTIONS = ['MACD', 'RSI', 'KDJ']

type SettingsProps = {
  onImported?: () => void
}

function detectFormat(headers: string[]): 'tradeflex' | 'tradingview' | 'tradovate' | 'tradovate_tv' | 'unknown' {
  if (headers.includes('平倉時間')) return 'tradeflex'
  if (headers.includes('商品') && headers.includes('Side')) return 'tradingview'
  if (headers.includes('B/S') && headers.includes('Contract')) return 'tradovate'
  if (headers.includes('買/賣') && headers.includes('成交均價')) return 'tradovate_tv'
  return 'unknown'
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseCSVLines(lines: string[], headers: string[]) {
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row: any = {}
    headers.forEach((h, i) => {
      row[h] = (values[i] || '').trim()
    })
    return row
  })
}

function getOrderPrice(order: any): number {
  const v1 = parseFloat(order['成交值'])
  if (v1 > 0) return v1
  const v2 = parseFloat(order['停損值'])
  if (v2 > 0) return v2
  const v3 = parseFloat(order['限價'])
  if (v3 > 0) return v3
  for (const val of Object.values(order)) {
    const n = parseFloat(String(val))
    if (n > 100 && n < 9999999 && !isNaN(n)) return n
  }
  return 0
}

function parseTradingViewCSV(rows: any[], symbolsData: Symbol[]): any[] {
  const filled = rows.filter(r => r['狀態'] === '已成交')
  const bySymbol: Record<string, any[]> = {}
  filled.forEach(r => {
    const sym = r['商品']
    if (!bySymbol[sym]) bySymbol[sym] = []
    bySymbol[sym].push(r)
  })
  const results: any[] = []
  Object.entries(bySymbol).forEach(([symbolKey, orders]) => {
    const cleanSymbol = symbolKey
      .replace('CME_MINI:', '').replace('CME_MICRO:', '')
      .replace('BINANCE:', '').replace('BITUNIX:', '')
      .split(':')[0].split('!')[0]
    const symbolInfo = symbolsData.find(s => {
      const sName = s.name.toUpperCase().replace(/\d+$/, '')
      const cName = cleanSymbol.toUpperCase().replace(/\d+$/, '')
      return sName === cName || s.name.toUpperCase() === cleanSymbol.toUpperCase()
    })
    const tickSize = symbolInfo?.tick_size || 1
    const tickValue = symbolInfo?.tick_value || 1
    orders.sort((a, b) => {
      const timeDiff = new Date(a['Placing time']).getTime() - new Date(b['Placing time']).getTime()
      if (timeDiff !== 0) return timeDiff
      if (a['Side'] === '買入' && b['Side'] === '賣出') return -1
      if (a['Side'] === '賣出' && b['Side'] === '買入') return 1
      return 0
    })
    const buyQueue: any[] = []
    const sellQueue: any[] = []
    orders.forEach(order => {
      const price = getOrderPrice(order)
      const qty = parseFloat(order['數量']) || 1
      const fee = parseFloat(order['佣金']) || 0
      if (order['Side'] === '買入') {
        if (sellQueue.length > 0) {
          const open = sellQueue.shift()
          const openPrice = getOrderPrice(open)
          const matchQty = Math.min(qty, parseFloat(open['數量']) || 1)
          const pnl = Math.round((openPrice - price) / tickSize * tickValue * matchQty * 100) / 100
          results.push({ symbol: cleanSymbol, direction: 'short', open_price: openPrice, close_price: price, quantity: matchQty, open_fee: parseFloat(open['佣金']) || 0, close_fee: fee, pnl, open_time: new Date(open['Placing time']).toISOString(), close_time: new Date(order['Placing time']).toISOString(), strategy: '', remark: '' })
        } else { buyQueue.push(order) }
      } else if (order['Side'] === '賣出') {
        if (buyQueue.length > 0) {
          const open = buyQueue.shift()
          const openPrice = getOrderPrice(open)
          const matchQty = Math.min(qty, parseFloat(open['數量']) || 1)
          const pnl = Math.round((price - openPrice) / tickSize * tickValue * matchQty * 100) / 100
          results.push({ symbol: cleanSymbol, direction: 'long', open_price: openPrice, close_price: price, quantity: matchQty, open_fee: parseFloat(open['佣金']) || 0, close_fee: fee, pnl, open_time: new Date(open['Placing time']).toISOString(), close_time: new Date(order['Placing time']).toISOString(), strategy: '', remark: '' })
        } else { sellQueue.push(order) }
      }
    })
  })
  return results
}

function parseTradovateCSV(rows: any[], symbolsData: Symbol[]): any[] {
  const byContract: Record<string, any[]> = {}
  rows.forEach(r => {
    const contract = r['Contract']?.trim() || ''
    if (!contract) return
    if (!byContract[contract]) byContract[contract] = []
    byContract[contract].push(r)
  })
  const results: any[] = []
  Object.entries(byContract).forEach(([contract, fills]) => {
    const product = fills[0]['Product']?.trim() || contract
    const csvTickSize = parseFloat(fills[0]['_tickSize'])
    const symbolInfo = symbolsData.find(s => {
      const sName = s.name.toUpperCase().replace(/\d+$/, '')
      const pName = product.toUpperCase().replace(/\d+$/, '')
      return sName === pName || s.name.toUpperCase() === product.toUpperCase()
    })
    const tickSize = csvTickSize > 0 ? csvTickSize : (symbolInfo?.tick_size || 1)
    const tickValue = symbolInfo?.tick_value || 1
    fills.sort((a, b) => new Date(a['_timestamp']).getTime() - new Date(b['_timestamp']).getTime())
    let netPosition = 0
    let currentFills: any[] = []
    fills.forEach(fill => {
      const side = (fill['B/S'] || '').trim()
      const qty = parseFloat(fill['Quantity']) || 1
      const delta = side === 'Buy' ? qty : -qty
      netPosition += delta
      currentFills.push(fill)
      if (netPosition === 0 && currentFills.length >= 2) {
        const buyFills = currentFills.filter(f => f['B/S'].trim() === 'Buy')
        const sellFills = currentFills.filter(f => f['B/S'].trim() === 'Sell')
        const totalBuyQty = buyFills.reduce((s, f) => s + parseFloat(f['Quantity']), 0)
        const totalSellQty = sellFills.reduce((s, f) => s + parseFloat(f['Quantity']), 0)
        const direction = buyFills[0] && new Date(buyFills[0]['_timestamp']) < new Date(sellFills[0]['_timestamp']) ? 'long' : 'short'
        const openFills = direction === 'long' ? buyFills : sellFills
        const closeFills = direction === 'long' ? sellFills : buyFills
        const totalQty = direction === 'long' ? totalBuyQty : totalSellQty
        const openPrice = openFills.reduce((s, f) => s + parseFloat(f['Price']) * parseFloat(f['Quantity']), 0) / totalQty
        const closePrice = closeFills.reduce((s, f) => s + parseFloat(f['Price']) * parseFloat(f['Quantity']), 0) / totalQty
        const ticks = direction === 'long' ? (closePrice - openPrice) / tickSize : (openPrice - closePrice) / tickSize
        const totalFee = currentFills.reduce((s, f) => s + (parseFloat(f['commission']) || 0), 0)
        const pnl = Math.round(ticks * tickValue * totalQty * 100) / 100
        results.push({
          symbol: product, direction,
          open_price: Math.round(openPrice * 100) / 100,
          close_price: Math.round(closePrice * 100) / 100,
          quantity: totalQty,
          open_fee: Math.round(totalFee / 2 * 100) / 100,
          close_fee: Math.round(totalFee / 2 * 100) / 100,
          pnl,
          open_time: new Date(openFills[0]['_timestamp']).toISOString(),
          close_time: new Date(closeFills[closeFills.length - 1]['_timestamp']).toISOString(),
          strategy: '', remark: '',
        })
        currentFills = []
      }
    })
  })
  return results
}

function parseTradovateTVCSV(rows: any[], symbolsData: Symbol[]): any[] {
  const filled = rows.filter(r => r['狀態'] === '已成交' && parseFloat(r['已成交數量']) > 0)
  const byContract: Record<string, any[]> = {}
  filled.forEach(r => {
    const contract = r['商品']?.trim() || ''
    if (!contract) return
    if (!byContract[contract]) byContract[contract] = []
    byContract[contract].push(r)
  })
  const results: any[] = []
  Object.entries(byContract).forEach(([contract, orders]) => {
    const product = contract.replace(/[A-Z]\d+$/, '').replace(/\d+$/, '') || contract
    const symbolInfo = symbolsData.find(s => {
      const sName = s.name.toUpperCase().replace(/\d+$/, '')
      const pName = product.toUpperCase()
      return sName === pName || s.name.toUpperCase() === product.toUpperCase()
    })
    const tickSize = symbolInfo?.tick_size || 1
    const tickValue = symbolInfo?.tick_value || 1
    orders.sort((a, b) => new Date(a['更新時間']).getTime() - new Date(b['更新時間']).getTime())
    let netPosition = 0
    let currentOrders: any[] = []
    orders.forEach(order => {
      const side = order['買/賣']?.trim()
      const qty = parseFloat(order['已成交數量']) || 0
      const delta = side === '買入' ? qty : -qty
      netPosition += delta
      currentOrders.push(order)
      if (Math.abs(netPosition) < 0.001 && currentOrders.length >= 2) {
        const buyOrders = currentOrders.filter(o => o['買/賣']?.trim() === '買入')
        const sellOrders = currentOrders.filter(o => o['買/賣']?.trim() === '賣出')
        const totalBuyQty = buyOrders.reduce((s, o) => s + (parseFloat(o['已成交數量']) || 0), 0)
        const totalSellQty = sellOrders.reduce((s, o) => s + (parseFloat(o['已成交數量']) || 0), 0)
        const firstBuyTime = buyOrders[0] ? new Date(buyOrders[0]['更新時間']) : new Date(9999999999999)
        const firstSellTime = sellOrders[0] ? new Date(sellOrders[0]['更新時間']) : new Date(9999999999999)
        const direction = firstBuyTime < firstSellTime ? 'long' : 'short'
        const openOrders = direction === 'long' ? buyOrders : sellOrders
        const closeOrders = direction === 'long' ? sellOrders : buyOrders
        const totalQty = direction === 'long' ? totalBuyQty : totalSellQty
        const openPrice = openOrders.reduce((s, o) => s + parseFloat(o['成交均價']) * parseFloat(o['已成交數量']), 0) / totalQty
        const closePrice = closeOrders.reduce((s, o) => s + parseFloat(o['成交均價']) * parseFloat(o['已成交數量']), 0) / totalQty
        const ticks = direction === 'long' ? (closePrice - openPrice) / tickSize : (openPrice - closePrice) / tickSize
        const pnl = Math.round(ticks * tickValue * totalQty * 100) / 100
        results.push({
          symbol: product, direction,
          open_price: Math.round(openPrice * 100) / 100,
          close_price: Math.round(closePrice * 100) / 100,
          quantity: totalQty,
          open_fee: 0, close_fee: 0, pnl,
          open_time: new Date(openOrders[0]['更新時間']).toISOString(),
          close_time: new Date(closeOrders[closeOrders.length - 1]['更新時間']).toISOString(),
          strategy: '', remark: '',
        })
        currentOrders = []
        netPosition = 0
      }
    })
  })
  return results
}

const LANGUAGES = [
  { code: 'zh-TW', label: '繁中' },
  { code: 'zh-CN', label: '简中' },
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日本語' },
]

export default function SettingsPanel({ onImported }: SettingsProps) {
  const { t, language, setLanguage } = useLanguage()
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [activeTab, setActiveTab] = useState<'symbols' | 'categories' | 'strategies' | 'tags' | 'currency' | 'data'>('symbols')
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('期貨')
  const [newTickSize, setNewTickSize] = useState('0.25')
  const [newTickValue, setNewTickValue] = useState('1.25')
  const [newCurrency, setNewCurrency] = useState('USD')
  const [newFee, setNewFee] = useState('0')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newStrategyName, setNewStrategyName] = useState('')
  const [newStrategyIndicators, setNewStrategyIndicators] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editingTagName, setEditingTagName] = useState('')
  const [editingSymbol, setEditingSymbol] = useState<Symbol | null>(null)
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null)
  const { currency, symbol, setCurrency } = useCurrency()
  const [initialCapital, setInitialCapital] = useState<string>('10000')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importStatus, setImportStatus] = useState<'idle' | 'preview' | 'importing' | 'done' | 'error'>('idle')
  const [importMessage, setImportMessage] = useState('')
  const [importFormat, setImportFormat] = useState<'tradeflex' | 'tradingview' | 'tradovate' | 'tradovate_tv' | 'unknown'>('unknown')
  const [convertedRows, setConvertedRows] = useState<any[]>([])
  const [exportRange, setExportRange] = useState<'all' | 'custom'>('all')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [clearStatus, setClearStatus] = useState<'idle' | 'confirm' | 'clearing' | 'done'>('idle')

  useEffect(() => {
    fetch('/api/capital').then(r => r.json()).then(data => {
      setInitialCapital(String(data.amount || 10000))
    })
  }, [])

  async function saveCapital() {
    await fetch('/api/capital', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(initialCapital) }),
    })
  }

  useEffect(() => {
    loadSymbols(); loadCategories(); loadStrategies(); loadTags()
  }, [])

  async function loadSymbols() {
    const res = await fetch('/api/symbols')
    const data = await res.json()
    setSymbols(Array.isArray(data) ? data : [])
  }

  async function loadCategories() {
    const res = await fetch('/api/categories')
    const data = await res.json()
    setCategories(Array.isArray(data) ? data : [])
  }

  async function loadStrategies() {
    const res = await fetch('/api/strategies')
    const data = await res.json()
    setStrategies(Array.isArray(data) ? data : [])
  }

  async function loadTags() {
    const res = await fetch('/api/tags')
    const data = await res.json()
    setTags(Array.isArray(data) ? data : [])
  }

  async function addSymbol() {
    if (!newName) return
    await fetch('/api/symbols', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.toUpperCase(), category: newCategory,
        tick_size: parseFloat(newTickSize), tick_value: parseFloat(newTickValue),
        currency: newCurrency, default_fee: parseFloat(newFee),
      }),
    })
    setNewName(''); setNewTickSize('0.25'); setNewTickValue('1.25'); setNewFee('0')
    loadSymbols()
  }

  async function updateSymbol() {
    if (!editingSymbol) return
    await fetch('/api/symbols', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingSymbol),
    })
    setEditingSymbol(null)
    loadSymbols()
  }

  async function deleteSymbol(id: string) {
    setSymbols(prev => prev.filter(s => s.id !== id))
    await fetch(`/api/symbols?id=${id}`, { method: 'DELETE' })
  }

  async function addCategory() {
    if (!newCategoryName) return
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName }),
    })
    setNewCategoryName('')
    loadCategories()
  }

  async function deleteCategory(id: string) {
    setCategories(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
  }

  async function addStrategy() {
    if (!newStrategyName) return
    await fetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newStrategyName, indicators: newStrategyIndicators }),
    })
    setNewStrategyName(''); setNewStrategyIndicators([])
    loadStrategies()
  }

  async function updateStrategy() {
    if (!editingStrategy) return
    await fetch(`/api/strategies?id=${editingStrategy.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingStrategy.name, indicators: editingStrategy.indicators }),
    })
    setEditingStrategy(null)
    loadStrategies()
  }

  async function deleteStrategy(id: string) {
    setStrategies(prev => prev.filter(s => s.id !== id))
    await fetch(`/api/strategies?id=${id}`, { method: 'DELETE' })
  }

  async function addTag() {
    if (!newTagName) return
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName }),
    })
    setNewTagName('')
    loadTags()
  }

  async function updateTag() {
  if (!editingTag || !editingTagName.trim()) return
  await fetch(`/api/tags?id=${editingTag.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: editingTagName.trim() }),
  })
  setEditingTag(null)
  setEditingTagName('')
  loadTags()
}

  async function deleteTag(id: string) {
    setTags(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/tags?id=${id}`, { method: 'DELETE' })
  }

  function toggleIndicator(ind: string) {
    setNewStrategyIndicators(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    )
  }

  function toggleEditingIndicator(ind: string) {
    if (!editingStrategy) return
    setEditingStrategy({
      ...editingStrategy,
      indicators: editingStrategy.indicators.includes(ind)
        ? editingStrategy.indicators.filter(i => i !== ind)
        : [...editingStrategy.indicators, ind]
    })
  }

  async function exportCSV() {
    const res = await fetch('/api/completed')
    const trades: any[] = await res.json()
    let filtered = trades
    if (exportRange === 'custom' && exportFrom) filtered = filtered.filter(t => t.close_time >= exportFrom)
    if (exportRange === 'custom' && exportTo) filtered = filtered.filter(t => t.close_time <= exportTo + 'T23:59:59')
    const headers = ['平倉時間', '開倉時間', '標的', '方向', '開倉價', '平倉價', '口數', '開倉手續費', '平倉手續費', '盈虧', '策略', '備註']
    const rows = filtered.map(tr => [
      tr.close_time ? new Date(tr.close_time).toLocaleString('zh-TW') : '',
      tr.open_time ? new Date(tr.open_time).toLocaleString('zh-TW') : '',
      tr.symbol, tr.direction === 'long' ? '做多' : '做空',
      tr.open_price, tr.close_price, tr.quantity, tr.open_fee, tr.close_fee, tr.pnl,
      tr.strategy || '', tr.remark || '',
    ])
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tradeflex_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function clearAllTrades() {
    setClearStatus('clearing')
    await fetch('/api/completed', { method: 'DELETE' })
    await fetch('/api/trades', { method: 'DELETE' })
    setClearStatus('done')
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const clean = text.replace(/^\uFEFF/, '')
      const lines = clean.split('\n').filter(l => l.trim())
      if (lines.length < 2) {
        setImportStatus('error')
        setImportMessage('CSV 檔案內容不足，請確認格式正確')
        return
      }
      const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim())
      const format = detectFormat(headers)
      if (format === 'unknown') {
        setImportStatus('error')
        setImportMessage('不支援的 CSV 格式')
        return
      }
      const rawRows = parseCSVLines(lines, headers)
      if (format === 'tradingview') {
        const converted = parseTradingViewCSV(rawRows, symbols)
        setConvertedRows(converted)
        setImportPreview(converted.slice(0, 5))
        setImportMessage(`偵測到 TradingView 格式，共轉換 ${converted.length} 筆已完成交易，預覽前 5 筆`)
      } else if (format === 'tradovate') {
        const converted = parseTradovateCSV(rawRows, symbols)
        setConvertedRows(converted)
        setImportPreview(converted.slice(0, 5))
        setImportMessage(`偵測到 Tradovate 格式，共轉換 ${converted.length} 筆已完成交易，預覽前 5 筆`)
      } else if (format === 'tradovate_tv') {
        const converted = parseTradovateTVCSV(rawRows, symbols)
        setConvertedRows(converted)
        setImportPreview(converted.slice(0, 5))
        setImportMessage(`偵測到 Tradovate(TradingView) 格式，共轉換 ${converted.length} 筆已完成交易，預覽前 5 筆`)
      } else {
        setConvertedRows(rawRows)
        setImportPreview(rawRows.slice(0, 5))
        setImportMessage(`偵測到 TradeFlex 格式，共 ${rawRows.length} 筆資料，預覽前 5 筆`)
      }
      setImportFormat(format)
      setImportStatus('preview')
    }
    reader.readAsText(file, 'utf-8')
  }

  async function confirmImport() {
    if (convertedRows.length === 0) return
    setImportStatus('importing')
    const portfolioRes = await fetch('/api/portfolios')
    const portfolios = await portfolioRes.json()
    const portfolioId = portfolios[0]?.id
    if (!portfolioId) {
      setImportStatus('error')
      setImportMessage('找不到投資組合，請先建立一個')
      return
    }
    const payload = convertedRows.map((row: any) => {
      if (importFormat === 'tradingview' || importFormat === 'tradovate' || importFormat === 'tradovate_tv') {
        return { ...row, portfolio_id: portfolioId }
      }
      return {
        portfolio_id: portfolioId,
        symbol: row['標的'] || '',
        direction: row['方向'] === '做多' ? 'long' : 'short',
        open_price: parseFloat(row['開倉價']) || 0,
        close_price: parseFloat(row['平倉價']) || 0,
        quantity: parseFloat(row['口數']) || 1,
        open_fee: parseFloat(row['開倉手續費']) || 0,
        close_fee: parseFloat(row['平倉手續費']) || 0,
        pnl: parseFloat(row['盈虧']) || 0,
        strategy: row['策略'] || '',
        remark: row['備註'] || '',
        open_time: row['開倉時間'] ? new Date(row['開倉時間']).toISOString() : new Date().toISOString(),
        close_time: row['平倉時間'] ? new Date(row['平倉時間']).toISOString() : new Date().toISOString(),
      }
    })
    try {
      const res = await fetch('/api/completed/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades: payload }),
      })
      const result = await res.json()
      if (res.ok) {
        setImportStatus('done')
        setImportMessage(`匯入完成：成功 ${result.count} 筆`)
        onImported?.()
      } else {
        setImportStatus('error')
        setImportMessage(`匯入失敗：${result.error}`)
      }
    } catch {
      setImportStatus('error')
      setImportMessage('匯入失敗，請稍後再試')
    }
    setImportPreview([])
    setConvertedRows([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function resetImport() {
    setImportStatus('idle')
    setImportMessage('')
    setImportPreview([])
    setConvertedRows([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [accountName, setAccountName] = useState('')
  const [accountPhone, setAccountPhone] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [lastLogin, setLastLogin] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountMsg, setAccountMsg] = useState('')
  const [accountErr, setAccountErr] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAccountEmail(data.user.email || '')
        setAccountName(data.user.user_metadata?.full_name || '')
        setAccountPhone(data.user.user_metadata?.phone || '')
        setLastLogin(data.user.last_sign_in_at ? new Date(data.user.last_sign_in_at).toLocaleString('zh-TW') : '')
      }
    })
  }, [])

  async function saveAccountInfo() {
    setSavingAccount(true)
    setAccountMsg('')
    setAccountErr('')
    const { error } = await supabase.auth.updateUser({
      data: { full_name: accountName, phone: accountPhone }
    })
    if (error) setAccountErr(error.message)
    else setAccountMsg('已儲存！')
    setSavingAccount(false)
  }

  async function changePassword() {
    setAccountMsg('')
    setAccountErr('')
    if (newPassword !== confirmPassword) { setAccountErr('兩次密碼不一致'); return }
    if (newPassword.length < 6) { setAccountErr('密碼至少 6 位'); return }
    setSavingAccount(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setAccountErr(error.message)
    else { setAccountMsg('密碼已更新！'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }
    setSavingAccount(false)
  }

  async function deleteAccount() {
    if (deleteConfirm !== accountEmail) { setAccountErr('請輸入正確的 Email 確認'); return }
    setAccountErr('帳號刪除功能需要聯絡管理員處理')
  }

  const cardStyle = { background: 'linear-gradient(160deg, var(--bg-card3) 0%, var(--bg-card4) 100%)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-inset), var(--shadow-card)' }

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="text-lg font-semibold mb-6">{t('settingsTitle')}</h2>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'symbols', label: t('symbolSettings') },
          { key: 'categories', label: t('categorySettings') },
          { key: 'strategies', label: t('strategySettings') },
          { key: 'tags', label: t('tagSettings') },
          { key: 'currency', label: t('currencySettings') },
          { key: 'data', label: t('dataManagement') },
          { key: 'account', label: '帳號設定' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={activeTab === tab.key
              ? { background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }
              : { background: 'var(--bg-card)', color: '#888' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'symbols' && (
  <div className="space-y-4">
    <div className="rounded-xl p-4" style={cardStyle}>
      <h3 className="text-sm font-semibold text-gray-400 mb-4">{t('addSymbol')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div><label className="text-xs text-gray-500 mb-1 block">{t('symbolName')}</label><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="MES" className="input" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">{t('category')}</label><select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="input">{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">{t('currency')}</label><select value={newCurrency} onChange={e => setNewCurrency(e.target.value)} className="input"><option>USD</option><option>TWD</option><option>USDT</option></select></div>
        <div><label className="text-xs text-gray-500 mb-1 block">{t('tickSize')}</label><input value={newTickSize} onChange={e => setNewTickSize(e.target.value)} type="number" step="0.01" className="input" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">{t('tickValue')}</label><input value={newTickValue} onChange={e => setNewTickValue(e.target.value)} type="number" step="0.01" className="input" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">{t('defaultFee')}</label><input value={newFee} onChange={e => setNewFee(e.target.value)} type="number" step="0.01" className="input" /></div>
      </div>
      <button onClick={addSymbol} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }}>{t('addSymbolBtn')}</button>
    </div>
    <div className="rounded-xl overflow-hidden" style={cardStyle}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-[var(--border)] text-left">
            <th className="py-3 px-4">{t('symbolName')}</th>
            <th className="py-3 px-4">{t('category')}</th>
            <th className="py-3 px-4">{t('tickSize')}</th>
            <th className="py-3 px-4">{t('tickValue')}</th>
            <th className="py-3 px-4">{t('currency')}</th>
            <th className="py-3 px-4">{t('defaultFee')}</th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {symbols.map(s => (
            <tr key={s.id} className="border-b border-[#1a1a1a] hover:bg-[var(--bg-card)]/30">
              {editingSymbol?.id === s.id ? (
                <>
                  <td className="py-2 px-4"><input value={editingSymbol.name} onChange={e => setEditingSymbol({...editingSymbol, name: e.target.value})} className="input w-24" /></td>
                  <td className="py-2 px-4"><select value={editingSymbol.category} onChange={e => setEditingSymbol({...editingSymbol, category: e.target.value})} className="input">{categories.map(c => <option key={c.id}>{c.name}</option>)}</select></td>
                  <td className="py-2 px-4"><input value={editingSymbol.tick_size} type="number" step="0.01" onChange={e => setEditingSymbol({...editingSymbol, tick_size: parseFloat(e.target.value) || 0})} className="input w-24" /></td>
                  <td className="py-2 px-4"><input value={editingSymbol.tick_value} type="number" step="0.01" onChange={e => setEditingSymbol({...editingSymbol, tick_value: parseFloat(e.target.value) || 0})} className="input w-24" /></td>
                  <td className="py-2 px-4"><select value={editingSymbol.currency} onChange={e => setEditingSymbol({...editingSymbol, currency: e.target.value})} className="input"><option>USD</option><option>TWD</option><option>USDT</option></select></td>
                  <td className="py-2 px-4"><input value={editingSymbol.default_fee} type="number" step="0.01" onChange={e => setEditingSymbol({...editingSymbol, default_fee: parseFloat(e.target.value) || 0})} className="input w-24" /></td>
                  <td className="py-2 px-4">
                    <div className="flex gap-2">
                      <button onClick={updateSymbol} className="text-[var(--color-profit)] hover:text-[var(--color-profit)] text-xs px-2 py-1 rounded">{t('save')}</button>
                      <button onClick={() => setEditingSymbol(null)} className="text-gray-400 hover:text-gray-300 text-xs px-2 py-1 rounded">{t('cancel')}</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="py-3 px-4 font-semibold">{s.name}</td>
                  <td className="py-3 px-4 text-gray-400">{s.category}</td>
                  <td className="py-3 px-4">{s.tick_size}</td>
                  <td className="py-3 px-4">{s.tick_value}</td>
                  <td className="py-3 px-4 text-gray-400">{s.currency}</td>
                  <td className="py-3 px-4">{s.default_fee}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button onClick={() => setEditingSymbol(s)} className="text-[var(--gold)] text-xs px-2 py-1 rounded">{t('edit')}</button>
                      <button onClick={() => deleteSymbol(s.id)} className="text-[var(--color-loss)] hover:text-[var(--color-loss)] text-xs px-2 py-1 rounded">{t('delete')}</button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">{t('addCategory')}</h3>
            <div className="flex gap-3">
              <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder={t('categoryName')} className="input flex-1" />
              <button onClick={addCategory} className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap" style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }}>{t('add')}</button>
            </div>
          </div>
          <div className="rounded-xl p-4" style={cardStyle}>
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <span className="text-sm">{c.name}</span>
                <button onClick={() => deleteCategory(c.id)} className="text-[var(--color-loss)] hover:text-[var(--color-loss)] text-xs px-2 py-1 rounded">{t('delete')}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'strategies' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">{t('addStrategy')}</h3>
            <div className="flex flex-col gap-3">
              <input value={newStrategyName} onChange={e => setNewStrategyName(e.target.value)} placeholder={t('strategyName')} className="input" />
              <div>
                <p className="text-xs text-gray-500 mb-2">{t('indicators')}</p>
                <div className="flex gap-2">
                  {INDICATOR_OPTIONS.map(ind => (
                    <button key={ind} type="button" onClick={() => toggleIndicator(ind)}
                      className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      style={newStrategyIndicators.includes(ind)
                        ? { background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }
                        : { background: 'var(--bg-card)', color: '#888' }
                      }
                    >{ind}</button>
                  ))}
                </div>
              </div>
              <button onClick={addStrategy} className="px-4 py-2 rounded-lg text-sm font-medium w-fit" style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }}>{t('addStrategyBtn')}</button>
            </div>
          </div>
          <div className="rounded-xl p-4" style={cardStyle}>
            {[...strategies].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW')).map(s => (
              <div key={s.id} className="border-b border-[var(--border)] py-3">
                {editingStrategy?.id === s.id ? (
                  <div className="flex flex-col gap-2">
                    <input value={editingStrategy.name} onChange={e => setEditingStrategy({...editingStrategy, name: e.target.value})} className="input" />
                    <div className="flex gap-2">
                      {INDICATOR_OPTIONS.map(ind => (
                        <button key={ind} type="button" onClick={() => toggleEditingIndicator(ind)}
                          className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                          style={editingStrategy.indicators.includes(ind)
                            ? { background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }
                            : { background: 'var(--bg-card)', color: '#888' }
                          }
                        >{ind}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={updateStrategy} className="text-[var(--color-profit)] text-xs px-2 py-1 rounded">{t('save')}</button>
                      <button onClick={() => setEditingStrategy(null)} className="text-gray-400 text-xs px-2 py-1 rounded">{t('cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">{s.name}</span>
                      {s.indicators && s.indicators.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {s.indicators.map(ind => (
                            <span key={ind} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: '#888' }}>{ind}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingStrategy({...s, indicators: s.indicators || []})} className="text-[var(--gold)] text-xs px-2 py-1 rounded">{t('edit')}</button>
                      <button onClick={() => deleteStrategy(s.id)} className="text-[var(--color-loss)] hover:text-[var(--color-loss)] text-xs px-2 py-1 rounded">{t('delete')}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {strategies.length === 0 && <p className="text-gray-600 text-sm py-2">{t('noStrategy')}</p>}
          </div>
        </div>
      )}

      {activeTab === 'tags' && (
  <div className="space-y-4">
    <div className="rounded-xl p-4" style={cardStyle}>
      <h3 className="text-sm font-semibold text-gray-400 mb-4">{t('addTag')}</h3>
      <div className="flex gap-3">
        <input
          value={newTagName}
          onChange={e => setNewTagName(e.target.value)}
          placeholder={t('tagName')}
          className="input flex-1"
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
        />
        <button
          type="button"
          onClick={addTag}
          className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }}
        >{t('add')}</button>
      </div>
    </div>
    <div className="rounded-xl p-4" style={cardStyle}>
      <div className="space-y-3">
  {tags.length === 0 && <p className="text-gray-600 text-sm py-2">{t('noStrategy')}</p>}
  {(() => {
    // 按 - 前綴分組
    const groups: Record<string, Tag[]> = {}
    tags.forEach(tag => {
      const prefix = tag.name.includes('/') ? tag.name.split('/')[0] : tag.name
      if (!groups[prefix]) groups[prefix] = []
      groups[prefix].push(tag)
    })
    return Object.entries(groups).map(([prefix, groupTags]) => (
      <div key={prefix}>
        <p className="text-xs text-gray-500 mb-2">{prefix}</p>
        <div className="flex flex-wrap gap-2">
          {groupTags.map(tag => (
  <div key={tag.id} className="flex items-center gap-1 rounded-full text-sm group" style={{ background: 'var(--bg-card)', border: '1px solid #2a2a2a' }}>
    {editingTag?.id === tag.id ? (
      <div className="flex items-center gap-1 px-2 py-1">
        <input
          value={editingTagName}
          onChange={e => setEditingTagName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') updateTag(); if (e.key === 'Escape') { setEditingTag(null); setEditingTagName('') } }}
          className="bg-[#222] border border-[var(--gold)] rounded px-2 py-0.5 text-xs text-[var(--text-primary)] focus:outline-none w-32"
          autoFocus
        />
        <button type="button" onClick={updateTag} className="text-[var(--color-profit)] text-xs px-1">✓</button>
        <button type="button" onClick={() => { setEditingTag(null); setEditingTagName('') }} className="text-gray-500 text-xs px-1">✕</button>
      </div>
    ) : (
      <div className="flex items-center gap-1 px-3 py-1.5">
        <span className="text-gray-300">#{tag.name}</span>
        <button type="button" onClick={() => { setEditingTag(tag); setEditingTagName(tag.name) }} className="text-gray-600 hover:text-[var(--gold)] ml-1 text-xs">✎</button>
<button type="button" onClick={() => deleteTag(tag.id)} className="text-gray-600 hover:text-[var(--color-loss)] text-xs">✕</button>
      </div>
    )}
  </div>
))}
        </div>
      </div>
    ))
  })()}
</div>
    </div>
  </div>
)}

      {activeTab === 'currency' && (
        <div className="space-y-4">
          {/* 語言設定 */}
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">{t('languageSettings')}</h3>
            <div className="flex gap-2 flex-wrap">
              {LANGUAGES.map(lang => (
                <button key={lang.code} onClick={() => setLanguage(lang.code as any)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={language === lang.code
                    ? { background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }
                    : { background: 'var(--bg-card)', color: '#888' }
                  }
                >{lang.label}</button>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">{t('baseCurrency')}</h3>
            <p className="text-xs text-gray-500 mb-4">{t('currencyDesc')}</p>
            <div className="flex gap-2 flex-wrap">
              {['USD', 'TWD', 'EUR', 'JPY', 'CNY'].map(c => (
                <button key={c} onClick={() => setCurrency(c)} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={currency === c
                    ? { background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }
                    : { background: 'var(--bg-card)', color: '#888' }
                  }
                >{c}</button>
              ))}
            </div>
            <div className="rounded-xl p-4 mt-4" style={cardStyle}>
              <h3 className="text-sm font-semibold text-gray-400 mb-4">{t('initialCapital')}</h3>
              <p className="text-xs text-gray-500 mb-4">{t('capitalDesc')}</p>
              <div className="flex gap-3">
                <input value={initialCapital} onChange={e => setInitialCapital(e.target.value)} type="number" className="input flex-1" placeholder="10000" />
                <button onClick={saveCapital} className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap" style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }}>{t('save')}</button>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-4">{t('current')}{currency} {symbol}</p>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-1">{t('exportTrades')}</h3>
            <p className="text-xs text-gray-600 mb-4">{t('exportDesc')}</p>
            <div className="flex gap-3 mb-4">
              <button onClick={() => setExportRange('all')} className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={exportRange === 'all' ? { background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' } : { background: 'var(--bg-card)', color: '#888' }}
              >{t('allData')}</button>
              <button onClick={() => setExportRange('custom')} className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={exportRange === 'custom' ? { background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' } : { background: 'var(--bg-card)', color: '#888' }}
              >{t('customDate')}</button>
            </div>
            {exportRange === 'custom' && (
              <div className="flex gap-3 mb-4">
                <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">{t('startDate')}</label><input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} className="input" /></div>
                <div className="flex-1"><label className="text-xs text-gray-500 mb-1 block">{t('endDate')}</label><input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} className="input" /></div>
              </div>
            )}
            <button onClick={exportCSV} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }}>{t('downloadCSV')}</button>
          </div>

          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-1">{t('importTrades')}</h3>
            <p className="text-xs text-gray-600 mb-1">{t('supportedFormats')}</p>
            <ul className="text-xs text-gray-500 mb-4 list-disc list-inside space-y-0.5">
              <li>TradeFlex</li>
              <li>TradingView Paper Trading</li>
              <li>Tradovate Fills（直接匯出）</li>
              <li>Tradovate（TradingView 匯出）</li>
            </ul>

            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />

            {importStatus === 'idle' && (
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: 'var(--bg-card)', color: 'var(--gold)', border: '1px solid #2a2a2a' }}>
                {t('selectCSV')}
              </button>
            )}

            {importStatus === 'preview' && (
              <div>
                <p className="text-xs text-gray-400 mb-3">{importMessage}</p>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-[var(--border)]">
                        {[t('closeTime'), t('symbol'), t('strategyLabel'), t('entryPrice'), t('closePrice'), t('quantity'), 'P&L'].map(h => (
                          <th key={h} className="py-2 px-2 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, i) => (
                        <tr key={i} className="border-b border-[#1a1a1a]">
                          <td className="py-1.5 px-2 text-gray-400">
                            {row.close_time ? new Date(row.close_time).toLocaleDateString('zh-TW') : row['平倉時間'] || ''}
                          </td>
                          <td className="py-1.5 px-2 font-semibold">{row.symbol || row['標的'] || ''}</td>
                          <td className="py-1.5 px-2" style={{ color: (row.direction === 'long' || row['方向'] === '做多') ? '#4ade80' : '#f87171' }}>
                            {row.direction === 'long' ? t('long') : row.direction === 'short' ? t('short') : row['方向'] || ''}
                          </td>
                          <td className="py-1.5 px-2">{row.open_price ?? row['開倉價'] ?? ''}</td>
                          <td className="py-1.5 px-2">{row.close_price ?? row['平倉價'] ?? ''}</td>
                          <td className="py-1.5 px-2">{row.quantity ?? row['口數'] ?? ''}</td>
                          <td className="py-1.5 px-2" style={{ color: (parseFloat(row.pnl) || parseFloat(row['盈虧'])) >= 0 ? '#4ade80' : '#f87171' }}>
                            {row.pnl ?? row['盈虧'] ?? ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3">
                  <button onClick={confirmImport} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }}>{t('confirmImport')}</button>
                  <button onClick={resetImport} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-card)', color: '#888', border: '1px solid #2a2a2a' }}>{t('cancel')}</button>
                </div>
              </div>
            )}

            {importStatus === 'importing' && (
              <p className="text-xs text-[var(--gold)]">匯入中，請稍候...</p>
            )}

            {(importStatus === 'done' || importStatus === 'error') && (
              <div>
                <p className={`text-xs mb-3 ${importStatus === 'done' ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}`}>{importMessage}</p>
                <button onClick={resetImport} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-card)', color: '#888', border: '1px solid #2a2a2a' }}>{t('reimport')}</button>
              </div>
            )}
          </div>

          <div className="rounded-xl p-4" style={{ background: 'linear-gradient(160deg, #1a0a0a 0%, #110808 100%)', border: '1px solid #3a1a1a' }}>
            <h3 className="text-sm font-semibold text-[var(--color-loss)] mb-1">{t('clearHistory')}</h3>
            <p className="text-xs text-gray-600 mb-4">{t('clearDesc')}</p>
            {clearStatus === 'idle' && (
              <button onClick={() => setClearStatus('confirm')} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: 'var(--bg-card)', color: 'var(--color-loss)', border: '1px solid #3a1a1a' }}>
                {t('clearBtn')}
              </button>
            )}
            {clearStatus === 'confirm' && (
              <div>
                <p className="text-xs text-[var(--color-loss)] mb-3">{t('clearConfirm')}</p>
                <div className="flex gap-3">
                  <button onClick={clearAllTrades} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#7f1d1d', color: '#fca5a5' }}>{t('confirmClear')}</button>
                  <button onClick={() => setClearStatus('idle')} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-card)', color: '#888', border: '1px solid #2a2a2a' }}>{t('cancel')}</button>
                </div>
              </div>
            )}
            {clearStatus === 'clearing' && <p className="text-xs text-[var(--color-loss)]">{t('clearing')}</p>}
            {clearStatus === 'done' && (
              <div>
                <p className="text-xs text-[var(--color-profit)] mb-3">{t('cleared')}</p>
                <button onClick={() => { setClearStatus('idle'); onImported?.() }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-card)', color: '#888', border: '1px solid #2a2a2a' }}>{t('close')}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

      {activeTab === 'account' && (
        <div className="space-y-4">
          {/* 基本資料 */}
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">基本資料</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">名稱</label>
                <input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="你的名稱" className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email（不可修改）</label>
                <input value={accountEmail} disabled className="input opacity-50 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">手機</label>
                <input value={accountPhone} onChange={e => setAccountPhone(e.target.value)} placeholder="+886 912 345 678" className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">最後登入時間</label>
                <input value={lastLogin} disabled className="input opacity-50 cursor-not-allowed" />
              </div>
              <button
                onClick={saveAccountInfo}
                disabled={savingAccount}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }}
              >
                {savingAccount ? '儲存中...' : '儲存資料'}
              </button>
            </div>
          </div>

          {/* 修改密碼 */}
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">修改密碼</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">新密碼</label>
                <div className="relative">
                  <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type={showNewPw ? 'text' : 'password'} placeholder="至少 6 位" className="input pr-10" />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {showNewPw ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">確認新密碼</label>
                <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="再輸入一次" className="input" />
              </div>
              <button
                onClick={changePassword}
                disabled={savingAccount}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#000' }}
              >
                {savingAccount ? '更新中...' : '更新密碼'}
              </button>
            </div>
          </div>

          {accountMsg && <p className="text-sm text-[var(--color-profit)]">{accountMsg}</p>}
          {accountErr && <p className="text-sm text-[var(--color-loss)]">{accountErr}</p>}

          {/* 通知設定 */}
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">通知設定</h3>
            <p className="text-xs text-gray-500">即將推出</p>
          </div>

          {/* 危險區域 */}
          <div className="rounded-xl p-4" style={{ ...cardStyle, border: '1px solid var(--color-loss)' }}>
            <h3 className="text-sm font-semibold text-[var(--color-loss)] mb-4">危險區域</h3>
            <p className="text-xs text-gray-500 mb-3">刪除帳號將永久移除所有資料，無法復原。請輸入你的 Email 確認。</p>
            <div className="flex gap-2">
              <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={accountEmail} className="input flex-1" />
              <button
                onClick={deleteAccount}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--color-loss)', color: '#fff' }}
              >
                刪除帳號
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}