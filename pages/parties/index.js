import { getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'
import Layout from '../../components/Layout'
import { riskLabel, formatCurrency } from '../../lib/utils'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

export default function PartiesPage() {
  const [parties, setParties] = useState([])
  const [filter, setFilter] = useState({ type: '', search: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filter.type) params.type = filter.type
    if (filter.search) params.search = filter.search
    axios.get('/api/parties', { params }).then(r => {
      setParties(r.data)
      setLoading(false)
    })
  }, [filter])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">Parties</h1>
          <p className="text-gray-500 text-sm">{parties.length} parties</p>
        </div>
        <Link href="/parties/new" className="btn-primary">+ Add Party</Link>
      </div>

      {/* Filters */}
      <div className="card mb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Search</label>
            <input className="input" placeholder="Party name..." value={filter.search}
              onChange={e => setFilter(p => ({ ...p, search: e.target.value }))} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={filter.type} onChange={e => setFilter(p => ({ ...p, type: e.target.value }))}>
              <option value="">All Types</option>
              <option value="buyer">Buyers</option>
              <option value="supplier">Suppliers</option>
              <option value="both">Both</option>
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
                <th className="th">Name</th>
                <th className="th">Type</th>
                <th className="th">Country</th>
                <th className="th">Contact</th>
                <th className="th">Deals</th>
                <th className="th">Volume</th>
                <th className="th">Overdue</th>
                <th className="th">Risk Score</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="td text-center text-gray-500 py-8">Loading...</td></tr>}
              {!loading && parties.length === 0 && <tr><td colSpan={9} className="td text-center text-gray-500 py-8">No parties found</td></tr>}
              {parties.map(party => {
                const risk = riskLabel(party.riskScore || 0)
                return (
                  <tr key={party._id} className="hover:bg-dark-hover/40 transition-colors">
                    <td className="td">
                      <Link href={`/parties/${party._id}`} className="text-brand-blue hover:underline font-medium">{party.name}</Link>
                    </td>
                    <td className="td">
                      <span className={party.type === 'buyer' ? 'badge-blue' : party.type === 'supplier' ? 'badge-green' : 'badge-purple'}>
                        {party.type}
                      </span>
                    </td>
                    <td className="td text-gray-400 text-xs">{party.country || '—'}</td>
                    <td className="td text-xs">
                      <div>{party.contactPerson || '—'}</div>
                      <div className="text-gray-500">{party.phone || ''}</div>
                    </td>
                    <td className="td font-mono text-xs text-center">{party.totalDeals || 0}</td>
                    <td className="td font-mono text-xs">
                      {party.totalVolume > 0 ? formatCurrency(party.totalVolume) : '—'}
                    </td>
                    <td className="td font-mono text-xs">
                      {party.overdueDeals > 0 ? (
                        <span className="text-red-400">{party.overdueDeals} deals</span>
                      ) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="td">
                      {party.riskScore > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-dark-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${party.riskScore >= 75 ? 'bg-red-500' : party.riskScore >= 40 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                              style={{ width: `${party.riskScore}%` }} />
                          </div>
                          <span className={`text-xs ${risk.color}`}>{party.riskScore}</span>
                        </div>
                      ) : <span className="text-gray-600 text-xs">New</span>}
                    </td>
                    <td className="td">
                      <div className="flex gap-2">
                        <Link href={`/parties/${party._id}`} className="text-xs text-gray-400 hover:text-brand-blue">View</Link>
                        <Link href={`/parties/${party._id}/edit`} className="text-xs text-gray-400 hover:text-brand-blue">Edit</Link>
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
