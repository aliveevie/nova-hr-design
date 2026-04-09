import { Router } from "express";
import {
  getPublicInviteController,
  resendPublicInviteWelcomeController,
  submitPublicInviteController,
} from "../controllers/invite.controller.js";

const router = Router();
router.get("/staff-invite/:token", getPublicInviteController);
router.post("/staff-invite/:token/submit", submitPublicInviteController);
router.post("/staff-invite/:token/resend-welcome", resendPublicInviteWelcomeController);

export default router;
