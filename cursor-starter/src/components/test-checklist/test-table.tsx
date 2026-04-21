"use client";

import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import type { TestItem } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TestRow } from "@/components/test-checklist/test-row";

export function TestTable({
  tab,
  rows,
  emptyHint,
  onAddRow,
  showAddRow,
  footer,
  saveRowFields,
  onResultPassOrFixed,
}: {
  tab: "core" | "new" | "completed";
  rows: TestItem[];
  emptyHint: string;
  onAddRow?: () => void;
  showAddRow?: boolean;
  footer?: React.ReactNode;
  saveRowFields: (id: string, patch: Partial<TestItem>) => Promise<void>;
  onResultPassOrFixed?: (item: TestItem, next: "pass" | "fixed") => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showAddRow && onAddRow ? (
          <Button type="button" size="sm" variant="secondary" onClick={onAddRow}>
            <Plus className="mr-1 size-4" />
            Add row
          </Button>
        ) : (
          <span />
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Page/Tab</TableHead>
              <TableHead>Test Step</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-8 text-center text-sm text-muted-foreground"
                  colSpan={7}
                >
                  {emptyHint}
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                {rows.map((item) => (
                  <TestRow
                    key={item.id}
                    item={item}
                    tab={tab}
                    saveRowFields={saveRowFields}
                    onResultPassOrFixed={
                      tab === "new" && onResultPassOrFixed
                        ? (next) => onResultPassOrFixed(item, next)
                        : undefined
                    }
                  />
                ))}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      {footer ? <div className="pt-2">{footer}</div> : null}
    </div>
  );
}
