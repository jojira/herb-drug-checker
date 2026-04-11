"use client"

export default function SoftWallModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop — click does NOT close */}
      <div className="fixed inset-0 bg-black/50 z-[10003]" aria-hidden="true" />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="softwall-heading"
        className="fixed inset-0 z-[10004] flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
          >
            ×
          </button>

          {/* Icon */}
          <p className="text-5xl text-center mb-4" aria-hidden="true">🔬</p>

          {/* Heading */}
          <h2
            id="softwall-heading"
            className="text-2xl font-black text-slate-900 text-center mb-2"
          >
            You&rsquo;ve used all 5 free searches
          </h2>

          {/* Body */}
          <p className="text-slate-500 text-sm leading-relaxed text-center mb-6">
            Create your free Formulens account to continue.
            Unlimited searches, no credit card required.
          </p>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => { window.location.href = "/sign-up" }}
            className="w-full bg-teal-700 text-white rounded-xl py-3 font-bold mb-3 hover:bg-teal-800 transition-colors"
          >
            Create Free Account
          </button>

          {/* Secondary link */}
          <span
            role="button"
            tabIndex={0}
            onClick={() => { window.location.href = "/sign-in" }}
            onKeyDown={(e) => { if (e.key === "Enter") window.location.href = "/sign-in" }}
            className="text-center text-xs text-slate-400 hover:text-teal-600 cursor-pointer transition-colors block"
          >
            Already have an account? Sign in
          </span>
        </div>
      </div>
    </>
  )
}
