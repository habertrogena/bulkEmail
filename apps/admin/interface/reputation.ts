export interface ReputationEntry {
  companyId: string;
  name: string;
  sendingDomain: string | null;
  sent: number;
  bounceRate: number;
  complaintRate: number;
  atRisk: boolean;
}
