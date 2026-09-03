"use client";

import { use, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ConfirmActionDialog } from "@/components/admin/ConfirmActionDialog";
import { BounceComplaintChart } from "@/components/admin/BounceComplaintChart";
import { CampaignStatusBadge } from "@/components/admin/CampaignStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { AdminCompanyDetail } from "@/interface/company";

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isAuthLoading } = useAdminAuth();
  const { getCompanyDetail, suspendCompany, unsuspendCompany, updateLimit } =
    useAdminCompanies();

  const [detail, setDetail] = useState<AdminCompanyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState("");
  const [planInput, setPlanInput] = useState("starter");

  function load() {
    getCompanyDetail(id)
      .then((data) => {
        setDetail(data);
        setLimitInput(String(data.company.monthlyEmailLimit));
        setPlanInput(data.company.planTier);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
  }

  useEffect(() => {
    if (isAuthLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, id]);

  if (isAuthLoading || (!detail && !error)) return <LoadingPage />;

  if (error || !detail) {
    return (
      <AdminShell>
        <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
          {error ?? "Company not found"}
        </div>
      </AdminShell>
    );
  }

  const { company, users, campaigns, series } = detail;

  return (
    <AdminShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-sm text-slate-600">{company.sendingDomain ?? "No domain yet"}</p>
        </div>
        <div className="flex items-center gap-3">
          {company.suspended ? (
            <Badge variant="destructive">Suspended</Badge>
          ) : (
            <Badge variant="secondary">Active</Badge>
          )}
          {company.suspended ? (
            <ConfirmActionDialog
              trigger={<Button>Unsuspend</Button>}
              title="Unsuspend this company?"
              description={`${company.name} will immediately be able to send campaigns again.`}
              confirmLabel="Unsuspend"
              onConfirm={async () => {
                await unsuspendCompany(company.id);
                load();
              }}
            />
          ) : (
            <ConfirmActionDialog
              trigger={<Button variant="destructive">Suspend</Button>}
              title="Suspend this company?"
              description={`${company.name} will immediately be blocked from sending any campaigns. This affects a real customer account.`}
              confirmLabel="Suspend"
              destructive
              onConfirm={async () => {
                await suspendCompany(company.id);
                load();
              }}
            />
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-3 text-lg font-semibold">Approved senders</h2>
          {company.approvedSenders.length === 0 ? (
            <p className="text-sm text-slate-500">None yet.</p>
          ) : (
            <ul className="space-y-1 text-sm font-mono text-slate-700">
              {company.approvedSenders.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}

          <h2 className="mt-6 mb-3 text-lg font-semibold">Users</h2>
          <ul className="space-y-1 text-sm text-slate-700">
            {users.map((u) => (
              <li key={u.id} className="flex justify-between">
                <span>{u.email}</span>
                <span className="text-slate-400">{u.role}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-3 text-lg font-semibold">Plan &amp; limit</h2>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">Monthly email limit</Label>
              <Input
                type="number"
                min={0}
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1 block">Plan tier</Label>
              <Select value={planInput} onValueChange={setPlanInput}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ConfirmActionDialog
              trigger={<Button>Save changes</Button>}
              title="Update plan and limit?"
              description={`This changes ${company.name}'s billing plan and/or monthly sending limit immediately.`}
              confirmLabel="Save"
              onConfirm={async () => {
                await updateLimit(company.id, {
                  monthlyEmailLimit: Number(limitInput),
                  planTier: planInput,
                });
                load();
              }}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-6 shadow">
        <h2 className="mb-3 text-lg font-semibold">Bounce &amp; complaint rate</h2>
        <BounceComplaintChart series={series} />
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 px-2 text-lg font-semibold">Campaign history</h2>
        {campaigns.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No campaigns yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Bounced</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.subject}</TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>{c.sentCount}</TableCell>
                  <TableCell>{c.deliveredCount}</TableCell>
                  <TableCell>{c.bouncedCount}</TableCell>
                  <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminShell>
  );
}
