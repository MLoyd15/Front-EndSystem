import mongoose from "mongoose";
const driverSchema = new mongoose.Schema({
  name: String,
  phone: String,
  active: { type: Boolean, default: true }
});
export default mongoose.model("Driver", driverSchema);