import express from "express";
import { login, getMe, setupAdmin } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/setup-admin", setupAdmin);

export default router;
