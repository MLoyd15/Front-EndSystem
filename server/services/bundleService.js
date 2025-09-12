import mongoose from "mongoose";
import Bundle from "../models/Bundle.js";
import Product from "../models/Product.js";

// Reserve a bundle (check stock and update)
export async function reserveBundle(bundleId, amount = 1) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const bundle = await Bundle.findById(bundleId).lean();
    if (!bundle) throw new Error("Bundle not found");

    // Check availability
    const products = await Product.find({
      _id: { $in: bundle.products.map(p => p.product) }
    }).session(session);

    const pMap = new Map(products.map(p => [String(p._id), p]));
    for (const item of bundle.products) {
      const p = pMap.get(String(item.product));
      const need = (item.quantity ?? 1) * amount;
      if (!p || p.stock < need) throw new Error("Insufficient stock for child product");
    }

    // Deduct stock and update sold count
    for (const item of bundle.products) {
      const need = (item.quantity ?? 1) * amount;
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: -need, sold: need } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();
    return { ok: true };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return { ok: false, error: err.message };
  }
}