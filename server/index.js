import express from 'express'
import cors from 'cors'
import http from "http";
import { Server } from "socket.io";
import connectDB from './db/connection.js'
import authRoutes from './routes/auth.js'
import categoryRoutes from './routes/category.js'
import adminRoutes from "./routes/admin.js";
import ordersRoutes from "./routes/orders.js"; 
import loyaltyRoutes from "./routes/loyalty.js";
import productRoutes from "./routes/product.js"
import bundlesRoutes from "./routes/bundles.js";
import deliveryRoutes from "./routes/delivery.js";
import promoRoutes from "./routes/promo.js";
import driverRoutes from "./routes/driver.js"
import path from "path";
import fs from "fs";
import chatRoutes from "./routes/chat.js";
import Message from "./models/Message.js";


import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use("/api/category", categoryRoutes)
app.use("/api/admin", adminRoutes); 
app.use("/api/orders", ordersRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use('/api/products', productRoutes);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api/bundles", bundlesRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/promo", promoRoutes);
app.use("/api/driver", driverRoutes)
app.use("/api/chat", chatRoutes);


app.use("/uploads", express.static(uploadsPath));



const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] }
});

const JWT_SECRET = process.env.JWT_SECRET;

// Socket auth helper
function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

io.on("connection", (socket) => {
  // Client provides orderId to join its room
  const initialOrderId = socket.handshake.auth?.orderId || socket.handshake.query?.orderId;
  if (initialOrderId) socket.join(String(initialOrderId));

  socket.on("join", ({ orderId }) => {
    if (orderId) socket.join(String(orderId));
  });

  socket.on("message", async ({ orderId, text }) => {
    if (!orderId || !text?.trim()) return;
    const from = socket.user?.role === "driver" ? "driver" : "customer";

    const msg = await Message.create({
      orderId,
      from,
      fromUser: socket.user?._id,
      text: text.trim(),
    });

    io.to(String(orderId)).emit("message", {
      _id: msg._id,
      orderId: String(orderId),
      from,
      fromUser: socket.user?._id,
      text: msg.text,
      createdAt: msg.createdAt,
      readBy: msg.readBy || [],
    });
  });

  socket.on("typing", ({ orderId, isTyping }) => {
    if (!orderId) return;
    socket.to(String(orderId)).emit("typing", {
      orderId,
      userId: socket.user?._id,
      role: socket.user?.role,
      isTyping: !!isTyping,
    });
  });

  socket.on("read", async ({ orderId }) => {
    if (!orderId) return;
    await Message.updateMany({ orderId }, { $addToSet: { readBy: socket.user?._id } });
    io.to(String(orderId)).emit("read", { orderId, userId: socket.user?._id });
  });
});

server.listen(process.env.PORT, () => {
  connectDB();
  console.log("The server is live with WebSocket");
});