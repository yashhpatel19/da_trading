import { getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../../components/Layout'
import { DealStatusBadge } from '../../../components/DealStatusBadge'
import { formatCurrency, fmtDate, riskLabel } from '../../../lib/utils'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

export default function PartyDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('buyer')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    axios.get(`/api/parties/${id}`).then(r => {
      setData(r.data)
      setLoading(false)
      // Default tab
      if (r.data.party.type === 'supplier') setTab('supplier')
    })
  }, [id])

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div></Layout>
  if (!data) return <Layout><div className="text-red-400">Party not found</div></Layout>

  const { party, buyerDeals, supplierDeals, payments } = data
  const risk = riskLabel(party.riskScore || 0)

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">{party.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={party.type === 'buyer' ? 'badge-blue' : party.type === 'supplier' ? 'badge-green' : 'badge-purple'}>
              {party.type}
            </span>
            <span className="text-gray-400 text-sm">{party.country}{party.city ? `, ${party.city}` : ''}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/parties/${id}/edit`} className="btn-secondary text-xs">Edit</Link>
          <Link href="/parties/new" className="btn-primary text-xs">+ New Party</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Stats & Details */}
        <div className="space-y-4">
          {/* Risk Score */}
          <div className="card">
            <div className="section-title mb-3">Risk Profile</div>
            <div className="text-center py-3">
              <div className={`text-4xl font-bold font-mono ${risk.color}`}>{party.riskScore || 0}</div>
              <div className={`text-sm mt-1 ${risk.color}`}>{risk.label}</div>
              <div className="w-full h-2 bg-dark-border rounded-full mt-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${party.riskScore >= 75 ? 'bg-red-500' : party.riskScore >= 40 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                  style={{ width: `${party.riskScore || 0}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
              <div className="p-2 bg-dark-surface rounded-lg text-center">
                <div className="text-gray-500">Total Deals</div>
                <div className="font-semibold text-white mt-0.5">{party.totalDeals || 0}</div>
              </div>
              <div className="p-2 bg-dark-surface rounded-lg text-center">
                <div className="text-gray-500">Completed</div>
                <div className="font-semibold text-emerald-400 mt-0.5">{party.completedDeals || 0}</div>
              </div>
              <div className="p-2 bg-dark-surface rounded-lg text-center">
                <div className="text-gray-500">Overdue</div>
                <div className={`font-semibold mt-0.5 ${(party.overdueDeals || 0) > 0 ? 'text-red-400' : 'text-gray-400'}`}>{party.overdueDeals || 0}</div>
              </div>
              <div className="p-2 bg-dark-surface rounded-lg text-center">
                <div className="text-gray-500">Avg Delay</div>
                <div className="font-semibold text-yellow-400 mt-0.5">{party.avgDelayDays || 0}d</div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="card">
            <div className="section-title mb-3">Contact Info</div>
            <div className="space-y-2 text-sm">
              {party.contactPerson && <div><div className="label">Contact Person</div><div className="text-gray-200">{party.contactPerson}</div></div>}
              {party.email && <div><div className="label">Email</div><a href={`mailto:${party.email}`} className="text-brand-blue hover:underline">{party.email}</a></div>}
              {party.phone && <div><div className="label">Phone</div><div className="text-gray-200">{party.phone}</div></div>}
              {party.address && <div><div className="label">Address</div><div className="text-gray-300">{party.address}</div></div>}
            </div>
          </div>

          {/* Total Volume */}
          <div className="card">
            <div className="section-title mb-3">Business Volume</div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Trade Volume</div>
              <div className="text-xl font-bold font-mono text-white">{formatCurrency(party.totalVolume || 0)}</div>
            </div>
            {party.totalOverdueAmount > 0 && (
              <div className="mt-3 pt-3 border-t border-dark-border">
                <div className="text-xs text-gray-500 mb-1">Overdue Amount</div>
                <div className="text-lg font-bold font-mono text-red-400">{formatCurrency(party.totalOverdueAmount)}</div>
              </div>
            )}
          </div>

          {party.bankDetails && (
            <div className="card">
              <div className="section-title mb-2">Bank Details</div>
              <div className="text-xs text-gray-400 whitespace-pre-line">{party.bankDetails}</div>
            </div>
          )}

          {party.notes && (
            <div className="card">
              <div className="section-title mb-2">Notes</div>
              <div className="text-sm text-gray-300">{party.notes}</div>
            </div>
          )}
        </div>

        {/* Right: Deals & Payments */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab */}
          {party.type === 'both' && (
            <div className="flex gap-1 p-1 bg-dark-surface rounded-lg w-fit">
              <button onClick={() => setTab('buyer')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'buyer' ? 'bg-dark-card text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                As Buyer
              </button>
              <button onClick={() => setTab('supplier')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'supplier' ? 'bg-dark-card text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                As Supplier
              </button>
            </div>
          )}

          {/* Deals table */}
          <div className="card overflow-hidden p-0">
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <div className="section-title">
                Deals {tab === 'buyer' ? '(as Buyer)' : '(as Supplier)'}
              </div>
              <Link href={`/deals/new`} className="btn-primary text-xs py-1.5">+ New Deal</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-surface">
                  <tr>
                    <th className="th">Deal ID</th>
                    <th className="th">{tab === 'buyer' ? 'Supplier' : 'Buyer'}</th>
                    <th className="th">Product</th>
                    <th className="th">Amount</th>
                    <th className="th">Outstanding</th>
                    <th className="th">Due</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(tab === 'buyer' ? buyerDeals : supplierDeals).map(d => (
                    <tr key={d._id} className="hover:bg-dark-hover/40">
                      <td className="td">
                        <Link href={`/deals/${d._id}`} className="text-brand-blue hover:underline font-mono text-xs">{d.dealId}</Link>
                      </td>
                      <td className="td text-xs">{tab === 'buyer' ? d.supplier?.name : d.buyer?.name}</td>
                      <td className="td text-xs">{d.product}</td>
                      <td className="td font-mono text-xs">{formatCurrency(d.invoiceAmount, d.currency)}</td>
                      <td className="td font-mono text-xs text-yellow-400">{formatCurrency(d.buyerOutstanding, d.currency)}</td>
                      <td className="td text-xs">{fmtDate(d.dueDate)}</td>
                      <td className="td"><DealStatusBadge status={d.dealStatus} /></td>
                    </tr>
                  ))}
                  {(tab === 'buyer' ? buyerDeals : supplierDeals).length === 0 && (
                    <tr><td colSpan={7} className="td text-center text-gray-500 py-6">No deals found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card">
            <div className="section-title mb-4">Recent Payments</div>
            {payments.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">No payments recorded</div>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 10).map(p => (
                  <div key={p._id} className="flex items-center justify-between p-2 bg-dark-surface rounded-lg text-xs">
                    <div>
                      <div className="text-gray-300">{p.deal?.dealId} · {p.type}</div>
                      <div className="text-gray-500">{fmtDate(p.paymentDate)} · {p.mode?.replace('_', ' ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-white">{formatCurrency(p.amount, p.currency)}</div>
                      <span className={p.status === 'paid' ? 'badge-green' : 'badge-yellow'}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
