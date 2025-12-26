"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignOutContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    async function performSignOut() {
      try {
        // Get CSRF token
        const csrfRes = await fetch("/api/auth/csrf");
        const { csrfToken } = await csrfRes.json();

        // Perform sign out
        const res = await fetch("/api/auth/signout", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            csrfToken,
            callbackUrl,
          }),
        });

        if (res.ok || res.redirected) {
          setStatus("success");
          // Redirect after a brief moment
          setTimeout(() => {
            window.location.href = callbackUrl;
          }, 500);
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    }

    performSignOut();
  }, [callbackUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted">Signing out...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-foreground">Signed out successfully</p>
            <p className="text-sm text-muted mt-2">Redirecting...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-foreground">Failed to sign out</p>
            <a href={callbackUrl} className="text-sm text-accent hover:underline mt-2 block">
              Return to app
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function SignOutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignOutContent />
    </Suspense>
  );
}
