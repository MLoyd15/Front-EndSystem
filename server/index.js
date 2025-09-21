import express from 'express'
import cors from 'cors'
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
import path from "path";
import fs from "fs";

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


app.use("/uploads", express.static(uploadsPath));

app.listen(process.env.PORT, () => {
    connectDB()
    console.log('The server is live')
})