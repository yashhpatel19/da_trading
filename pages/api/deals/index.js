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
      buyer, supplier, product, status, paymentStatus,
      dateFrom, dateTo, dueDateFrom, dueDateTo,
      overdue, search, page = 1, limit = 50,
    } = req.query

    const filter = {}

    if (buyer) filter.buyer = buyer
    if (supplier) filter.supplier = supplier
    if (status) filter.dealStatus = status
    if (paymentStatus) filter.paymentStatus = paymentStatus

    if (product) filter.product = { $regex: product, $options: 'i' }
    if (search) {
      filter.$or = [
        { dealId: { $regex: search, $options: 'i' } },
        { product: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ]
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {}
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom)
      if (dateTo) filter.createdAt.$lte = new Date(dateTo)
    }

    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {}
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom)
      if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo)
    }

    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() }
      filter.dealStatus = { $nin: ['Completed', 'Cancelled'] }
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

    // Auto-generate deal ID if not provided
    if (!data.dealId) {
      data.dealId = generateDealId()
    }

    // Calculate due date
    if (data.acceptanceDate && data.daTenor) {
      const d = new Date(data.acceptanceDate)
      d.setDate(d.getDate() + Number(data.daTenor))
      data.dueDate = d
    }

    // Set totalExpected
    data.totalExpected = (Number(data.invoiceAmount) || 0) + (Number(data.topAmount) || 0)
    data.buyerOutstanding = data.totalExpected
    data.commissionPending = Number(data.commissionAmount) || 0

    const deal = await Deal.create(data)
    const populated = await deal.populate(['buyer', 'supplier'])
    return res.status(201).json(populated)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
