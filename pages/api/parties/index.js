import { getServerSession } from 'next-auth/next'
import authOptions from '../auth/[...nextauth]'
import connectDB from '../../../lib/mongodb'
import Party from '../../../models/Party'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  await connectDB()

  if (req.method === 'GET') {
    const { type, search } = req.query
    const filter = {}
    if (type) filter.type = type === 'both' ? { $in: ['buyer', 'supplier', 'both'] } : { $in: [type, 'both'] }
    if (search) filter.name = { $regex: search, $options: 'i' }

    const parties = await Party.find(filter).sort({ name: 1 }).lean()
    return res.json(parties)
  }

  if (req.method === 'POST') {
    const party = await Party.create(req.body)
    return res.status(201).json(party)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
