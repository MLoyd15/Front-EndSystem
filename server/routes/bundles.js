import express from "express";
import * as ctrl from "../controlers/bundleController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Create
router.post("/", authMiddleware, ctrl.create);
// List (with optional search/active toggle)
router.get("/", authMiddleware, ctrl.list);
// Get one
router.get("/:id", authMiddleware, ctrl.getOne);
// Update
router.put("/:id", authMiddleware, ctrl.update);
// Delete
router.delete("/:id", authMiddleware, ctrl.remove);

export default router;