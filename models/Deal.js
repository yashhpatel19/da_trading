import mongoose from 'mongoose'

// Embedded product line schema
const ProductLineSchema = new mongoose.Schema({
  category:           { type: String, default: '' },
  size:               { type: String, default: '' },
  grade:              { type: String, default: '' },
  quantity:           { type: Number, default: 0 },  // CBM

  invoiceRatePerCBM:  { type: Number, default: 0 },  // rate on invoice document
  totalRatePerCBM:    { type: Number, default: 0 },  // total rate charged to customer (invoice + top)
  supplierRatePerCBM: { type: Number, default: 0 },  // what agent owes supplier per CBM

  // Calculated fields (set by pre-save)
  topRatePerCBM:      { type: Number, default: 0 },  // totalRatePerCBM - invoiceRatePerCBM
  invoiceAmount:      { type: Number, default: 0 },  // invoiceRatePerCBM * quantity
  topAmount:          { type: Number, default: 0 },  // topRatePerCBM * quantity
  supplierTotal:      { type: Number, default: 0 },  // supplierRatePerCBM * quantity
}, { _id: true })

const DealSchema = new mongoose.Schema({
  dealId:   { type: String, required: true, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  buyer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  currency: { type: String, default: 'USD' },

  // Multi-product lines
  products: [ProductLineSchema],

  // Timeline
  eta:         { type: Date },            // ETA of shipment = invoice 1st due date
  freeDays:    { type: Number, default: 0 }, // free days at port; eta+freeDays = invoice last urgent due
  topDueDate:  { type: Date },            // due date for top amount (manually set)

  // Status
  dealStatus: {
    type: String,
    enum: ['Draft', 'Confirmed', 'Shipped', 'BL Sent', 'Invoice Paid', 'Fully Paid', 'Had Claim', 'Cancelled'],
    default: 'Draft',
  },

  // Claim fields (when dealStatus = 'Had Claim')
  supplierClaimShare: { type: Number, default: 0 }, // supplier bears this portion
  myClaimShare:       { type: Number, default: 0 }, // agent bears this portion (loss)

  // Computed totals from product lines
  totalInvoiceAmount:  { type: Number, default: 0 },
  totalTopAmount:      { type: Number, default: 0 },
  totalSupplierAmount: { type: Number, default: 0 },
  totalExpected:       { type: Number, default: 0 }, // totalInvoiceAmount + totalTopAmount

  // Payment tracking (updated on each payment event)
  totalReceived:      { type: Number, default: 0 },
  invoiceReceived:    { type: Number, default: 0 },
  topReceived:        { type: Number, default: 0 },
  buyerOutstanding:   { type: Number, default: 0 },

  // Commission tracking
  grossCommission:    { type: Number, default: 0 }, // = totalTopAmount
  netCommission:      { type: Number, default: 0 }, // grossCommission - myClaimShare
  commissionReceived: { type: Number, default: 0 },
  commissionPending:  { type: Number, default: 0 },

  notes: { type: String, default: '' },
}, { timestamps: true })

// Before save: recalculate all product line and deal-level totals
DealSchema.pre('save', function (next) {
  let totalInvoice = 0, totalTop = 0, totalSupplier = 0

  for (const p of this.products || []) {
    p.topRatePerCBM  = (p.totalRatePerCBM || 0) - (p.invoiceRatePerCBM || 0)
    p.invoiceAmount  = (p.invoiceRatePerCBM || 0) * (p.quantity || 0)
    p.topAmount      = p.topRatePerCBM * (p.quantity || 0)
    p.supplierTotal  = (p.supplierRatePerCBM || 0) * (p.quantity || 0)
    totalInvoice    += p.invoiceAmount
    totalTop        += p.topAmount
    totalSupplier   += p.supplierTotal
  }

  this.totalInvoiceAmount  = totalInvoice
  this.totalTopAmount      = totalTop
  this.totalSupplierAmount = totalSupplier
  this.totalExpected       = totalInvoice + totalTop
  this.grossCommission     = totalTop
  this.netCommission       = totalTop - (this.myClaimShare || 0)
  this.buyerOutstanding    = Math.max(0, this.totalExpected - (this.totalReceived || 0))
  this.commissionPending   = Math.max(0, this.netCommission - (this.commissionReceived || 0))

  next()
})

DealSchema.index({ buyer: 1 })
DealSchema.index({ supplier: 1 })
DealSchema.index({ dealStatus: 1 })
DealSchema.index({ eta: 1 })
DealSchema.index({ dealId: 1 })

export default mongoose.models.Deal || mongoose.model('Deal', DealSchema)
