import { Badge } from "@/components/ui/badge";
import type { CampaignStatus } from "@/interface/campaign";

const STATUS_VARIANT: Record<
  CampaignStatus,
  "default" | "secondary" | "destructive" | "success"
> = {
  draft: "secondary",
  sending: "default",
  completed: "success",
  failed: "destructive",
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Draft",
  sending: "Sending",
  completed: "Completed",
  failed: "Failed",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
