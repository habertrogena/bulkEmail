"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CampaignStatusBadge } from "@/components/dashboard/CampaignStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { useAuth } from "@/context/useAuth";
import { useCampaigns } from "@/hooks/useCampaigns";
import type { Campaign } from "@/interface/campaign";

export default function DashboardPage() {
  const { isAuthLoading } = useAuth();
  const { listCampaigns } = useCampaigns();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    listCampaigns()
      .then(setCampaigns)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load campaigns"),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]);

  if (isAuthLoading) return <LoadingPage />;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
        <Button onClick={() => router.push("/campaigns/new")}>New campaign</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl bg-white p-4 shadow">
        {campaigns === null ? (
          <p className="p-6 text-center text-sm text-slate-500">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <div className="p-10 text-center">
            <p className="mb-4 text-sm text-slate-600">
              You haven&apos;t created any campaigns yet.
            </p>
            <Button onClick={() => router.push("/campaigns/new")}>
              Create your first campaign
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Bounced</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/campaigns/${campaign.id}`)}
                >
                  <TableCell className="font-medium text-slate-900">
                    <Link href={`/campaigns/${campaign.id}`} onClick={(e) => e.stopPropagation()}>
                      {campaign.subject}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={campaign.status} />
                  </TableCell>
                  <TableCell>{campaign.totalCount}</TableCell>
                  <TableCell>{campaign.sentCount}</TableCell>
                  <TableCell>{campaign.deliveredCount}</TableCell>
                  <TableCell>{campaign.bouncedCount}</TableCell>
                  <TableCell>
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardLayout>
  );
}
