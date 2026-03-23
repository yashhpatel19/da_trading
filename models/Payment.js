import mongoose from 'mongoose'

const PaymentSchema = new mongoose.Schema({
  deal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', required: true },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },

  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },

  // Type of payment component
  type: {
    type: String,
    enum: ['invoice', 'top', 'commission', 'partial', 'final_settlement', 'advance', 'other'],
    default: 'partial',
  },

  // Direction: from whom to whom
  direction: {
    type: String,
    enum: ['received', 'paid_out'],  // received from buyer, or paid_out to supplier
    default: 'received',
  },

  paymentDate: { type: Date },
  dueDate: { type: Date },

  mode: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque', 'other'],
    default: 'bank_transfer',
  },

  reference: { type: String, default: '' },   // bank ref / TT number

  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'partial', 'cancelled'],
    default: 'pending',
  },

  isCommission: { type: Boolean, default: false }, // flag if this payment = our commission

  remarks: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
})

PaymentSchema.index({ deal: 1 })
PaymentSchema.index({ party: 1 })
PaymentSchema.index({ status: 1 })
PaymentSchema.index({ paymentDate: 1 })

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema)
