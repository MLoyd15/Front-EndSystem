import mongoose from "mongoose";

const isHttpUrl = (u) => {
  try { const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:"; }
  catch { return false; }
};

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    stock: { type: Number, default: 0 },
    sold:  { type: Number, default: 0 },
    price: { type: Number, required: true },
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
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);