import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    phone:    { type: String },
    password: { type: String, required: true },
    role:     { type: String, enum: ["driver"], default: "driver" },
    active:   { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Driver = mongoose.model("Driver", driverSchema);
export default Driver;
