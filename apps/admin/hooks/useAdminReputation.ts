"use client";

import { apiFetch } from "@/lib/api";
import type { ReputationEntry } from "@/interface/reputation";

export function useAdminReputation() {
  async function getReputation(): Promise<ReputationEntry[]> {
    return apiFetch<ReputationEntry[]>("/admin/reputation");
  }

  return { getReputation };
}
