// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    from: {
      type: String,
      enum: ["customer", "driver"],
      required: true,
    },
    // 👇 This is where refPath goes
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "fromModel",  // <--- this tells Mongoose: look at fromModel
      required: true,
    },
    fromModel: {
      type: String,
      enum: ["User", "Driver"], // your actual model names
      required: true,
    },
    text: {
      type: String,
      trim: true,
      required: true,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "fromModel", // 👈 same trick for read receipts
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
