import { getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

const TYPES = ['partial', 'invoice', 'top', 'commission', 'final_settlement', 'advance', 'other']
const MODES = ['bank_transfer', 'cash', 'cheque', 'other']
const DIRECTIONS = ['received', 'paid_out']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'INR', 'CNY']

export default function NewPaymentPage() {
  const router = useRouter()
  const [deals, setDeals] = useState([])
  const [parties, setParties] = useState([])
  const [form, setForm] = useState({
    deal: router.query.deal || '',
    party: '', amount: '', currency: 'USD', type: 'partial',
    direction: 'received', mode: 'bank_transfer',
    paymentDate: new Date().toISOString().slice(0, 10),
    dueDate: '', status: 'paid', reference: '', remarks: '', isCommission: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      axios.get('/api/deals', { params: { limit: 100 } }),
      axios.get('/api/parties'),
    ]).then(([d, p]) => {
      setDeals(d.data.deals)
      setParties(p.data)

      // If deal pre-selected, pre-fill party
      if (router.query.deal) {
        const deal = d.data.deals.find(x => x._id === router.query.deal)
        if (deal) setForm(prev => ({ ...prev, party: deal.buyer?._id || '', currency: deal.currency }))
      }
    })
  }, [])

  // When deal changes, auto-fill currency
  const handleDealChange = (dealId) => {
    const deal = deals.find(d => d._id === dealId)
    setForm(prev => ({
      ...prev,
      deal: dealId,
      currency: deal?.currency || 'USD',
      party: deal?.buyer?._id || prev.party,
    }))
  }

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = { ...form, isCommission: form.type === 'commission' }
      await axios.post('/api/payments', data)
      if (form.deal) {
        router.push(`/deals/${form.deal}`)
      } else {
        router.push('/payments')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save payment')
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="page-title">Record Payment</h1>
          <p className="text-gray-500 text-sm mt-1">Add a payment against a deal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}

          <div className="card">
            <div className="section-title mb-4">Link to Deal</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Deal</label>
                <select className="input" value={form.deal} onChange={e => handleDealChange(e.target.value)}>
                  <option value="">Select Deal</option>
                  {deals.map(d => (
                    <option key={d._id} value={d._id}>{d.dealId} – {d.buyer?.name} / {d.product}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Party</label>
                <select className="input" value={form.party} onChange={e => set('party', e.target.value)} required>
                  <option value="">Select Party</option>
                  {parties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-title mb-4">Payment Details</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Amount *</label>
                <input className="input" type="number" step="0.01" required value={form.amount}
                  onChange={e => set('amount', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                  {TYPES.map(t => <option key={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Direction</label>
                <select className="input" value={form.direction} onChange={e => set('direction', e.target.value)}>
                  {DIRECTIONS.map(d => <option key={d} value={d}>{d === 'received' ? '↓ Received from buyer' : '↑ Paid out to supplier'}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <div>
                <label className="label">Payment Mode</label>
                <select className="input" value={form.mode} onChange={e => set('mode', e.target.value)}>
                  {MODES.map(m => <option key={m}>{m.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Payment Date</label>
                <input className="input" type="date" value={form.paymentDate}
                  onChange={e => set('paymentDate', e.target.value)} />
              </div>
              <div>
                <label className="label">Due Date (if pending)</label>
                <input className="input" type="date" value={form.dueDate}
                  onChange={e => set('dueDate', e.target.value)} />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Reference Number</label>
              <input className="input" placeholder="TT number, bank reference, cheque number..." value={form.reference}
                onChange={e => set('reference', e.target.value)} />
            </div>
            <div className="mt-4">
              <label className="label">Remarks</label>
              <textarea className="input" rows={2} placeholder="Any notes..." value={form.remarks}
                onChange={e => set('remarks', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-primary px-6 py-2.5" disabled={saving}>
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
            <button type="button" className="btn-secondary px-6" onClick={() => router.back()}>Cancel</button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
