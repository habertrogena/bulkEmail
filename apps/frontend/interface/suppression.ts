export type SuppressionReason = "bounce" | "complaint" | "manual_unsubscribe";

export interface SuppressionEntry {
  id: string;
  companyId: string;
  email: string;
  reason: SuppressionReason;
  createdAt: string;
}
