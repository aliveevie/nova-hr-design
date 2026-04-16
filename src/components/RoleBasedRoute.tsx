import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/store";

interface RoleBasedRouteProps {
  allowedRoles: ("HR Admin" | "Manager" | "Employee")[];
  redirectTo?: string;
}

const RoleBasedRoute = ({ allowedRoles, redirectTo }: RoleBasedRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  if (!user || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect employees to their portal, admins to dashboard
    if (user.role === "Employee") {
      return <Navigate to="/employee-portal" replace />;
    }
    return <Navigate to={redirectTo || "/"} replace />;
  }

  return <Outlet />;
};

export default RoleBasedRoute;

