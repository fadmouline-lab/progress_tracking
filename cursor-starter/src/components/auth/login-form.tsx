"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"magic" | "password">("magic");
  const [pwMode, setPwMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackError = (() => {
    const q = searchParams.get("error");
    if (q === "auth") {
      return "Sign-in failed. Try requesting a new magic link.";
    }
    if (q === "missing_code") {
      return "Missing auth code. Open the link from your email.";
    }
    if (q === "no_user") {
      return "Could not load your account after sign-in.";
    }
    return null;
  })();

  const displayError = callbackError ?? error;

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error: signError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      router.refresh();
      router.push("/home");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      if (signError) {
        if (signError.status === 429 || signError.message?.toLowerCase().includes("rate limit")) {
          setError("Too many sign-up attempts. Wait a few minutes and try again, or ask your admin to raise the Supabase rate limit.");
        } else {
          setError(signError.message);
        }
        return;
      }
      if (data.session) {
        router.refresh();
        router.push("/onboarding");
      } else {
        setSignupSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border shadow-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Sign in with a magic link or email and password. No account yet? Use
          the Email &amp; password tab to sign up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayError ? (
          <p className="text-destructive mb-4 text-sm" role="alert">
            {displayError}
          </p>
        ) : null}
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as "magic" | "password");
            setError(null);
            setSent(false);
            setSignupSent(false);
            setPwMode("signin");
          }}
          className="w-full"
        >
          <TabsList className="grid w-full min-w-0 grid-cols-2 !w-full">
            <TabsTrigger value="magic">Magic link</TabsTrigger>
            <TabsTrigger value="password">Email &amp; password</TabsTrigger>
          </TabsList>
          <TabsContent value="magic" className="mt-4">
            {sent ? (
              <p className="text-sm text-muted-foreground">
                Check your email for the magic link to create your account or
                sign in.
              </p>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="magic-email">Email</Label>
                  <Input
                    id="magic-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send magic link"}
                </Button>
              </form>
            )}
          </TabsContent>
          <TabsContent value="password" className="mt-4">
            {signupSent ? (
              <p className="text-sm text-muted-foreground">
                Check your email to confirm your account, then come back to sign
                in.
              </p>
            ) : (
              <form
                onSubmit={
                  pwMode === "signin"
                    ? handlePasswordSignIn
                    : handlePasswordSignUp
                }
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="pw-email">Email</Label>
                  <Input
                    id="pw-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw-password">Password</Label>
                  <Input
                    id="pw-password"
                    name="password"
                    type="password"
                    autoComplete={
                      pwMode === "signin" ? "current-password" : "new-password"
                    }
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? pwMode === "signin"
                      ? "Signing in…"
                      : "Creating account…"
                    : pwMode === "signin"
                      ? "Sign in"
                      : "Sign up"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {pwMode === "signin" ? (
                    <>
                      No account?{" "}
                      <button
                        type="button"
                        className="underline hover:text-foreground"
                        onClick={() => {
                          setPwMode("signup");
                          setError(null);
                        }}
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="underline hover:text-foreground"
                        onClick={() => {
                          setPwMode("signin");
                          setError(null);
                        }}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
