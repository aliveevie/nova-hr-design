import { AuthRequest } from "../middleware/auth.middleware.js";
import { getOwnedEmployeeIdsForHrAdmin } from "../services/employee.service.js";

/** When the user is HR Admin, returns ids of employees they own; otherwise null (no extra filter). */
export const getHrAdminAllowedEmployeeIds = async (
  req: AuthRequest
): Promise<string[] | null> => {
  if (req.user?.role !== "HR Admin") return null;
  return getOwnedEmployeeIdsForHrAdmin(req.user.userId);
};
