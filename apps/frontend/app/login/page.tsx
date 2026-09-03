"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/useAuth";
import LoginForm from "@/components/forms/LoginForm";

export default function LoginPage() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) router.replace("/dashboard");
  }, [isAuthLoading, isAuthenticated, router]);

  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <LoginForm />
    </div>
  );
}
