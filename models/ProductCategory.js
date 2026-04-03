import mongoose from 'mongoose'

const ProductCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  sizes: [{ type: String, trim: true }],   // e.g. ["25x200x3000", "50x100x4000"]
  grades: [{ type: String, trim: true }],  // e.g. ["Grade A", "Grade B", "Select"]
}, { timestamps: true })

export default mongoose.models.ProductCategory || mongoose.model('ProductCategory', ProductCategorySchema)
