import { getServerSession } from 'next-auth/next'
import authOptions from '../auth/[...nextauth]'
import connectDB from '../../../lib/mongodb'
import Payment from '../../../models/Payment'
import Deal from '../../../models/Deal'

// Recalculate deal totals after payment change
async function recalcDeal(dealId) {
  const payments = await Payment.find({ deal: dealId, status: 'paid', direction: 'received' })
  const totalReceived = payments.reduce((s, p) => s + p.amount, 0)
  const commissionReceived = payments
    .filter(p => p.isCommission)
    .reduce((s, p) => s + p.amount, 0)

  const deal = await Deal.findById(dealId)
  if (!deal) return

  deal.totalReceived = totalReceived
  deal.commissionReceived = commissionReceived
  deal.buyerOutstanding = Math.max(0, deal.totalExpected - totalReceived)
  deal.commissionPending = Math.max(0, deal.commissionAmount - commissionReceived)

  if (totalReceived === 0) {
    deal.paymentStatus = 'Not Started'
  } else if (totalReceived >= deal.totalExpected) {
    deal.paymentStatus = 'Full'
    if (!['Cancelled'].includes(deal.dealStatus)) deal.dealStatus = 'Completed'
  } else {
    deal.paymentStatus = 'Partial'
    if (!['Completed', 'Cancelled'].includes(deal.dealStatus)) deal.dealStatus = 'Partially Paid'
  }

  // Overdue check
  if (deal.dueDate && new Date(deal.dueDate) < new Date() &&
      !['Completed', 'Cancelled'].includes(deal.dealStatus)) {
    deal.dealStatus = 'Overdue'
    deal.paymentStatus = 'Overdue'
  }

  await deal.save()
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  await connectDB()

  if (req.method === 'GET') {
    const { deal, party, status, type, page = 1, limit = 50 } = req.query
    const filter = {}
    if (deal) filter.deal = deal
    if (party) filter.party = party
    if (status) filter.status = status
    if (type) filter.type = type

    const skip = (Number(page) - 1) * Number(limit)
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('deal', 'dealId currency')
        .populate('party', 'name type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Payment.countDocuments(filter),
    ])

    return res.json({ payments, total })
  }

  if (req.method === 'POST') {
    const data = req.body

    // Set isCommission flag
    if (data.type === 'commission') data.isCommission = true

    const payment = await Payment.create(data)

    // Recalc deal totals
    if (data.deal) await recalcDeal(data.deal)

    const populated = await Payment.findById(payment._id)
      .populate('deal', 'dealId')
      .populate('party', 'name')

    return res.status(201).json(populated)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
