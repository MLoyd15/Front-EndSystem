import express from "express";
import { getLoyaltyInfo, redeemReward } from "../controlers/loyaltyController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getLoyaltyInfo);   // ✅ Get points & tier
router.post("/redeem", protect, redeemReward); // ✅ Redeem rewards

export default router;