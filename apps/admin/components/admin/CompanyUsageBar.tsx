import { cn } from "@/lib/utils";

export function CompanyUsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isHigh = pct >= 90;

  return (
    <div className="w-40">
      <div className="mb-1 flex justify-between text-xs text-slate-600">
        <span>{used.toLocaleString()}</span>
        <span>{limit.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn("h-full rounded-full", isHigh ? "bg-red-500" : "bg-indigo-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
