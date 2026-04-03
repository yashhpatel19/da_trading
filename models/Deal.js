import mongoose from 'mongoose'

const DealSchema = new mongoose.Schema({
  dealId: { type: String, required: true, unique: true },

  // Parties
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },

  // Product details
  product: { type: String, required: true },
  productCategory: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'CBM' },
  qualitySpec: { type: String, default: '' }, // quality / spec / size

  // Financials
  invoiceAmount: { type: Number, required: true, default: 0 },
  topAmount: { type: Number, default: 0 },     // cash/top component
  commissionAmount: { type: Number, default: 0 }, // our commission
  currency: { type: String, default: 'USD' },

  // Dates
  shipmentDate: { type: Date },
  acceptanceDate: { type: Date },
  daTenor: { type: Number, default: 90 },       // days (e.g. 90, 120, 180)
  dueDate: { type: Date },                       // auto-calc: acceptanceDate + daTenor

  // Status
  dealStatus: {
    type: String,
    enum: ['Draft', 'Confirmed', 'Shipped', 'Accepted', 'Payment Due', 'Partially Paid', 'Completed', 'Overdue', 'Cancelled'],
    default: 'Draft',
  },
  paymentStatus: {
    type: String,
    enum: ['Not Started', 'Partial', 'Full', 'Overdue'],
    default: 'Not Started',
  },

  // Computed payment fields (updated on each payment)
  totalExpected: { type: Number, default: 0 },  // invoiceAmount + topAmount
  totalReceived: { type: Number, default: 0 },  // sum of all received payments
  buyerOutstanding: { type: Number, default: 0 }, // totalExpected - totalReceived
  commissionReceived: { type: Number, default: 0 },
  commissionPending: { type: Number, default: 0 },

  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
})

// Before save: recalculate derived fields
DealSchema.pre('save', function (next) {
  // Auto-calculate due date if acceptance date and tenor are set
  if (this.acceptanceDate && this.daTenor) {
    const d = new Date(this.acceptanceDate)
    d.setDate(d.getDate() + this.daTenor)
    this.dueDate = d
  }

  // Total expected = invoice + top
  this.totalExpected = (this.invoiceAmount || 0) + (this.topAmount || 0)

  // Outstanding
  this.buyerOutstanding = Math.max(0, this.totalExpected - (this.totalReceived || 0))

  // Commission pending
  this.commissionPending = Math.max(0, (this.commissionAmount || 0) - (this.commissionReceived || 0))

  next()
})

DealSchema.index({ buyer: 1 })
DealSchema.index({ supplier: 1 })
DealSchema.index({ dealStatus: 1 })
DealSchema.index({ dueDate: 1 })
DealSchema.index({ dealId: 1 })

export default mongoose.models.Deal || mongoose.model('Deal', DealSchema)
