import express from "express";
import { driverLogin, updateDriverInfo } from "../controlers/driverController.js";
import authMiddleware from "../middleware/authMiddleware.js"; // make sure it sets req.user

const router = express.Router();

// Login
router.post("/login", driverLogin);

// Update own profile (must be logged in)
router.put("/me", authMiddleware, updateDriverInfo);

export default router;
