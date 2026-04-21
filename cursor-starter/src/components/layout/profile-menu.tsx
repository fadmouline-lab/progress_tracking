"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setFullName(profile?.full_name ?? "");
      setAvatarUrl(profile?.avatar_url ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveName = useCallback(async () => {
    if (!userId) return;
    const name = fullName.trim();
    if (!name) {
      toast.message("Display name cannot be empty.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else toast.success("Name saved");
  }, [fullName, userId]);

  const onAvatar = useCallback(
    async (file: File | null) => {
      if (!file || !userId) return;
      const supabase = createClient();
      try {
        const safe = file.name.replace(/[^\w.\-]/g, "_");
        const path = `${userId}/${Date.now()}-${safe}`;
        const { error: up } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true });
        if (up) throw new Error(up.message);
        const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
        const url = pub.publicUrl;
        const { error } = await supabase
          .from("profiles")
          .update({ avatar_url: url })
          .eq("id", userId);
        if (error) throw new Error(error.message);
        setAvatarUrl(url);
        toast.success("Avatar updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    },
    [userId],
  );

  const onPassword = useCallback(async () => {
    if (!password.trim()) {
      toast.message("Enter a new password first.");
      return;
    }
    setPwSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });
      if (error) throw new Error(error.message);
      setPassword("");
      toast.success("Password updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setPwSaving(false);
    }
  }, [password]);

  const initials = fullName.trim()
    ? fullName.trim().slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label="Profile menu"
        >
          <Avatar className="size-8">
            <AvatarImage src={avatarUrl ?? undefined} alt="" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Display name</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => void saveName()}
                placeholder="Your name"
                autoComplete="name"
              />
              <p className="text-xs text-muted-foreground">
                Press Tab or click away to save your name.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-avatar">Avatar</Label>
              <Input
                id="profile-avatar"
                type="file"
                accept="image/*"
                onChange={(e) => void onAvatar(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-pw">New password</Label>
              <Input
                id="profile-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Optional"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pwSaving}
                  onClick={() => void onPassword()}
                >
                  {pwSaving ? "Updating…" : "Update password"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await createClient().auth.signOut();
                    router.push("/login");
                  }}
                >
                  <LogOut className="mr-1 size-3.5" />
                  Log out
                </Button>
              </div>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
