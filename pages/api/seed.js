// POST /api/seed - Seeds the database with demo data (dev only)
import connectDB from '../../lib/mongodb'
import User from '../../models/User'
import Party from '../../models/Party'
import Deal from '../../models/Deal'
import Payment from '../../models/Payment'
import bcrypt from 'bcryptjs'

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

  // Create admin user
  const hashed = await bcrypt.hash('admin123', 12)
  await User.create({ name: 'Admin User', email: 'admin@datrading.com', password: hashed, role: 'admin' })

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

  // Create deals with varied statuses
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
    {
      dealId: 'DA-202502-1002',
      supplier: vnWood._id, buyer: delhi._id,
      product: 'Plywood Sheets', productCategory: 'Timber', quantity: 320, unit: 'CBM', qualitySpec: '18mm, E2 grade, 8x4 ft',
      invoiceAmount: 52000, topAmount: 4500, commissionAmount: 3200, currency: 'USD',
      shipmentDate: daysAgo(40), acceptanceDate: daysAgo(25), daTenor: 120, dueDate: daysAhead(95),
      dealStatus: 'Accepted', paymentStatus: 'Not Started',
      totalExpected: 56500, totalReceived: 0, buyerOutstanding: 56500, commissionPending: 3200,
      notes: 'Long tenor deal. Buyer requested 120 days DA.',
    },
    {
      dealId: 'DA-202502-1003',
      supplier: sseSteel._id, buyer: bangalore._id,
      product: 'MS Steel Bars', productCategory: 'Steel', quantity: 180, unit: 'CBM', qualitySpec: 'Fe500, 12mm dia, ISI marked',
      invoiceAmount: 124000, topAmount: 12000, commissionAmount: 8200, currency: 'USD',
      shipmentDate: daysAgo(110), acceptanceDate: daysAgo(95), daTenor: 90, dueDate: daysAgo(5),
      dealStatus: 'Overdue', paymentStatus: 'Overdue',
      totalExpected: 136000, totalReceived: 50000, buyerOutstanding: 86000, commissionReceived: 0, commissionPending: 8200,
      notes: 'Payment overdue. Follow up urgently with Mr. Suresh Kumar.',
    },
    {
      dealId: 'DA-202503-1004',
      supplier: mpob._id, buyer: chennai._id,
      product: 'Crude Palm Oil', productCategory: 'Agri Commodity', quantity: 500, unit: 'CBM', qualitySpec: 'RBD Palm Oil, FFA < 0.1%',
      invoiceAmount: 98000, topAmount: 9000, commissionAmount: 6500, currency: 'USD',
      shipmentDate: daysAgo(20), acceptanceDate: daysAgo(10), daTenor: 90, dueDate: daysAhead(80),
      dealStatus: 'Accepted', paymentStatus: 'Not Started',
      totalExpected: 107000, totalReceived: 0, buyerOutstanding: 107000, commissionPending: 6500,
      notes: 'Smooth transaction. Regular buyer.',
    },
    {
      dealId: 'DA-202412-1005',
      supplier: gzTimber._id, buyer: kolkata._id,
      product: 'Hardwood Timber', productCategory: 'Timber', quantity: 380, unit: 'CBM', qualitySpec: 'Mixed hardwood, 25-40cm',
      invoiceAmount: 76000, topAmount: 7000, commissionAmount: 5000, currency: 'USD',
      shipmentDate: daysAgo(140), acceptanceDate: daysAgo(125), daTenor: 90, dueDate: daysAgo(35),
      dealStatus: 'Completed', paymentStatus: 'Full',
      totalExpected: 83000, totalReceived: 83000, buyerOutstanding: 0, commissionReceived: 5000, commissionPending: 0,
      notes: 'Completed on time. Good experience.',
    },
    {
      dealId: 'DA-202501-1006',
      supplier: sseSteel._id, buyer: ahmedabad._id,
      product: 'HR Steel Coils', productCategory: 'Steel', quantity: 220, unit: 'CBM', qualitySpec: 'IS:1079, 2mm thickness, 1250mm width',
      invoiceAmount: 145000, topAmount: 14000, commissionAmount: 9500, currency: 'USD',
      shipmentDate: daysAgo(85), acceptanceDate: daysAgo(70), daTenor: 90, dueDate: daysAgo(20),
      dealStatus: 'Partially Paid', paymentStatus: 'Partial',
      totalExpected: 159000, totalReceived: 80000, buyerOutstanding: 79000, commissionReceived: 3000, commissionPending: 6500,
      notes: 'Buyer paid 50%. Balance expected soon.',
    },
    {
      dealId: 'DA-202503-1007',
      supplier: vnWood._id, buyer: mumbai._id,
      product: 'MDF Boards', productCategory: 'Timber', quantity: 290, unit: 'CBM', qualitySpec: '12mm & 18mm, E1 grade',
      invoiceAmount: 43000, topAmount: 4000, commissionAmount: 2800, currency: 'USD',
      shipmentDate: daysAgo(5), acceptanceDate: null, daTenor: 90, dueDate: null,
      dealStatus: 'Shipped', paymentStatus: 'Not Started',
      totalExpected: 47000, totalReceived: 0, buyerOutstanding: 47000, commissionPending: 2800,
      notes: 'Vessel departed. ETA 15 days.',
    },
    {
      dealId: 'DA-202503-1008',
      supplier: mpob._id, buyer: delhi._id,
      product: 'Palm Fatty Acid Distillate', productCategory: 'Agri Commodity', quantity: 420, unit: 'CBM', qualitySpec: 'PFAD, FFA 90%+',
      invoiceAmount: 67000, topAmount: 6000, commissionAmount: 4200, currency: 'USD',
      shipmentDate: null, acceptanceDate: null, daTenor: 90, dueDate: null,
      dealStatus: 'Confirmed', paymentStatus: 'Not Started',
      totalExpected: 73000, totalReceived: 0, buyerOutstanding: 73000, commissionPending: 4200,
      notes: 'LC opened. Shipment scheduled next week.',
    },
    {
      dealId: 'DA-202412-1009',
      supplier: gzTimber._id, buyer: bangalore._id,
      product: 'Bamboo Flooring', productCategory: 'Timber', quantity: 160, unit: 'CBM', qualitySpec: 'Natural horizontal, 14mm, T&G',
      invoiceAmount: 38000, topAmount: 3500, commissionAmount: 2500, currency: 'USD',
      shipmentDate: daysAgo(160), acceptanceDate: daysAgo(145), daTenor: 120, dueDate: daysAgo(25),
      dealStatus: 'Completed', paymentStatus: 'Full',
      totalExpected: 41500, totalReceived: 41500, buyerOutstanding: 0, commissionReceived: 2500, commissionPending: 0,
      notes: 'Completed. Repeat order expected.',
    },
    {
      dealId: 'DA-202502-1010',
      supplier: sseSteel._id, buyer: chennai._id,
      product: 'Stainless Steel Sheets', productCategory: 'Steel', quantity: 90, unit: 'CBM', qualitySpec: 'SS304, 2B finish, 1.5mm',
      invoiceAmount: 89000, topAmount: 8500, commissionAmount: 5800, currency: 'USD',
      shipmentDate: daysAgo(55), acceptanceDate: daysAgo(40), daTenor: 90, dueDate: daysAhead(50),
      dealStatus: 'Payment Due', paymentStatus: 'Not Started',
      totalExpected: 97500, totalReceived: 0, buyerOutstanding: 97500, commissionPending: 5800,
      notes: 'First steel deal with Chennai Port Traders.',
    },
  ])

  // Create payments for deals with received amounts
  const paymentData = []

  // Deal 1003 - Partial payment received (Overdue - Bangalore Steel)
  paymentData.push({
    deal: deals[2]._id, party: bangalore._id,
    amount: 50000, currency: 'USD', type: 'partial', direction: 'received',
    paymentDate: daysAgo(10), status: 'paid', mode: 'bank_transfer',
    reference: 'TT/BNK/2025/03/441', isCommission: false,
    remarks: 'First instalment received. Balance 86000 still pending.',
  })

  // Deal 1005 - Completed (Kolkata)
  paymentData.push({
    deal: deals[4]._id, party: kolkata._id,
    amount: 78000, currency: 'USD', type: 'invoice', direction: 'received',
    paymentDate: daysAgo(38), status: 'paid', mode: 'bank_transfer',
    reference: 'TT/KOL/2024/12/188', isCommission: false,
    remarks: 'Invoice portion received.',
  })
  paymentData.push({
    deal: deals[4]._id, party: kolkata._id,
    amount: 5000, currency: 'USD', type: 'commission', direction: 'received',
    paymentDate: daysAgo(36), status: 'paid', mode: 'cash',
    reference: 'CASH-1005-COMM', isCommission: true,
    remarks: 'Commission received in cash.',
  })

  // Deal 1006 - Partial (Ahmedabad Steel)
  paymentData.push({
    deal: deals[5]._id, party: ahmedabad._id,
    amount: 80000, currency: 'USD', type: 'partial', direction: 'received',
    paymentDate: daysAgo(15), status: 'paid', mode: 'bank_transfer',
    reference: 'TT/AHD/2025/01/332', isCommission: false,
    remarks: 'Partial payment - first instalment.',
  })
  paymentData.push({
    deal: deals[5]._id, party: ahmedabad._id,
    amount: 3000, currency: 'USD', type: 'commission', direction: 'received',
    paymentDate: daysAgo(14), status: 'paid', mode: 'bank_transfer',
    reference: 'TT/AHD/2025/01/333', isCommission: true,
    remarks: 'Partial commission received.',
  })

  // Deal 1009 - Completed (Bangalore Bamboo)
  paymentData.push({
    deal: deals[8]._id, party: bangalore._id,
    amount: 41500, currency: 'USD', type: 'final_settlement', direction: 'received',
    paymentDate: daysAgo(28), status: 'paid', mode: 'bank_transfer',
    reference: 'TT/BNG/2024/12/091', isCommission: false,
    remarks: 'Full and final settlement.',
  })
  paymentData.push({
    deal: deals[8]._id, party: bangalore._id,
    amount: 2500, currency: 'USD', type: 'commission', direction: 'received',
    paymentDate: daysAgo(27), status: 'paid', mode: 'cash',
    reference: 'CASH-1009-COMM', isCommission: true,
    remarks: 'Commission received.',
  })

  await Payment.insertMany(paymentData)

  res.json({ success: true, message: 'Database seeded successfully', counts: { parties: parties.length, deals: deals.length, payments: paymentData.length } })
}
