import Promotion from "../models/Promotion.js";

// List with simple search (matches the table + search box)
export const listPromos = async (req, res) => {
  const { q = "" } = req.query;
  const rx = new RegExp(q, "i");
  const promos = await Promotion.find({
    $or: [{ code: rx }, { name: rx }, { type: rx }],
  }).sort({ createdAt: -1 });
  res.json(promos);
};

// Create (matches your right-side "Create Promo" form)
export const createPromo = async (req, res) => {
  const {
    code, name, type, value = 0, minSpend = 0, maxDiscount = 0,
    limit = 0, status = "Active", startsAt, endsAt
  } = req.body;

  if (!code || !name || !type) {
    return res.status(400).json({ message: "code, name, and type are required" });
  }

  const exists = await Promotion.findOne({ code: code.toUpperCase().trim() });
  if (exists) return res.status(409).json({ message: "Code already exists" });

  const promo = await Promotion.create({
    code, name, type, value, minSpend, maxDiscount, limit, status, startsAt, endsAt
  });
  res.status(201).json(promo);
};

export const togglePause = async (req, res) => {
  const { id } = req.params;
  const { forceActivate } = req.body;

  const promo = await Promotion.findById(id);
  if (!promo) return res.status(404).json({ message: "Not found" });

  if (forceActivate) {
    promo.status = "Active";
    // ✨ Make it active immediately — no longer scheduled
    promo.startsAt = null;           // or: new Date()
  } else {
    promo.status = promo.status === "Paused" ? "Active" : "Paused";
  }

  await promo.save();
  res.json(promo);
};

// Duplicate row (used by your Copy button)
export const duplicatePromo = async (req, res) => {
  const { id } = req.params;
  const src = await Promotion.findById(id);
  if (!src) return res.status(404).json({ message: "Not found" });

  const code = `${src.code}-COPY`;
  const existing = await Promotion.findOne({ code });
  if (existing) return res.status(409).json({ message: "Duplicate code already exists" });

  const copy = await Promotion.create({
    ...src.toObject(),
    _id: undefined,
    code,
    name: `${src.name} (Copy)`,
    used: 0,
    status: "Paused",
  });
  res.status(201).json(copy);
};

// (Optional) Delete
export const deletePromo = async (req, res) => {
  const { id } = req.params;
  const out = await Promotion.findByIdAndDelete(id);
  if (!out) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
};

// APPLY endpoint — validate code & compute discount for a given cart subtotal
// Public endpoint to get active promos for landing page
export const getActivePromos = async (req, res) => {
  const now = new Date();
  
  try {
    const activePromos = await Promotion.find({
      $and: [
        { status: "Active" },
        {
          $or: [
            { startsAt: { $exists: false } },
            { startsAt: null },
            { startsAt: { $lte: now } }
          ]
        },
        {
          $or: [
            { endsAt: { $exists: false } },
            { endsAt: null },
            { endsAt: { $gte: now } }
          ]
        },
        {
          $or: [
            { limit: 0 }, // No limit set
            { limit: { $exists: false } }, // No limit field
            { $expr: { $lt: ["$used", "$limit"] } } // Used count is less than limit
          ]
        }
      ]
    }).sort({ createdAt: -1 }).limit(5); // Get latest 5 active promos
    
    res.json({ success: true, promos: activePromos });
  } catch (error) {
    console.error("Error fetching active promos:", error);
    res.status(500).json({ success: false, message: "Failed to fetch active promos" });
  }
};

export const applyPromo = async (req, res) => {
  const { code, subtotal } = req.body; // subtotal in pesos
  const now = new Date();

  const promo = await Promotion.findOne({ code: String(code).toUpperCase().trim() });
  if (!promo) return res.status(404).json({ message: "Invalid code" });

  // status & date checks
  if (promo.status === "Paused") return res.status(400).json({ message: "Promo is paused" });
  if (promo.startsAt && now < promo.startsAt) return res.status(400).json({ message: "Promo not started" });
  if (promo.endsAt && now > promo.endsAt) return res.status(400).json({ message: "Promo expired" });
  if (promo.limit > 0 && promo.used >= promo.limit) return res.status(400).json({ message: "Promo usage limit reached" });
  if (subtotal < (promo.minSpend || 0)) return res.status(400).json({ message: `Minimum spend is ₱${promo.minSpend}` });

  // compute discount
  let discount = 0;
  if (promo.type === "Percentage") {
    discount = (Number(promo.value || 0) / 100) * subtotal;
    if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
  } else if (promo.type === "Fixed Amount") {
    discount = Math.min(Number(promo.value || 0), subtotal);
  } else if (promo.type === "Free Shipping") {
    // If you want shipping fee in the request, compute there; for now return a flag
    return res.json({ ok: true, type: promo.type, discount: 0, freeShipping: true, promo });
  }

  res.json({ ok: true, type: promo.type, discount: Math.floor(discount), promo });
};

// (Recommended) redeem inside order placement to increment `used` atomically
export const redeemPromoOnOrder = async (session, promoId) => {
  // Call inside a Mongo transaction
  await Promotion.updateOne(
    { _id: promoId, $or: [{ limit: 0 }, { used: { $lt: "$limit" } }] },
    { $inc: { used: 1 } },
    { session }
  );
};

export const reactivatePromo = async (req, res) => {
  const { id } = req.params;
  const { startsAt, endsAt } = req.body;

  const promo = await Promotion.findById(id);
  if (!promo) return res.status(404).json({ message: "Not found" });

  // Update dates and set status back to Active or Scheduled
  promo.startsAt = startsAt ? new Date(startsAt) : null;
  promo.endsAt = endsAt ? new Date(endsAt) : null;
  
  // If start date is in the future, set as scheduled, otherwise active
  const now = new Date();
  if (startsAt && new Date(startsAt) > now) {
    promo.status = "Active"; // Frontend will show as "Scheduled"
  } else {
    promo.status = "Active";
  }

  await promo.save();
  res.json(promo);
};

// Test endpoint to increment used count (for testing purposes only)
export const testIncrementUsed = async (req, res) => {
  const { code } = req.params;
  
  try {
    const promo = await Promotion.findOne({ code: code.toUpperCase() });
    if (!promo) return res.status(404).json({ message: "Promo not found" });
    
    promo.used = (promo.used || 0) + 1;
    await promo.save();
    
    res.json({ 
      success: true, 
      message: `Incremented used count for ${code}`, 
      promo: {
        code: promo.code,
        used: promo.used,
        limit: promo.limit,
        reachedLimit: promo.limit > 0 && promo.used >= promo.limit
      }
    });
  } catch (error) {
    console.error("Error incrementing used count:", error);
    res.status(500).json({ success: false, message: "Failed to increment used count" });
  }
};