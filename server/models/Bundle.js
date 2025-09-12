import mongoose from "mongoose";

const bundleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, min: 1, default: 1 }
}, { _id: false });

const bundleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  // Choose pricing strategy: fixed price, or computed (optional, see controller)
  price: { type: Number, required: true, min: 0 },
  products: { type: [bundleItemSchema], default: [] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

bundleSchema.index({ name: 1 }, { unique: true });

const Bundle = mongoose.model("Bundle", bundleSchema);
export default Bundle;