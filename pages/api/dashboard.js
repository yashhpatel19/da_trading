import { getServerSession } from 'next-auth/next'
import authOptions from './auth/[...nextauth]'
import connectDB from '../../lib/mongodb'
import Deal from '../../models/Deal'
import Payment from '../../models/Payment'
import Party from '../../models/Party'
import { startOfMonth, subMonths, format } from 'date-fns'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  await connectDB()

  const now = new Date()
  const next7 = new Date(now); next7.setDate(now.getDate() + 7)
  const next30 = new Date(now); next30.setDate(now.getDate() + 30)

  // Active statuses (not completed/cancelled)
  const openStatuses = ['Draft', 'Confirmed', 'Shipped', 'Accepted', 'Payment Due', 'Partially Paid', 'Overdue']
  const riskStatuses = ['Accepted', 'Payment Due', 'Partially Paid', 'Overdue']

  const [
    allDeals,
    payments,
  ] = await Promise.all([
    Deal.find({}).populate('buyer', 'name').populate('supplier', 'name').lean(),
    Payment.find({ status: 'paid' }).lean(),
  ])

  // --- Deal counts ---
  const activeDeals = allDeals.filter(d => openStatuses.includes(d.dealStatus))
  const completedDeals = allDeals.filter(d => d.dealStatus === 'Completed')
  const overdueDeals = allDeals.filter(d => d.dealStatus === 'Overdue')
  const cancelledDeals = allDeals.filter(d => d.dealStatus === 'Cancelled')

  // --- Commission ---
  const totalExpectedCommission = allDeals.reduce((s, d) => s + (d.commissionAmount || 0), 0)
  const commissionReceived = payments
    .filter(p => p.isCommission)
    .reduce((s, p) => s + p.amount, 0)
  const commissionPending = totalExpectedCommission - commissionReceived

  // --- Exposure ---
  const exposureDeals = allDeals.filter(d => riskStatuses.includes(d.dealStatus))
  const totalExposure = exposureDeals.reduce((s, d) => s + (d.buyerOutstanding || 0), 0)
  const overdueExposure = allDeals
    .filter(d => d.dealStatus === 'Overdue')
    .reduce((s, d) => s + (d.buyerOutstanding || 0), 0)

  // --- Outstanding (buyer / supplier) ---
  const totalBuyerOutstanding = allDeals
    .filter(d => openStatuses.includes(d.dealStatus))
    .reduce((s, d) => s + (d.buyerOutstanding || 0), 0)

  // Supplier outstanding = sum of invoiceAmount for deals where we haven't settled supplier
  // (simplified: supplier outstanding = invoiceAmount for active deals)
  const totalSupplierOutstanding = allDeals
    .filter(d => ['Shipped', 'Accepted', 'Payment Due'].includes(d.dealStatus))
    .reduce((s, d) => s + (d.invoiceAmount || 0), 0)

  // --- Due soon ---
  const dueSoon7 = allDeals.filter(d =>
    d.dueDate && d.dealStatus !== 'Completed' && d.dealStatus !== 'Cancelled' &&
    new Date(d.dueDate) <= next7 && new Date(d.dueDate) >= now
  ).length

  const dueSoon30 = allDeals.filter(d =>
    d.dueDate && d.dealStatus !== 'Completed' && d.dealStatus !== 'Cancelled' &&
    new Date(d.dueDate) <= next30 && new Date(d.dueDate) >= now
  ).length

  // --- Monthly charts (last 6 months) ---
  const months = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i))
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    const label = format(monthStart, 'MMM yy')

    const monthDeals = allDeals.filter(d => {
      const created = new Date(d.createdAt)
      return created >= monthStart && created < monthEnd
    })

    const monthCommission = payments
      .filter(p => p.isCommission && p.paymentDate >= monthStart && p.paymentDate < monthEnd)
      .reduce((s, p) => s + p.amount, 0)

    const monthOverdue = allDeals.filter(d =>
      d.dealStatus === 'Overdue' &&
      d.dueDate && new Date(d.dueDate) >= monthStart && new Date(d.dueDate) < monthEnd
    ).length

    months.push({
      month: label,
      dealCount: monthDeals.length,
      dealVolume: monthDeals.reduce((s, d) => s + (d.invoiceAmount || 0), 0),
      commissionEarned: monthCommission,
      overdueCount: monthOverdue,
    })
  }

  // --- Recent deals (last 5) ---
  const recentDeals = allDeals
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(d => ({
      _id: d._id,
      dealId: d.dealId,
      buyer: d.buyer?.name || '—',
      supplier: d.supplier?.name || '—',
      invoiceAmount: d.invoiceAmount,
      currency: d.currency,
      dealStatus: d.dealStatus,
      dueDate: d.dueDate,
    }))

  res.json({
    counts: {
      active: activeDeals.length,
      completed: completedDeals.length,
      overdue: overdueDeals.length,
      total: allDeals.length,
    },
    commission: {
      expected: totalExpectedCommission,
      received: commissionReceived,
      pending: commissionPending,
    },
    exposure: {
      total: totalExposure,
      overdue: overdueExposure,
    },
    outstanding: {
      buyer: totalBuyerOutstanding,
      supplier: totalSupplierOutstanding,
    },
    dueSoon: { next7: dueSoon7, next30: dueSoon30 },
    charts: { monthly: months },
    recentDeals,
  })
}
