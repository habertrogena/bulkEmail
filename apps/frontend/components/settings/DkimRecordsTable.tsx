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

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Value</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {instructions.map((record) => (
            <TableRow key={record.name}>
              <TableCell className="font-mono text-xs">{record.name}</TableCell>
              <TableCell>{record.type}</TableCell>
              <TableCell className="font-mono text-xs">{record.value}</TableCell>
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
