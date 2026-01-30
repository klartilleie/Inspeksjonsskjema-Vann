import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AppUser {
  id: string;
  username: string;
  email?: string;
  role: string;
}

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  login: () => void; // Endret: Ingen brukernavn/passord trengs lenger
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Vi sjekker nå mot /api/app/me som vi satte opp i routes.ts
      const response = await fetch("/api/app/me", { credentials: "include" });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Sender brukeren til Auth0-innloggingen
  const login = () => {
    window.location.href = "/login";
  };

  // Sender brukeren til Auth0-utloggingen
  const logout = () => {
    window.location.href = "/logout";
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
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