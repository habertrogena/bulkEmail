export type CampaignStatus = "draft" | "sending" | "completed" | "failed";

export interface Campaign {
  id: string;
  companyId: string;
  subject: string;
  bodyHtml: string;
  fromAddress: string;
  replyTo: string | null;
  status: CampaignStatus;
  totalCount: number;
  sentCount: number;
  deliveredCount: number;
  bouncedCount: number;
  complainedCount: number;
  createdAt: string;
  sentAt: string | null;
}

export interface CreateCampaignInput {
  subject: string;
  bodyHtml: string;
  fromAddress: string;
  replyTo?: string;
}

export interface AddRecipientsResponse {
  totalRows: number;
  inserted: number;
  invalidEmail: number;
  duplicate: number;
  suppressed: number;
}

export interface SendCampaignResponse {
  status: string;
  enqueued: number;
}
