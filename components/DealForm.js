import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import { DEAL_STATUSES, fmtDate, invoiceLastDue } from '../lib/utils'
import { addDays } from 'date-fns'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'INR', 'CNY']

const emptyLine = () => ({
  _id: Date.now() + Math.random(),
  category: '', size: '', grade: '', quantity: '',
  invoiceRatePerCBM: '', totalRatePerCBM: '', supplierRatePerCBM: '',
})

function calcLine(l) {
  const qty  = Number(l.quantity) || 0
  const inv  = Number(l.invoiceRatePerCBM) || 0
  const tot  = Number(l.totalRatePerCBM) || 0
  const sup  = Number(l.supplierRatePerCBM) || 0
  const top  = tot - inv
  return {
    topRatePerCBM:  top,
    invoiceAmount:  inv * qty,
    topAmount:      top * qty,
    supplierTotal:  sup * qty,
  }
}

export default function DealForm({ initialData = {}, mode = 'create' }) {
  const router = useRouter()
  const [form, setForm] = useState({
    dealId: '', supplier: '', buyer: '', currency: 'USD',
    dealStatus: 'Draft', notes: '',
    eta: '', freeDays: '', topDueDate: '',
    supplierClaimShare: '', myClaimShare: '',
    ...initialData,
    eta:        initialData.eta        ? initialData.eta.slice(0, 10) : '',
    topDueDate: initialData.topDueDate ? initialData.topDueDate.slice(0, 10) : '',
  })
  const [products, setProducts] = useState(
    initialData.products?.length
      ? initialData.products.map(p => ({ ...p, _id: p._id || Date.now() + Math.random() }))
      : [emptyLine()]
  )
  const [parties, setParties] = useState([])
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get('/api/parties').then(r => setParties(r.data))
    axios.get('/api/categories').then(r => setCategories(r.data))
  }, [])

  const buyers    = parties.filter(p => ['buyer', 'both'].includes(p.type))
  const suppliers = parties.filter(p => ['supplier', 'both'].includes(p.type))

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // Product line helpers
  const setLine = (idx, key, val) => {
    setProducts(prev => prev.map((l, i) => i === idx ? { ...l, [key]: val } : l))
  }
  const addLine    = () => setProducts(prev => [...prev, emptyLine()])
  const removeLine = (idx) => setProducts(prev => prev.filter((_, i) => i !== idx))

  // Get sizes/grades for selected category
  const getCat = (name) => categories.find(c => c.name === name)

  // Totals
  const totals = products.reduce((acc, l) => {
    const c = calcLine(l)
    acc.invoiceAmount  += c.invoiceAmount
    acc.topAmount      += c.topAmount
    acc.supplierTotal  += c.supplierTotal
    acc.totalExpected  += c.invoiceAmount + c.topAmount
    return acc
  }, { invoiceAmount: 0, topAmount: 0, supplierTotal: 0, totalExpected: 0 })

  const netCommission = totals.topAmount - (Number(form.myClaimShare) || 0)

  // ETA due dates preview
  const etaDate     = form.eta ? new Date(form.eta) : null
  const lastDueDate = etaDate && form.freeDays
    ? addDays(etaDate, Number(form.freeDays))
    : etaDate

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        freeDays: Number(form.freeDays) || 0,
        supplierClaimShare: Number(form.supplierClaimShare) || 0,
        myClaimShare: Number(form.myClaimShare) || 0,
        products: products.map(l => ({
          ...l,
          quantity:           Number(l.quantity) || 0,
          invoiceRatePerCBM:  Number(l.invoiceRatePerCBM) || 0,
          totalRatePerCBM:    Number(l.totalRatePerCBM) || 0,
          supplierRatePerCBM: Number(l.supplierRatePerCBM) || 0,
        })),
      }
      if (mode === 'create') {
        const res = await axios.post('/api/deals', payload)
        router.push(`/deals/${res.data._id}`)
      } else {
        await axios.put(`/api/deals/${initialData._id}`, payload)
        router.push(`/deals/${initialData._id}`)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Deal Info */}
      <div className="card">
        <div className="section-title mb-4">Deal Information</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Deal ID</label>
            <input className="input" placeholder="Auto-generated if blank" value={form.dealId}
              onChange={e => set('dealId', e.target.value)} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.dealStatus} onChange={e => set('dealStatus', e.target.value)}>
              {DEAL_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="card">
        <div className="section-title mb-4">Parties</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Supplier *</label>
            <select className="input" value={form.supplier} onChange={e => set('supplier', e.target.value)} required>
              <option value="">Select Supplier</option>
              {suppliers.map(p => <option key={p._id} value={p._id}>{p.name} ({p.country})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Buyer *</label>
            <select className="input" value={form.buyer} onChange={e => set('buyer', e.target.value)} required>
              <option value="">Select Buyer</option>
              {buyers.map(p => <option key={p._id} value={p._id}>{p.name} ({p.country})</option>)}
            </select>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          <a href="/parties/new" target="_blank" className="text-brand-blue hover:underline">+ Add new party</a>
        </div>
      </div>

      {/* Timeline */}
      <div className="card">
        <div className="section-title mb-4">Timeline</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">ETA of Shipment *</label>
            <input className="input" type="date" value={form.eta}
              onChange={e => set('eta', e.target.value)} required />
            <div className="text-xs text-gray-500 mt-1">Invoice 1st due date = ETA</div>
          </div>
          <div>
            <label className="label">Free Days</label>
            <input className="input" type="number" min="0" placeholder="0" value={form.freeDays}
              onChange={e => set('freeDays', e.target.value)} />
            <div className="text-xs text-gray-500 mt-1">Last urgent = ETA + free days</div>
          </div>
          <div>
            <label className="label">Invoice Last Urgent Due</label>
            <div className="input bg-dark-bg text-yellow-400 font-mono text-sm flex items-center">
              {lastDueDate ? lastDueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '— set ETA'}
            </div>
          </div>
          <div>
            <label className="label">Top Amount Due Date</label>
            <input className="input" type="date" value={form.topDueDate}
              onChange={e => set('topDueDate', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Product Lines */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title">Product Lines</div>
          <button type="button" onClick={addLine}
            className="text-xs px-3 py-1.5 bg-brand-blue/20 text-brand-blue rounded-lg hover:bg-brand-blue/30 transition-colors">
            + Add Line
          </button>
        </div>

        <div className="space-y-4">
          {products.map((line, idx) => {
            const calc    = calcLine(line)
            const cat     = getCat(line.category)
            return (
              <div key={line._id} className="border border-dark-border rounded-lg p-4 relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Line {idx + 1}</span>
                  {products.length > 1 && (
                    <button type="button" onClick={() => removeLine(idx)}
                      className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  )}
                </div>

                {/* Category / Size / Grade / Qty */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="label text-xs">Category</label>
                    <select className="input text-sm" value={line.category} onChange={e => setLine(idx, 'category', e.target.value)}>
                      <option value="">Select</option>
                      {categories.map(c => <option key={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Size</label>
                    {cat?.sizes?.length ? (
                      <select className="input text-sm" value={line.size} onChange={e => setLine(idx, 'size', e.target.value)}>
                        <option value="">Select</option>
                        {cat.sizes.map(s => <option key={s}>{s}</option>)}
                        <option value="__custom">Custom...</option>
                      </select>
                    ) : (
                      <input className="input text-sm" placeholder="e.g. 25x200x3000" value={line.size}
                        onChange={e => setLine(idx, 'size', e.target.value)} />
                    )}
                    {line.size === '__custom' && (
                      <input className="input text-sm mt-1" placeholder="Enter size" autoFocus
                        onChange={e => setLine(idx, 'size', e.target.value)} />
                    )}
                  </div>
                  <div>
                    <label className="label text-xs">Grade</label>
                    {cat?.grades?.length ? (
                      <select className="input text-sm" value={line.grade} onChange={e => setLine(idx, 'grade', e.target.value)}>
                        <option value="">Select</option>
                        {cat.grades.map(g => <option key={g}>{g}</option>)}
                        <option value="__custom">Custom...</option>
                      </select>
                    ) : (
                      <input className="input text-sm" placeholder="e.g. Grade A" value={line.grade}
                        onChange={e => setLine(idx, 'grade', e.target.value)} />
                    )}
                    {line.grade === '__custom' && (
                      <input className="input text-sm mt-1" placeholder="Enter grade" autoFocus
                        onChange={e => setLine(idx, 'grade', e.target.value)} />
                    )}
                  </div>
                  <div>
                    <label className="label text-xs">Quantity (CBM)</label>
                    <input className="input text-sm" type="number" step="0.01" placeholder="0.00" value={line.quantity}
                      onChange={e => setLine(idx, 'quantity', e.target.value)} />
                  </div>
                </div>

                {/* Rates */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="label text-xs">Invoice Rate / CBM ({form.currency})</label>
                    <input className="input text-sm" type="number" step="0.01" placeholder="0.00" value={line.invoiceRatePerCBM}
                      onChange={e => setLine(idx, 'invoiceRatePerCBM', e.target.value)} />
                    <div className="text-xs text-gray-600 mt-0.5">On invoice document</div>
                  </div>
                  <div>
                    <label className="label text-xs">Total Rate / CBM ({form.currency})</label>
                    <input className="input text-sm" type="number" step="0.01" placeholder="0.00" value={line.totalRatePerCBM}
                      onChange={e => setLine(idx, 'totalRatePerCBM', e.target.value)} />
                    <div className="text-xs text-gray-600 mt-0.5">Invoice + top component</div>
                  </div>
                  <div>
                    <label className="label text-xs">Supplier Rate / CBM ({form.currency})</label>
                    <input className="input text-sm" type="number" step="0.01" placeholder="0.00" value={line.supplierRatePerCBM}
                      onChange={e => setLine(idx, 'supplierRatePerCBM', e.target.value)} />
                    <div className="text-xs text-gray-600 mt-0.5">What you owe supplier</div>
                  </div>
                </div>

                {/* Calculated preview */}
                {(Number(line.quantity) > 0 || Number(line.invoiceRatePerCBM) > 0) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-dark-surface rounded-lg text-xs">
                    <div>
                      <div className="text-gray-500">Top / CBM</div>
                      <div className="font-mono text-yellow-400">{form.currency} {calc.topRatePerCBM.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Invoice Amount</div>
                      <div className="font-mono text-white">{form.currency} {calc.invoiceAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Top Amount</div>
                      <div className="font-mono text-yellow-400">{form.currency} {calc.topAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Supplier Total</div>
                      <div className="font-mono text-purple-400">{form.currency} {calc.supplierTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Deal Totals */}
        <div className="mt-4 p-4 bg-dark-bg rounded-lg border border-dark-border">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Deal Totals</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Total Invoice</div>
              <div className="font-mono text-white font-semibold">{form.currency} {totals.invoiceAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Total Top (Commission)</div>
              <div className="font-mono text-yellow-400 font-semibold">{form.currency} {totals.topAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Total Supplier Payable</div>
              <div className="font-mono text-purple-400 font-semibold">{form.currency} {totals.supplierTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Total Expected</div>
              <div className="font-mono text-emerald-400 font-semibold">{form.currency} {totals.totalExpected.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Claims Section — shown when status is Had Claim */}
      {form.dealStatus === 'Had Claim' && (
        <div className="card border border-red-800/40">
          <div className="section-title mb-1 text-red-400">Claim Details</div>
          <div className="text-xs text-gray-500 mb-4">
            Gross commission: {form.currency} {totals.topAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Supplier's Claim Share ({form.currency})</label>
              <input className="input" type="number" step="0.01" placeholder="0.00" value={form.supplierClaimShare}
                onChange={e => set('supplierClaimShare', e.target.value)} />
              <div className="text-xs text-gray-600 mt-1">Supplier bears this portion</div>
            </div>
            <div>
              <label className="label">My Claim Share ({form.currency})</label>
              <input className="input border-red-800/50" type="number" step="0.01" placeholder="0.00" value={form.myClaimShare}
                onChange={e => set('myClaimShare', e.target.value)} />
              <div className="text-xs text-gray-600 mt-1">Your loss — deducted from commission</div>
            </div>
            <div>
              <label className="label">Net Commission ({form.currency})</label>
              <div className={`input bg-dark-bg font-mono text-sm flex items-center ${netCommission < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {netCommission < 0 ? '−' : ''}{form.currency} {Math.abs(netCommission).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                {netCommission < 0 && <span className="ml-2 text-xs text-red-500">(Loss)</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="card">
        <div className="section-title mb-4">Notes</div>
        <textarea className="input" rows={3} placeholder="Any additional notes..." value={form.notes}
          onChange={e => set('notes', e.target.value)} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="submit" className="btn-primary px-6 py-2.5" disabled={saving}>
          {saving ? 'Saving...' : mode === 'create' ? 'Create Deal' : 'Save Changes'}
        </button>
        <button type="button" className="btn-secondary px-6" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  )
}
