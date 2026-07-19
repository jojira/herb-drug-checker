"use client";

import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { getUserEntitlements } from "@/lib/entitlements";
import type { SearchSavePayload } from "@/lib/searchHistoryService";

export interface UseSearchHistoryResult {
  saveSearch: (payload: SearchSavePayload) => Promise<void>;
  isSaving: boolean;
}

export function useSearchHistory(): UseSearchHistoryResult {
  const { user } = useUser();
  const entitlements = getUserEntitlements(user ?? null);
  const [isSaving, setIsSaving] = useState(false);

  const saveSearch = useCallback(
    async (payload: SearchSavePayload) => {
      if (!user || !entitlements.canExportPDF) return;

      setIsSaving(true);
      try {
        await fetch("/api/search-history/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // Non-critical
      } finally {
        setIsSaving(false);
      }
    },
    [user, entitlements.canExportPDF]
  );

  return { saveSearch, isSaving };
}
