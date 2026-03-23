import mongoose from 'mongoose'

const PartySchema = new mongoose.Schema({
  name: { type: String, required: true },
  // A party can be buyer, supplier, or both
  type: { type: String, enum: ['buyer', 'supplier', 'both'], required: true },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  bankDetails: { type: String, default: '' },
  notes: { type: String, default: '' },

  // Risk metrics (updated via deals/payments aggregation)
  riskScore: { type: Number, default: 0 },          // 0-100
  totalDeals: { type: Number, default: 0 },
  completedDeals: { type: Number, default: 0 },
  overdueDeals: { type: Number, default: 0 },
  totalVolume: { type: Number, default: 0 },        // sum of invoice amounts
  avgDelayDays: { type: Number, default: 0 },       // avg days late
  partialPaymentCount: { type: Number, default: 0 },
  totalOverdueAmount: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
})

PartySchema.index({ name: 1 })
PartySchema.index({ type: 1 })

export default mongoose.models.Party || mongoose.model('Party', PartySchema)
