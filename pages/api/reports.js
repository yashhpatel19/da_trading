import { getServerSession } from 'next-auth/next'
import authOptions from './auth/[...nextauth]'
import connectDB from '../../lib/mongodb'
import Deal from '../../models/Deal'
import Payment from '../../models/Payment'
import Party from '../../models/Party'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  await connectDB()

  const { type, dateFrom, dateTo, buyer, supplier } = req.query

  const dealFilter = {}
  if (buyer) dealFilter.buyer = buyer
  if (supplier) dealFilter.supplier = supplier
  if (dateFrom || dateTo) {
    dealFilter.createdAt = {}
    if (dateFrom) dealFilter.createdAt.$gte = new Date(dateFrom)
    if (dateTo) dealFilter.createdAt.$lte = new Date(dateTo)
  }

  const deals = await Deal.find(dealFilter)
    .populate('buyer', 'name country')
    .populate('supplier', 'name country')
    .lean()

  const payments = await Payment.find({ deal: { $in: deals.map(d => d._id) } })
    .populate('party', 'name')
    .lean()

  switch (type) {
    case 'deal_profit': {
      const rows = deals.map(d => ({
        dealId: d.dealId,
        buyer: d.buyer?.name,
        supplier: d.supplier?.name,
        product: d.product,
        invoiceAmount: d.invoiceAmount,
        topAmount: d.topAmount,
        commissionAmount: d.commissionAmount,
        commissionReceived: d.commissionReceived,
        commissionPending: d.commissionPending,
        currency: d.currency,
        dealStatus: d.dealStatus,
        dueDate: d.dueDate,
      }))
      return res.json({ rows, title: 'Deal-wise Profit Report' })
    }

    case 'buyer_outstanding': {
      const buyerMap = {}
      deals.forEach(d => {
        if (!d.buyer) return
        const key = d.buyer._id.toString()
        if (!buyerMap[key]) buyerMap[key] = { name: d.buyer.name, deals: 0, totalExpected: 0, totalReceived: 0, outstanding: 0 }
        buyerMap[key].deals++
        buyerMap[key].totalExpected += d.totalExpected || 0
        buyerMap[key].totalReceived += d.totalReceived || 0
        buyerMap[key].outstanding += d.buyerOutstanding || 0
      })
      return res.json({ rows: Object.values(buyerMap), title: 'Buyer Outstanding Report' })
    }

    case 'commission': {
      const rows = deals.map(d => ({
        dealId: d.dealId,
        buyer: d.buyer?.name,
        invoiceAmount: d.invoiceAmount,
        commissionAmount: d.commissionAmount,
        commissionReceived: d.commissionReceived,
        commissionPending: d.commissionPending,
        currency: d.currency,
        dealStatus: d.dealStatus,
      }))
      const totalExpected = deals.reduce((s, d) => s + (d.commissionAmount || 0), 0)
      const totalReceived = deals.reduce((s, d) => s + (d.commissionReceived || 0), 0)
      return res.json({ rows, summary: { totalExpected, totalReceived, pending: totalExpected - totalReceived }, title: 'Commission Report' })
    }

    case 'overdue': {
      const overdueDeals = deals.filter(d =>
        ['Overdue', 'Payment Due', 'Partially Paid'].includes(d.dealStatus) &&
        d.dueDate && new Date(d.dueDate) < new Date()
      )
      const rows = overdueDeals.map(d => ({
        dealId: d.dealId,
        buyer: d.buyer?.name,
        product: d.product,
        invoiceAmount: d.invoiceAmount,
        outstanding: d.buyerOutstanding,
        dueDate: d.dueDate,
        daysOverdue: Math.max(0, Math.floor((Date.now() - new Date(d.dueDate)) / 86400000)),
        currency: d.currency,
        dealStatus: d.dealStatus,
      }))
      return res.json({ rows, title: 'Overdue Report' })
    }

    case 'monthly_summary': {
      const monthMap = {}
      deals.forEach(d => {
        const key = new Date(d.createdAt).toISOString().slice(0, 7)
        if (!monthMap[key]) monthMap[key] = { month: key, deals: 0, volume: 0, commission: 0, completed: 0, overdue: 0 }
        monthMap[key].deals++
        monthMap[key].volume += d.invoiceAmount || 0
        monthMap[key].commission += d.commissionAmount || 0
        if (d.dealStatus === 'Completed') monthMap[key].completed++
        if (d.dealStatus === 'Overdue') monthMap[key].overdue++
      })
      const rows = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))
      return res.json({ rows, title: 'Monthly Summary Report' })
    }

    default:
      return res.json({ deals, payments })
  }
}
