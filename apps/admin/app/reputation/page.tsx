"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { useAdminAuth } from "@/context/useAdminAuth";
import { useAdminReputation } from "@/hooks/useAdminReputation";
import type { ReputationEntry } from "@/interface/reputation";

const BOUNCE_THRESHOLD = 0.05;
const COMPLAINT_THRESHOLD = 0.001;

export default function ReputationPage() {
  const { isAuthLoading } = useAdminAuth();
  const { getReputation } = useAdminReputation();

  const [entries, setEntries] = useState<ReputationEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    getReputation()
      .then(setEntries)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]);

  if (isAuthLoading) return <LoadingPage />;

  return (
    <AdminShell>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Reputation monitoring</h1>
      <p className="mb-6 text-sm text-slate-600">
        Last 30 days, sorted worst bounce rate first. Danger zone:{" "}
        <span className="font-medium text-red-600">
          &gt;{(BOUNCE_THRESHOLD * 100).toFixed(0)}% bounce
        </span>{" "}
        or{" "}
        <span className="font-medium text-red-600">
          &gt;{(COMPLAINT_THRESHOLD * 100).toFixed(2)}% complaint
        </span>
        .
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl bg-white p-4 shadow">
        {entries === null ? (
          <p className="p-6 text-center text-sm text-slate-500">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No companies yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Sent (30d)</TableHead>
                <TableHead>Bounce rate</TableHead>
                <TableHead>Complaint rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.companyId}>
                  <TableCell className="font-medium">
                    <Link href={`/companies/${entry.companyId}`} className="hover:underline">
                      {entry.name}
                    </Link>
                  </TableCell>
                  <TableCell>{entry.sent}</TableCell>
                  <TableCell className={entry.bounceRate > BOUNCE_THRESHOLD ? "font-semibold text-red-600" : ""}>
                    {(entry.bounceRate * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell
                    className={
                      entry.complaintRate > COMPLAINT_THRESHOLD ? "font-semibold text-red-600" : ""
                    }
                  >
                    {(entry.complaintRate * 100).toFixed(3)}%
                  </TableCell>
                  <TableCell>
                    {entry.atRisk ? (
                      <Badge variant="destructive">At risk</Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminShell>
  );
}
