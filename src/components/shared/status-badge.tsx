import { Badge } from "@/components/ui/badge";
import { badgeToneForStatus } from "@/lib/labels";

export function StatusBadge({ label, status }: { label: string; status: string }) {
  const tone = badgeToneForStatus(status);
  return <Badge variant={tone}>{label}</Badge>;
}
