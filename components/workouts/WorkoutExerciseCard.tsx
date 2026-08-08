"use client"

import type { ReactNode } from "react"

const card =
  "relative scroll-mt-24 overflow-hidden rounded-[1.35rem] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014))] shadow-[0_12px_30px_rgba(0,0,0,0.55)]"

type WorkoutExerciseCardProps = {
  exerciseName: string
  exerciseIndex: number
  exerciseComplete: boolean
  prescription?: string
  coachNotes?: string
  demo?: any
  children: ReactNode
  onOpenDetails: () => void
  onOpenDemo: () => void
}

export default function WorkoutExerciseCard({
  exerciseName,
  exerciseIndex,
  exerciseComplete,
  prescription,
  coachNotes,
  demo,
  children,
  onOpenDetails,
  onOpenDemo,
}: WorkoutExerciseCardProps) {
  return (
    <div
      className={`${card} p-3 transition-all duration-300 ${
        exerciseComplete
          ? "border-smc-gold/25 shadow-[0_0_28px_rgba(212,175,55,0.10)]"
          : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

      {exerciseComplete && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.13),transparent_34%)]" />
      )}

      <div className="relative z-10">
        <header className="text-center">
          <div className="flex items-center justify-center gap-2">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/70">
              Exercise {exerciseIndex + 1}
            </p>

            {exerciseComplete && (
              <span className="rounded-full border border-smc-gold/35 bg-smc-gold/[0.12] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-smc-gold">
                ✓ Complete
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenDetails}
            className="mx-auto mt-1 block break-words text-xl font-black leading-tight text-white transition hover:text-smc-gold active:scale-[0.98]"
          >
            {exerciseName}
          </button>

          <div className="mt-2 flex justify-center">
            <span className="max-w-full break-words rounded-full border border-smc-gold/25 bg-smc-gold/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-smc-gold">
              {prescription || "No prescription"}
            </span>
          </div>
        </header>

        {demo && (
          <button
            type="button"
            onClick={onOpenDemo}
            disabled={!demo?.video_url}
            className="group relative mt-2.5 h-[86px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-left disabled:cursor-default"
          >
            {demo?.thumbnail_url ? (
              <img
                src={demo.thumbnail_url}
                alt={`${exerciseName} demo`}
                className="h-full w-full object-cover opacity-80 transition group-hover:scale-[1.03] group-hover:opacity-100"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.10),transparent_55%),#070707] px-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-smc-gold/65">
                  Demo coming soon
                </p>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

            <div className="absolute bottom-2 left-2">
              <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/70 backdrop-blur">
                Video Demo
              </span>
            </div>

            {demo?.video_url && (
              <div className="absolute bottom-2 right-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-smc-gold/60 bg-black/55 text-smc-gold shadow-[0_0_14px_rgba(212,175,55,0.20)] backdrop-blur">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 fill-current"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>
            )}
          </button>
        )}

        {coachNotes && (
          <p className="mt-2 break-words text-xs leading-5 text-white/45">
            {coachNotes}
          </p>
        )}

        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}