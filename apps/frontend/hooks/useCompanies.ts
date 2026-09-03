"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  AddDomainResponse,
  AddSenderResponse,
  CompanyProfile,
  DomainStatusResponse,
} from "@/interface/company";

export function useCompanies() {
  const [isLoading, setIsLoading] = useState(false);

  async function getProfile(): Promise<CompanyProfile> {
    return apiFetch<CompanyProfile>("/companies/me");
  }

  async function addDomain(domain: string): Promise<AddDomainResponse> {
    setIsLoading(true);
    try {
      return await apiFetch<AddDomainResponse>("/companies/domain", {
        method: "POST",
        body: JSON.stringify({ domain }),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function getDomainStatus(): Promise<DomainStatusResponse> {
    return apiFetch<DomainStatusResponse>("/companies/domain/status");
  }

  async function addSender(address: string): Promise<AddSenderResponse> {
    setIsLoading(true);
    try {
      return await apiFetch<AddSenderResponse>("/companies/senders", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return { getProfile, addDomain, getDomainStatus, addSender, isLoading };
}
