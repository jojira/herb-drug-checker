import type { User } from "@clerk/nextjs/server";

export interface UserEntitlements {
  tier: "basic" | "pro";
  canExportPDF: boolean;
  canShareLink: boolean;
  hasUnlimitedSearch: boolean;
  partnerId: string | null;
}

export function getUserEntitlements(user: User | null): UserEntitlements {
  if (!user) {
    return {
      tier: "basic",
      canExportPDF: false,
      canShareLink: false,
      hasUnlimitedSearch: false,
      partnerId: null,
    };
  }

  const partnerId =
    (user.publicMetadata?.partner_id as string | undefined) ??
    (user.unsafeMetadata?.partner_id as string | undefined) ??
    null;
  const isPro = !!partnerId;

  return {
    tier: isPro ? "pro" : "basic",
    canExportPDF: isPro,
    canShareLink: isPro,
    hasUnlimitedSearch: isPro,
    partnerId,
  };
}
