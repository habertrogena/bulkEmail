import type { Campaign } from "./campaign";

export interface AdminCompanyListItem {
  id: string;
  name: string;
  sendingDomain: string | null;
  domainVerified: boolean;
  planTier: string;
  monthlyEmailLimit: number;
  monthlyUsage: number;
  campaignsSentThisMonth: number;
  suspended: boolean;
  createdAt: string;
}

export interface AdminCompanyUser {
  id: string;
  email: string;
  role: string;
  isPlatformAdmin: boolean;
  createdAt: string;
}

export interface DailyRate {
  date: string;
  sent: number;
  bounceRate: number;
  complaintRate: number;
}

export interface FullCompany {
  id: string;
  name: string;
  sendingDomain: string | null;
  domainVerified: boolean;
  dkimTokens: unknown;
  configurationSetName: string | null;
  approvedSenders: string[];
  planTier: string;
  monthlyEmailLimit: number;
  suspended: boolean;
  createdAt: string;
}

export interface AdminCompanyDetail {
  company: FullCompany;
  users: AdminCompanyUser[];
  campaigns: Campaign[];
  series: DailyRate[];
}

export interface UpdateLimitInput {
  monthlyEmailLimit?: number;
  planTier?: string;
}
