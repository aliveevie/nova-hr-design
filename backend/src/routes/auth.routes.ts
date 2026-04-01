import { Router } from "express";
import {
  loginController,
  meController,
  logoutController,
  forgotPasswordController,
  resetPasswordController,
  changePasswordController,
  verifyFirstLoginController,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", loginController);
router.post("/logout", logoutController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);
router.post("/first-login/verify", verifyFirstLoginController);
router.post("/change-password", authenticate, changePasswordController);
router.get("/me", authenticate, meController);

export default router;
