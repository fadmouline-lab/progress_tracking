import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full flex-col justify-center bg-muted/30 px-4 py-12">
      <div
        className="mx-auto w-full max-w-md min-w-0 shrink-0"
        style={{ width: "100%", maxWidth: "28rem" }}
      >
        <Suspense
          fallback={
            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
              Loading sign-in…
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
