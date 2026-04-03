import { getServerSession } from 'next-auth/next'
import authOptions from '../auth/[...nextauth]'
import connectDB from '../../../lib/mongodb'
import Deal from '../../../models/Deal'
import { generateDealId } from '../../../lib/utils'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  await connectDB()

  if (req.method === 'GET') {
    const {
      buyer, supplier, status, etaFrom, etaTo, overdue,
      search, page = 1, limit = 50,
    } = req.query

    const filter = {}
    if (buyer) filter.buyer = buyer
    if (supplier) filter.supplier = supplier
    if (status) filter.dealStatus = status

    if (search) {
      filter.$or = [
        { dealId: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { 'products.category': { $regex: search, $options: 'i' } },
        { 'products.grade': { $regex: search, $options: 'i' } },
      ]
    }

    if (etaFrom || etaTo) {
      filter.eta = {}
      if (etaFrom) filter.eta.$gte = new Date(etaFrom)
      if (etaTo) filter.eta.$lte = new Date(etaTo)
    }

    if (overdue === 'true') {
      // Invoice overdue = past eta + freeDays
      // We filter roughly by eta < today and status not closed
      filter.eta = { $lt: new Date() }
      filter.dealStatus = { $nin: ['Fully Paid', 'Had Claim', 'Cancelled'] }
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [deals, total] = await Promise.all([
      Deal.find(filter)
        .populate('buyer', 'name country type')
        .populate('supplier', 'name country type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Deal.countDocuments(filter),
    ])

    return res.json({ deals, total, page: Number(page), limit: Number(limit) })
  }

  if (req.method === 'POST') {
    const data = req.body
    if (!data.dealId) data.dealId = generateDealId()

    // Ensure products is an array
    if (!Array.isArray(data.products)) data.products = []

    const deal = new Deal(data)
    await deal.save()  // pre-save calculates all totals
    const populated = await Deal.findById(deal._id).populate('buyer', 'name country').populate('supplier', 'name country')
    return res.status(201).json(populated)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
