import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthenticatedUser } from "@/types";
import { authApi } from "@/lib/api";

interface AuthContextType {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_STORAGE_KEY = "hr_auth_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user from localStorage on mount and verify with API
  useEffect(() => {
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    const token = localStorage.getItem("auth_token");
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        
        // Verify token with API
        authApi.getMe().catch(() => {
          // Token invalid, clear storage
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem("auth_token");
        });
      } catch (error) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem("auth_token");
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authApi.login({ email, password });
      const userToStore: AuthenticatedUser = response.user;
      
      setUser(userToStore);
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userToStore));
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem("auth_token");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
