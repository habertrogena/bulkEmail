"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Campaign } from "@/interface/campaign";

const POLL_INTERVAL_MS = 3000;

/** Fetches a campaign and polls every few seconds while it's actively sending. */
export function useCampaignPoll(id: string) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchCampaign() {
    try {
      const data = await apiFetch<Campaign>(`/campaigns/${id}`);
      setCampaign(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      const data = await fetchCampaign();
      if (cancelled) return;
      setIsLoading(false);

      if (data && data.status === "sending") {
        intervalRef.current = setInterval(async () => {
          const latest = await fetchCampaign();
          if (latest && latest.status !== "sending" && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }, POLL_INTERVAL_MS);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { campaign, isLoading, error, refetch: fetchCampaign };
}
