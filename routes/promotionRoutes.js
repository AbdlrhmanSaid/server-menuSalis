import express from "express";
import {
  getPromotions,
  getActivePromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotionStatus,
} from "../controllers/promotionController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import uploadMiddleware from "../middlewares/upload.js";

const router = express.Router();

router.get("/", getPromotions);
router.get("/active", getActivePromotions);
router.get("/:id", getPromotionById);

router.post(
  "/",
  protect,
  authorize("admin", "supervisor"),
  uploadMiddleware([{ name: "banner", maxCount: 1 }]),
  createPromotion
);

router.put(
  "/:id",
  protect,
  authorize("admin", "supervisor"),
  uploadMiddleware([{ name: "banner", maxCount: 1 }]),
  updatePromotion
);

router.put(
  "/:id/toggle",
  protect,
  authorize("admin", "supervisor"),
  togglePromotionStatus
);

router.delete("/:id", protect, authorize("admin", "supervisor"), deletePromotion);

export default router;
