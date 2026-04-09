import { Router } from "express";
import {
  createInviteController,
  deleteInviteController,
  listInvitesController,
  inviteStatsController,
  revokeInviteController,
} from "../controllers/invite.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();
router.use(authenticate);
router.use(requireRole("HR Admin"));
router.get("/stats", inviteStatsController);
router.get("/", listInvitesController);
router.post("/", createInviteController);
router.put("/:id/revoke", revokeInviteController);
router.delete("/:id", deleteInviteController);

export default router;
