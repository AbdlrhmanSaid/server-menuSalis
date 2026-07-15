import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductInBranch,
  updateProductBranches,
} from "../controllers/productController.js";

import { protect, authorize } from "../middlewares/authMiddleware.js";
import uploadMiddleware from "../middlewares/upload.js";

const router = express.Router();

router.get("/", getProducts);

router.get("/:id", getProductById);

router.post(
  "/",
  protect,
  authorize("admin", "supervisor"),
  uploadMiddleware("image"),
  createProduct
);

router.put(
  "/:id",
  protect,
  authorize("admin", "supervisor"),
  uploadMiddleware("image"),
  updateProduct
);

router.put(
  "/:id/toggle-branch/:branchId",
  protect,
  authorize("admin", "supervisor"),
  toggleProductInBranch
);

router.put(
  "/:id/update-branches",
  protect,
  authorize("admin", "supervisor"),
  updateProductBranches
);

router.delete("/:id", protect, authorize("admin", "supervisor"), deleteProduct);

export default router;
