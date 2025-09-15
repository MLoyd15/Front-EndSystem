import mongoose from "mongoose";
import Bundle from "../models/Bundle.js";
import Product from "../models/Product.js";

/** Optional: compute price from children if you want that mode */
async function computeBundlePrice(products) {
  // Sum(product.price * quantity)
  const ids = products.map(p => p.product);
  const docs = await Product.find({ _id: { $in: ids } }).select("_id price");
  const priceMap = new Map(docs.map(d => [String(d._id), d.price]));
  let total = 0;
  for (const item of products) {
    total += (priceMap.get(String(item.product)) ?? 0) * (item.quantity ?? 1);
  }
  return total;
}

export const create = async (req, res) => {
  try {
    let { name, description, price, products, isActive } = req.body;

    // Validate referenced products exist
    const productIds = (products ?? []).map(p => p.product);
    const count = await Product.countDocuments({ _id: { $in: productIds } });
    if (count !== productIds.length) {
      return res.status(400).json({ success: false, message: "One or more products do not exist." });
    }

    // price = await computeBundlePrice(products);

    const bundle = await Bundle.create({ name, description, price, products, isActive });
    return res.status(201).json({ success: true, bundle });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Bundle name already exists." });
    }
    console.error("Create bundle error:", err);
    return res.status(500).json({ success: false, message: "Server error creating bundle." });
  }
};

export const list = async (req, res) => {
  try {
    const { q, active } = req.query;
    const filter = {};
    if (q) filter.name = { $regex: q, $options: "i" };
    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;

    const bundles = await Bundle.find(filter)
      .populate("products.product", "name price stock")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, bundles });
  } catch (err) {
    console.error("List bundles error:", err);
    return res.status(500).json({ success: false, message: "Server error listing bundles." });
  }
};

export const getOne = async (req, res) => {
  try {
    const bundle = await Bundle.findById(req.params.id)
      .populate("products.product", "name price stock");
    if (!bundle) return res.status(404).json({ success: false, message: "Bundle not found." });
    return res.status(200).json({ success: true, bundle });
  } catch (err) {
    console.error("Get bundle error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching bundle." });
  }
};

export const update = async (req, res) => {
  try {
    const { name, description, price, products, isActive } = req.body;

    if (products) {
      const productIds = products.map(p => p.product);
      const count = await Product.countDocuments({ _id: { $in: productIds } });
      if (count !== productIds.length) {
        return res.status(400).json({ success: false, message: "One or more products do not exist." });
      }
    }

    const updated = await Bundle.findByIdAndUpdate(
      req.params.id,
      { name, description, price, products, isActive },
      { new: true, runValidators: true }
    ).populate("products.product", "name price stock");

    if (!updated) return res.status(404).json({ success: false, message: "Bundle not found." });
    return res.status(200).json({ success: true, bundle: updated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Bundle name already exists." });
    }
    console.error("Update bundle error:", err);
    return res.status(500).json({ success: false, message: "Server error updating bundle." });
  }
};

export const remove = async (req, res) => {
  try {
    const deleted = await Bundle.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Bundle not found." });
    return res.status(200).json({ success: true, message: "Bundle deleted." });
  } catch (err) {
    console.error("Delete bundle error:", err);
    return res.status(500).json({ success: false, message: "Server error deleting bundle." });
  }
};