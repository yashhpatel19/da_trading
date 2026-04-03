import { getServerSession } from 'next-auth/next'
import authOptions from '../auth/[...nextauth]'
import connectDB from '../../../lib/mongodb'
import ProductCategory from '../../../models/ProductCategory'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  await connectDB()

  if (req.method === 'GET') {
    const categories = await ProductCategory.find().sort({ name: 1 }).lean()
    return res.json(categories)
  }

  if (req.method === 'POST') {
    const { name, sizes = [], grades = [] } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const cat = await ProductCategory.create({ name, sizes, grades })
    return res.status(201).json(cat)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
