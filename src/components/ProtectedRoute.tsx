import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/store/AuthStore";

const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (
    user?.mustChangePassword &&
    user?.firstLoginVerified === false &&
    location.pathname !== "/login"
  ) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

