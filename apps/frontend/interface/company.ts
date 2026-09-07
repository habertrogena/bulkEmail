export interface DkimInstruction {
  label: string; // e.g. "DKIM", "SPF", "Receiving" — which record this is
  type: "CNAME" | "TXT" | "MX" | "CAA";
  name: string;
  value: string;
  priority?: number; // only present for MX records
}

export interface CompanyProfile {
  sendingDomain: string | null;
  domainVerified: boolean;
  approvedSenders: string[];
  planTier: string;
  monthlyEmailLimit: number;
  instructions: DkimInstruction[];
}

export interface AddDomainResponse {
  domain: string;
  instructions: DkimInstruction[];
}

export interface DomainStatusResponse {
  sendingDomain: string | null;
  domainVerified: boolean;
}

export interface AddSenderResponse {
  approvedSenders: string[];
}
