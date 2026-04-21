"use client";

import Link from "next/link";
import type { ProjectWithMeta } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectWithMeta[];
};

export function ProjectSelector({ open, onOpenChange, projects }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select a project</DialogTitle>
          <DialogDescription>
            Open a project to work on Scope, Progress, and Test Checklist.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 pt-2">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet — create one with the other button.
            </p>
          ) : (
            projects.map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}/scope`}
                onClick={() => onOpenChange(false)}
              >
                <Card className="transition-colors hover:bg-muted/60">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {p.logo_url ? (
                        <img
                          src={p.logo_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                          —
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.member_count}{" "}
                        {p.member_count === 1 ? "member" : "members"}
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="secondary">
                      Open
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
