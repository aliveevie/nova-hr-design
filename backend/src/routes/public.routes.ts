import { Router } from "express";
import {
  getPublicInviteController,
  submitPublicInviteController,
} from "../controllers/invite.controller.js";

const router = Router();
router.get("/staff-invite/:token", getPublicInviteController);
router.post("/staff-invite/:token/submit", submitPublicInviteController);

export default router;
