"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { CompanyUsageBar } from "@/components/admin/CompanyUsageBar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAdminCompanies } from "@/hooks/useAdminCompanies";
import { useAdminReputation } from "@/hooks/useAdminReputation";
import type { AdminCompanyListItem } from "@/interface/company";
import type { ReputationEntry } from "@/interface/reputation";

type SortKey = "usage" | "bounceRate" | "createdAt";

export default function CompaniesPage() {
  const { isAuthLoading } = useAdminAuth();
  const { listCompanies } = useAdminCompanies();
  const { getReputation } = useAdminReputation();

  const [companies, setCompanies] = useState<AdminCompanyListItem[] | null>(null);
  const [reputation, setReputation] = useState<ReputationEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");

  useEffect(() => {
    if (isAuthLoading) return;
    listCompanies()
      .then(setCompanies)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
    getReputation()
      .then(setReputation)
      .catch(() => setReputation([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]);

  const bounceRateByCompany = useMemo(
    () => new Map(reputation.map((r) => [r.companyId, r.bounceRate])),
    [reputation],
  );

  const filtered = useMemo(() => {
    if (!companies) return null;
    const term = search.trim().toLowerCase();
    const rows = term
      ? companies.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.sendingDomain?.toLowerCase().includes(term),
        )
      : companies;

    return [...rows].sort((a, b) => {
      if (sortKey === "usage") return b.monthlyUsage - a.monthlyUsage;
      if (sortKey === "bounceRate") {
        return (
          (bounceRateByCompany.get(b.id) ?? 0) - (bounceRateByCompany.get(a.id) ?? 0)
        );
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [companies, search, sortKey, bounceRateByCompany]);

  if (isAuthLoading) return <LoadingPage />;

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
        <div className="flex gap-3">
          <Input
            placeholder="Search by name or domain"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Newest first</SelectItem>
              <SelectItem value="usage">Usage this month</SelectItem>
              <SelectItem value="bounceRate">Bounce rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl bg-white p-4 shadow">
        {filtered === null ? (
          <p className="p-6 text-center text-sm text-slate-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No companies found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Usage this month</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((company) => (
                <TableRow
                  key={company.id}
                  className="cursor-pointer"
                  onClick={() => (window.location.href = `/companies/${company.id}`)}
                >
                  <TableCell className="font-medium text-slate-900">
                    <Link
                      href={`/companies/${company.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {company.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {company.sendingDomain ?? "—"}{" "}
                    {company.sendingDomain && (
                      <Badge variant={company.domainVerified ? "success" : "warning"}>
                        {company.domainVerified ? "Verified" : "Pending"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{company.planTier}</TableCell>
                  <TableCell>
                    <CompanyUsageBar used={company.monthlyUsage} limit={company.monthlyEmailLimit} />
                  </TableCell>
                  <TableCell>
                    {company.suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
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
