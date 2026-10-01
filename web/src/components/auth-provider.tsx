"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { disconnectSocket, getSocket } from "@/lib/socket";
import type { Me, Role } from "@/lib/types";
import { PageLoader, useToast } from "./ui";

interface AuthContextValue {
  user: Me;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<Me | null>(null);

  useEffect(() => {
    api
      .get<{ user: Me }>("/auth/me")
      .then(({ user }) => setUser(user))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
      });
  }, [router]);

  // Personal realtime notifications (task assigned, leave reviewed, ...).
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const onNotify = (n: { message: string }) => toast(n.message, "info");
    socket.on("notification", onNotify);
    return () => {
      socket.off("notification", onNotify);
    };
  }, [user, toast]);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    disconnectSocket();
    router.replace("/login");
  }, [router]);

  const hasRole = useCallback((...roles: Role[]) => !!user && roles.includes(user.role), [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader />
      </div>
    );
  }
  return <AuthContext.Provider value={{ user, logout, hasRole }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
