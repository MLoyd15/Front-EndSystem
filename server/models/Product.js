import mongoose from "mongoose";

// For Images 
const isHttpUrl = (u) => {
  try { const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:"; }
  catch { return false; }
};

const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    description: { type: String, default: "" }, // 🆕 Product description
    stock:       { type: Number, default: 0, min: 0 },
    sold:        { type: Number, default: 0, min: 0 },
    price:       { type: Number, required: true, min: 0 },
    minStock:    { type: Number, default: 0, min: 0 },
    weightKg:    { type: Number, min: 0, default: null },

    // Reviews
    reviews: [
      {
        userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating:    { type: Number, min: 1, max: 5 },
        comment:   String,
        imageUrls: [String],
        createdAt: { type: Date, default: Date.now },
      },
    ],

    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.every(isHttpUrl),
        message: "images must be valid http(s) URLs",
      },
    },
    catalog: { type: Boolean, default: true },
    
    // ✅ NEW: Active field for approval workflow
    // true = approved/active, false = pending approval or soft-deleted
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Index for efficient queries
productSchema.index({ active: 1, createdAt: -1 });
productSchema.index({ name: 'text' }); // For search functionality

export default mongoose.model("Product", productSchema);