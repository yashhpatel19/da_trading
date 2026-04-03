import { getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../../components/Layout'
import { DealStatusBadge } from '../../../components/DealStatusBadge'
import { formatCurrency, fmtDate, daysFromToday, isInvoiceOverdue, isInvoiceUrgent } from '../../../lib/utils'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

const PAYMENT_TYPES = ['invoice', 'top', 'commission', 'partial', 'final_settlement', 'advance', 'other']
const PAYMENT_MODES = ['bank_transfer', 'cash', 'cheque', 'other']

export default function DealDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '', type: 'invoice', direction: 'received', mode: 'bank_transfer',
    paymentDate: new Date().toISOString().slice(0, 10), status: 'paid',
    reference: '', remarks: '',
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
        party: data.deal.buyer._id || data.deal.buyer,
        currency: data.deal.currency,
        isCommission: paymentForm.type === 'commission' || paymentForm.type === 'top',
      })
      setShowPaymentForm(false)
      setPaymentForm({ amount: '', type: 'invoice', direction: 'received', mode: 'bank_transfer', paymentDate: new Date().toISOString().slice(0, 10), status: 'paid', reference: '', remarks: '' })
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

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-gray-500">Loading...</div></Layout>
  if (!data) return <Layout><div className="text-red-400">Deal not found</div></Layout>

  const { deal, payments } = data
  const pctReceived = deal.totalExpected > 0 ? (deal.totalReceived / deal.totalExpected) * 100 : 0
  const invoiceOverdue = isInvoiceOverdue(deal.eta, deal.freeDays)
  const invoiceUrgent  = isInvoiceUrgent(deal.eta, deal.freeDays)
  const topOverdue     = deal.topDueDate && new Date(deal.topDueDate) < new Date()

  // ETA + freeDays = last urgent due
  const lastInvoiceDue = deal.eta
    ? new Date(new Date(deal.eta).getTime() + (deal.freeDays || 0) * 86400000)
    : null

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-brand-blue text-lg font-bold">{deal.dealId}</span>
            <DealStatusBadge status={deal.dealStatus} />
            {invoiceOverdue && <span className="badge-red">INVOICE OVERDUE</span>}
            {deal.dealStatus === 'Had Claim' && <span className="badge-red">CLAIM</span>}
          </div>
          <div className="text-gray-400 text-sm">
            {deal.supplier?.name} → {deal.buyer?.name}
            {deal.currency && <span className="ml-2 text-gray-600">· {deal.currency}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/deals/${id}/edit`} className="btn-secondary text-xs">Edit</Link>
          <button onClick={handleDeleteDeal} className="text-xs px-3 py-1.5 bg-red-900/30 text-red-400 border border-red-800/50 rounded-lg hover:bg-red-900/50">Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Parties */}
          <div className="card">
            <div className="section-title mb-4">Parties</div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Supplier</div>
                <Link href={`/parties/${deal.supplier?._id}`} className="text-brand-blue hover:underline font-medium">{deal.supplier?.name}</Link>
                <div className="text-xs text-gray-500 mt-0.5">{deal.supplier?.country}{deal.supplier?.city ? ` · ${deal.supplier.city}` : ''}</div>
                <div className="text-xs text-gray-500">{deal.supplier?.email}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Buyer</div>
                <Link href={`/parties/${deal.buyer?._id}`} className="text-brand-blue hover:underline font-medium">{deal.buyer?.name}</Link>
                <div className="text-xs text-gray-500 mt-0.5">{deal.buyer?.country}{deal.buyer?.city ? ` · ${deal.buyer.city}` : ''}</div>
                {deal.buyer?.riskScore > 0 && (
                  <span className={`text-xs ${deal.buyer.riskScore >= 75 ? 'text-red-400' : deal.buyer.riskScore >= 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    Risk: {deal.buyer.riskScore}/100
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Product Lines */}
          {deal.products?.length > 0 && (
            <div className="card">
              <div className="section-title mb-4">Product Lines</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="th text-left">Category / Size / Grade</th>
                      <th className="th text-right">Qty (CBM)</th>
                      <th className="th text-right">Inv Rate</th>
                      <th className="th text-right">Top Rate</th>
                      <th className="th text-right">Invoice Amt</th>
                      <th className="th text-right">Top Amt</th>
                      <th className="th text-right">Supplier Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deal.products.map((p, i) => (
                      <tr key={i} className="border-b border-dark-border/50 hover:bg-dark-surface/50">
                        <td className="td">
                          <div className="font-medium text-gray-200">{p.category || '—'}</div>
                          <div className="text-gray-500">{[p.size, p.grade].filter(Boolean).join(' · ')}</div>
                        </td>
                        <td className="td text-right font-mono">{p.quantity}</td>
                        <td className="td text-right font-mono text-gray-300">{p.invoiceRatePerCBM?.toFixed(2)}</td>
                        <td className="td text-right font-mono text-yellow-400">{p.topRatePerCBM?.toFixed(2)}</td>
                        <td className="td text-right font-mono">{p.invoiceAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="td text-right font-mono text-yellow-400">{p.topAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="td text-right font-mono text-purple-400">{p.supplierTotal?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-dark-border">
                      <td className="td font-semibold text-gray-300">TOTALS</td>
                      <td className="td text-right font-mono font-semibold">
                        {deal.products.reduce((s, p) => s + (p.quantity || 0), 0).toFixed(2)}
                      </td>
                      <td className="td" />
                      <td className="td" />
                      <td className="td text-right font-mono font-semibold">{deal.currency} {deal.totalInvoiceAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="td text-right font-mono font-semibold text-yellow-400">{deal.currency} {deal.totalTopAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="td text-right font-mono font-semibold text-purple-400">{deal.currency} {deal.totalSupplierAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="card">
            <div className="section-title mb-4">Financial Summary</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div>
                <div className="label">Total Invoice</div>
                <div className="font-mono text-white">{formatCurrency(deal.totalInvoiceAmount, deal.currency)}</div>
              </div>
              <div>
                <div className="label">Total Top</div>
                <div className="font-mono text-yellow-400">{formatCurrency(deal.totalTopAmount, deal.currency)}</div>
              </div>
              <div>
                <div className="label">Supplier Payable</div>
                <div className="font-mono text-purple-400">{formatCurrency(deal.totalSupplierAmount, deal.currency)}</div>
              </div>
              <div>
                <div className="label">Total Expected</div>
                <div className="font-mono text-white font-semibold">{formatCurrency(deal.totalExpected, deal.currency)}</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="border-t border-dark-border pt-4">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-400">Payment received</span>
                <span className="font-mono text-emerald-400">{formatCurrency(deal.totalReceived, deal.currency)}</span>
              </div>
              <div className="h-2 bg-dark-border rounded-full overflow-hidden mb-1.5">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, pctReceived)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{pctReceived.toFixed(1)}% received</span>
                <span>Outstanding: {formatCurrency(deal.buyerOutstanding, deal.currency)}</span>
              </div>
            </div>

            {/* Commission */}
            <div className="border-t border-dark-border pt-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="label">Gross Commission</div>
                  <div className="font-mono text-yellow-400">{formatCurrency(deal.grossCommission, deal.currency)}</div>
                </div>
                {deal.dealStatus === 'Had Claim' && (
                  <div>
                    <div className="label">My Claim Share</div>
                    <div className="font-mono text-red-400">− {formatCurrency(deal.myClaimShare, deal.currency)}</div>
                  </div>
                )}
                <div>
                  <div className="label">Net Commission</div>
                  <div className={`font-mono font-semibold ${deal.netCommission < 0 ? 'text-red-400' : 'text-purple-400'}`}>
                    {formatCurrency(deal.netCommission, deal.currency)}
                    {deal.netCommission < 0 && <span className="text-xs ml-1">(Loss)</span>}
                  </div>
                </div>
                <div>
                  <div className="label">Commission Pending</div>
                  <div className="font-mono text-yellow-400">{formatCurrency(deal.commissionPending, deal.currency)}</div>
                </div>
              </div>
              {deal.dealStatus === 'Had Claim' && deal.supplierClaimShare > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Supplier claim share: {formatCurrency(deal.supplierClaimShare, deal.currency)}
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <div className="section-title mb-4">Timeline</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="label">ETA / Invoice 1st Due</div>
                <div className={`font-semibold ${invoiceUrgent ? 'text-yellow-400' : invoiceOverdue ? 'text-red-400' : 'text-gray-200'}`}>
                  {fmtDate(deal.eta)}
                </div>
              </div>
              <div>
                <div className="label">Free Days</div>
                <div className="font-mono text-gray-200">{deal.freeDays || 0} days</div>
              </div>
              <div>
                <div className="label">Invoice Last Urgent Due</div>
                <div className={`font-semibold ${invoiceOverdue ? 'text-red-400' : invoiceUrgent ? 'text-yellow-400' : 'text-gray-200'}`}>
                  {lastInvoiceDue ? fmtDate(lastInvoiceDue) : '—'}
                  {invoiceOverdue && <div className="text-xs text-red-500 mt-0.5">OVERDUE</div>}
                  {invoiceUrgent && <div className="text-xs text-yellow-500 mt-0.5">URGENT</div>}
                </div>
              </div>
              <div>
                <div className="label">Top Amount Due</div>
                <div className={`font-semibold ${topOverdue ? 'text-red-400' : 'text-gray-200'}`}>
                  {fmtDate(deal.topDueDate)}
                  {topOverdue && <div className="text-xs text-red-500 mt-0.5">OVERDUE</div>}
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

        {/* Right: Payments sidebar */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="section-title">Payments</div>
              <button onClick={() => setShowPaymentForm(!showPaymentForm)} className="btn-primary text-xs py-1.5">
                {showPaymentForm ? 'Cancel' : '+ Add'}
              </button>
            </div>

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
                  <label className="label">Date</label>
                  <input className="input" type="date" value={paymentForm.paymentDate}
                    onChange={e => setPaymentForm(p => ({ ...p, paymentDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Mode</label>
                  <select className="input" value={paymentForm.mode}
                    onChange={e => setPaymentForm(p => ({ ...p, mode: e.target.value }))}>
                    {PAYMENT_MODES.map(m => <option key={m}>{m.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Reference</label>
                  <input className="input" placeholder="TT / bank ref" value={paymentForm.reference}
                    onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Remarks</label>
                  <input className="input" placeholder="Notes..." value={paymentForm.remarks}
                    onChange={e => setPaymentForm(p => ({ ...p, remarks: e.target.value }))} />
                </div>
                <button type="submit" className="btn-primary w-full text-xs py-2" disabled={savingPayment}>
                  {savingPayment ? 'Saving...' : 'Record Payment'}
                </button>
              </form>
            )}

            <div className="space-y-2">
              {payments.length === 0 && <div className="text-xs text-gray-500 text-center py-4">No payments recorded</div>}
              {payments.map(p => (
                <div key={p._id} className={`p-3 rounded-lg border text-xs ${p.status === 'paid' ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-dark-surface border-dark-border'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-mono font-semibold text-sm text-white">{formatCurrency(p.amount, p.currency || deal.currency)}</div>
                    <div className="flex gap-1 items-center">
                      <span className={p.status === 'paid' ? 'badge-green' : 'badge-yellow'}>{p.status}</span>
                      <button onClick={() => handleDeletePayment(p._id)} className="text-red-500 hover:text-red-300">×</button>
                    </div>
                  </div>
                  <div className="text-gray-400">{p.type} · {p.mode?.replace(/_/g, ' ')}</div>
                  {p.paymentDate && <div className="text-gray-500">{fmtDate(p.paymentDate)}</div>}
                  {p.reference && <div className="text-gray-600">Ref: {p.reference}</div>}
                  {p.remarks && <div className="text-gray-600 mt-0.5">{p.remarks}</div>}
                  {p.isCommission && <span className="badge-purple mt-1 inline-block">Commission</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Quick summary */}
          <div className="card">
            <div className="section-title mb-3">Summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Invoice</span>
                <span className="font-mono">{formatCurrency(deal.totalInvoiceAmount, deal.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Top / Commission</span>
                <span className="font-mono text-yellow-400">{formatCurrency(deal.totalTopAmount, deal.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Received</span>
                <span className="font-mono text-emerald-400">{formatCurrency(deal.totalReceived, deal.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-dark-border pt-2">
                <span className="text-gray-300 font-medium">Outstanding</span>
                <span className={`font-mono font-semibold ${deal.buyerOutstanding > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {formatCurrency(deal.buyerOutstanding, deal.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t border-dark-border pt-2">
                <span className="text-gray-300 font-medium">Net Commission</span>
                <span className={`font-mono font-semibold ${deal.netCommission < 0 ? 'text-red-400' : 'text-purple-400'}`}>
                  {formatCurrency(deal.netCommission, deal.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
