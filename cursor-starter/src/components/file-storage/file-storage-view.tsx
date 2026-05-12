"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProject } from "@/hooks/use-project";
import type { ProjectFile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Loader2, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

function formatBytes(n: number | null) {
  if (n == null || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function displayNameForUser(
  members: { user_id: string; profile: { full_name: string | null; email: string } | null }[],
  userId: string | null,
) {
  if (!userId) return "Unknown";
  const m = members.find((x) => x.user_id === userId);
  return m?.profile?.full_name?.trim() || m?.profile?.email || "Teammate";
}

export function FileStorageView() {
  const { projectId, members, loading: projectLoading } = useProject();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [savingRenameId, setSavingRenameId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [fileDeleteTarget, setFileDeleteTarget] = useState<ProjectFile | null>(
    null,
  );
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: qErr } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (qErr) {
      setError(qErr.message);
      setFiles([]);
    } else {
      setError(null);
      setFiles((data ?? []) as ProjectFile[]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project-files:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_files",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, load]);

  const nameByUser = useMemo(
    () => (userId: string | null) => displayNameForUser(members, userId),
    [members],
  );

  useEffect(() => {
    if (uploadFile && !displayName.trim()) {
      setDisplayName(uploadFile.name);
    }
  }, [uploadFile, displayName]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) {
      setError("Choose a file to upload.");
      return;
    }
    const name = displayName.trim() || uploadFile.name;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const fileId = crypto.randomUUID();
    const safeBase = uploadFile.name.replace(/[^\w.\-]/g, "_") || "file";
    const path = `${projectId}/${fileId}-${safeBase}`;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in.");
        return;
      }

      const { error: upErr } = await supabase.storage
        .from("project-files")
        .upload(path, uploadFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: uploadFile.type || undefined,
        });
      if (upErr) {
        setError(upErr.message);
        return;
      }

      const { error: insErr } = await supabase.from("project_files").insert({
        id: fileId,
        project_id: projectId,
        display_name: name,
        storage_path: path,
        content_type: uploadFile.type || null,
        size_bytes: uploadFile.size,
        uploaded_by: user.id,
      });

      if (insErr) {
        await supabase.storage.from("project-files").remove([path]);
        setError(insErr.message);
        return;
      }

      setUploadFile(null);
      setDisplayName("");
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(row: ProjectFile) {
    setDownloadingId(row.id);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: signErr } = await supabase.storage
        .from("project-files")
        .createSignedUrl(row.storage_path, 3600);
      if (signErr || !data?.signedUrl) {
        setError(signErr?.message ?? "Could not create download link.");
        return;
      }
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = row.display_name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloadingId(null);
    }
  }

  async function saveRename(row: ProjectFile) {
    const next = renameDraft.trim();
    if (!next || next === row.display_name) {
      setRenamingId(null);
      return;
    }
    setSavingRenameId(row.id);
    setError(null);
    try {
      const supabase = createClient();
      const { error: uErr } = await supabase
        .from("project_files")
        .update({ display_name: next })
        .eq("id", row.id);
      if (uErr) {
        setError(uErr.message);
        return;
      }
      setRenamingId(null);
      await load();
    } finally {
      setSavingRenameId(null);
    }
  }

  async function confirmDeleteFile() {
    if (!fileDeleteTarget) return;
    const path = fileDeleteTarget.storage_path;
    const id = fileDeleteTarget.id;
    setDeletingFileId(id);
    setError(null);
    try {
      const supabase = createClient();
      const { error: dbErr } = await supabase
        .from("project_files")
        .delete()
        .eq("id", id)
        .eq("project_id", projectId);
      if (dbErr) {
        setError(dbErr.message);
        throw new Error(dbErr.message);
      }
      const { error: storageErr } = await supabase.storage
        .from("project-files")
        .remove([path]);
      if (storageErr) {
        setError(
          `Removed from the list, but storage cleanup failed: ${storageErr.message}`,
        );
      }
      setFileDeleteTarget(null);
      await load();
    } finally {
      setDeletingFileId(null);
    }
  }

  if (projectLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>File storage</CardTitle>
          <CardDescription>
            Upload files for this project, give them a friendly name, download
            shared files, or delete ones you no longer need.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setUploadFile(f);
                  if (f) setDisplayName(f.name);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-display-name">Display name</Label>
              <Input
                id="file-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Q1 roadmap.pdf"
              />
            </div>
            <Button type="submit" disabled={uploading || !uploadFile}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Files ({files.length})
        </h2>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No files yet. Upload something above.
          </p>
        ) : (
          <ul className="space-y-3">
            {files.map((row) => (
              <li key={row.id}>
                <Card className="py-4 shadow-none">
                  <CardContent className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      {renamingId === row.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            className="max-w-md"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveRename(row);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={savingRenameId === row.id}
                            onClick={() => void saveRename(row)}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRenamingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="block w-full truncate text-left text-sm font-medium underline-offset-4 hover:underline"
                          onClick={() => {
                            setRenamingId(row.id);
                            setRenameDraft(row.display_name);
                          }}
                        >
                          {row.display_name}
                        </button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {nameByUser(row.uploaded_by)} ·{" "}
                        {new Date(row.created_at).toLocaleString()} ·{" "}
                        {formatBytes(row.size_bytes)}
                        {row.content_type ? ` · ${row.content_type}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={downloadingId === row.id}
                        onClick={() => void handleDownload(row)}
                      >
                        {downloadingId === row.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <>
                            <Download className="mr-1.5 size-4" />
                            Download
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={deletingFileId === row.id}
                        onClick={() => setFileDeleteTarget(row)}
                      >
                        <Trash2 className="mr-1.5 size-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={fileDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setFileDeleteTarget(null);
        }}
        title="Delete this file?"
        description={
          fileDeleteTarget
            ? `“${fileDeleteTarget.display_name}” will be removed for everyone and the stored bytes will be deleted.`
            : ""
        }
        confirmLabel={deletingFileId ? "Deleting…" : "Delete"}
        destructive
        onConfirm={confirmDeleteFile}
      />
    </div>
  );
}
