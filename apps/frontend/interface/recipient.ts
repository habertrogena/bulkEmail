export type RecipientStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed";

export interface Recipient {
  id: string;
  campaignId: string;
  email: string;
  mergeData: Record<string, unknown> | null;
  status: RecipientStatus;
  sesMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
}

export interface RecipientsPage {
  items: Recipient[];
  total: number;
  page: number;
  pageSize: number;
}
