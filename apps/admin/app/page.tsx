"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { useAdminAuth } from "@/context/useAdminAuth";
import { useAdminAwsHealth } from "@/hooks/useAdminAwsHealth";
import { useAdminReputation } from "@/hooks/useAdminReputation";
import { useAdminCompanies } from "@/hooks/useAdminCompanies";
import type { AwsHealth } from "@/interface/aws-health";
import type { ReputationEntry } from "@/interface/reputation";
import type { AdminCompanyListItem } from "@/interface/company";

export default function OverviewPage() {
  const { isAuthLoading } = useAdminAuth();
  const { getAwsHealth } = useAdminAwsHealth();
  const { getReputation } = useAdminReputation();
  const { listCompanies } = useAdminCompanies();

  const [health, setHealth] = useState<AwsHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [reputation, setReputation] = useState<ReputationEntry[] | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyListItem[] | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    getAwsHealth()
      .then(setHealth)
      .catch((err: unknown) =>
        setHealthError(err instanceof Error ? err.message : "Failed to load AWS health"),
      );
    getReputation().then(setReputation).catch(() => setReputation([]));
    listCompanies().then(setCompanies).catch(() => setCompanies([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]);

  if (isAuthLoading) return <LoadingPage />;

  const atRisk = reputation?.filter((r) => r.atRisk) ?? [];
  const totalCompanies = companies?.length ?? 0;
  const campaignsThisMonth =
    companies?.reduce((sum, c) => sum + c.campaignsSentThisMonth, 0) ?? 0;
  const volumeThisMonth = companies?.reduce((sum, c) => sum + c.monthlyUsage, 0) ?? 0;

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Overview</h1>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">AWS SES health</h2>
        {healthError ? (
          <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
            {healthError}
          </div>
        ) : !health ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Account status"
              value={health.productionAccessEnabled ? "Production" : "Sandbox"}
            />
            <Tile
              label="24h sent / daily quota"
              value={`${health.sentLast24Hours ?? "—"} / ${health.max24HourSend ?? "—"}`}
            />
            <Tile label="Max send rate" value={`${health.maxSendRate ?? "—"} / sec`} />
            <Tile label="Sending enabled" value={health.sendingEnabled ? "Yes" : "No"} />
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Reputation warnings</h2>
        {atRisk.length === 0 ? (
          <p className="text-sm text-slate-500">No companies currently above threshold.</p>
        ) : (
          <div className="space-y-2">
            {atRisk.map((entry) => (
              <Link
                key={entry.companyId}
                href={`/companies/${entry.companyId}`}
                className="flex items-center justify-between rounded-lg bg-red-50 p-4 hover:bg-red-100"
              >
                <div>
                  <p className="font-medium text-red-900">{entry.name}</p>
                  <p className="text-sm text-red-700">
                    Bounce {(entry.bounceRate * 100).toFixed(2)}% · Complaint{" "}
                    {(entry.complaintRate * 100).toFixed(3)}%
                  </p>
                </div>
                <Badge variant="destructive">At risk</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">This month</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Tile label="Total companies" value={String(totalCompanies)} />
          <Tile label="Campaigns sent" value={String(campaignsThisMonth)} />
          <Tile label="Email volume" value={volumeThisMonth.toLocaleString()} />
          <Tile label="Companies at risk" value={String(atRisk.length)} />
        </div>
      </section>
    </AdminShell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
