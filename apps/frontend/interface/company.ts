export interface DkimInstruction {
  type: "CNAME";
  name: string;
  value: string;
}

export interface CompanyProfile {
  sendingDomain: string | null;
  domainVerified: boolean;
  approvedSenders: string[];
  planTier: string;
  monthlyEmailLimit: number;
  dkimTokens: string[];
  instructions: DkimInstruction[];
}

export interface AddDomainResponse {
  domain: string;
  dkimTokens: string[];
  instructions: DkimInstruction[];
}

export interface DomainStatusResponse {
  sendingDomain: string | null;
  domainVerified: boolean;
}

export interface AddSenderResponse {
  approvedSenders: string[];
}
