import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getOwnedEmployeeIdsForHrAdmin,
  resolveAdminOwnerForCreate,
} from "../services/employee.service.js";

/** For HR Admin/Manager, returns ids of employees in their owned scope; otherwise null. */
export const getHrAdminAllowedEmployeeIds = async (
  req: AuthRequest
): Promise<string[] | null> => {
  if (!req.user) return null;
  if (req.user.role === "HR Admin") {
    return getOwnedEmployeeIdsForHrAdmin(req.user.userId);
  }
  if (req.user.role === "Manager") {
    const primaryOwnerId = await resolveAdminOwnerForCreate("Manager", req.user.userId);
    return getOwnedEmployeeIdsForHrAdmin(primaryOwnerId);
  }
  return null;
};
