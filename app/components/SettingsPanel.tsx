'use client'

import { useEffect, useState } from 'react'
import { useCurrency } from '../CurrencyContext'

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

export default function SettingsPanel() {
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [activeTab, setActiveTab] = useState<'symbols' | 'categories' | 'strategies' | 'tags' | 'currency'>('symbols')

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
  const [editingSymbol, setEditingSymbol] = useState<Symbol | null>(null)
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null)
  const { currency, symbol, setCurrency } = useCurrency()
  const [initialCapital, setInitialCapital] = useState<string>('10000')

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
    loadSymbols()
    loadCategories()
    loadStrategies()
    loadTags()
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
        name: newName.toUpperCase(),
        category: newCategory,
        tick_size: parseFloat(newTickSize),
        tick_value: parseFloat(newTickValue),
        currency: newCurrency,
        default_fee: parseFloat(newFee),
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
    setNewStrategyName('')
    setNewStrategyIndicators([])
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

  const cardStyle = { background: 'linear-gradient(160deg, #161616 0%, #0f0f0f 100%)', border: '1px solid #2a2a2a' }

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="text-lg font-semibold mb-6">設定</h2>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'symbols', label: '標的設定' },
          { key: 'categories', label: '類別設定' },
          { key: 'strategies', label: '策略設定' },
          { key: 'tags', label: '標籤設定' },
          { key: 'currency', label: '幣值設定' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={activeTab === tab.key
              ? { background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }
              : { background: '#1a1a1a', color: '#888' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'symbols' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">新增標的</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">標的名稱</label><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="MES" className="input" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">類別</label><select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="input">{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
              <div><label className="text-xs text-gray-500 mb-1 block">貨幣</label><select value={newCurrency} onChange={e => setNewCurrency(e.target.value)} className="input"><option>USD</option><option>TWD</option><option>USDT</option></select></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Tick Size</label><input value={newTickSize} onChange={e => setNewTickSize(e.target.value)} type="number" step="0.01" className="input" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Tick Value</label><input value={newTickValue} onChange={e => setNewTickValue(e.target.value)} type="number" step="0.01" className="input" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">預設手續費/口</label><input value={newFee} onChange={e => setNewFee(e.target.value)} type="number" step="0.01" className="input" /></div>
            </div>
            <button onClick={addSymbol} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }}>新增標的</button>
          </div>

          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <table className="w-full text-sm">
              <thead><tr className="text-gray-500 border-b border-[#2a2a2a] text-left"><th className="py-3 px-4">標的</th><th className="py-3 px-4">類別</th><th className="py-3 px-4">Tick Size</th><th className="py-3 px-4">Tick Value</th><th className="py-3 px-4">貨幣</th><th className="py-3 px-4">手續費/口</th><th className="py-3 px-4"></th></tr></thead>
              <tbody>
                {symbols.map(s => (
                  <tr key={s.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/30">
                    {editingSymbol?.id === s.id ? (
                      <>
                        <td className="py-2 px-4"><input value={editingSymbol.name} onChange={e => setEditingSymbol({...editingSymbol, name: e.target.value})} className="input w-24" /></td>
                        <td className="py-2 px-4"><select value={editingSymbol.category} onChange={e => setEditingSymbol({...editingSymbol, category: e.target.value})} className="input">{categories.map(c => <option key={c.id}>{c.name}</option>)}</select></td>
                        <td className="py-2 px-4"><input value={editingSymbol.tick_size} type="number" step="0.01" onChange={e => setEditingSymbol({...editingSymbol, tick_size: parseFloat(e.target.value)})} className="input w-24" /></td>
                        <td className="py-2 px-4"><input value={editingSymbol.tick_value} type="number" step="0.01" onChange={e => setEditingSymbol({...editingSymbol, tick_value: parseFloat(e.target.value)})} className="input w-24" /></td>
                        <td className="py-2 px-4"><select value={editingSymbol.currency} onChange={e => setEditingSymbol({...editingSymbol, currency: e.target.value})} className="input"><option>USD</option><option>TWD</option><option>USDT</option></select></td>
                        <td className="py-2 px-4"><input value={editingSymbol.default_fee} type="number" step="0.01" onChange={e => setEditingSymbol({...editingSymbol, default_fee: parseFloat(e.target.value)})} className="input w-24" /></td>
                        <td className="py-2 px-4"><div className="flex gap-2"><button onClick={updateSymbol} className="text-green-400 hover:text-green-300 text-xs px-2 py-1 rounded">儲存</button><button onClick={() => setEditingSymbol(null)} className="text-gray-400 hover:text-gray-300 text-xs px-2 py-1 rounded">取消</button></div></td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-semibold">{s.name}</td>
                        <td className="py-3 px-4 text-gray-400">{s.category}</td>
                        <td className="py-3 px-4">{s.tick_size}</td>
                        <td className="py-3 px-4">{s.tick_value}</td>
                        <td className="py-3 px-4 text-gray-400">{s.currency}</td>
                        <td className="py-3 px-4">{s.default_fee}</td>
                        <td className="py-3 px-4"><div className="flex gap-2"><button onClick={() => setEditingSymbol(s)} className="text-[#d4a843] text-xs px-2 py-1 rounded">編輯</button><button onClick={() => deleteSymbol(s.id)} className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded">刪除</button></div></td>
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
            <h3 className="text-sm font-semibold text-gray-400 mb-4">新增類別</h3>
            <div className="flex gap-3">
              <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="類別名稱" className="input flex-1" />
              <button onClick={addCategory} className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }}>新增</button>
            </div>
          </div>
          <div className="rounded-xl p-4" style={cardStyle}>
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-[#2a2a2a]">
                <span className="text-sm">{c.name}</span>
                <button onClick={() => deleteCategory(c.id)} className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded">刪除</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'strategies' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">新增策略</h3>
            <div className="flex flex-col gap-3">
              <input value={newStrategyName} onChange={e => setNewStrategyName(e.target.value)} placeholder="策略名稱，例如：60k CISD" className="input" />
              <div>
                <p className="text-xs text-gray-500 mb-2">選擇此策略需要輸入的指標</p>
                <div className="flex gap-2">
                  {INDICATOR_OPTIONS.map(ind => (
                    <button key={ind} type="button" onClick={() => toggleIndicator(ind)}
                      className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      style={newStrategyIndicators.includes(ind)
                        ? { background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }
                        : { background: '#1a1a1a', color: '#888' }
                      }
                    >{ind}</button>
                  ))}
                </div>
              </div>
              <button onClick={addStrategy} className="px-4 py-2 rounded-lg text-sm font-medium w-fit" style={{ background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }}>新增策略</button>
            </div>
          </div>
          <div className="rounded-xl p-4" style={cardStyle}>
            {strategies.map(s => (
              <div key={s.id} className="border-b border-[#2a2a2a] py-3">
                {editingStrategy?.id === s.id ? (
                  <div className="flex flex-col gap-2">
                    <input value={editingStrategy.name} onChange={e => setEditingStrategy({...editingStrategy, name: e.target.value})} className="input" />
                    <div className="flex gap-2">
                      {INDICATOR_OPTIONS.map(ind => (
                        <button key={ind} type="button" onClick={() => toggleEditingIndicator(ind)}
                          className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                          style={editingStrategy.indicators.includes(ind)
                            ? { background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }
                            : { background: '#1a1a1a', color: '#888' }
                          }
                        >{ind}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={updateStrategy} className="text-green-400 text-xs px-2 py-1 rounded">儲存</button>
                      <button onClick={() => setEditingStrategy(null)} className="text-gray-400 text-xs px-2 py-1 rounded">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">{s.name}</span>
                      {s.indicators && s.indicators.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {s.indicators.map(ind => (
                            <span key={ind} className="text-xs px-2 py-0.5 rounded" style={{ background: '#1a1a1a', color: '#888' }}>{ind}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingStrategy({...s, indicators: s.indicators || []})} className="text-[#d4a843] text-xs px-2 py-1 rounded">編輯</button>
                      <button onClick={() => deleteStrategy(s.id)} className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded">刪除</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {strategies.length === 0 && <p className="text-gray-600 text-sm py-2">尚無策略</p>}
          </div>
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">新增標籤</h3>
            <div className="flex gap-3">
              <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="標籤名稱，例如：趨勢交易、突破" className="input flex-1"
                onKeyDown={e => { if (e.key === 'Enter') addTag() }}
              />
              <button onClick={addTag} className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }}>新增</button>
            </div>
          </div>
          <div className="rounded-xl p-4" style={cardStyle}>
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <div key={t.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm group" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                  <span className="text-gray-300">{t.name}</span>
                  <button onClick={() => deleteTag(t.id)} className="text-gray-600 hover:text-red-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
              {tags.length === 0 && <p className="text-gray-600 text-sm py-2">尚無標籤</p>}
            </div>
          </div>
        </div>
      )}
    {activeTab === 'currency' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">基準貨幣</h3>
            <p className="text-xs text-gray-500 mb-4">選擇後所有金額顯示將自動換算</p>
            <div className="flex gap-2 flex-wrap">
              {['USD', 'TWD', 'EUR', 'JPY', 'CNY'].map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={currency === c
                    ? { background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }
                    : { background: '#1a1a1a', color: '#888' }
                  }
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="rounded-xl p-4 mt-4" style={cardStyle}>
        <h3 className="text-sm font-semibold text-gray-400 mb-4">初始資金</h3>
        <p className="text-xs text-gray-500 mb-4">用於計算資金成長曲線</p>
        <div className="flex gap-3">
          <input
            value={initialCapital}
            onChange={e => setInitialCapital(e.target.value)}
            type="number"
            className="input flex-1"
            placeholder="10000"
          />
          <button
            onClick={saveCapital}
            className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #d4a843 0%, #b8892e 100%)', color: '#000' }}
          >
            儲存
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-4">目前：{currency} {symbol}</p>
          </div>
        </div>
      )}
      </div>
  )
}