import { getServerSession } from 'next-auth/next'
import authOptions from '../auth/[...nextauth]'
import connectDB from '../../../lib/mongodb'
import Payment from '../../../models/Payment'
import Deal from '../../../models/Deal'

async function recalcDeal(dealId) {
  const payments = await Payment.find({ deal: dealId, status: 'paid', direction: 'received' })
  const totalReceived = payments.reduce((s, p) => s + p.amount, 0)
  const commissionReceived = payments.filter(p => p.isCommission).reduce((s, p) => s + p.amount, 0)

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
  const { id } = req.query

  if (req.method === 'PUT') {
    const data = req.body
    if (data.type === 'commission') data.isCommission = true

    const payment = await Payment.findByIdAndUpdate(id, data, { new: true })
    if (!payment) return res.status(404).json({ error: 'Payment not found' })

    if (payment.deal) await recalcDeal(payment.deal)
    return res.json(payment)
  }

  if (req.method === 'DELETE') {
    const payment = await Payment.findByIdAndDelete(id)
    if (!payment) return res.status(404).json({ error: 'Payment not found' })
    if (payment.deal) await recalcDeal(payment.deal)
    return res.json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
