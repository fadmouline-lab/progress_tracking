import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { LiquidBallBackground } from "@/components/liquid-ball-background";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh w-full flex-col justify-center bg-muted/30 px-4 py-12 md:bg-transparent">
      <LiquidBallBackground />
      <div
        className="relative z-10 mx-auto w-full max-w-md min-w-0 shrink-0"
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
