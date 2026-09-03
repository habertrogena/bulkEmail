import { Badge } from "@/components/ui/badge";
import type { RecipientStatus } from "@/interface/recipient";

const STATUS_VARIANT: Record<
  RecipientStatus,
  "default" | "secondary" | "destructive" | "success" | "warning"
> = {
  pending: "secondary",
  sent: "default",
  delivered: "success",
  bounced: "warning",
  complained: "warning",
  failed: "destructive",
};

const STATUS_LABEL: Record<RecipientStatus, string> = {
  pending: "Pending",
  sent: "Sent",
  delivered: "Delivered",
  bounced: "Bounced",
  complained: "Complained",
  failed: "Failed",
};

export function RecipientStatusBadge({ status }: { status: RecipientStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
