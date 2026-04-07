import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getEmployeeById,
  hrAdminOwnsEmployee,
  resolveAdminOwnerForCreate,
} from "../services/employee.service.js";

export const canUserAccessEmployee = async (
  req: AuthRequest,
  employeeId: string
): Promise<boolean> => {
  if (!req.user) return false;

  if (req.user.role === "Employee") {
    return req.user.employeeId === employeeId;
  }

  if (req.user.role === "HR Admin") {
    return hrAdminOwnsEmployee(employeeId, req.user.userId);
  }

  if (req.user.role === "Manager") {
    const primaryOwnerId = await resolveAdminOwnerForCreate("Manager", req.user.userId);
    const emp = await getEmployeeById(employeeId);
    return !!emp && String((emp as any).admin_owner_id || "") === String(primaryOwnerId);
  }

  return false;
};
