import { getServerSession } from 'next-auth/next'
import authOptions from '../auth/[...nextauth]'
import connectDB from '../../../lib/mongodb'
import Party from '../../../models/Party'
import Deal from '../../../models/Deal'
import Payment from '../../../models/Payment'
import { calcRiskScore } from '../../../lib/utils'

// Recompute risk score and stats for a party
async function refreshPartyStats(partyId) {
  const [buyerDeals, supplierDeals, payments] = await Promise.all([
    Deal.find({ buyer: partyId }).lean(),
    Deal.find({ supplier: partyId }).lean(),
    Payment.find({ party: partyId, status: 'paid' }).lean(),
  ])

  const allDeals = [...new Map([...buyerDeals, ...supplierDeals].map(d => [d._id.toString(), d])).values()]
  const totalDeals = allDeals.length
  const completedDeals = allDeals.filter(d => d.dealStatus === 'Completed').length
  const overdueDeals = allDeals.filter(d => d.dealStatus === 'Overdue').length
  const totalVolume = buyerDeals.reduce((s, d) => s + (d.invoiceAmount || 0), 0)
  const totalOverdueAmount = allDeals
    .filter(d => d.dealStatus === 'Overdue')
    .reduce((s, d) => s + (d.buyerOutstanding || 0), 0)

  // Average delay: for completed deals, check if any overdue payment was recorded
  const partialPaymentCount = allDeals.filter(d => d.dealStatus === 'Partially Paid').length

  // Simple avg delay: assume 0 for now (can be enhanced with actual payment dates)
  const avgDelayDays = overdueDeals > 0 ? Math.round((overdueDeals / Math.max(totalDeals, 1)) * 30) : 0

  const riskScore = calcRiskScore({
    totalDeals,
    overdueDeals,
    avgDelayDays,
    overdueAmount: totalOverdueAmount,
    partialPayments: partialPaymentCount,
    completedDeals,
  })

  await Party.findByIdAndUpdate(partyId, {
    totalDeals,
    completedDeals,
    overdueDeals,
    totalVolume,
    avgDelayDays,
    partialPaymentCount,
    totalOverdueAmount,
    riskScore,
  })
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  await connectDB()
  const { id } = req.query

  if (req.method === 'GET') {
    const party = await Party.findById(id).lean()
    if (!party) return res.status(404).json({ error: 'Party not found' })

    // Refresh stats on view
    await refreshPartyStats(id)
    const updated = await Party.findById(id).lean()

    // Fetch deals for this party
    const [buyerDeals, supplierDeals] = await Promise.all([
      Deal.find({ buyer: id }).populate('supplier', 'name').sort({ createdAt: -1 }).lean(),
      Deal.find({ supplier: id }).populate('buyer', 'name').sort({ createdAt: -1 }).lean(),
    ])

    // Fetch payments
    const payments = await Payment.find({ party: id })
      .populate('deal', 'dealId')
      .sort({ paymentDate: -1 })
      .limit(20)
      .lean()

    return res.json({ party: updated, buyerDeals, supplierDeals, payments })
  }

  if (req.method === 'PUT') {
    const party = await Party.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
    if (!party) return res.status(404).json({ error: 'Party not found' })
    return res.json(party)
  }

  if (req.method === 'DELETE') {
    await Party.findByIdAndDelete(id)
    return res.json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export { refreshPartyStats }
