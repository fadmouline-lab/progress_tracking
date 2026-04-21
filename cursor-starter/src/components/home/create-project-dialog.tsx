"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Project name is required.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in.");
        return;
      }

      const { data: project, error: insertError } = await supabase
        .from("projects")
        .insert({
          name: trimmed,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertError || !project) {
        setError(insertError?.message ?? "Could not create project.");
        return;
      }

      let logoUrl: string | null = null;
      if (logoFile) {
        const safeName = logoFile.name.replace(/[^\w.\-]/g, "_");
        const path = `${project.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("project-logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadError) {
          setError(uploadError.message);
          return;
        }
        const { data: pub } = supabase.storage
          .from("project-logos")
          .getPublicUrl(path);
        logoUrl = pub.publicUrl;
        await supabase
          .from("projects")
          .update({ logo_url: logoUrl })
          .eq("id", project.id);
      }

      const { error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: "owner",
        });
      if (memberError) {
        setError(memberError.message);
        return;
      }

      setName("");
      setLogoFile(null);
      onOpenChange(false);
      onCreated?.();
      router.push(`/project/${project.id}/scope`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Give it a name and optionally add a logo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mobile app rewrite"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-logo">Logo (optional)</Label>
            <Input
              id="project-logo"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setLogoFile(e.target.files?.[0] ?? null)
              }
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
