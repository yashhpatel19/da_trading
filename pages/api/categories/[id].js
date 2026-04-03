import { getServerSession } from 'next-auth/next'
import authOptions from '../auth/[...nextauth]'
import connectDB from '../../../lib/mongodb'
import ProductCategory from '../../../models/ProductCategory'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  await connectDB()
  const { id } = req.query

  if (req.method === 'GET') {
    const cat = await ProductCategory.findById(id).lean()
    if (!cat) return res.status(404).json({ error: 'Not found' })
    return res.json(cat)
  }

  if (req.method === 'PUT') {
    const { name, sizes, grades } = req.body
    const cat = await ProductCategory.findByIdAndUpdate(
      id, { name, sizes, grades }, { new: true, runValidators: true }
    )
    if (!cat) return res.status(404).json({ error: 'Not found' })
    return res.json(cat)
  }

  if (req.method === 'DELETE') {
    await ProductCategory.findByIdAndDelete(id)
    return res.json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
