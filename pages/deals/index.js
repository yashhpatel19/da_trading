import { getSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import Link from 'next/link'
import Layout from '../../components/Layout'
import { DealStatusBadge } from '../../components/DealStatusBadge'
import { formatCurrency, fmtDate, isInvoiceOverdue, DEAL_STATUSES } from '../../lib/utils'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

const STATUSES = ['', ...DEAL_STATUSES]

export default function DealsPage() {
  const [deals, setDeals] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [parties, setParties] = useState([])
  const [filters, setFilters] = useState({ status: '', buyer: '', supplier: '', search: '', overdue: '' })

  const loadDeals = useCallback(async () => {
    setLoading(true)
    const params = {}
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    const res = await axios.get('/api/deals', { params })
    setDeals(res.data.deals)
    setTotal(res.data.total)
    setLoading(false)
  }, [filters])

  useEffect(() => { loadDeals() }, [loadDeals])

  useEffect(() => {
    axios.get('/api/parties').then(r => setParties(r.data))
  }, [])

  const buyers = parties.filter(p => ['buyer', 'both'].includes(p.type))
  const suppliers = parties.filter(p => ['supplier', 'both'].includes(p.type))

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">Deals</h1>
          <p className="text-gray-500 text-sm">{total} deal{total !== 1 ? 's' : ''} found</p>
        </div>
        <Link href="/deals/new" className="btn-primary">+ New Deal</Link>
      </div>

      {/* Filters */}
      <div className="card mb-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="label">Search</label>
            <input className="input" placeholder="Deal ID, product..." value={filters.search}
              onChange={e => setFilter('search', e.target.value)} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Buyer</label>
            <select className="input" value={filters.buyer} onChange={e => setFilter('buyer', e.target.value)}>
              <option value="">All Buyers</option>
              {buyers.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Supplier</label>
            <select className="input" value={filters.supplier} onChange={e => setFilter('supplier', e.target.value)}>
              <option value="">All Suppliers</option>
              {suppliers.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Overdue Only</label>
            <select className="input" value={filters.overdue} onChange={e => setFilter('overdue', e.target.value)}>
              <option value="">All</option>
              <option value="true">Overdue Only</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="btn-secondary text-xs py-1.5" onClick={() => setFilters({ status: '', buyer: '', supplier: '', search: '', overdue: '' })}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-surface">
              <tr>
                <th className="th">Deal ID</th>
                <th className="th">Buyer</th>
                <th className="th">Supplier</th>
                <th className="th">Products</th>
                <th className="th">Invoice</th>
                <th className="th">Top / Commission</th>
                <th className="th">Outstanding</th>
                <th className="th">ETA / Due</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="td text-center text-gray-500 py-8">Loading...</td></tr>
              )}
              {!loading && deals.length === 0 && (
                <tr><td colSpan={10} className="td text-center text-gray-500 py-8">No deals found. <Link href="/deals/new" className="text-brand-blue hover:underline">Create one →</Link></td></tr>
              )}
              {deals.map(deal => {
                const invoiceOD = isInvoiceOverdue(deal.eta, deal.freeDays)
                const categories = [...new Set((deal.products || []).map(p => p.category).filter(Boolean))].join(', ')

                return (
                  <tr key={deal._id} className={`hover:bg-dark-hover/40 transition-colors ${invoiceOD ? 'bg-red-950/10' : ''}`}>
                    <td className="td">
                      <Link href={`/deals/${deal._id}`} className="text-brand-blue hover:underline font-mono text-xs font-medium">
                        {deal.dealId}
                      </Link>
                    </td>
                    <td className="td">
                      <div className="text-sm text-gray-200">{deal.buyer?.name || '—'}</div>
                      <div className="text-xs text-gray-500">{deal.buyer?.country || ''}</div>
                    </td>
                    <td className="td">
                      <div className="text-sm text-gray-200">{deal.supplier?.name || '—'}</div>
                      <div className="text-xs text-gray-500">{deal.supplier?.country || ''}</div>
                    </td>
                    <td className="td text-xs">
                      <div className="text-gray-200">{categories || '—'}</div>
                      <div className="text-gray-500">{(deal.products || []).length} line{deal.products?.length !== 1 ? 's' : ''}</div>
                    </td>
                    <td className="td font-mono text-xs">
                      {formatCurrency(deal.totalInvoiceAmount, deal.currency)}
                    </td>
                    <td className="td font-mono text-xs text-yellow-400">
                      {formatCurrency(deal.totalTopAmount, deal.currency)}
                      {deal.netCommission < 0 && <div className="text-red-400 text-xs">Loss deal</div>}
                    </td>
                    <td className={`td font-mono text-xs ${deal.buyerOutstanding > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {formatCurrency(deal.buyerOutstanding, deal.currency)}
                    </td>
                    <td className="td text-xs">
                      {deal.eta ? (
                        <div>
                          <div className={invoiceOD ? 'text-red-400' : 'text-gray-300'}>{fmtDate(deal.eta)}</div>
                          {invoiceOD && <div className="text-red-500">INV OVERDUE</div>}
                          {deal.freeDays > 0 && !invoiceOD && <div className="text-gray-500">+{deal.freeDays}d free</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="td"><DealStatusBadge status={deal.dealStatus} /></td>
                    <td className="td">
                      <div className="flex gap-2">
                        <Link href={`/deals/${deal._id}`} className="text-xs text-gray-400 hover:text-brand-blue">View</Link>
                        <Link href={`/deals/${deal._id}/edit`} className="text-xs text-gray-400 hover:text-brand-blue">Edit</Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
