import { STATUS_COLORS, PAYMENT_STATUS_COLORS } from '../lib/utils'

export function DealStatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || 'badge-gray'
  return <span className={cls}>{status}</span>
}

export function PaymentStatusBadge({ status }) {
  const cls = PAYMENT_STATUS_COLORS[status] || 'badge-gray'
  return <span className={cls}>{status}</span>
}
