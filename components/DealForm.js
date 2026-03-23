import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

const DEAL_STATUSES = ['Draft', 'Confirmed', 'Shipped', 'Accepted', 'Payment Due', 'Partially Paid', 'Completed', 'Overdue', 'Cancelled']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'INR', 'CNY']
const TENORS = [30, 45, 60, 90, 120, 150, 180]
const CATEGORIES = ['Timber', 'Steel', 'Agri Commodity', 'Chemicals', 'Plastics', 'Minerals', 'Textiles', 'Other']

export default function DealForm({ initialData = {}, mode = 'create' }) {
  const router = useRouter()
  const [form, setForm] = useState({
    dealId: '', supplier: '', buyer: '', product: '', productCategory: '',
    quantity: '', unit: 'CBM', qualitySpec: '',
    invoiceAmount: '', topAmount: '', commissionAmount: '', currency: 'USD',
    shipmentDate: '', acceptanceDate: '', daTenor: 90,
    dealStatus: 'Draft', notes: '',
    ...initialData,
    // Format dates for input
    shipmentDate: initialData.shipmentDate ? initialData.shipmentDate.slice(0, 10) : '',
    acceptanceDate: initialData.acceptanceDate ? initialData.acceptanceDate.slice(0, 10) : '',
  })
  const [parties, setParties] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get('/api/parties').then(r => setParties(r.data))
  }, [])

  const buyers = parties.filter(p => ['buyer', 'both'].includes(p.type))
  const suppliers = parties.filter(p => ['supplier', 'both'].includes(p.type))

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // Auto-calculate due date preview
  const dueDatePreview = () => {
    if (!form.acceptanceDate || !form.daTenor) return null
    const d = new Date(form.acceptanceDate)
    d.setDate(d.getDate() + Number(form.daTenor))
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const totalExpected = (Number(form.invoiceAmount) || 0) + (Number(form.topAmount) || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (mode === 'create') {
        const res = await axios.post('/api/deals', form)
        router.push(`/deals/${res.data._id}`)
      } else {
        await axios.put(`/api/deals/${initialData._id}`, form)
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

      {/* Basic Info */}
      <div className="card">
        <div className="section-title mb-4">Deal Information</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Deal ID</label>
            <input className="input" placeholder="Auto-generated if blank" value={form.dealId}
              onChange={e => set('dealId', e.target.value)} />
          </div>
          <div>
            <label className="label">Deal Status</label>
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
        <div className="mt-3 text-xs text-gray-500">
          Party not listed? <a href="/parties/new" target="_blank" className="text-brand-blue hover:underline">Add new party →</a>
        </div>
      </div>

      {/* Product */}
      <div className="card">
        <div className="section-title mb-4">Product Details</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Product Name *</label>
            <input className="input" placeholder="e.g. Teak Wood Logs" value={form.product}
              onChange={e => set('product', e.target.value)} required />
          </div>
          <div>
            <label className="label">Product Category</label>
            <select className="input" value={form.productCategory} onChange={e => set('productCategory', e.target.value)}>
              <option value="">Select Category</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quantity (CBM)</label>
            <input className="input" type="number" placeholder="0" value={form.quantity}
              onChange={e => set('quantity', e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Quality / Specification / Size</label>
          <input className="input" placeholder="e.g. Grade A, 30-50cm diameter, ISI marked" value={form.qualitySpec}
            onChange={e => set('qualitySpec', e.target.value)} />
        </div>
      </div>

      {/* Financials */}
      <div className="card">
        <div className="section-title mb-4">Financial Details</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Invoice Amount ({form.currency}) *</label>
            <input className="input" type="number" step="0.01" placeholder="0.00" value={form.invoiceAmount}
              onChange={e => set('invoiceAmount', e.target.value)} required />
          </div>
          <div>
            <label className="label">Top / Cash Amount ({form.currency})</label>
            <input className="input" type="number" step="0.01" placeholder="0.00" value={form.topAmount}
              onChange={e => set('topAmount', e.target.value)} />
            <div className="text-xs text-gray-600 mt-1">The unofficial cash component</div>
          </div>
          <div>
            <label className="label">Our Commission ({form.currency})</label>
            <input className="input" type="number" step="0.01" placeholder="0.00" value={form.commissionAmount}
              onChange={e => set('commissionAmount', e.target.value)} />
            <div className="text-xs text-gray-600 mt-1">Usually included in top amount</div>
          </div>
        </div>

        {/* Summary */}
        {totalExpected > 0 && (
          <div className="mt-4 p-3 bg-dark-surface rounded-lg border border-dark-border">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500 text-xs">Invoice</div>
                <div className="font-mono text-white">{form.currency} {Number(form.invoiceAmount || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Top Amount</div>
                <div className="font-mono text-yellow-400">{form.currency} {Number(form.topAmount || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Total Expected</div>
                <div className="font-mono text-emerald-400 font-semibold">{form.currency} {totalExpected.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="card">
        <div className="section-title mb-4">Dates & DA Tenor</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Shipment Date</label>
            <input className="input" type="date" value={form.shipmentDate}
              onChange={e => set('shipmentDate', e.target.value)} />
          </div>
          <div>
            <label className="label">Acceptance Date</label>
            <input className="input" type="date" value={form.acceptanceDate}
              onChange={e => set('acceptanceDate', e.target.value)} />
          </div>
          <div>
            <label className="label">DA Tenor (days)</label>
            <select className="input" value={form.daTenor} onChange={e => set('daTenor', e.target.value)}>
              {TENORS.map(t => <option key={t} value={t}>{t} days</option>)}
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="label">Calculated Due Date</label>
            <div className="input bg-dark-bg text-yellow-400 font-mono text-sm flex items-center">
              {dueDatePreview() || '— (set acceptance date)'}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="card">
        <div className="section-title mb-4">Notes</div>
        <textarea className="input" rows={3} placeholder="Any additional notes, instructions, or remarks..."
          value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="submit" className="btn-primary px-6 py-2.5" disabled={saving}>
          {saving ? 'Saving...' : mode === 'create' ? 'Create Deal' : 'Save Changes'}
        </button>
        <button type="button" className="btn-secondary px-6" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  )
}
