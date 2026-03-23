import { getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../../components/Layout'
import { DealStatusBadge, PaymentStatusBadge } from '../../../components/DealStatusBadge'
import { formatCurrency, fmtDate, daysFromToday } from '../../../lib/utils'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

const PAYMENT_TYPES = ['partial', 'invoice', 'top', 'commission', 'final_settlement', 'advance', 'other']
const PAYMENT_MODES = ['bank_transfer', 'cash', 'cheque', 'other']

export default function DealDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '', type: 'partial', direction: 'received', mode: 'bank_transfer',
    paymentDate: new Date().toISOString().slice(0, 10), status: 'paid',
    reference: '', remarks: '', isCommission: false,
  })
  const [savingPayment, setSavingPayment] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    const res = await axios.get(`/api/deals/${id}`)
    setData(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleDeleteDeal = async () => {
    if (!confirm('Delete this deal and all its payments?')) return
    await axios.delete(`/api/deals/${id}`)
    router.push('/deals')
  }

  const handleAddPayment = async (e) => {
    e.preventDefault()
    setSavingPayment(true)
    try {
      await axios.post('/api/payments', {
        ...paymentForm,
        deal: id,
        party: data.deal.buyer,
        currency: data.deal.currency,
        isCommission: paymentForm.type === 'commission',
      })
      setShowPaymentForm(false)
      setPaymentForm({ amount: '', type: 'partial', direction: 'received', mode: 'bank_transfer', paymentDate: new Date().toISOString().slice(0, 10), status: 'paid', reference: '', remarks: '', isCommission: false })
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add payment')
    }
    setSavingPayment(false)
  }

  const handleDeletePayment = async (payId) => {
    if (!confirm('Remove this payment?')) return
    await axios.delete(`/api/payments/${payId}`)
    await load()
  }

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div></Layout>
  if (!data) return <Layout><div className="text-red-400">Deal not found</div></Layout>

  const { deal, payments } = data
  const daysUntil = deal.dueDate ? -daysFromToday(deal.dueDate) : null
  const isOverdue = daysUntil !== null && daysUntil < 0
  const pctReceived = deal.totalExpected > 0 ? (deal.totalReceived / deal.totalExpected) * 100 : 0

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-brand-blue text-lg font-bold">{deal.dealId}</span>
            <DealStatusBadge status={deal.dealStatus} />
            {isOverdue && <span className="badge-red">OVERDUE</span>}
          </div>
          <div className="text-gray-400 text-sm">{deal.product} · {deal.productCategory}</div>
        </div>
        <div className="flex gap-2">
          <Link href={`/deals/${id}/edit`} className="btn-secondary text-xs">Edit Deal</Link>
          <button onClick={handleDeleteDeal} className="btn-danger text-xs">Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Deal info */}
        <div className="lg:col-span-2 space-y-5">

          {/* Parties */}
          <div className="card">
            <div className="section-title mb-4">Parties</div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Supplier</div>
                <Link href={`/parties/${deal.supplier?._id}`} className="text-brand-blue hover:underline font-medium">{deal.supplier?.name}</Link>
                <div className="text-xs text-gray-500 mt-0.5">{deal.supplier?.country} · {deal.supplier?.city}</div>
                <div className="text-xs text-gray-500">{deal.supplier?.email}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Buyer</div>
                <Link href={`/parties/${deal.buyer?._id}`} className="text-brand-blue hover:underline font-medium">{deal.buyer?.name}</Link>
                <div className="text-xs text-gray-500 mt-0.5">{deal.buyer?.country} · {deal.buyer?.city}</div>
                <div className="text-xs text-gray-500">{deal.buyer?.email}</div>
                {deal.buyer?.riskScore > 0 && (
                  <div className="mt-1">
                    <span className={`text-xs ${deal.buyer.riskScore >= 75 ? 'text-red-400' : deal.buyer.riskScore >= 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      Risk Score: {deal.buyer.riskScore}/100
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product */}
          <div className="card">
            <div className="section-title mb-4">Product Details</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><div className="label">Product</div><div className="text-gray-200">{deal.product}</div></div>
              <div><div className="label">Category</div><div className="text-gray-200">{deal.productCategory || '—'}</div></div>
              <div><div className="label">Quantity</div><div className="text-gray-200 font-mono">{deal.quantity} {deal.unit}</div></div>
              <div className="col-span-3"><div className="label">Specification</div><div className="text-gray-200">{deal.qualitySpec || '—'}</div></div>
            </div>
          </div>

          {/* Financial */}
          <div className="card">
            <div className="section-title mb-4">Financial Summary</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="label">Invoice Amount</div>
                <div className="font-mono text-white">{formatCurrency(deal.invoiceAmount, deal.currency)}</div>
              </div>
              <div>
                <div className="label">Top Amount</div>
                <div className="font-mono text-yellow-400">{formatCurrency(deal.topAmount, deal.currency)}</div>
              </div>
              <div>
                <div className="label">Total Expected</div>
                <div className="font-mono text-white font-semibold">{formatCurrency(deal.totalExpected, deal.currency)}</div>
              </div>
              <div>
                <div className="label">Commission</div>
                <div className="font-mono text-purple-400">{formatCurrency(deal.commissionAmount, deal.currency)}</div>
              </div>
            </div>

            {/* Payment progress */}
            <div className="border-t border-dark-border pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Payment received</span>
                <span className="font-mono text-emerald-400">{formatCurrency(deal.totalReceived, deal.currency)}</span>
              </div>
              <div className="h-2 bg-dark-border rounded-full overflow-hidden mb-2">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, pctReceived)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{pctReceived.toFixed(1)}% received</span>
                <span>Outstanding: {formatCurrency(deal.buyerOutstanding, deal.currency)}</span>
              </div>
            </div>

            {/* Commission tracking */}
            <div className="border-t border-dark-border pt-4 mt-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="label">Commission Expected</div>
                  <div className="font-mono text-purple-400">{formatCurrency(deal.commissionAmount, deal.currency)}</div>
                </div>
                <div>
                  <div className="label">Commission Received</div>
                  <div className="font-mono text-emerald-400">{formatCurrency(deal.commissionReceived, deal.currency)}</div>
                </div>
                <div>
                  <div className="label">Commission Pending</div>
                  <div className="font-mono text-yellow-400">{formatCurrency(deal.commissionPending, deal.currency)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="card">
            <div className="section-title mb-4">Timeline</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><div className="label">Shipment Date</div><div className="text-gray-200">{fmtDate(deal.shipmentDate)}</div></div>
              <div><div className="label">Acceptance Date</div><div className="text-gray-200">{fmtDate(deal.acceptanceDate)}</div></div>
              <div><div className="label">DA Tenor</div><div className="text-gray-200 font-mono">{deal.daTenor} days</div></div>
              <div>
                <div className="label">Due Date</div>
                <div className={`font-semibold ${isOverdue ? 'text-red-400' : 'text-yellow-400'}`}>
                  {fmtDate(deal.dueDate)}
                  {isOverdue && <div className="text-xs text-red-500 mt-0.5">{Math.abs(daysUntil)}d overdue</div>}
                  {!isOverdue && daysUntil !== null && <div className="text-xs text-gray-500 mt-0.5">{daysUntil}d remaining</div>}
                </div>
              </div>
            </div>
          </div>

          {deal.notes && (
            <div className="card">
              <div className="section-title mb-3">Notes</div>
              <p className="text-gray-300 text-sm leading-relaxed">{deal.notes}</p>
            </div>
          )}
        </div>

        {/* Right: Payments */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="section-title">Payments</div>
              <button onClick={() => setShowPaymentForm(!showPaymentForm)} className="btn-primary text-xs py-1.5">
                {showPaymentForm ? 'Cancel' : '+ Add Payment'}
              </button>
            </div>

            {/* Add Payment Form */}
            {showPaymentForm && (
              <form onSubmit={handleAddPayment} className="mb-4 p-3 bg-dark-surface rounded-lg border border-dark-border space-y-3">
                <div>
                  <label className="label">Amount ({deal.currency})</label>
                  <input className="input" type="number" step="0.01" required value={paymentForm.amount}
                    onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={paymentForm.type}
                    onChange={e => setPaymentForm(p => ({ ...p, type: e.target.value }))}>
                    {PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={paymentForm.status}
                    onChange={e => setPaymentForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
                <div>
                  <label className="label">Payment Date</label>
                  <input className="input" type="date" value={paymentForm.paymentDate}
                    onChange={e => setPaymentForm(p => ({ ...p, paymentDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Mode</label>
                  <select className="input" value={paymentForm.mode}
                    onChange={e => setPaymentForm(p => ({ ...p, mode: e.target.value }))}>
                    {PAYMENT_MODES.map(m => <option key={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Reference</label>
                  <input className="input" placeholder="TT number / bank ref" value={paymentForm.reference}
                    onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Remarks</label>
                  <input className="input" placeholder="Notes..." value={paymentForm.remarks}
                    onChange={e => setPaymentForm(p => ({ ...p, remarks: e.target.value }))} />
                </div>
                <button type="submit" className="btn-success w-full text-xs py-2" disabled={savingPayment}>
                  {savingPayment ? 'Saving...' : 'Record Payment'}
                </button>
              </form>
            )}

            {/* Payment list */}
            <div className="space-y-2">
              {payments.length === 0 && <div className="text-xs text-gray-500 text-center py-4">No payments recorded</div>}
              {payments.map(p => (
                <div key={p._id} className={`p-3 rounded-lg border text-xs ${p.status === 'paid' ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-dark-surface border-dark-border'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-mono font-semibold text-sm text-white">{formatCurrency(p.amount, p.currency || deal.currency)}</div>
                    <div className="flex gap-1">
                      <span className={p.status === 'paid' ? 'badge-green' : 'badge-yellow'}>{p.status}</span>
                      <button onClick={() => handleDeletePayment(p._id)} className="text-red-500 hover:text-red-300 ml-1">×</button>
                    </div>
                  </div>
                  <div className="text-gray-500">{p.type} · {p.mode?.replace('_', ' ')}</div>
                  {p.paymentDate && <div className="text-gray-500">{fmtDate(p.paymentDate)}</div>}
                  {p.reference && <div className="text-gray-600">Ref: {p.reference}</div>}
                  {p.remarks && <div className="text-gray-600 mt-1">{p.remarks}</div>}
                  {p.isCommission && <span className="badge-purple mt-1 inline-block">Commission</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="card">
            <div className="section-title mb-3">Quick Summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Expected</span>
                <span className="font-mono text-white">{formatCurrency(deal.totalExpected, deal.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Received</span>
                <span className="font-mono text-emerald-400">{formatCurrency(deal.totalReceived, deal.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-dark-border pt-2">
                <span className="text-gray-300 font-medium">Outstanding</span>
                <span className={`font-mono font-semibold ${deal.buyerOutstanding > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {formatCurrency(deal.buyerOutstanding, deal.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
