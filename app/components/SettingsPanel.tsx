'use client'

import { useEffect, useState } from 'react'

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

export default function SettingsPanel() {
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeTab, setActiveTab] = useState<'symbols' | 'categories'>('symbols')

  // 新增標的
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('期貨')
  const [newTickSize, setNewTickSize] = useState('0.25')
  const [newTickValue, setNewTickValue] = useState('1.25')
  const [newCurrency, setNewCurrency] = useState('USD')
  const [newFee, setNewFee] = useState('0')

  // 新增類別
  const [newCategoryName, setNewCategoryName] = useState('')

  // 編輯標的
  const [editingSymbol, setEditingSymbol] = useState<Symbol | null>(null)

  useEffect(() => {
    loadSymbols()
    loadCategories()
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
    await fetch(`/api/symbols?id=${id}`, { method: 'DELETE' })
    loadSymbols()
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
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    loadCategories()
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="text-lg font-semibold mb-6">設定</h2>

      {/* Tab */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('symbols')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'symbols' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          標的設定
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'categories' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          類別設定
        </button>
      </div>

      {/* 標的設定 */}
      {activeTab === 'symbols' && (
        <div className="space-y-4">
          {/* 新增標的 */}
          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">新增標的</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">標的名稱</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="MES" className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">類別</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                  className="input">
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">貨幣</label>
                <select value={newCurrency} onChange={e => setNewCurrency(e.target.value)}
                  className="input">
                  <option>USD</option>
                  <option>TWD</option>
                  <option>USDT</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tick Size（最小跳動）</label>
                <input value={newTickSize} onChange={e => setNewTickSize(e.target.value)}
                  type="number" step="0.01" placeholder="0.25" className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tick Value（每tick價值）</label>
                <input value={newTickValue} onChange={e => setNewTickValue(e.target.value)}
                  type="number" step="0.01" placeholder="1.25" className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">預設手續費/口</label>
                <input value={newFee} onChange={e => setNewFee(e.target.value)}
                  type="number" step="0.01" placeholder="0.62" className="input" />
              </div>
            </div>
            <button onClick={addSymbol}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
              新增標的
            </button>
          </div>

          {/* 標的列表 */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 text-left">
                  <th className="py-3 px-4">標的</th>
                  <th className="py-3 px-4">類別</th>
                  <th className="py-3 px-4">Tick Size</th>
                  <th className="py-3 px-4">Tick Value</th>
                  <th className="py-3 px-4">貨幣</th>
                  <th className="py-3 px-4">手續費/口</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {symbols.map(s => (
                  <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    {editingSymbol?.id === s.id ? (
                      <>
                        <td className="py-2 px-4">
                          <input value={editingSymbol.name}
                            onChange={e => setEditingSymbol({...editingSymbol, name: e.target.value})}
                            className="input w-24" />
                        </td>
                        <td className="py-2 px-4">
                          <select value={editingSymbol.category}
                            onChange={e => setEditingSymbol({...editingSymbol, category: e.target.value})}
                            className="input">
                            {categories.map(c => <option key={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className="py-2 px-4">
                          <input value={editingSymbol.tick_size} type="number" step="0.01"
                            onChange={e => setEditingSymbol({...editingSymbol, tick_size: parseFloat(e.target.value)})}
                            className="input w-24" />
                        </td>
                        <td className="py-2 px-4">
                          <input value={editingSymbol.tick_value} type="number" step="0.01"
                            onChange={e => setEditingSymbol({...editingSymbol, tick_value: parseFloat(e.target.value)})}
                            className="input w-24" />
                        </td>
                        <td className="py-2 px-4">
                          <select value={editingSymbol.currency}
                            onChange={e => setEditingSymbol({...editingSymbol, currency: e.target.value})}
                            className="input">
                            <option>USD</option><option>TWD</option><option>USDT</option>
                          </select>
                        </td>
                        <td className="py-2 px-4">
                          <input value={editingSymbol.default_fee} type="number" step="0.01"
                            onChange={e => setEditingSymbol({...editingSymbol, default_fee: parseFloat(e.target.value)})}
                            className="input w-24" />
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex gap-2">
                            <button onClick={updateSymbol}
                              className="text-green-400 hover:text-green-300 text-xs px-2 py-1 rounded hover:bg-green-950">
                              儲存
                            </button>
                            <button onClick={() => setEditingSymbol(null)}
                              className="text-gray-400 hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-700">
                              取消
                            </button>
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
                            <button onClick={() => setEditingSymbol(s)}
                              className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded hover:bg-blue-950">
                              編輯
                            </button>
                            <button onClick={() => deleteSymbol(s.id)}
                              className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-950">
                              刪除
                            </button>
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

      {/* 類別設定 */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">新增類別</h3>
            <div className="flex gap-3">
              <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                placeholder="類別名稱" className="input flex-1" />
              <button onClick={addCategory}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                新增
              </button>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="space-y-2">
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-sm">{c.name}</span>
                  <button onClick={() => deleteCategory(c.id)}
                    className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-950">
                    刪除
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}