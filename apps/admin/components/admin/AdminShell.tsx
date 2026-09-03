"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/context/useAdminAuth";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/companies", label: "Companies" },
  { href: "/reputation", label: "Reputation" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAdminAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full flex justify-between items-center bg-slate-900 p-4 shadow-md">
        <span className="font-semibold text-white">Platform Admin</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-300">{user?.email}</span>
          <Button variant="destructive" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="w-56 bg-white p-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded p-2 text-sm font-medium",
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </aside>
        <main className="flex-1 p-6 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
