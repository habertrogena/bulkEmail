"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  AddRecipientsResponse,
  Campaign,
  CreateCampaignInput,
  SendCampaignResponse,
} from "@/interface/campaign";
import type { RecipientsPage, RecipientStatus } from "@/interface/recipient";

export function useCampaigns() {
  const [isLoading, setIsLoading] = useState(false);

  async function listCampaigns(): Promise<Campaign[]> {
    return apiFetch<Campaign[]>("/campaigns");
  }

  async function getCampaign(id: string): Promise<Campaign> {
    return apiFetch<Campaign>(`/campaigns/${id}`);
  }

  async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    setIsLoading(true);
    try {
      return await apiFetch<Campaign>("/campaigns", {
        method: "POST",
        body: JSON.stringify(input),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function addRecipients(id: string, csv: string): Promise<AddRecipientsResponse> {
    setIsLoading(true);
    try {
      return await apiFetch<AddRecipientsResponse>(`/campaigns/${id}/recipients`, {
        method: "POST",
        body: JSON.stringify({ csv }),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function sendCampaign(id: string): Promise<SendCampaignResponse> {
    setIsLoading(true);
    try {
      return await apiFetch<SendCampaignResponse>(`/campaigns/${id}/send`, {
        method: "POST",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function listRecipients(
    id: string,
    params: { status?: RecipientStatus | "all"; page?: number; pageSize?: number },
  ): Promise<RecipientsPage> {
    const query = new URLSearchParams();
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return apiFetch<RecipientsPage>(`/campaigns/${id}/recipients${qs ? `?${qs}` : ""}`);
  }

  return {
    listCampaigns,
    getCampaign,
    createCampaign,
    addRecipients,
    sendCampaign,
    listRecipients,
    isLoading,
  };
}
