import { format, addDays, isAfter, isBefore, differenceInDays } from 'date-fns'

// Generate a human-readable deal ID: DA-YYYYMM-XXXX
export function generateDealId() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `DA-${year}${month}-${rand}`
}

// Format currency with commas
export function formatCurrency(amount, currency = 'USD') {
  if (amount == null || isNaN(amount)) return `${currency} 0`
  return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Format compact number for cards (e.g., 1.2M)
export function formatCompact(amount) {
  if (!amount) return '0'
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return String(amount)
}

// Calculate due date from acceptance date + tenor (days)
export function calcDueDate(acceptanceDate, tenorDays) {
  if (!acceptanceDate || !tenorDays) return null
  return addDays(new Date(acceptanceDate), Number(tenorDays))
}

// Check if a date is overdue
export function isOverdue(dueDate) {
  if (!dueDate) return false
  return isBefore(new Date(dueDate), new Date())
}

// Days overdue (positive = overdue, negative = days remaining)
export function daysFromToday(date) {
  if (!date) return null
  return differenceInDays(new Date(), new Date(date))
}

// Deal status badge color mapping
export const STATUS_COLORS = {
  Draft: 'badge-gray',
  Confirmed: 'badge-blue',
  Shipped: 'badge-purple',
  Accepted: 'badge-blue',
  'Payment Due': 'badge-yellow',
  'Partially Paid': 'badge-yellow',
  Completed: 'badge-green',
  Overdue: 'badge-red',
  Cancelled: 'badge-gray',
}

// Payment status colors
export const PAYMENT_STATUS_COLORS = {
  pending: 'badge-yellow',
  paid: 'badge-green',
  overdue: 'badge-red',
  partial: 'badge-blue',
}

// Risk score to label
export function riskLabel(score) {
  if (score >= 75) return { label: 'High Risk', color: 'text-red-400' }
  if (score >= 40) return { label: 'Medium Risk', color: 'text-yellow-400' }
  return { label: 'Low Risk', color: 'text-emerald-400' }
}

// Calculate simple rule-based risk score for a buyer
export function calcRiskScore({ totalDeals, overdueDeals, avgDelayDays, overdueAmount, partialPayments, completedDeals }) {
  let score = 0

  // Overdue ratio (0-30 pts)
  if (totalDeals > 0) {
    const overdueRatio = overdueDeals / totalDeals
    score += overdueRatio * 30
  }

  // Average delay (0-25 pts): 30+ days = max
  const delayScore = Math.min((avgDelayDays / 30) * 25, 25)
  score += delayScore

  // Overdue amount weight (0-25 pts): >$100k = max
  const amtScore = Math.min((overdueAmount / 100000) * 25, 25)
  score += amtScore

  // Partial payment frequency (0-20 pts)
  if (totalDeals > 0) {
    const partialRatio = partialPayments / totalDeals
    score += partialRatio * 20
  }

  return Math.round(Math.min(score, 100))
}

// Format date nicely
export function fmtDate(date) {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy')
}

// Build query string from filters object
export function buildQuery(filters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== '' && v != null) params.set(k, v)
  })
  return params.toString()
}
