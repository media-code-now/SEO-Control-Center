"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();
  const [devEmail, setDevEmail] = useState("");
  const [devPasscode, setDevPasscode] = useState("");
  const [devError, setDevError] = useState<string | null>(null);
  const [isSigningIn, startTransition] = useTransition();
  const isNonProduction = process.env.NODE_ENV !== "production";

  const handleSignIn = async () => {
    await signIn("google", { callbackUrl: "/" });
  };

  const handleDevLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isNonProduction) return;
    setDevError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: devEmail,
        passcode: devPasscode,
        redirect: false,
        callbackUrl: "/",
      });
      if (result?.error) {
        setDevError("Unable to sign in with the provided credentials.");
        return;
      }
      router.push("/");
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white">
            SEO
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Sign in to SEO Control Center</h1>
          <p className="mt-2 text-sm text-slate-600">Connect with Google to sync your Search Console data.</p>
        </div>
        <div className="space-y-4">
          <Button onClick={handleSignIn} className="w-full">
            Continue with Google
          </Button>
        </div>
        {isNonProduction && (
          <div className="mt-6 space-y-3 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">QA login</p>
            <form data-testid="dev-login-form" className="space-y-3" onSubmit={handleDevLogin}>
              <div>
                <Label htmlFor="dev-email">Email</Label>
                <Input
                  id="dev-email"
                  data-testid="dev-email"
                  placeholder="founder@example.com"
                  value={devEmail}
                  onChange={(event) => setDevEmail(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dev-passcode">Passcode</Label>
                <Input
                  id="dev-passcode"
                  data-testid="dev-passcode"
                  type="password"
                  placeholder="Enter QA passcode"
                  value={devPasscode}
                  onChange={(event) => setDevPasscode(event.target.value)}
                />
              </div>
              {devError ? <p className="text-xs text-red-500">{devError}</p> : null}
              <Button data-testid="dev-login-submit" type="submit" className="w-full" disabled={isSigningIn}>
                {isSigningIn ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <p className="text-xs text-slate-500">Limited to QA environments. Uses seeded workspace accounts.</p>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-slate-500">
          Need access? Contact <Link href="mailto:ops@example.com" className="underline">ops@example.com</Link>
        </p>
      </div>
    </div>
  );
}
