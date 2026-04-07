import { Router } from "express";
import {
  createInviteController,
  listInvitesController,
  inviteStatsController,
} from "../controllers/invite.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();
router.use(authenticate);
router.use(requireRole("HR Admin"));
router.get("/stats", inviteStatsController);
router.get("/", listInvitesController);
router.post("/", createInviteController);

export default router;
