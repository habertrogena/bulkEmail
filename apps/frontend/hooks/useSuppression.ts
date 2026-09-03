"use client";

import { apiFetch } from "@/lib/api";
import type { SuppressionEntry } from "@/interface/suppression";

export function useSuppression() {
  async function list(): Promise<SuppressionEntry[]> {
    return apiFetch<SuppressionEntry[]>("/suppression");
  }

  return { list };
}
