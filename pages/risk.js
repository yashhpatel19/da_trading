import { getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'
import Layout from '../components/Layout'
import { DealStatusBadge } from '../components/DealStatusBadge'
import { formatCurrency, fmtDate, daysFromToday, riskLabel } from '../lib/utils'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

export default function RiskPage() {
  const [deals, setDeals] = useState([])
  const [parties, setParties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      axios.get('/api/deals', { params: { limit: 200 } }),
      axios.get('/api/parties', { params: { type: 'buyer' } }),
    ]).then(([d, p]) => {
      setDeals(d.data.deals)
      setParties(p.data)
      setLoading(false)
    })
  }, [])

  const now = new Date()
  const openStatuses = ['Accepted', 'Payment Due', 'Partially Paid', 'Overdue']
  const activeDeals = deals.filter(d => openStatuses.includes(d.dealStatus))
  const overdueDeals = deals.filter(d => d.dealStatus === 'Overdue')
  const dueSoon = deals.filter(d => {
    if (!d.dueDate || ['Completed', 'Cancelled'].includes(d.dealStatus)) return false
    const days = -daysFromToday(d.dueDate)
    return days > 0 && days <= 7
  })

  const totalExposure = activeDeals.reduce((s, d) => s + (d.buyerOutstanding || 0), 0)
  const overdueExposure = overdueDeals.reduce((s, d) => s + (d.buyerOutstanding || 0), 0)

  // Buyer-wise exposure
  const buyerMap = {}
  activeDeals.forEach(d => {
    if (!d.buyer) return
    const key = d.buyer._id || d.buyer
    const name = d.buyer.name || '—'
    if (!buyerMap[key]) buyerMap[key] = { id: key, name, deals: 0, outstanding: 0, overdue: 0, overdueAmount: 0 }
    buyerMap[key].deals++
    buyerMap[key].outstanding += d.buyerOutstanding || 0
    if (d.dealStatus === 'Overdue') {
      buyerMap[key].overdue++
      buyerMap[key].overdueAmount += d.buyerOutstanding || 0
    }
  })
  const buyerExposure = Object.values(buyerMap).sort((a, b) => b.outstanding - a.outstanding)

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="page-title">Risk Monitor</h1>
        <p className="text-gray-500 text-sm mt-0.5">DA exposure tracking and overdue alerts</p>
      </div>

      {/* Risk summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card border-l-2 border-l-red-500">
          <div className="text-xs text-gray-500 uppercase mb-2">Total Exposure</div>
          <div className="text-2xl font-bold font-mono text-red-400">${(totalExposure / 1000).toFixed(1)}k</div>
          <div className="text-xs text-gray-500 mt-1">{activeDeals.length} open deals</div>
        </div>
        <div className="card border-l-2 border-l-red-700">
          <div className="text-xs text-gray-500 uppercase mb-2">Overdue Exposure</div>
          <div className="text-2xl font-bold font-mono text-red-500">${(overdueExposure / 1000).toFixed(1)}k</div>
          <div className="text-xs text-gray-500 mt-1">{overdueDeals.length} overdue deals</div>
        </div>
        <div className="card border-l-2 border-l-yellow-500">
          <div className="text-xs text-gray-500 uppercase mb-2">Due in 7 Days</div>
          <div className="text-2xl font-bold font-mono text-yellow-400">{dueSoon.length}</div>
          <div className="text-xs text-gray-500 mt-1">Payment deadlines approaching</div>
        </div>
        <div className="card border-l-2 border-l-brand-blue">
          <div className="text-xs text-gray-500 uppercase mb-2">At-Risk Buyers</div>
          <div className="text-2xl font-bold font-mono text-brand-blue">{buyerExposure.filter(b => b.overdue > 0).length}</div>
          <div className="text-xs text-gray-500 mt-1">Buyers with overdue deals</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Overdue deals - Critical */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <div className="section-title text-red-400">Overdue Deals ({overdueDeals.length})</div>
          </div>
          {overdueDeals.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">No overdue deals</div>
          ) : (
            <div className="space-y-2">
              {overdueDeals.map(d => {
                const daysOver = Math.abs(daysFromToday(d.dueDate))
                return (
                  <div key={d._id} className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <Link href={`/deals/${d._id}`} className="font-mono text-xs text-brand-blue hover:underline">{d.dealId}</Link>
                      <span className="text-red-400 text-xs font-semibold">{daysOver}d overdue</span>
                    </div>
                    <div className="text-sm text-gray-200">{d.buyer?.name}</div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-gray-500">{d.product} · Due {fmtDate(d.dueDate)}</div>
                      <div className="font-mono text-xs text-red-400 font-semibold">{formatCurrency(d.buyerOutstanding, d.currency)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Due soon */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <div className="section-title text-yellow-400">Due in 7 Days ({dueSoon.length})</div>
          </div>
          {dueSoon.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">No upcoming deadlines</div>
          ) : (
            <div className="space-y-2">
              {dueSoon.map(d => {
                const daysLeft = -daysFromToday(d.dueDate)
                return (
                  <div key={d._id} className="p-3 bg-yellow-950/20 border border-yellow-900/40 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <Link href={`/deals/${d._id}`} className="font-mono text-xs text-brand-blue hover:underline">{d.dealId}</Link>
                      <span className="text-yellow-400 text-xs font-semibold">in {daysLeft}d</span>
                    </div>
                    <div className="text-sm text-gray-200">{d.buyer?.name}</div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-gray-500">{d.product} · Due {fmtDate(d.dueDate)}</div>
                      <div className="font-mono text-xs text-yellow-400">{formatCurrency(d.buyerOutstanding, d.currency)}</div>
                    </div>
                    <div className="mt-1"><DealStatusBadge status={d.dealStatus} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Buyer-wise exposure */}
      <div className="card mb-5">
        <div className="section-title mb-4">Buyer-wise Exposure</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Buyer</th>
                <th className="th">Open Deals</th>
                <th className="th">Outstanding</th>
                <th className="th">Overdue Deals</th>
                <th className="th">Overdue Amount</th>
                <th className="th">Risk Score</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {buyerExposure.length === 0 && <tr><td colSpan={7} className="td text-center text-gray-500 py-6">No active deals</td></tr>}
              {buyerExposure.map(b => {
                const party = parties.find(p => p._id === b.id)
                const risk = riskLabel(party?.riskScore || 0)
                return (
                  <tr key={b.id} className={`hover:bg-dark-hover/40 ${b.overdue > 0 ? 'bg-red-950/10' : ''}`}>
                    <td className="td">
                      <Link href={`/parties/${b.id}`} className="text-brand-blue hover:underline font-medium">{b.name}</Link>
                    </td>
                    <td className="td text-center font-mono text-sm">{b.deals}</td>
                    <td className="td font-mono text-sm text-yellow-400">{formatCurrency(b.outstanding)}</td>
                    <td className="td text-center">
                      {b.overdue > 0 ? <span className="badge-red">{b.overdue}</span> : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="td font-mono text-sm text-red-400">
                      {b.overdueAmount > 0 ? formatCurrency(b.overdueAmount) : '—'}
                    </td>
                    <td className="td">
                      {party?.riskScore > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-dark-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${party.riskScore >= 75 ? 'bg-red-500' : party.riskScore >= 40 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                              style={{ width: `${party.riskScore}%` }} />
                          </div>
                          <span className={`text-xs ${risk.color}`}>{party.riskScore}/100</span>
                        </div>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="td">
                      <Link href={`/parties/${b.id}`} className="text-xs text-gray-400 hover:text-brand-blue">Profile →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* All active deals exposure */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-dark-border">
          <div className="section-title">All Open DA Deals – Exposure Breakdown</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-surface">
              <tr>
                <th className="th">Deal ID</th>
                <th className="th">Buyer</th>
                <th className="th">Product</th>
                <th className="th">Total Expected</th>
                <th className="th">Received</th>
                <th className="th">Outstanding</th>
                <th className="th">Due Date</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {activeDeals.map(d => {
                const daysUntil = d.dueDate ? -daysFromToday(d.dueDate) : null
                const isOD = daysUntil !== null && daysUntil < 0
                return (
                  <tr key={d._id} className={`hover:bg-dark-hover/40 ${isOD ? 'bg-red-950/10' : ''}`}>
                    <td className="td"><Link href={`/deals/${d._id}`} className="text-brand-blue hover:underline font-mono text-xs">{d.dealId}</Link></td>
                    <td className="td text-sm">{d.buyer?.name}</td>
                    <td className="td text-xs text-gray-400">{d.product}</td>
                    <td className="td font-mono text-xs">{formatCurrency(d.totalExpected, d.currency)}</td>
                    <td className="td font-mono text-xs text-emerald-400">{formatCurrency(d.totalReceived, d.currency)}</td>
                    <td className={`td font-mono text-xs font-semibold ${isOD ? 'text-red-400' : 'text-yellow-400'}`}>
                      {formatCurrency(d.buyerOutstanding, d.currency)}
                    </td>
                    <td className={`td text-xs ${isOD ? 'text-red-400' : 'text-gray-300'}`}>
                      {fmtDate(d.dueDate)}
                      {isOD && <div className="text-red-500 text-xs">{Math.abs(daysUntil)}d overdue</div>}
                    </td>
                    <td className="td"><DealStatusBadge status={d.dealStatus} /></td>
                  </tr>
                )
              })}
              {activeDeals.length === 0 && <tr><td colSpan={8} className="td text-center text-gray-500 py-6">No active deals</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
