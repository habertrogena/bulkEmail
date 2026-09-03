"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRegister } from "@/hooks/useRegister";
import { useLogin } from "@/hooks/useLogin";
import { useUser } from "@/hooks/useUser";
import { apiFetch, ApiError } from "@/lib/api";
import type { AuthUser, AuthContextType } from "./types";
import type { RegisterFormValues } from "@/validation/register.schema";
import type { LoginFormValues } from "@/validation/login.schema";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { register: registerApi } = useRegister();
  const { login: loginApi } = useLogin();
  const { getUser } = useUser();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const isAuthenticated = !!user;

  const runBootstrap = useCallback(async () => {
    const maxAttempts = 3;
    const retryDelayMs = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const me = await getUser();
        setUser(me);
        setIsAuthLoading(false);
        return;
      } catch (err) {
        setUser(null);
        if (err instanceof ApiError && err.status === 401) {
          setIsAuthLoading(false);
          return;
        }
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, retryDelayMs));
          continue;
        }
        setIsAuthLoading(false);
      }
    }
  }, [getUser]);

  useEffect(() => {
    runBootstrap();
  }, [runBootstrap]);

  async function register(data: RegisterFormValues) {
    setIsAuthLoading(true);
    try {
      await registerApi(data);
      await loginApi({ email: data.email, password: data.password });
      const me = await getUser();
      setUser(me);
      router.push("/dashboard");
    } catch (err) {
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function login(data: LoginFormValues) {
    setIsAuthLoading(true);
    try {
      await loginApi(data);
      const me = await getUser();
      setUser(me);
      router.push("/dashboard");
    } catch (err) {
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function logout() {
    try {
      await apiFetch<{ message: string }>("/auth/logout", { method: "POST" });
    } catch {
      // Still clear local state so user isn't stuck if API fails
    } finally {
      setUser(null);
      router.push("/login");
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAuthLoading,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
