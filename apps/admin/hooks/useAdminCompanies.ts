"use client";

import { apiFetch } from "@/lib/api";
import type {
  AdminCompanyDetail,
  AdminCompanyListItem,
  UpdateDomainInput,
  UpdateLimitInput,
  UpdateProviderInput,
} from "@/interface/company";

export function useAdminCompanies() {
  async function listCompanies(): Promise<AdminCompanyListItem[]> {
    return apiFetch<AdminCompanyListItem[]>("/admin/companies");
  }

  async function getCompanyDetail(id: string): Promise<AdminCompanyDetail> {
    return apiFetch<AdminCompanyDetail>(`/admin/companies/${id}`);
  }

  async function suspendCompany(id: string) {
    return apiFetch(`/admin/companies/${id}/suspend`, { method: "POST" });
  }

  async function unsuspendCompany(id: string) {
    return apiFetch(`/admin/companies/${id}/unsuspend`, { method: "POST" });
  }

  async function updateLimit(id: string, input: UpdateLimitInput) {
    return apiFetch(`/admin/companies/${id}/limit`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async function updateProvider(id: string, input: UpdateProviderInput) {
    return apiFetch(`/admin/companies/${id}/provider`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async function updateDomain(id: string, input: UpdateDomainInput) {
    return apiFetch(`/admin/companies/${id}/domain`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  return {
    listCompanies,
    getCompanyDetail,
    suspendCompany,
    unsuspendCompany,
    updateLimit,
    updateProvider,
    updateDomain,
  };
}
