"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
      <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="text-center text-slate-600">
        We couldn&apos;t complete your request. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
