"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { RegisterFormValues } from "@/validation/register.schema";
import { RegisterResponse } from "@/interface/register";

export function useRegister() {
  const [data, setData] = useState<RegisterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState<string | null>(null);

  const register = async (payload: RegisterFormValues) => {
    setIsLoading(true);
    setIsError(null);

    try {
      const { confirmPassword, ...apiPayload } = payload;
      void confirmPassword;

      const result = await apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(apiPayload),
      });

      setData(result);
      return result;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      setIsError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    register,
    data,
    isLoading,
    isError,
  };
}
