import mongoose from "mongoose";

const PromotionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },

    // "Percentage" | "Fixed Amount" | "Free Shipping"
    type: { type: String, required: true, enum: ["Percentage", "Fixed Amount", "Free Shipping"] },
    value: { type: Number, default: 0 },           // e.g. 10 (10%) or 150 (₱150)
    minSpend: { type: Number, default: 0 },        // ₱ threshold to qualify
    maxDiscount: { type: Number, default: 0 },     // cap for % promos; for fixed you can mirror value

    used: { type: Number, default: 0 },            // total redemptions so far
    limit: { type: Number, default: 0 },           // 0 = unlimited
    status: { type: String, default: "Active", enum: ["Active", "Paused", "Scheduled", "Expired"] },

    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true }
);

PromotionSchema.index({ status: 1 });
PromotionSchema.index({ startsAt: 1, endsAt: 1 });

export default mongoose.model("Promotion", PromotionSchema);