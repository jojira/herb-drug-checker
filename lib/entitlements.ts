// Structural type — compatible with both server-side User and client-side UserResource
interface ClerkUserLike {
  publicMetadata?: Record<string, unknown>;
  unsafeMetadata?: Record<string, unknown>;
}

export interface UserEntitlements {
  tier: "basic" | "pro";
  canExportPDF: boolean;
  canShareLink: boolean;
  hasUnlimitedSearch: boolean;
  partnerId: string | null;
}

export function getUserEntitlements(user: ClerkUserLike | null): UserEntitlements {
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
