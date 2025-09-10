import express from "express";
import * as ctrl from "../controlers/productController.js";


const router = express.Router();

router.get("/audit", ctrl.auditList);
router.post("/audit/reconcile", ctrl.auditReconcile);

// GET /api/products?search=&category=&catalog=&page=&limit=
router.get('/', ctrl.list);

// GET /api/products/:id
router.get('/:id', ctrl.getOne);

// POST /api/products
router.post('/', ctrl.create);

// PATCH /api/products/:id
router.patch('/:id', ctrl.update);
router.put('/:id', ctrl.update); 

// DELETE /api/products/:id
router.delete('/:id', ctrl.remove);

// PATCH /api/products/:id/catalog  { value: true|false }
router.patch('/:id/catalog', ctrl.toggleCatalog);

export default router