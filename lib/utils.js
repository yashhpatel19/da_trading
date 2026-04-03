import { format, addDays, isAfter, isBefore, differenceInDays } from 'date-fns'

export function generateDealId() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `DA-${year}${month}-${rand}`
}

export function formatCurrency(amount, currency = 'USD') {
  if (amount == null || isNaN(amount)) return `${currency} 0`
  return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCompact(amount) {
  if (!amount) return '0'
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return String(amount)
}

export function isOverdue(date) {
  if (!date) return false
  return isBefore(new Date(date), new Date())
}

export function daysFromToday(date) {
  if (!date) return null
  return differenceInDays(new Date(), new Date(date))
}

export function fmtDate(date) {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy')
}

export function buildQuery(filters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== '' && v != null) params.set(k, v)
  })
  return params.toString()
}

// Invoice due dates based on ETA + freeDays
export function invoiceFirstDue(eta) {
  return eta ? new Date(eta) : null
}
export function invoiceLastDue(eta, freeDays) {
  if (!eta) return null
  return addDays(new Date(eta), Number(freeDays) || 0)
}
export function isInvoiceOverdue(eta, freeDays) {
  const lastDue = invoiceLastDue(eta, freeDays)
  if (!lastDue) return false
  return isBefore(lastDue, new Date())
}
export function isInvoiceUrgent(eta, freeDays) {
  // Between ETA and ETA+freeDays
  if (!eta) return false
  const first = invoiceFirstDue(eta)
  const last  = invoiceLastDue(eta, freeDays)
  const now   = new Date()
  return isAfter(now, first) && isBefore(now, last)
}

// New deal statuses
export const DEAL_STATUSES = [
  'Draft', 'Confirmed', 'Shipped', 'BL Sent', 'Invoice Paid', 'Fully Paid', 'Had Claim', 'Cancelled',
]

export const STATUS_COLORS = {
  Draft:          'badge-gray',
  Confirmed:      'badge-blue',
  Shipped:        'badge-purple',
  'BL Sent':      'badge-indigo',
  'Invoice Paid': 'badge-yellow',
  'Fully Paid':   'badge-green',
  'Had Claim':    'badge-red',
  Cancelled:      'badge-gray',
}

export const PAYMENT_STATUS_COLORS = {
  pending: 'badge-yellow',
  paid:    'badge-green',
  overdue: 'badge-red',
  partial: 'badge-blue',
}

export function riskLabel(score) {
  if (score >= 75) return { label: 'High Risk', color: 'text-red-400' }
  if (score >= 40) return { label: 'Medium Risk', color: 'text-yellow-400' }
  return { label: 'Low Risk', color: 'text-emerald-400' }
}

export function calcRiskScore({ totalDeals, overdueDeals, avgDelayDays, overdueAmount, partialPayments }) {
  let score = 0
  if (totalDeals > 0) score += (overdueDeals / totalDeals) * 30
  score += Math.min((avgDelayDays / 30) * 25, 25)
  score += Math.min((overdueAmount / 100000) * 25, 25)
  if (totalDeals > 0) score += Math.min((partialPayments / totalDeals) * 20, 20)
  return Math.round(Math.min(score, 100))
}
