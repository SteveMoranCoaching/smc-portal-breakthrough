"use client"

import { useState } from "react"

type SessionItem = {
  id: string
  title: string
  completed: boolean
}

type ProgrammeWeekProgressCellProps = {
  weekNumber: number
  completed: number
  total: number
  sessions: SessionItem[]
  isCurrent?: boolean
  isPast?: boolean
}

export default function ProgrammeWeekProgressCell({
  weekNumber,
  completed,
  total,
  sessions,
  isCurrent = false,
  isPast = false,
}: ProgrammeWeekProgressCellProps) {
  const [open, setOpen] = useState(false)

  const percentage =
    total > 0 ? completed / total : 0

  const completionTone =
    total > 0 && completed >= total
      ? "text-green-300"
      : percentage >= 0.5
        ? "text-amber-200"
        : "text-red-300"

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex min-h-[42px] w-full flex-col items-center justify-center rounded-[0.75rem] border px-2 py-1.5 text-center transition ${
          isCurrent
            ? "border-green-500/30 bg-green-500/12"
            : isPast
              ? "border-white/[0.06] bg-white/[0.025]"
              : "border-green-500/20 bg-green-500/10"
        }`}
      >
        <span
          className={`text-[10px] font-black ${
            isCurrent
              ? "text-green-300"
              : "text-green-300/80"
          }`}
        >
          Week {weekNumber}
        </span>

        <span
          className={`mt-0.5 text-[9px] font-black ${completionTone}`}
        >
          {completed}/{total} sessions
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close session list"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div className="absolute left-1/2 top-[calc(100%+0.4rem)] z-50 w-[210px] -translate-x-1/2 rounded-xl border border-white/[0.08] bg-[#090909] p-2 shadow-[0_18px_44px_rgba(0,0,0,0.8)]">
            <p className="mb-2 text-[8px] font-black uppercase tracking-[0.18em] text-smc-gold/70">
              Week {weekNumber}
            </p>

            {sessions.length > 0 ? (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.025] px-2 py-1.5"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-black ${
                        session.completed
                          ? "bg-green-500 text-black"
                          : "border border-white/10 text-white/25"
                      }`}
                    >
                      {session.completed ? "✓" : ""}
                    </span>

                    <p
                      className={`truncate text-[10px] font-bold ${
                        session.completed
                          ? "text-white/75"
                          : "text-white/38"
                      }`}
                    >
                      {session.title}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-white/35">
                No programmed sessions.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}