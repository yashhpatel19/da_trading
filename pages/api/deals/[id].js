import { getServerSession } from 'next-auth/next'
import authOptions from '../auth/[...nextauth]'
import connectDB from '../../../lib/mongodb'
import Deal from '../../../models/Deal'
import Payment from '../../../models/Payment'

// Recalculate deal payment totals from actual payments
async function recalcDealTotals(dealId) {
  const payments = await Payment.find({ deal: dealId, status: 'paid' })

  const totalReceived = payments
    .filter(p => p.direction === 'received')
    .reduce((s, p) => s + p.amount, 0)

  const invoiceReceived = payments
    .filter(p => p.direction === 'received' && ['invoice', 'partial'].includes(p.type))
    .reduce((s, p) => s + p.amount, 0)

  const topReceived = payments
    .filter(p => p.direction === 'received' && ['top', 'commission'].includes(p.type))
    .reduce((s, p) => s + p.amount, 0)

  const commissionReceived = payments
    .filter(p => p.isCommission && p.direction === 'received')
    .reduce((s, p) => s + p.amount, 0)

  const deal = await Deal.findById(dealId)
  if (!deal) return

  deal.totalReceived      = totalReceived
  deal.invoiceReceived    = invoiceReceived
  deal.topReceived        = topReceived
  deal.commissionReceived = commissionReceived
  // buyerOutstanding, commissionPending recalculated in pre-save
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

    const payments = await Payment.find({ deal: id })
      .populate('party', 'name type')
      .sort({ paymentDate: -1 })
      .lean()

    return res.json({ deal, payments })
  }

  if (req.method === 'PUT') {
    const data = req.body
    if (!Array.isArray(data.products)) data.products = []

    const deal = await Deal.findById(id)
    if (!deal) return res.status(404).json({ error: 'Deal not found' })

    Object.assign(deal, data)
    await deal.save()  // pre-save recalculates everything

    await recalcDealTotals(id)
    const updated = await Deal.findById(id)
      .populate('buyer', 'name country')
      .populate('supplier', 'name country')

    return res.json(updated)
  }

  if (req.method === 'DELETE') {
    const deal = await Deal.findByIdAndDelete(id)
    if (!deal) return res.status(404).json({ error: 'Deal not found' })
    await Payment.deleteMany({ deal: id })
    return res.json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export { recalcDealTotals }
