"use client";

import { Button } from "../ui/button";
import { useAuth } from "@/context/useAuth";

export default function DashboardNavbar() {
  const { user, logout } = useAuth();

  return (
    <header className="w-full flex justify-between items-center bg-white p-4 shadow-md">
      <span className="font-medium text-slate-800">
        Hello, {user?.email}
      </span>
      <Button variant="destructive" onClick={logout}>
        Logout
      </Button>
    </header>
  );
}
