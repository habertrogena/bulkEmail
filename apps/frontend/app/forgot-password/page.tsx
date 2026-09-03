"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/useAuth";
import ForgotPasswordForm from "@/components/forms/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) router.replace("/dashboard");
  }, [isAuthLoading, isAuthenticated, router]);

  if (isAuthLoading || isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <ForgotPasswordForm />
    </div>
  );
}
