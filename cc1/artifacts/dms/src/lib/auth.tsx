import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { setupApiAuth } from "./api";
import { DmsUser } from "@workspace/api-client-react";

interface AuthContextType {
  user: DmsUser | null;
  token: string | null;
  login: (token: string, user: DmsUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DmsUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem("dms_token");
    const storedUser = localStorage.getItem("dms_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // failed to parse
      }
      setupApiAuth();
    }
  }, []);

  const login = (newToken: string, newUser: DmsUser) => {
    localStorage.setItem("dms_token", newToken);
    localStorage.setItem("dms_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setupApiAuth();
    setLocation("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("dms_token");
    localStorage.removeItem("dms_user");
    setToken(null);
    setUser(null);
    setupApiAuth();
    setLocation("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
