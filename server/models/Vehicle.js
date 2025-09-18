import mongoose from "mongoose";
const vehicleSchema = new mongoose.Schema({
  plate: String,
  capacityKg: Number,
  active: { type: Boolean, default: true }
});
export default mongoose.model("Vehicle", vehicleSchema);