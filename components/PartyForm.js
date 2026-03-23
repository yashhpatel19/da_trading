import { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

const PARTY_TYPES = ['buyer', 'supplier', 'both']

export default function PartyForm({ initialData = {}, mode = 'create' }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', type: 'buyer', country: '', city: '', contactPerson: '',
    email: '', phone: '', address: '', bankDetails: '', notes: '',
    ...initialData,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (mode === 'create') {
        const res = await axios.post('/api/parties', form)
        router.push(`/parties/${res.data._id}`)
      } else {
        await axios.put(`/api/parties/${initialData._id}`, form)
        router.push(`/parties/${initialData._id}`)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save party')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}

      <div className="card">
        <div className="section-title mb-4">Party Information</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="label">Company Name *</label>
            <input className="input" placeholder="e.g. Mumbai Traders Pvt Ltd" value={form.name}
              onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Party Type *</label>
            <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
              {PARTY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label">Country</label>
            <input className="input" placeholder="e.g. India" value={form.country}
              onChange={e => set('country', e.target.value)} />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" placeholder="e.g. Mumbai" value={form.city}
              onChange={e => set('city', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title mb-4">Contact Details</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Contact Person</label>
            <input className="input" placeholder="Full name" value={form.contactPerson}
              onChange={e => set('contactPerson', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="contact@company.com" value={form.email}
              onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" placeholder="+91-22-12345678" value={form.phone}
              onChange={e => set('phone', e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Address</label>
          <textarea className="input" rows={2} placeholder="Full address..." value={form.address}
            onChange={e => set('address', e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="section-title mb-4">Bank & Notes</div>
        <div className="mb-4">
          <label className="label">Bank Details</label>
          <textarea className="input" rows={2} placeholder="Bank name, account number, SWIFT, IBAN..." value={form.bankDetails}
            onChange={e => set('bankDetails', e.target.value)} />
        </div>
        <div>
          <label className="label">Internal Notes</label>
          <textarea className="input" rows={2} placeholder="Any notes about this party..." value={form.notes}
            onChange={e => set('notes', e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary px-6 py-2.5" disabled={saving}>
          {saving ? 'Saving...' : mode === 'create' ? 'Add Party' : 'Save Changes'}
        </button>
        <button type="button" className="btn-secondary px-6" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  )
}
