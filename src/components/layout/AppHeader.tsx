import { Search, Bell, ChevronDown, Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/store/AuthStore";

interface AppHeaderProps {
  onMenuClick: () => void;
}

const AppHeader = ({ onMenuClick }: AppHeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null;

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onMenuClick} className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden md:block flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search employees, documents..." className="pl-10 bg-muted/50 border-0 focus-visible:ring-1" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-semibold">3</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 p-1.5 hover:bg-muted rounded-lg transition-colors outline-none">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>My Profile</DropdownMenuItem>
            <DropdownMenuItem>Account Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppHeader;
