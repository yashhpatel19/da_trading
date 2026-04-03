import { getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'
import Layout from '../../components/Layout'
import { formatCurrency, fmtDate } from '../../lib/utils'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

const PAYMENT_STATUS_BADGE = {
  paid: 'badge-green',
  pending: 'badge-yellow',
  overdue: 'badge-red',
  partial: 'badge-blue',
  cancelled: 'badge-gray',
}

const TYPES = ['', 'partial', 'invoice', 'top', 'commission', 'final_settlement', 'advance', 'other']
const STATUSES = ['', 'paid', 'pending', 'overdue', 'partial', 'cancelled']

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', type: '' })

  const load = async () => {
    setLoading(true)
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.type) params.type = filters.type
    const res = await axios.get('/api/payments', { params })
    setPayments(res.data.payments)
    setTotal(res.data.total)
    setLoading(false)
  }

  useEffect(() => { load() }, [filters])

  // Totals
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const totalCommission = payments.filter(p => p.isCommission && p.status === 'paid').reduce((s, p) => s + p.amount, 0)

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="text-gray-500 text-sm">{total} payment records</p>
        </div>
        <Link href="/payments/new" className="btn-primary">+ Record Payment</Link>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card">
          <div className="text-xs text-gray-500 uppercase mb-1">Total Received (Paid)</div>
          <div className="text-xl font-bold font-mono text-emerald-400">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 uppercase mb-1">Total Pending</div>
          <div className="text-xl font-bold font-mono text-yellow-400">{formatCurrency(totalPending)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 uppercase mb-1">Commission Collected</div>
          <div className="text-xl font-bold font-mono text-purple-400">{formatCurrency(totalCommission)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="input" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}>
              {TYPES.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-surface">
              <tr>
                <th className="th">Deal</th>
                <th className="th">Party</th>
                <th className="th">Amount</th>
                <th className="th">Type</th>
                <th className="th">Direction</th>
                <th className="th">Mode</th>
                <th className="th">Date</th>
                <th className="th">Reference</th>
                <th className="th">Status</th>
                <th className="th">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="td text-center text-gray-500 py-8">Loading...</td></tr>}
              {!loading && payments.length === 0 && <tr><td colSpan={10} className="td text-center text-gray-500 py-8">No payments found</td></tr>}
              {payments.map(p => (
                <tr key={p._id} className="hover:bg-dark-hover/40 transition-colors">
                  <td className="td">
                    {p.deal ? (
                      <Link href={`/deals/${p.deal._id}`} className="text-brand-blue hover:underline font-mono text-xs">{p.deal.dealId}</Link>
                    ) : '—'}
                  </td>
                  <td className="td text-sm">{p.party?.name || '—'}</td>
                  <td className="td font-mono text-sm font-medium text-white">
                    {formatCurrency(p.amount, p.currency)}
                    {p.isCommission && <span className="badge-purple ml-1">Comm</span>}
                  </td>
                  <td className="td text-xs text-gray-400">{p.type?.replace('_', ' ')}</td>
                  <td className="td">
                    <span className={p.direction === 'received' ? 'badge-green' : 'badge-yellow'}>
                      {p.direction === 'received' ? '↓ received' : '↑ paid out'}
                    </span>
                  </td>
                  <td className="td text-xs text-gray-400">{p.mode?.replace('_', ' ')}</td>
                  <td className="td text-xs">{fmtDate(p.paymentDate)}</td>
                  <td className="td text-xs font-mono text-gray-500">{p.reference || '—'}</td>
                  <td className="td">
                    <span className={PAYMENT_STATUS_BADGE[p.status] || 'badge-gray'}>{p.status}</span>
                  </td>
                  <td className="td text-xs text-gray-500 max-w-xs truncate">{p.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
