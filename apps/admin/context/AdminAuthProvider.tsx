"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import type { AdminAuthContextType, AdminUser } from "./types";
import type { LoginFormValues } from "@/validation/login.schema";

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const NOT_ADMIN_MESSAGE = "You do not have admin access.";

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const isAuthenticated = !!user;

  const runBootstrap = useCallback(async () => {
    try {
      const me = await apiFetch<AdminUser>("/auth/me");
      if (!me.isPlatformAdmin) {
        // A valid session, but not an admin — clear it silently, no redirect loop.
        await apiFetch<{ message: string }>("/auth/logout", { method: "POST" }).catch(() => {});
        setUser(null);
      } else {
        setUser(me);
      }
    } catch (err) {
      setUser(null);
      if (!(err instanceof ApiError && err.status === 401)) {
        // Non-auth failure (network, 5xx) — still just treat as logged out.
      }
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    runBootstrap();
  }, [runBootstrap]);

  async function login(data: LoginFormValues) {
    setIsAuthLoading(true);
    try {
      await apiFetch("/auth/login", { method: "POST", body: JSON.stringify(data) });
      const me = await apiFetch<AdminUser>("/auth/me");

      if (!me.isPlatformAdmin) {
        await apiFetch<{ message: string }>("/auth/logout", { method: "POST" }).catch(() => {});
        throw new Error(NOT_ADMIN_MESSAGE);
      }

      setUser(me);
      router.push("/");
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function logout() {
    try {
      await apiFetch<{ message: string }>("/auth/logout", { method: "POST" });
    } catch {
      // Still clear local state so the user isn't stuck if the API fails.
    } finally {
      setUser(null);
      router.push("/login");
    }
  }

  return (
    <AdminAuthContext.Provider value={{ user, isAuthenticated, isAuthLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
