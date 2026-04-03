// POST /api/seed - Seeds the database with demo data (dev only)
import connectDB from '../../lib/mongodb'
import User from '../../models/User'
import Party from '../../models/Party'
import Deal from '../../models/Deal'
import Payment from '../../models/Payment'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Not allowed in production' })

  await connectDB()

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Party.deleteMany({}),
    Deal.deleteMany({}),
    Payment.deleteMany({}),
  ])

  // ✅ Create admin user (FIXED: no manual hashing)
  await User.create({
    name: 'Admin User',
    email: 'admin@datrading.com',
    password: 'admin123',
    role: 'admin',
  })

  // Create parties
  const parties = await Party.insertMany([
    { name: 'Guangzhou Timber Co.', type: 'supplier', country: 'China', city: 'Guangzhou', contactPerson: 'Mr. Chen Wei', email: 'chen@gztimber.cn', phone: '+86-20-88887777' },
    { name: 'Shanghai Steel Exports', type: 'supplier', country: 'China', city: 'Shanghai', contactPerson: 'Ms. Li Na', email: 'li.na@sse.cn', phone: '+86-21-55556666' },
    { name: 'Vietnam Wood Products', type: 'supplier', country: 'Vietnam', city: 'Ho Chi Minh City', contactPerson: 'Mr. Nguyen Van A', email: 'nguyen@vwp.vn', phone: '+84-28-99998888' },
    { name: 'Malaysian Palm Oil Board', type: 'supplier', country: 'Malaysia', city: 'Kuala Lumpur', contactPerson: 'Mr. Ahmad Razak', email: 'ahmad@mpob.my', phone: '+60-3-22223333' },
    { name: 'Mumbai Traders Pvt Ltd', type: 'buyer', country: 'India', city: 'Mumbai', contactPerson: 'Mr. Rajesh Shah', email: 'rajesh@mumbaitraders.in', phone: '+91-22-44445555' },
    { name: 'Delhi Imports & Co', type: 'buyer', country: 'India', city: 'Delhi', contactPerson: 'Ms. Priya Mehra', email: 'priya@delhiimports.in', phone: '+91-11-33334444' },
    { name: 'Bangalore Wood Depot', type: 'buyer', country: 'India', city: 'Bangalore', contactPerson: 'Mr. Suresh Kumar', email: 'suresh@bwdepot.in', phone: '+91-80-22223333' },
    { name: 'Chennai Port Traders', type: 'buyer', country: 'India', city: 'Chennai', contactPerson: 'Mr. Arjun Nair', email: 'arjun@cpt.in', phone: '+91-44-11112222' },
    { name: 'Kolkata Commodity House', type: 'both', country: 'India', city: 'Kolkata', contactPerson: 'Mr. Sanjay Bose', email: 'sanjay@kch.in', phone: '+91-33-66667777' },
    { name: 'Ahmedabad Steel Works', type: 'buyer', country: 'India', city: 'Ahmedabad', contactPerson: 'Mr. Vikram Patel', email: 'vikram@asw.in', phone: '+91-79-88889999' },
  ])

  const [gzTimber, sseSteel, vnWood, mpob, mumbai, delhi, bangalore, chennai, kolkata, ahmedabad] = parties

  const now = new Date()
  const daysAgo = (n) => new Date(now - n * 86400000)
  const daysAhead = (n) => new Date(now.getTime() + n * 86400000)

  // Create deals (unchanged)
  const deals = await Deal.insertMany([
    {
      dealId: 'DA-202501-1001',
      supplier: gzTimber._id, buyer: mumbai._id,
      product: 'Teak Wood Logs', productCategory: 'Timber', quantity: 450, unit: 'CBM', qualitySpec: 'Grade A, 30-50cm diameter',
      invoiceAmount: 87000, topAmount: 8000, commissionAmount: 5500, currency: 'USD',
      shipmentDate: daysAgo(75), acceptanceDate: daysAgo(60), daTenor: 90, dueDate: daysAhead(30),
      dealStatus: 'Payment Due', paymentStatus: 'Not Started',
      totalExpected: 95000, totalReceived: 0, buyerOutstanding: 95000, commissionPending: 5500,
      notes: 'First deal with Mumbai Traders. Quality approved on arrival.',
    },
    // (rest of your deals unchanged)
  ])

  // Payments (unchanged)
  const paymentData = []

  paymentData.push({
    deal: deals[2]._id, party: bangalore._id,
    amount: 50000, currency: 'USD', type: 'partial', direction: 'received',
    paymentDate: daysAgo(10), status: 'paid', mode: 'bank_transfer',
    reference: 'TT/BNK/2025/03/441', isCommission: false,
    remarks: 'First instalment received. Balance 86000 still pending.',
  })

  await Payment.insertMany(paymentData)

  res.json({
    success: true,
    message: 'Database seeded successfully',
    counts: {
      parties: parties.length,
      deals: deals.length,
      payments: paymentData.length,
    },
  })
}
