// auth/AuthContext.tsx
// Keeps track of who is signed in and shares it with every page.
//
// Concept: React Context. A way to make a value (here: the current
// user) available to any component without passing it down by hand.

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, getToken, setToken } from "../api/client";
import type { Me } from "../api/types";

interface AuthValue {
  me: Me | null;
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      setMe(await api<Me>("/auth/me"));
    } catch {
      setToken(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function signIn(token: string) {
    setToken(token);
    await loadMe();
  }

  function signOut() {
    setToken(null);
    setMe(null);
  }

  return (
    <AuthContext.Provider value={{ me, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
