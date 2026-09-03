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
