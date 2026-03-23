import { getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import { DealStatusBadge } from '../components/DealStatusBadge'
import { MonthlyVolumeChart, MonthlyCommissionChart, OverdueTrendChart } from '../components/charts/MonthlyChart'
import { formatCurrency, fmtDate } from '../lib/utils'
import Link from 'next/link'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/dashboard').then(r => {
      setData(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-sm">Loading dashboard...</div>
      </div>
    </Layout>
  )

  if (!data) return (
    <Layout>
      <div className="text-red-400 text-sm">Failed to load dashboard data.</div>
    </Layout>
  )

  const { counts, commission, exposure, outstanding, dueSoon, charts, recentDeals } = data

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Trade overview and key metrics</p>
        </div>
        <div className="text-xs text-gray-600 font-mono">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      </div>

      {/* Deal Count Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Deals" value={counts.active} sub={`${counts.total} total deals`} accent="blue" />
        <StatCard label="Completed" value={counts.completed} accent="green" />
        <StatCard label="Overdue" value={counts.overdue} accent="red" sub="Require immediate action" />
        <StatCard label="Due in 7 Days" value={dueSoon.next7} sub={`${dueSoon.next30} in 30 days`} accent="yellow" />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Expected Commission"
          value={`$${(commission.expected / 1000).toFixed(1)}k`}
          sub={`${formatCurrency(commission.expected)}`}
          accent="purple"
        />
        <StatCard
          label="Commission Received"
          value={`$${(commission.received / 1000).toFixed(1)}k`}
          sub={`Pending: $${(commission.pending / 1000).toFixed(1)}k`}
          accent="green"
        />
        <StatCard
          label="Buyer Outstanding"
          value={`$${(outstanding.buyer / 1000).toFixed(1)}k`}
          sub="Total receivable from buyers"
          accent="cyan"
        />
        <StatCard
          label="Supplier Outstanding"
          value={`$${(outstanding.supplier / 1000).toFixed(1)}k`}
          sub="Payable to suppliers"
          accent="yellow"
        />
      </div>

      {/* Exposure Highlight */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card border border-red-900/40 bg-red-950/20">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-red-400 uppercase tracking-wide">Total Exposure at Risk</div>
            <span className="badge-red">MONITOR</span>
          </div>
          <div className="text-3xl font-bold text-red-400 font-mono">
            ${(exposure.total / 1000).toFixed(1)}k
          </div>
          <div className="text-xs text-gray-500 mt-1">Buyer outstanding on all open/unpaid deals</div>
          <div className="mt-3 pt-3 border-t border-red-900/30 flex items-center justify-between">
            <div className="text-xs text-gray-500">Overdue portion</div>
            <div className="text-sm font-semibold text-red-400">${(exposure.overdue / 1000).toFixed(1)}k</div>
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Commission Summary</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Expected</span>
              <span className="font-mono text-white text-sm">{formatCurrency(commission.expected)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Received</span>
              <span className="font-mono text-emerald-400 text-sm">{formatCurrency(commission.received)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dark-border">
              <span className="text-sm font-medium text-gray-300">Pending</span>
              <span className="font-mono text-yellow-400 text-sm font-semibold">{formatCurrency(commission.pending)}</span>
            </div>
            {commission.expected > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Collection rate</span>
                  <span>{((commission.received / commission.expected) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, (commission.received / commission.expected) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="section-title mb-4">Monthly Deal Volume</div>
          <MonthlyVolumeChart data={charts.monthly} />
        </div>
        <div className="card">
          <div className="section-title mb-4">Monthly Commission Earned</div>
          <MonthlyCommissionChart data={charts.monthly} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="section-title mb-4">Overdue Trend</div>
          <OverdueTrendChart data={charts.monthly} />
        </div>

        {/* Due Soon Summary */}
        <div className="card">
          <div className="section-title mb-4">Payment Deadlines</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-950/20 rounded-lg border border-red-900/30">
              <div>
                <div className="text-sm font-medium text-white">Due in next 7 days</div>
                <div className="text-xs text-gray-500">Immediate attention required</div>
              </div>
              <div className="text-2xl font-bold text-red-400">{dueSoon.next7}</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-950/20 rounded-lg border border-yellow-900/30">
              <div>
                <div className="text-sm font-medium text-white">Due in next 30 days</div>
                <div className="text-xs text-gray-500">Plan collection</div>
              </div>
              <div className="text-2xl font-bold text-yellow-400">{dueSoon.next30}</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-950/30 rounded-lg border border-red-800/40">
              <div>
                <div className="text-sm font-medium text-white">Currently Overdue</div>
                <div className="text-xs text-gray-500">Past due date, unpaid</div>
              </div>
              <div className="text-2xl font-bold text-red-400">{counts.overdue}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Deals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title">Recent Deals</div>
          <Link href="/deals" className="text-xs text-brand-blue hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Deal ID</th>
                <th className="th">Buyer</th>
                <th className="th">Supplier</th>
                <th className="th">Amount</th>
                <th className="th">Due Date</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentDeals.map(deal => (
                <tr key={deal._id} className="hover:bg-dark-hover/50 transition-colors">
                  <td className="td">
                    <Link href={`/deals/${deal._id}`} className="text-brand-blue hover:underline font-mono text-xs">
                      {deal.dealId}
                    </Link>
                  </td>
                  <td className="td">{deal.buyer}</td>
                  <td className="td">{deal.supplier}</td>
                  <td className="td font-mono text-xs">{formatCurrency(deal.invoiceAmount, deal.currency)}</td>
                  <td className="td text-xs">{fmtDate(deal.dueDate)}</td>
                  <td className="td"><DealStatusBadge status={deal.dealStatus} /></td>
                </tr>
              ))}
              {recentDeals.length === 0 && (
                <tr><td colSpan={6} className="td text-center text-gray-500">No deals yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
