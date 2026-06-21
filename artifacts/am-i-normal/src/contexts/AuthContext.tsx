import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import type { AuthUser } from "@workspace/api-client-react";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "ain_jwt";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      setAuthTokenGetter(() => token);
      try {
        const payload = JSON.parse(atob(token.split(".")[1]!));
        const exp = payload.exp as number | undefined;
        if (exp && Date.now() / 1000 > exp) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
          setAuthTokenGetter(() => null);
          setIsLoading(false);
          return;
        }
        setUser({ id: payload.userId, email: payload.email, createdAt: new Date().toISOString() });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setAuthTokenGetter(() => null);
      }
    } else {
      setAuthTokenGetter(() => null);
    }
    setIsLoading(false);
  }, [token]);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    setAuthTokenGetter(() => newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setAuthTokenGetter(() => null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
