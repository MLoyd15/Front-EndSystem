import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

// -------------------- Login --------------------
export async function driverLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const driver = await User.findOne({ 
      email: String(email).toLowerCase().trim(),
      role: 'driver'
    });

    // Guard against missing doc or missing/empty password (legacy docs)
    if (!driver || !driver.password) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Check if driver account is active
    if (driver.active === false) {
      return res.status(401).json({ success: false, message: "Account has been deactivated. Please contact administrator." });
    }

    const ok = await bcrypt.compare(password, driver.password);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: driver._id, role: driver.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        role: driver.role,
      },
    });
  } catch (err) {
    console.error("driverLogin error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}  
// -------------------- Update Own Info --------------------
export async function updateDriverInfo(req, res) {
  try {
    const driverId = req.user?.id; // comes from auth middleware
    if (!driverId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.phone) updates.phone = req.body.phone;

    if (req.body.password) {
      updates.password = await bcrypt.hash(req.body.password, 10);
    }

    const updated = await User.findOneAndUpdate(
      { _id: driverId, role: 'driver' }, 
      updates, 
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    res.json({ success: true, driver: updated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: "Update failed", error: err.message });
  }
}
