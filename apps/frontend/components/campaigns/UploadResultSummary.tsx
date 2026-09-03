import type { AddRecipientsResponse } from "@/interface/campaign";

export function UploadResultSummary({ result }: { result: AddRecipientsResponse }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 text-sm">
      <p className="mb-2 font-medium text-slate-900">
        Parsed {result.totalRows} row{result.totalRows === 1 ? "" : "s"} — {result.inserted}{" "}
        added.
      </p>
      {(result.invalidEmail > 0 || result.duplicate > 0 || result.suppressed > 0) && (
        <ul className="space-y-0.5 text-slate-600">
          {result.invalidEmail > 0 && <li>{result.invalidEmail} skipped: invalid email</li>}
          {result.duplicate > 0 && <li>{result.duplicate} skipped: duplicate</li>}
          {result.suppressed > 0 && <li>{result.suppressed} skipped: suppressed</li>}
        </ul>
      )}
    </div>
  );
}
