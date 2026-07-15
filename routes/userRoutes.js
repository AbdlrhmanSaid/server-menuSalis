import express from "express";
import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  updatePassword,
} from "../controllers/userController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("admin", "supervisor"), getUsers);
router.post("/", protect, authorize("admin", "supervisor"), addUser);
router.put("/:id", protect, authorize("admin", "supervisor"), updateUser);
router.delete("/:id", protect, authorize("admin", "supervisor"), deleteUser);
router.put(
  "/:id/password",
  protect,
  authorize("admin", "supervisor"),
  updatePassword
);

export default router;
