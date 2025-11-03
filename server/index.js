import dotenv from 'dotenv';
dotenv.config(); // ⚠️ ADD THIS - Load environment variables first!

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
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import path from "path";
import adminRefundTicketsRouter from "./routes/adminRefundTickets.js";
import maintenanceRoutes from './routes/maintenance.js';
import lalamoveRoutes from './routes/lalalmove.js';
import supportChatRoutes from "./routes/supportChatRoutes.js";
import deliveryChatRoutes from "./routes/deliveryChat.js";
import activityLogRoutes from "./routes/activityLog.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:19006",
      "http://localhost:8081",
      "http://localhost:8082",
      "exp://localhost:19000",
      "exp://192.168.1.100:19000",
      "https://goagritrading.org",
      "https://goapgitrading.org",
      'https://goat-agritrading-frontend.vercel.app',
      "*"
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
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
app.use("/api/refund-tickets", adminRefundTicketsRouter);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/lalamove', lalamoveRoutes);
app.use("/api/support-chat", supportChatRoutes);
app.use("/api/delivery-chat", deliveryChatRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// ✅ IMPROVED: Health check with more details
app.get("/health", (_req, res) => {
  res.status(200).json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ ADD: Root endpoint
app.get("/", (_req, res) => {
  res.status(200).json({ 
    message: "Goat-Agri-Trading API is running",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      api: "/api/*"
    }
  });
});

// Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: "*", 
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  allowEIO3: true,
});

const JWT_SECRET = process.env.JWT_SECRET;

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
    socket.handshake.query?.token;

  if (!token) return next();
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id || decoded._id || decoded.sub || decoded.userId;
    socket.userEmail = decoded.email;
    socket.user = decoded;
  } catch (err) {
    console.error('JWT verification error:', err.message);
  }
  next();
});

// Socket.IO connection handling
io.on("connection", async (socket) => {
  console.log(`User ${socket.userId || 'anonymous'} connected`);
  
  if (socket.userId) {
    socket.join(`user_${socket.userId}`);
  }
  
  try {
    if (socket.userId) {
      const User = (await import('./models/user.js')).default;
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

  // Order chat functionality
  const initialOrderId =
    socket.handshake.auth?.orderId || socket.handshake.query?.orderId;
  if (initialOrderId) socket.join(String(initialOrderId));

  socket.on("join", ({ orderId }) => {
    if (orderId) socket.join(String(orderId));
  });

  socket.on("message", async ({ orderId, text }) => {
    if (!orderId || !text?.trim()) return;
    const from = socket.user?.role === "driver" ? "driver" : "customer";

    try {
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
    } catch (error) {
      console.error('Error creating message:', error);
    }
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
    try {
      await Message.updateMany(
        { orderId },
        { $addToSet: { readBy: socket.user?._id } }
      );
      io.to(String(orderId)).emit("read", { orderId, userId: socket.user?._id });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Support chat functionality
  socket.on('join_support_room', (roomId) => {
    socket.join(`support_${roomId}`);
    console.log(`User ${socket.userId} joined support room: support_${roomId}`);
  });
  
  socket.on('leave_support_room', (roomId) => {
    socket.leave(`support_${roomId}`);
    console.log(`User ${socket.userId} left support room: support_${roomId}`);
  });
  
  socket.on('typing_support', ({ roomId, isTyping }) => {
    socket.to(`support_${roomId}`).emit('user_typing_support', {
      userId: socket.userId,
      isTyping,
      isAdmin: socket.isAdmin || false
    });
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId || 'anonymous'} disconnected`);
  });
});

app.set("io", io);

// ✅ CRITICAL FIX: Bind to 0.0.0.0 and use Render's PORT
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // ⚠️ THIS IS CRITICAL FOR RENDER

server.listen(PORT, HOST, () => {
  connectDB();
  console.log(`✅ Server is live on ${HOST}:${PORT}`);
  console.log("✅ Socket.IO server ready");
  console.log('🔍 Environment Check:', {
    nodeEnv: process.env.NODE_ENV,
    port: PORT,
    host: HOST,
    hasMongoUrl: !!process.env.MONGO_URL,
    hasLalamoveKey: !!process.env.LALAMOVE_API_KEY,
    hasLalamoveSecret: !!process.env.LALAMOVE_API_SECRET,
  });
});