import Product from "../models/Product.js";
import Category from "../models/category.js";
import mongoose from "mongoose";

/** Helper: get io instance safely */
const getIO = (req) => req.app && req.app.get && req.app.get("io");

/** Build filtering for list endpoint */
function buildQuery(q) {
  const query = {};
  if (q?.search) {
    query.name = { $regex: q.search, $options: "i" };
  }
  if (q?.category) {
    query.category = q.category; // expects id
  }
  if (q?.catalog === "true" || q?.catalog === "false") {
    query.catalog = q.catalog === "true";
  }
  return query;
}

const list = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const query = buildQuery(req.query);

    const [items, total] = await Promise.all([
      Product.find(query)
        .populate("category", "categoryName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch products" });
  }
};

const getOne = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }
    
    const item = await Product.findById(req.params.id).populate(
      "category",
      "categoryName"
    );
    if (!item) return res.status(404).json({ message: "Product not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch product" });
  }
};

const normalizeImages = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
  // allow comma or newline separated string
  return String(val)
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const create = async (req, res) => {
  try {
    const {
      name,
      category,
      stock = 0,
      price,
      catalog = true,
      description = "",
      weightKg,
      minStock = 0,
    } = req.body || {};
    const images = normalizeImages(req.body?.images);

    if (!name || price == null || !category) {
      return res
        .status(400)
        .json({ message: "name, price, and category are required" });
    }
    if (minStock != null && (isNaN(Number(minStock)) || Number(minStock) < 0)) {
      return res
        .status(400)
        .json({ message: "minStock must be a number ≥ 0" });
    }
    if (weightKg != null && (isNaN(Number(weightKg)) || Number(weightKg) < 0)) {
      return res
        .status(400)
        .json({ message: "weightKg must be a number ≥ 0" });
    }

    const cat = await Category.findById(category);
    if (!cat)
      return res.status(400).json({ message: "Category does not exist" });

    const product = await Product.create({
      name,
      category,
      stock,
      price,
      catalog,
      description,
      images,
      weightKg: weightKg == null ? null : Number(weightKg),
      minStock: minStock == null ? 0 : Number(minStock),
    });

    const created = await product.populate("category", "categoryName");
    res.status(201).json(created);

    // 🔴 real-time: broadcast new product
    const io = getIO(req);
    io?.emit("inventory:created", {
      _id: created._id,
      name: created.name,
      stock: created.stock,
      price: created.price,
      minStock: created.minStock,
      weightKg: created.weightKg,
      images: created.images,
      catalog: created.catalog,
      category: created.category, // already populated
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Duplicate field (name or sku) already exists" });
    }
    res.status(500).json({ message: err.message || "Failed to create product" });
  }
};

const update = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }
    
    const body = Object.fromEntries(
      Object.entries(req.body).filter(([, v]) => v !== undefined)
    );

    if ("images" in body) body.images = normalizeImages(body.images);

    // normalize/validate minStock if present
    if ("minStock" in body) {
      const m = Number(body.minStock);
      if (isNaN(m) || m < 0) {
        return res
          .status(400)
          .json({ message: "minStock must be a number ≥ 0" });
      }
      body.minStock = m;
    }

    // normalize/validate weightKg if present
    if ("weightKg" in body) {
      if (body.weightKg == null || body.weightKg === "") {
        body.weightKg = null;
      } else {
        const w = Number(body.weightKg);
        if (isNaN(w) || w < 0) {
          return res
            .status(400)
            .json({ message: "weightKg must be a number ≥ 0" });
        }
        body.weightKg = w;
      }
    }

    if (body.category) {
      const cat = await Category.findById(body.category);
      if (!cat)
        return res.status(400).json({ message: "Category does not exist" });
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).populate("category", "categoryName");

    if (!updated) return res.status(404).json({ message: "Product not found" });
    res.json(updated);

    // 🔴 real-time: broadcast single product update
    const io = getIO(req);
    io?.emit("inventory:update", {
      productId: updated._id,
      stock: updated.stock,
      price: updated.price,
      minStock: updated.minStock,
      sold: updated.sold,
      catalog: updated.catalog,
      // (you can add other fields if your UI needs them)
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update product" });
  }
};

const remove = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }
    
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Deleted", id: deleted._id });

    // 🔴 real-time: broadcast deletion
    const io = getIO(req);
    io?.emit("inventory:deleted", { productId: deleted._id });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete product" });
  }
};

/** Toggle catalog visibility */
const toggleCatalog = async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body; // boolean
    const updated = await Product.findByIdAndUpdate(
      id,
      { catalog: Boolean(value) },
      { new: true }
    ).populate("category", "categoryName");
    if (!updated) return res.status(404).json({ message: "Product not found" });
    res.json(updated);

    // 🔴 real-time: broadcast catalog flag change
    const io = getIO(req);
    io?.emit("inventory:update", {
      productId: updated._id,
      catalog: updated.catalog,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Failed to toggle catalog flag" });
  }
};

export const auditList = async (req, res) => {
  try {
    const products = await Product.find({})
      .select("name stock price category")
      .populate("category", "categoryName");
    res.json({ items: products, total: products.length });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch audit list" });
  }
};

// Accept [{id, physical}] and set stock = physical
export const auditReconcile = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      return res
        .status(400)
        .json({ message: "items is required (array of {id, physical})" });
    }

    // basic validation + build bulk ops
    const ops = [];
    const emits = []; // collect payloads for sockets
    for (const r of items) {
      const id = String(r.id || "").trim();
      const physical = Number(r.physical);
      
      // Validate ObjectId format
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res
          .status(400)
          .json({ message: `Invalid product ID format: ${id}` });
      }
      
      if (Number.isNaN(physical) || physical < 0) {
        return res
          .status(400)
          .json({ message: "Each item needs valid physical count >= 0" });
      }
      
      ops.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) },
          update: { $set: { stock: physical } },
        },
      });
      emits.push({ productId: id, stock: physical });
    }

    if (ops.length === 0) {
      return res.status(400).json({ message: "No valid items to reconcile" });
    }

    const result = await Product.bulkWrite(ops, { ordered: false });
    res.json({ ok: true, modified: result.modifiedCount ?? result.nModified ?? 0 });

    // 🔴 real-time: broadcast bulk updates (after write)
    const io = getIO(req);
    io?.emit("inventory:bulk", emits);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to reconcile audit" });
  }
};

// Return a plain array (handy for the reviews page that expects an array)
const listFlat = async (req, res) => {
  try {
    const query = buildQuery(req.query);

    const products = await Product.find(query)
      .populate("category", "categoryName")
      .populate("reviews.userId", "name email")
      .lean();

    res.json(products); // <-- array
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch products" });
  }
};

// DELETE /api/products/:productId/reviews/:reviewId
const deleteReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const updated = await Product.findByIdAndUpdate(
      productId,
      { $pull: { reviews: { _id: reviewId } } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Review not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete review" });
  }
};

export {
  list,
  getOne,
  create,
  update,
  remove,
  toggleCatalog,
  listFlat,
  deleteReview,
};
