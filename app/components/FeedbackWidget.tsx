"use client";

/**
 * FeedbackWidget.tsx
 *
 * Floating feedback button + modal, rendered on all routes via layout.tsx.
 * Submits to POST /api/feedback which forwards to FEEDBACK_WEBHOOK_URL
 * (Google Sheets Apps Script webhook) or logs to console in dev mode.
 *
 * z-index: button z-[10000], backdrop z-[10001], panel z-[10002]
 * — above search dropdowns (z-[9999]) and sticky headers (z-10).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { FeedbackType, FeedbackPayload } from "@/lib/types/clinical";

type SubmitState = "idle" | "loading" | "success" | "error";

const APP_VERSION = "3.3.0";

const FEEDBACK_CATEGORIES: { value: FeedbackType; label: string }[] = [
  { value: "data_accuracy", label: "Data Accuracy Issue" },
  { value: "ui_bug", label: "UI / UX Bug" },
  { value: "feature_request", label: "Feature Request" },
  { value: "general_praise", label: "General Praise" },
];

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | "">("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-close modal 3 seconds after successful submission
  useEffect(() => {
    if (submitState === "success") {
      autoCloseRef.current = setTimeout(() => {
        handleClose();
      }, 3000);
    }
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitState]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = useCallback(() => {
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    setOpen(false);
    // Reset form after close animation would finish
    setTimeout(() => {
      setFeedbackType("");
      setMessage("");
      setSubmitState("idle");
    }, 150);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!feedbackType || !message.trim()) return;
    setSubmitState("loading");

    const payload: FeedbackPayload = {
      type: feedbackType,
      message: message.trim(),
      context: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        activeRxcuis: [],
        activeHerbId: null,
        appVersion: APP_VERSION,
      },
    };

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Treat both { success: true } and { success: false } as "submitted" —
      // the API route never 500s, so reaching here means the round-trip worked.
      setSubmitState("success");
    } catch {
      setSubmitState("error");
    }
  }, [feedbackType, message]);

  const canSubmit = feedbackType !== "" && message.trim().length > 0;
  const inputsDisabled = submitState === "loading";

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open clinical feedback form"
        className="fixed bottom-6 right-6 z-[10000] flex items-center gap-1.5 bg-teal-700 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg hover:bg-teal-800 transition-colors"
      >
        <span aria-hidden>💬</span>
        Feedback
      </button>

      {/* ── Backdrop ────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[10001]"
          aria-hidden="true"
          onClick={handleClose}
        />
      )}

      {/* ── Modal panel ─────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10002] w-full max-w-md bg-white rounded-xl shadow-xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h2
                id="feedback-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Clinical Feedback
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Help us improve clinical safety and accuracy.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close feedback form"
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 text-xl leading-none transition-colors mt-0.5"
            >
              ×
            </button>
          </div>

          {/* ── Success state ── */}
          {submitState === "success" ? (
            <div className="mt-6 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl" aria-hidden>✓</span>
              </div>
              <p className="font-bold text-slate-800 mb-1">Thank you!</p>
              <p className="text-sm text-slate-500 mb-5">
                Your feedback helps us improve clinical safety.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            /* ── Form state (idle / loading / error) ── */
            <form
              onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
              className="mt-4 space-y-4"
              noValidate
            >
              {/* Feedback type */}
              <div>
                <label
                  htmlFor="feedback-type"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Feedback Type <span className="text-red-500" aria-hidden>*</span>
                </label>
                <select
                  id="feedback-type"
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value as FeedbackType | "")}
                  disabled={inputsDisabled}
                  required
                  aria-required="true"
                  className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                  <option value="" disabled>Select a category…</option>
                  {FEEDBACK_CATEGORIES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="feedback-message"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Your Feedback <span className="text-red-500" aria-hidden>*</span>
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  disabled={inputsDisabled}
                  required
                  aria-required="true"
                  placeholder="Describe what you observed or what you'd like to see…"
                  className="w-full border border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Inline error */}
              {submitState === "error" && (
                <p className="text-xs text-red-600 flex items-center gap-1.5" role="alert">
                  <span aria-hidden>⚠</span>
                  Submission failed — please try again.
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit || inputsDisabled}
                aria-disabled={!canSubmit || inputsDisabled}
                className="w-full py-2.5 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitState === "loading" ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                      aria-hidden="true"
                    />
                    Submitting…
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
