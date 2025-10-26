import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {type: String},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    address: {type: String},
    role: {type: String, enum:["admin", "superadmin","user", "driver"]},
    active:   { type: Boolean, default: true },

     // Loyalty fields
    loyaltyPoints: { type: Number, default: 0 },
    loyaltyTier: { type: String, enum: ["Sprout", "Seedling", "Cultivator", "Bloom", "Harvester"], default: "Sprout" },
    loyaltyHistory: [
    {
      action: { type: String }, // "earned" | "redeemed"
      points: { type: Number },
      date: { type: Date, default: Date.now }
    }
     ]
})

const User = mongoose.model("User", userSchema)

export default User;