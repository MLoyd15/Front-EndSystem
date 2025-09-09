import Product from "../models/Product.js"
import Category from "../models/category.js"

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
        .populate("category", "categoryName") // your Category schema uses categoryName
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
  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
  // allow comma or newline separated string
  return String(val)
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean);
};

const create = async (req, res) => {
  try {
    const { name, category, stock = 0, price, catalog = true, description = "" } = req.body || {};
    const images = normalizeImages(req.body?.images); // <-- URLs only

    if (!name || price == null || !category) {
      return res.status(400).json({ message: "name, price, and category are required" });
    }

    const cat = await Category.findById(category);
    if (!cat) return res.status(400).json({ message: "Category does not exist" });

    const product = await Product.create({
      name, category, stock, price, catalog, description, images
    });

    const created = await product.populate("category", "categoryName");
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate field (name or sku) already exists" });
    }
    res.status(500).json({ message: err.message || "Failed to create product" });
  }
};

const update = async (req, res) => {
  try {
    const body = Object.fromEntries(
      Object.entries(req.body).filter(([, v]) => v !== undefined)
    );
    if ("images" in body) body.images = normalizeImages(body.images);

    if (body.category) {
      const cat = await Category.findById(body.category);
      if (!cat) return res.status(400).json({ message: "Category does not exist" });
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).populate("category", "categoryName");

    if (!updated) return res.status(404).json({ message: "Product not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update product" });
  }
};


const remove = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Deleted", id: deleted._id });
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
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Failed to toggle catalog flag" });
  }
};

export { list, getOne, create, update, remove, toggleCatalog };