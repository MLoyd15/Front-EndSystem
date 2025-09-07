import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    stock: { type: Number, default: 0 },   // available inventory
    sold: { type: Number, default: 0 },    // how many sold
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;