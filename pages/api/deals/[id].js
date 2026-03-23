import { getServerSession } from 'next-auth/next'
import authOptions from '../auth/[...nextauth]'
import connectDB from '../../../lib/mongodb'
import Deal from '../../../models/Deal'
import Payment from '../../../models/Payment'

// Recalculate deal financial totals based on payments
async function recalcDealTotals(dealId) {
  const payments = await Payment.find({ deal: dealId, status: 'paid' })

  const totalReceived = payments
    .filter(p => p.direction === 'received')
    .reduce((s, p) => s + p.amount, 0)

  const commissionReceived = payments
    .filter(p => p.isCommission && p.direction === 'received')
    .reduce((s, p) => s + p.amount, 0)

  const deal = await Deal.findById(dealId)
  if (!deal) return

  deal.totalReceived = totalReceived
  deal.commissionReceived = commissionReceived
  deal.buyerOutstanding = Math.max(0, deal.totalExpected - totalReceived)
  deal.commissionPending = Math.max(0, deal.commissionAmount - commissionReceived)

  // Auto-update payment status
  if (totalReceived === 0) {
    deal.paymentStatus = 'Not Started'
  } else if (totalReceived >= deal.totalExpected) {
    deal.paymentStatus = 'Full'
    if (deal.dealStatus !== 'Cancelled') deal.dealStatus = 'Completed'
  } else {
    deal.paymentStatus = 'Partial'
    if (!['Completed', 'Cancelled'].includes(deal.dealStatus)) {
      deal.dealStatus = 'Partially Paid'
    }
  }

  // Check overdue
  if (deal.dueDate && new Date(deal.dueDate) < new Date() &&
      !['Completed', 'Cancelled'].includes(deal.dealStatus) &&
      deal.paymentStatus !== 'Full') {
    deal.dealStatus = 'Overdue'
    deal.paymentStatus = 'Overdue'
  }

  await deal.save()
  return deal
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  await connectDB()
  const { id } = req.query

  if (req.method === 'GET') {
    const deal = await Deal.findById(id)
      .populate('buyer', 'name country city contactPerson email phone riskScore')
      .populate('supplier', 'name country city contactPerson email phone')
      .lean()

    if (!deal) return res.status(404).json({ error: 'Deal not found' })

    // Fetch all payments for this deal
    const payments = await Payment.find({ deal: id })
      .populate('party', 'name type')
      .sort({ paymentDate: -1 })
      .lean()

    return res.json({ deal, payments })
  }

  if (req.method === 'PUT') {
    const data = req.body

    // Recalculate dueDate if acceptance date or tenor changed
    if (data.acceptanceDate && data.daTenor) {
      const d = new Date(data.acceptanceDate)
      d.setDate(d.getDate() + Number(data.daTenor))
      data.dueDate = d
    }

    data.totalExpected = (Number(data.invoiceAmount) || 0) + (Number(data.topAmount) || 0)

    const deal = await Deal.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('buyer', 'name')
      .populate('supplier', 'name')

    if (!deal) return res.status(404).json({ error: 'Deal not found' })

    // Recalculate totals from payments
    await recalcDealTotals(id)
    const updated = await Deal.findById(id).populate('buyer', 'name').populate('supplier', 'name')

    return res.json(updated)
  }

  if (req.method === 'DELETE') {
    const deal = await Deal.findByIdAndDelete(id)
    if (!deal) return res.status(404).json({ error: 'Deal not found' })
    // Also delete associated payments
    await Payment.deleteMany({ deal: id })
    return res.json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export { recalcDealTotals }
