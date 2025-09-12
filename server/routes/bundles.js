import express from "express";
import * as ctrl from "../controlers/bundleController.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();

// Create
router.post("/", auth, ctrl.create);
// List (with optional search/active toggle)
router.get("/", auth, ctrl.list);
// Get one
router.get("/:id", auth, ctrl.getOne);
// Update
router.put("/:id", auth, ctrl.update);
// Delete
router.delete("/:id", auth, ctrl.remove);

export default router;