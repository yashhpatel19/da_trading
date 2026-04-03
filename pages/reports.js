import { getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '../components/Layout'
import { formatCurrency, fmtDate } from '../lib/utils'
import { DealStatusBadge } from '../components/DealStatusBadge'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

const REPORT_TYPES = [
  { key: 'deal_profit', label: 'Deal-wise Profit', desc: 'Commission and profit per deal' },
  { key: 'buyer_outstanding', label: 'Buyer Outstanding', desc: 'Total receivable per buyer' },
  { key: 'commission', label: 'Commission Report', desc: 'Expected vs received commission' },
  { key: 'overdue', label: 'Overdue Report', desc: 'All overdue deals with days past due' },
  { key: 'monthly_summary', label: 'Monthly Summary', desc: 'Volume and commission by month' },
]

export default function ReportsPage() {
  const [reportType, setReportType] = useState('deal_profit')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' })
  const [parties, setParties] = useState([])

  useEffect(() => {
    axios.get('/api/parties').then(r => setParties(r.data))
  }, [])

  const loadReport = async () => {
    setLoading(true)
    const params = { type: reportType, ...filters }
    const res = await axios.get('/api/reports', { params })
    setData(res.data)
    setLoading(false)
  }

  useEffect(() => { loadReport() }, [reportType])

  // Download CSV
  const downloadCSV = () => {
    if (!data?.rows?.length) return
    const keys = Object.keys(data.rows[0])
    const csv = [
      keys.join(','),
      ...data.rows.map(row => keys.map(k => {
        const v = row[k]
        if (v instanceof Date || (typeof v === 'string' && v.includes('T'))) return fmtDate(v)
        if (typeof v === 'number') return v
        return `"${String(v || '').replace(/"/g, '""')}"`
      }).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const current = REPORT_TYPES.find(r => r.key === reportType)

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Generate and download business reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar: report types */}
        <div className="lg:col-span-1">
          <div className="card p-3">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-3 px-2">Report Types</div>
            {REPORT_TYPES.map(r => (
              <button
                key={r.key}
                onClick={() => setReportType(r.key)}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${reportType === r.key ? 'bg-brand-blue/15 text-brand-blue' : 'text-gray-400 hover:bg-dark-hover hover:text-gray-200'}`}
              >
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs opacity-60 mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main: report content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="section-title">{current?.label}</div>
              <div className="flex gap-2">
                <button onClick={loadReport} className="btn-secondary text-xs py-1.5">Refresh</button>
                <button onClick={downloadCSV} className="btn-primary text-xs py-1.5" disabled={!data?.rows?.length}>
                  ↓ Download CSV
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="label">Date From</label>
                <input className="input" type="date" value={filters.dateFrom}
                  onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} />
              </div>
              <div>
                <label className="label">Date To</label>
                <input className="input" type="date" value={filters.dateTo}
                  onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} />
              </div>
              <div className="flex items-end">
                <button onClick={loadReport} className="btn-primary w-full text-xs py-2">Apply</button>
              </div>
              <div className="flex items-end">
                <button onClick={() => { setFilters({ dateFrom: '', dateTo: '' }); setTimeout(loadReport, 0) }} className="btn-secondary w-full text-xs py-2">Clear</button>
              </div>
            </div>
          </div>

          {/* Summary (commission report) */}
          {data?.summary && (
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <div className="label">Expected</div>
                <div className="text-xl font-bold font-mono text-purple-400">{formatCurrency(data.summary.totalExpected)}</div>
              </div>
              <div className="card text-center">
                <div className="label">Received</div>
                <div className="text-xl font-bold font-mono text-emerald-400">{formatCurrency(data.summary.totalReceived)}</div>
              </div>
              <div className="card text-center">
                <div className="label">Pending</div>
                <div className="text-xl font-bold font-mono text-yellow-400">{formatCurrency(data.summary.pending)}</div>
              </div>
            </div>
          )}

          {/* Report table */}
          <div className="card overflow-hidden p-0">
            {loading ? (
              <div className="text-center py-10 text-gray-500">Loading report...</div>
            ) : (
              <div className="overflow-x-auto">
                {reportType === 'deal_profit' && <DealProfitTable rows={data?.rows || []} />}
                {reportType === 'buyer_outstanding' && <BuyerOutstandingTable rows={data?.rows || []} />}
                {reportType === 'commission' && <CommissionTable rows={data?.rows || []} />}
                {reportType === 'overdue' && <OverdueTable rows={data?.rows || []} />}
                {reportType === 'monthly_summary' && <MonthlySummaryTable rows={data?.rows || []} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function DealProfitTable({ rows }) {
  const totalComm = rows.reduce((s, r) => s + (r.commissionAmount || 0), 0)
  const totalRcvd = rows.reduce((s, r) => s + (r.commissionReceived || 0), 0)
  return (
    <table className="w-full">
      <thead className="bg-dark-surface">
        <tr>
          <th className="th">Deal ID</th><th className="th">Buyer</th><th className="th">Supplier</th>
          <th className="th">Product</th><th className="th">Invoice</th><th className="th">Commission</th>
          <th className="th">Comm. Received</th><th className="th">Comm. Pending</th><th className="th">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-dark-hover/40">
            <td className="td font-mono text-xs text-brand-blue">{r.dealId}</td>
            <td className="td text-sm">{r.buyer}</td><td className="td text-sm text-gray-400">{r.supplier}</td>
            <td className="td text-xs text-gray-400">{r.product}</td>
            <td className="td font-mono text-xs">{formatCurrency(r.invoiceAmount, r.currency)}</td>
            <td className="td font-mono text-xs text-purple-400">{formatCurrency(r.commissionAmount, r.currency)}</td>
            <td className="td font-mono text-xs text-emerald-400">{formatCurrency(r.commissionReceived, r.currency)}</td>
            <td className="td font-mono text-xs text-yellow-400">{formatCurrency(r.commissionPending, r.currency)}</td>
            <td className="td"><DealStatusBadge status={r.dealStatus} /></td>
          </tr>
        ))}
        {rows.length > 0 && (
          <tr className="bg-dark-surface font-semibold">
            <td className="td text-xs" colSpan={5}>TOTALS ({rows.length} deals)</td>
            <td className="td font-mono text-xs text-purple-400">{formatCurrency(totalComm)}</td>
            <td className="td font-mono text-xs text-emerald-400">{formatCurrency(totalRcvd)}</td>
            <td className="td font-mono text-xs text-yellow-400">{formatCurrency(totalComm - totalRcvd)}</td>
            <td className="td"></td>
          </tr>
        )}
        {rows.length === 0 && <tr><td colSpan={9} className="td text-center text-gray-500 py-6">No data</td></tr>}
      </tbody>
    </table>
  )
}

function BuyerOutstandingTable({ rows }) {
  return (
    <table className="w-full">
      <thead className="bg-dark-surface">
        <tr>
          <th className="th">Buyer</th><th className="th">Total Deals</th>
          <th className="th">Total Expected</th><th className="th">Total Received</th><th className="th">Outstanding</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-dark-hover/40">
            <td className="td font-medium text-gray-200">{r.name}</td>
            <td className="td text-center font-mono text-sm">{r.deals}</td>
            <td className="td font-mono text-sm">{formatCurrency(r.totalExpected)}</td>
            <td className="td font-mono text-sm text-emerald-400">{formatCurrency(r.totalReceived)}</td>
            <td className="td font-mono text-sm font-semibold text-yellow-400">{formatCurrency(r.outstanding)}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={5} className="td text-center text-gray-500 py-6">No data</td></tr>}
      </tbody>
    </table>
  )
}

function CommissionTable({ rows }) {
  return (
    <table className="w-full">
      <thead className="bg-dark-surface">
        <tr>
          <th className="th">Deal ID</th><th className="th">Buyer</th><th className="th">Invoice</th>
          <th className="th">Commission</th><th className="th">Received</th><th className="th">Pending</th><th className="th">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-dark-hover/40">
            <td className="td font-mono text-xs text-brand-blue">{r.dealId}</td>
            <td className="td text-sm">{r.buyer}</td>
            <td className="td font-mono text-xs">{formatCurrency(r.invoiceAmount, r.currency)}</td>
            <td className="td font-mono text-xs text-purple-400">{formatCurrency(r.commissionAmount, r.currency)}</td>
            <td className="td font-mono text-xs text-emerald-400">{formatCurrency(r.commissionReceived, r.currency)}</td>
            <td className="td font-mono text-xs text-yellow-400">{formatCurrency(r.commissionPending, r.currency)}</td>
            <td className="td"><DealStatusBadge status={r.dealStatus} /></td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={7} className="td text-center text-gray-500 py-6">No data</td></tr>}
      </tbody>
    </table>
  )
}

function OverdueTable({ rows }) {
  const totalOutstanding = rows.reduce((s, r) => s + (r.outstanding || 0), 0)
  return (
    <table className="w-full">
      <thead className="bg-dark-surface">
        <tr>
          <th className="th">Deal ID</th><th className="th">Buyer</th><th className="th">Product</th>
          <th className="th">Invoice</th><th className="th">Outstanding</th><th className="th">Due Date</th>
          <th className="th">Days Overdue</th><th className="th">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-red-950/10">
            <td className="td font-mono text-xs text-brand-blue">{r.dealId}</td>
            <td className="td text-sm">{r.buyer}</td>
            <td className="td text-xs text-gray-400">{r.product}</td>
            <td className="td font-mono text-xs">{formatCurrency(r.invoiceAmount, r.currency)}</td>
            <td className="td font-mono text-xs text-red-400 font-semibold">{formatCurrency(r.outstanding, r.currency)}</td>
            <td className="td text-xs text-red-400">{fmtDate(r.dueDate)}</td>
            <td className="td text-center"><span className="badge-red">{r.daysOverdue}d</span></td>
            <td className="td"><DealStatusBadge status={r.dealStatus} /></td>
          </tr>
        ))}
        {rows.length > 0 && (
          <tr className="bg-dark-surface font-semibold">
            <td className="td text-xs" colSpan={4}>TOTAL OVERDUE ({rows.length} deals)</td>
            <td className="td font-mono text-xs text-red-400">{formatCurrency(totalOutstanding)}</td>
            <td className="td" colSpan={3}></td>
          </tr>
        )}
        {rows.length === 0 && <tr><td colSpan={8} className="td text-center text-gray-500 py-6">No overdue deals</td></tr>}
      </tbody>
    </table>
  )
}

function MonthlySummaryTable({ rows }) {
  return (
    <table className="w-full">
      <thead className="bg-dark-surface">
        <tr>
          <th className="th">Month</th><th className="th">Deals</th><th className="th">Volume</th>
          <th className="th">Commission</th><th className="th">Completed</th><th className="th">Overdue</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-dark-hover/40">
            <td className="td font-mono text-sm">{r.month}</td>
            <td className="td text-center font-mono text-sm">{r.deals}</td>
            <td className="td font-mono text-sm">{formatCurrency(r.volume)}</td>
            <td className="td font-mono text-sm text-purple-400">{formatCurrency(r.commission)}</td>
            <td className="td text-center"><span className="badge-green">{r.completed}</span></td>
            <td className="td text-center">{r.overdue > 0 ? <span className="badge-red">{r.overdue}</span> : <span className="text-gray-500">0</span>}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={6} className="td text-center text-gray-500 py-6">No data</td></tr>}
      </tbody>
    </table>
  )
}
