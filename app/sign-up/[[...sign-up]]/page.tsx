"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SignUpPage() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const refCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("formulens_ref="))
      ?.split("=")[1];

    if (refCookie && !user.unsafeMetadata?.partner_id) {
      // unsafeMetadata is writable client-side; publicMetadata requires the
      // Backend API (server-side only). The webhook handler reads both.
      user
        .update({ unsafeMetadata: { partner_id: refCookie } })
        .catch((err) => console.error("Failed to set partner metadata:", err));
    }
  }, [user, isLoaded]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Sign up to Formulens
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Create a free account to remove the 5-search guest limit and get
            unlimited interaction checks.
          </p>
          <p className="text-slate-400 text-xs leading-relaxed mt-2 italic">
            Formulens Pro (coming soon): PDF export, shareable results, and
            search history for your practice.
          </p>
        </div>
        <div className="flex justify-center">
          <SignUp />
        </div>
      </div>
    </main>
  );
}
