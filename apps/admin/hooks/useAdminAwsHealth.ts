"use client";

import { apiFetch } from "@/lib/api";
import type { AwsHealth } from "@/interface/aws-health";

export function useAdminAwsHealth() {
  async function getAwsHealth(): Promise<AwsHealth> {
    return apiFetch<AwsHealth>("/admin/aws-health");
  }

  return { getAwsHealth };
}
