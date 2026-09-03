"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/useAuth";
import RegisterForm from "@/components/forms/RegisterForm";

export default function RegisterPage() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) router.replace("/dashboard");
  }, [isAuthLoading, isAuthenticated, router]);

  if (isAuthLoading || isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <RegisterForm />
    </div>
  );
}
