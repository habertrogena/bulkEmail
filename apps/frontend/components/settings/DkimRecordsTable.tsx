import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyButton } from "./CopyButton";
import type { DkimInstruction } from "@/interface/company";

export function DkimRecordsTable({ instructions }: { instructions: DkimInstruction[] }) {
  if (instructions.length === 0) return null;

  // SES only ever returns DKIM CNAMEs, so the "Record" and "Priority"
  // columns would just repeat "DKIM" / stay blank for every row there.
  // Resend returns a mix (SPF/DKIM/MX/etc, some with an MX priority), so
  // only show these columns when there's something to distinguish.
  const showRecordColumn = instructions.some((r) => r.label !== "DKIM");
  const showPriorityColumn = instructions.some((r) => r.priority !== undefined);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {showRecordColumn && <TableHead>Record</TableHead>}
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Value</TableHead>
            {showPriorityColumn && <TableHead>Priority</TableHead>}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {instructions.map((record, i) => (
            <TableRow key={`${record.name}-${i}`}>
              {showRecordColumn && <TableCell>{record.label}</TableCell>}
              <TableCell className="font-mono text-xs">{record.name}</TableCell>
              <TableCell>{record.type}</TableCell>
              <TableCell className="font-mono text-xs">{record.value}</TableCell>
              {showPriorityColumn && <TableCell>{record.priority ?? "—"}</TableCell>}
              <TableCell>
                <CopyButton value={record.value} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
