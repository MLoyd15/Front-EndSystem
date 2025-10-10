import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./db/connection.js";
import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/category.js";
import adminRoutes from "./routes/admin.js";
import ordersRoutes from "./routes/orders.js";
import loyaltyRoutes from "./routes/loyalty.js";
import productRoutes from "./routes/product.js";
import bundlesRoutes from "./routes/bundles.js";
import deliveryRoutes from "./routes/delivery.js";
import promoRoutes from "./routes/promo.js";
import driverRoutes from "./routes/driver.js";
import chatRoutes from "./routes/chat.js";
import Message from "./models/Message.js";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import path from "path";
import adminRefundTicketsRouter from "./routes/adminRefundTickets.js";
import maintenanceRoutes from './routes/maintenance.js';
import lalamoveRoutes from './routes/lalamove.js';




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ CORS — set your actual dev origins here (optional but recommended)
app.use(
  cors({
    origin: [
      "http://localhost:5173",   // Vite admin
      "http://127.0.0.1:5173",
      "http://localhost:19006",  // Expo web preview (if used)
      "https://goagritrading.org"
      
      
    ],
    credentials: true,
  })
);

// ✅ Body parsers (once is enough)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ❌ No local uploads folder/static serving needed with Cloudinary
// const uploadsPath = path.join(__dirname, "uploads");
// if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
// app.use("/uploads", express.static(uploadsPath));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/products", productRoutes);   // <-- your Cloudinary upload route lives inside this module now
app.use("/api/bundles", bundlesRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/promo", promoRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/refund-tickets", adminRefundTicketsRouter);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/lalamove', lalamoveRoutes);


// (Optional) simple health check
app.get("/health", (_req, res) => res.json({ ok: true }));


// ✅ Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const JWT_SECRET = process.env.JWT_SECRET;

// (Optional) attach user to socket from token
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
    socket.handshake.query?.token;

  if (!token) return next(); // allow anonymous if you want
  try {
    const user = jwt.verify(token, JWT_SECRET);
    socket.user = user; // { _id, role, ... }
  } catch {
    // ignore or: return next(new Error("Invalid token"));
  }
  next();
});

io.on("connection", (socket) => {
  const initialOrderId =
    socket.handshake.auth?.orderId || socket.handshake.query?.orderId;
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
    await Message.updateMany(
      { orderId },
      { $addToSet: { readBy: socket.user?._id } }
    );
    io.to(String(orderId)).emit("read", { orderId, userId: socket.user?._id });
  });
});

// Expose io to routes/controllers that broadcast
app.set("io", io);

server.listen(process.env.PORT || 5000, () => {
  connectDB();
  console.log("The server is live with WebSocket");
});
