import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, UserPlus, Clock, CalendarOff, DollarSign,
  TrendingUp, GraduationCap, ShieldAlert, BarChart3, CalendarDays,
  Settings, X,
} from "lucide-react";
import { useAuth } from "@/lib/store";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Employees", icon: Users, path: "/employees" },
  { label: "Recruitment", icon: UserPlus, path: "/recruitment" },
  { label: "Attendance", icon: Clock, path: "/attendance" },
  { label: "Leave Management", icon: CalendarOff, path: "/leave" },
  { label: "Payroll", icon: DollarSign, path: "/payroll" },
  { label: "Performance", icon: TrendingUp, path: "/performance" },
  { label: "Training", icon: GraduationCap, path: "/training" },
  { label: "Discipline", icon: ShieldAlert, path: "/discipline" },
  { label: "Reports", icon: BarChart3, path: "/reports" },
  { label: "Holidays", icon: CalendarDays, path: "/holidays" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AppSidebar = ({ open, onClose }: AppSidebarProps) => {
  const { user } = useAuth();
  
  // Only show sidebar for HR Admin and Manager roles
  if (user?.role === "Employee") {
    return null;
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 shrink-0 bg-sidebar text-sidebar-foreground
          transform transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-sm">N</span>
            </div>
            <span className="text-lg font-bold text-sidebar-primary tracking-tight">NovaHR</span>
          </div>
          <button onClick={onClose} className="md:hidden text-sidebar-foreground hover:text-sidebar-primary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/50 hover:text-sidebar-primary"
                    }`
                  }
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50">© 2026 NovaHR v1.0</p>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
