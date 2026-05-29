"use client"

import { useState } from "react"

export default function LatestFeedbackCard({
  item,
  dateLabel,
  softBorder,
}: {
  item: {
    type: string
    exerciseName: string
    feedback: string
    createdAt: string
  }
  dateLabel: string
  softBorder: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-3 w-full rounded-[1.2rem] border ${softBorder} bg-black/45 p-3 text-left transition active:scale-[0.99]`}
      >
        <div className="mb-2 flex items-center gap-3">
          <span className="rounded-full bg-smc-gold px-3 py-1 text-[9px] font-black uppercase text-black">
            {item.type}
          </span>

          <span className="text-xs text-smc-muted-soft">{dateLabel}</span>
        </div>

        <p className="text-sm font-black text-smc-text">{item.exerciseName}</p>

        <p className="mt-1 line-clamp-3 text-sm leading-5 text-zinc-300">
          {item.feedback}
        </p>

        <p className="mt-3 text-xs font-black text-smc-gold">
          Tap to read full feedback →
        </p>
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 px-4 py-6 backdrop-blur-xl">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-smc-gold/25 bg-[#050505] p-5 text-white shadow-[0_0_70px_rgba(212,175,55,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-smc-gold">
                  {item.type}
                </p>

                <h2 className="mt-2 text-xl font-black text-white">
                  {item.exerciseName}
                </h2>

                <p className="mt-1 text-xs text-smc-muted-soft">
                  {dateLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xl font-black text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-[1.2rem] border border-white/[0.07] bg-black/40 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                {item.feedback}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-2xl bg-smc-gold px-5 py-3 text-sm font-black text-black"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}