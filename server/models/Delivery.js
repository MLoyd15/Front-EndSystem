import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true }, // linked order
    type: { type: String, enum: ["pickup", "third-party", "in-house"], required: true }, // delivery mode
    status: { type: String, enum: ["pending", "assigned", "in-transit", "completed", "cancelled"], default: "pending" }, // progress
    deliveryAddress: String,          // for delivery or pickup instructions
    pickupLocation: String,           // for customer pickup
    scheduledDate: Date,              // when to pickup/deliver
    thirdPartyProvider: String,       // e.g., Lalamove/Grab
    assignedVehicle: String,          // plate or vehicle id for in-house
    assignedDriver: String            
  },
  { timestamps: true }
);

export default mongoose.model("Delivery", deliverySchema);