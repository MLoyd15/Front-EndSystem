import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true, required: true },
    from: { type: String, enum: ["customer", "driver"], required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional
    text: { type: String, trim: true },
    attachments: [{ url: String, type: String }], // optional
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Message", MessageSchema);
