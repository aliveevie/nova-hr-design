import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/store";
import { useEffect } from "react";
import AppHeader from "./AppHeader";

const EmployeeLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Redirect employees away from admin routes
    if (user?.role === "Employee") {
      const currentPath = location.pathname;
      const adminRoutes = [
        "/employees",
        "/recruitment",
        "/attendance",
        "/leave",
        "/payroll",
        "/performance",
        "/training",
        "/discipline",
        "/reports",
        "/holidays",
        "/settings",
      ];
      
      if (adminRoutes.some(route => currentPath.startsWith(route) && currentPath !== "/employee-portal")) {
        navigate("/employee-portal", { replace: true });
      }
      
      // Redirect root to employee portal
      if (currentPath === "/") {
        navigate("/employee-portal", { replace: true });
      }
    }
  }, [user, navigate, location]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* No sidebar for employees - they only see their portal */}
      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EmployeeLayout;

