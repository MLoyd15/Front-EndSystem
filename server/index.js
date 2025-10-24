import dotenv from 'dotenv';
import express from "express";
import cors from "cors";
import http from "http";
import { createServer } from "http";
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
import lalamoveRoutes from './routes/lalalmove.js';
import supportChatRoutes from "./routes/supportChatRoutes.js"; // ✅ Already imported

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
      "https://goagritrading.org",
      'https://goat-agritrading-frontend.vercel.app',
    ],
    credentials: true,
  })
);

// ✅ Body parsers (once is enough)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bundles", bundlesRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/promo", promoRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/refund-tickets", adminRefundTicketsRouter);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/lalamove', lalamoveRoutes);
app.use("/api/support-chat", supportChatRoutes); // ✅ ADD THIS LINE

// (Optional) simple health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// ✅ Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ UPDATED: Socket.IO authentication middleware
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
    socket.handshake.query?.token;

  if (!token) return next(); // allow anonymous if you want
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // ✅ CHANGED: Store user info consistently
    socket.userId = decoded.id || decoded._id || decoded.sub || decoded.userId;
    socket.userEmail = decoded.email;
    socket.user = decoded; // Keep for backward compatibility with existing order chat
  } catch (err) {
    // ignore or: return next(new Error("Invalid token"));
  }
  next();
});

// ✅ UPDATED: Socket.IO connection handling
io.on("connection", async (socket) => {
  console.log(`User ${socket.userId} connected`);
  
  // ✅ NEW: Join user to their personal room for notifications
  if (socket.userId) {
    socket.join(`user_${socket.userId}`);
  }
  
  // ✅ NEW: Check if user is admin and join admin room
  try {
    if (socket.userId) {
      const User = (await import('./models/User.js')).default;
      const user = await User.findById(socket.userId);
      if (user && ['admin', 'superadmin'].includes(user.role)) {
        socket.join('admin_room');
        socket.isAdmin = true;
        console.log(`Admin ${socket.userId} joined admin room`);
      }
    }
  } catch (error) {
    console.error('Error checking user role:', error);
  }

  // ✅ EXISTING: Order chat functionality (keep this)
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

  // ✅ NEW: Support chat functionality
  socket.on('join_support_room', (roomId) => {
    socket.join(`support_${roomId}`);
    console.log(`User ${socket.userId} joined support room: support_${roomId}`);
  });
  
  socket.on('leave_support_room', (roomId) => {
    socket.leave(`support_${roomId}`);
    console.log(`User ${socket.userId} left support room: support_${roomId}`);
  });
  
  // ✅ NEW: Handle typing indicators for support chat
  socket.on('typing_support', ({ roomId, isTyping }) => {
    socket.to(`support_${roomId}`).emit('user_typing_support', {
      userId: socket.userId,
      isTyping,
      isAdmin: socket.isAdmin || false
    });
  });

  // ✅ NEW: Disconnect handler
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Expose io to routes/controllers that broadcast
app.set("io", io);

server.listen(process.env.PORT || 5000, () => {
  connectDB();
  console.log("The server is live with WebSocket");
  console.log("✅ Socket.IO server ready for support chat");
});

console.log('🔍 Environment Check:', {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  hasMongoUrl: !!process.env.MONGO_URL,
  hasLalamoveKey: !!process.env.LALAMOVE_API_KEY,
  hasLalamoveSecret: !!process.env.LALAMOVE_API_SECRET,
  lalamoveKeyPreview: process.env.LALAMOVE_API_KEY?.substring(0, 10) + '...',
});