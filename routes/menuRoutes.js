// routes/menuRoutes.js
import express from "express";
import {
  getMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenusByCompanySlug, // 🆕
} from "../controllers/menuController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getMenus);
router.get("/:id", getMenuById);

router.get("/by-company/:slug", getMenusByCompanySlug);

router.post("/", protect, authorize("admin", "supervisor"), createMenu);
router.put("/:id", protect, authorize("admin", "supervisor"), updateMenu);
router.delete("/:id", protect, authorize("admin", "supervisor"), deleteMenu);

export default router;
