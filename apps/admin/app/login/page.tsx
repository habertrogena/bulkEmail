"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/useAdminAuth";
import LoginForm from "@/components/forms/LoginForm";

export default function LoginPage() {
  const { isAuthenticated, isAuthLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) router.replace("/");
  }, [isAuthLoading, isAuthenticated, router]);

  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <LoginForm />
    </div>
  );
}
