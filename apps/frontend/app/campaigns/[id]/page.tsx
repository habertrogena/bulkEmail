"use client";

import { use, useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardCard from "@/components/dashboard/DashboardCard";
import { CampaignStatusBadge } from "@/components/dashboard/CampaignStatusBadge";
import { RecipientStatusBadge } from "@/components/dashboard/RecipientStatusBadge";
import { Button } from "@/components/ui/button";
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
import { useCampaignPoll } from "@/hooks/useCampaignPoll";
import { useCampaigns } from "@/hooks/useCampaigns";
import type { Recipient, RecipientStatus } from "@/interface/recipient";

const STATUS_FILTERS: { value: RecipientStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "bounced", label: "Bounced" },
  { value: "complained", label: "Complained" },
  { value: "failed", label: "Failed" },
];

const PAGE_SIZE = 20;

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { campaign, isLoading, error } = useCampaignPoll(id);
  const { listRecipients } = useCampaigns();

  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<RecipientStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [total, setTotal] = useState(0);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaign) return;
    listRecipients(id, { status: "pending", page: 1, pageSize: 1 })
      .then((res) => setPendingCount(res.total))
      .catch(() => setPendingCount(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, campaign?.status, campaign?.sentCount, campaign?.deliveredCount]);

  useEffect(() => {
    setRecipientsError(null);
    listRecipients(id, { status: statusFilter, page, pageSize: PAGE_SIZE })
      .then((res) => {
        setRecipients(res.items);
        setTotal(res.total);
      })
      .catch((err: unknown) =>
        setRecipientsError(err instanceof Error ? err.message : "Failed to load recipients"),
      );
    // listRecipients is recreated each render by useCampaigns(); omit it to avoid a refetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, statusFilter, page]);

  if (isLoading) return <LoadingPage />;

  if (error || !campaign) {
    return (
      <DashboardLayout>
        <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
          {error ?? "Campaign not found"}
        </div>
      </DashboardLayout>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{campaign.subject}</h1>
          <p className="text-sm text-slate-600">From {campaign.fromAddress}</p>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DashboardCard title="Sent">
          <p className="text-2xl font-semibold">{campaign.sentCount}</p>
        </DashboardCard>
        <DashboardCard title="Delivered">
          <p className="text-2xl font-semibold">{campaign.deliveredCount}</p>
        </DashboardCard>
        <DashboardCard title="Bounced">
          <p className="text-2xl font-semibold">{campaign.bouncedCount}</p>
        </DashboardCard>
        <DashboardCard title="Complained">
          <p className="text-2xl font-semibold">{campaign.complainedCount}</p>
        </DashboardCard>
        <DashboardCard title="Pending">
          <p className="text-2xl font-semibold">{pendingCount ?? "—"}</p>
        </DashboardCard>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recipients</h2>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as RecipientStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {recipientsError && (
          <p className="mb-3 text-sm font-medium text-red-600">{recipientsError}</p>
        )}

        {recipients === null ? (
          <p className="p-6 text-center text-sm text-slate-500">Loading recipients...</p>
        ) : recipients.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No recipients found.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent at</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell>{recipient.email}</TableCell>
                    <TableCell>
                      <RecipientStatusBadge status={recipient.status} />
                    </TableCell>
                    <TableCell>
                      {recipient.sentAt ? new Date(recipient.sentAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-red-600">
                      {recipient.errorMessage ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
