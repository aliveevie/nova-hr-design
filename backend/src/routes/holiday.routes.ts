import { Router } from "express";
import {
  getHolidaysController,
  getHolidayController,
  createHolidayController,
  updateHolidayController,
  deleteHolidayController,
} from "../controllers/holiday.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", getHolidaysController);
router.get("/:id", getHolidayController);
router.post("/", createHolidayController);
router.put("/:id", updateHolidayController);
router.delete("/:id", deleteHolidayController);

export default router;

