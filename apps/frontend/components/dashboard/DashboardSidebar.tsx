"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserCardModal from "./UserCard";
import { useAuth } from "@/context/useAuth";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Campaigns" },
  { href: "/settings/domain", label: "Sending domain" },
  { href: "/suppression", label: "Suppression list" },
];

export default function DashboardSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <aside className="w-64 bg-white p-4 h-full flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Navigation</h2>

      <nav className="flex flex-col gap-1">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded p-2 text-sm font-medium",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <UserCardModal user={user} />
      </div>
    </aside>
  );
}
