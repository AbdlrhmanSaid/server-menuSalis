import express from "express";
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/companyController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import uploadMiddleware from "../middlewares/upload.js";

const router = express.Router();

router.get("/", getCompanies);
router.get("/:id", getCompanyById);

router.post(
  "/",
  protect,
  authorize("admin", "supervisor"),
  uploadMiddleware("logo"),
  createCompany
);

router.put(
  "/:id",
  protect,
  authorize("admin", "supervisor"),
  uploadMiddleware("logo"),
  updateCompany
);

router.delete("/:id", protect, authorize("admin", "supervisor"), deleteCompany);

export default router;
