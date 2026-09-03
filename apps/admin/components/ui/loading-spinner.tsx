"use client";

import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

/** Circular progress bar (indeterminate). */
export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <svg
      className={cn("animate-spin text-slate-600", sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="42"
        strokeDashoffset="14"
        className="opacity-90"
      />
    </svg>
  );
}

type LoadingPageProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** Centred full-area loading state (e.g. for dashboard). */
export function LoadingPage({ size = "md", className }: LoadingPageProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center gap-3",
        className
      )}
    >
      <LoadingSpinner size={size} />
      <p className="text-sm text-slate-600">Loading...</p>
    </div>
  );
}
