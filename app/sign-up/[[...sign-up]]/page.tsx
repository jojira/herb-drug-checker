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
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <SignUp />
    </main>
  );
}
