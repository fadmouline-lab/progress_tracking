"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm() {
  const router = useRouter();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = fullName.trim();
    if (!name) {
      setError("Full name is required.");
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

      let avatarUrl: string | null = null;
      if (avatarFile) {
        const safeName = avatarFile.name.replace(/[^\w.\-]/g, "_");
        const path = `${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) {
          setError(uploadError.message);
          return;
        }
        const { data: pub } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        avatarUrl = pub.publicUrl;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email ?? "",
          full_name: name,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" },
      );
      if (profileError) {
        setError(profileError.message);
        return;
      }

      router.push("/home");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border shadow-sm">
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>
          Set up your profile. Avatar is optional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar (optional)</Label>
            <Input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setAvatarFile(e.target.files?.[0] ?? null)
              }
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
