import express from "express";
import {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchesByCompanySlug,
  toggleBranchStatus,
} from "../controllers/branchController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getBranches);
router.get("/:id", getBranchById);

router.post("/", protect, authorize("admin", "supervisor"), createBranch);
router.put("/:id", protect, authorize("admin", "supervisor"), updateBranch);
router.put(
  "/:id/toggle",
  protect,
  authorize("admin", "supervisor"),
  toggleBranchStatus
);
router.delete("/:id", protect, authorize("admin", "supervisor"), deleteBranch);
router.get("/by-company/:slug", getBranchesByCompanySlug);

export default router;
