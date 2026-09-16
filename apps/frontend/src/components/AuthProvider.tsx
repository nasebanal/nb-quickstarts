"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AuthContextValue {
  token: string | null;
  employeeCode: string | null;
  // True until the sessionStorage restore below has run once. Consumers
  // (e.g. the /items guard) must not redirect on a missing token while this
  // is true, or a plain page reload would bounce a logged-in viewer home
  // before the restore has a chance to run.
  initializing: boolean;
  setAuth: (token: string, employeeCode: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "nb-quickstarts-auth";

// Persisted to sessionStorage (cleared when the tab/browser closes, unlike
// localStorage) rather than kept in-memory-only, so a full page reload -
// e.g. clicking the logo, which reloads whatever page you're already on -
// doesn't log the viewer out. Read back inside an effect (not during the
// initial render) since the server has no sessionStorage and an initial
// mismatch would break hydration.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const restored = JSON.parse(raw) as { token: string; employeeCode: string };
        setToken(restored.token);
        setEmployeeCode(restored.employeeCode);
      }
    } catch {
      // Private browsing / storage disabled — fall back to in-memory only.
    }
    setInitializing(false);
  }, []);

  const setAuth = (nextToken: string, nextEmployeeCode: string) => {
    setToken(nextToken);
    setEmployeeCode(nextEmployeeCode);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, employeeCode: nextEmployeeCode }));
    } catch {
      // Ignore — the session just won't survive a reload.
    }
  };

  const logout = () => {
    setToken(null);
    setEmployeeCode(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore.
    }
  };

  return (
    <AuthContext.Provider value={{ token, employeeCode, initializing, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
