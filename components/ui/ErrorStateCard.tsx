"use client"

type ErrorStateCardProps = {
  title?: string
  body?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export default function ErrorStateCard({
  title = "Something didn’t load cleanly",
  body = "No stress — give it another go. If it keeps happening, we’ll tighten up the data route behind it.",
  actionLabel = "Try again",
  onAction,
  className = "",
}: ErrorStateCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.6rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.78)] ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.14),transparent_36%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-red-300/80">
          Portal check
        </p>

        <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-white">
          {title}
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">{body}</p>

        {onAction ? (
          <button
            onClick={onAction}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] px-5 text-xs font-black uppercase tracking-[0.22em] text-white/75 transition active:scale-[0.97]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}