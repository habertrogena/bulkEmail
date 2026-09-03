import type { DailyRate } from "@/interface/company";

const CHART_WIDTH = 480;
const CHART_HEIGHT = 120;
const PADDING = 8;

function MiniRateChart({
  series,
  dataKey,
  threshold,
  label,
  color,
}: {
  series: DailyRate[];
  dataKey: "bounceRate" | "complaintRate";
  threshold: number;
  label: string;
  color: string;
}) {
  const values = series.map((d) => d[dataKey]);
  const max = Math.max(threshold * 1.4, ...values, 0.0001);

  const toX = (i: number) =>
    PADDING + (i / Math.max(1, series.length - 1)) * (CHART_WIDTH - PADDING * 2);
  const toY = (v: number) =>
    CHART_HEIGHT - PADDING - (v / max) * (CHART_HEIGHT - PADDING * 2);

  const points = series.map((d, i) => `${toX(i)},${toY(d[dataKey])}`).join(" ");
  const thresholdY = toY(threshold);

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-700">
        {label} <span className="text-slate-400">(last {series.length} days)</span>
      </p>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full rounded border bg-white"
        role="img"
        aria-label={`${label} over time, danger threshold ${(threshold * 100).toFixed(2)}%`}
      >
        <line
          x1={PADDING}
          y1={thresholdY}
          x2={CHART_WIDTH - PADDING}
          y2={thresholdY}
          stroke="#ef4444"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <text x={CHART_WIDTH - PADDING} y={thresholdY - 3} textAnchor="end" fontSize="9" fill="#ef4444">
          {(threshold * 100).toFixed(2)}% danger zone
        </text>
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
      </svg>
    </div>
  );
}

export function BounceComplaintChart({ series }: { series: DailyRate[] }) {
  if (series.length === 0) {
    return <p className="text-sm text-slate-500">No send activity in the last 30 days.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MiniRateChart
        series={series}
        dataKey="bounceRate"
        threshold={0.05}
        label="Bounce rate"
        color="#4f46e5"
      />
      <MiniRateChart
        series={series}
        dataKey="complaintRate"
        threshold={0.001}
        label="Complaint rate"
        color="#d97706"
      />
    </div>
  );
}
