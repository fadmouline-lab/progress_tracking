import { OnboardingForm } from "@/components/auth/onboarding-form";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-svh w-full flex-col justify-center bg-muted/30 px-4 py-12">
      <div
        className="mx-auto w-full max-w-md min-w-0 shrink-0"
        style={{ width: "100%", maxWidth: "28rem" }}
      >
        <OnboardingForm />
      </div>
    </div>
  );
}
