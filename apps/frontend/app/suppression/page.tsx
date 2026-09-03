"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { useAuth } from "@/context/useAuth";
import { useSuppression } from "@/hooks/useSuppression";
import type { SuppressionEntry } from "@/interface/suppression";

const REASON_LABEL: Record<SuppressionEntry["reason"], string> = {
  bounce: "Bounce",
  complaint: "Complaint",
  manual_unsubscribe: "Manual unsubscribe",
};

export default function SuppressionPage() {
  const { isAuthLoading } = useAuth();
  const { list } = useSuppression();

  const [entries, setEntries] = useState<SuppressionEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    list()
      .then(setEntries)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load suppression list"),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]);

  if (isAuthLoading) return <LoadingPage />;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Suppression list</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl bg-white p-4 shadow">
        {entries === null ? (
          <p className="p-6 text-center text-sm text-slate-500">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            No suppressed addresses yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{REASON_LABEL[entry.reason]}</Badge>
                  </TableCell>
                  <TableCell>{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardLayout>
  );
}
