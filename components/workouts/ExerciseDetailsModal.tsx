"use client"

import Link from "next/link"

type ExerciseDetailsModalProps = {
  exerciseInfo: any
  onClose: () => void
  onOpenDemo: (demo: any) => void
}

export default function ExerciseDetailsModal({
  exerciseInfo,
  onClose,
  onOpenDemo,
}: ExerciseDetailsModalProps) {
  if (!exerciseInfo) return null

  const {
    exercise,
    exerciseName,
    demo,
    previousPerformance,
    previousCoachFeedback,
  } = exerciseInfo

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-3 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close exercise details"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-10 flex max-h-[78vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-smc-gold/20 bg-[#050505] shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
        <div className="shrink-0 border-b border-white/[0.06] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold">
                Exercise Hub
              </p>

              <h2 className="mt-1 break-words text-xl font-black leading-tight text-white">
                {exerciseName}
              </h2>

              <p className="mt-1 break-words text-xs leading-5 text-white/45">
                {exercise?.prescription || "No prescription added"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close exercise hub"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-lg font-black text-white/55 transition hover:text-white active:scale-95"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          <div className="space-y-2">
            {demo?.video_url && (
              <button
                type="button"
                onClick={() => onOpenDemo(demo)}
                className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-smc-gold/20 bg-smc-gold/[0.07] px-3.5 py-3 text-left transition active:scale-[0.99]"
              >
                <div>
                  <p className="text-sm font-black text-white">Demo Video</p>
                  <p className="mt-0.5 text-[10px] text-white/40">
                    Watch the exercise demonstration
                  </p>
                </div>

                <span className="text-sm font-black text-smc-gold">▶</span>
              </button>
            )}

            {demo?.coach_notes && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-smc-gold">
                  Steve’s Cues
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/72">
                  {demo.coach_notes}
                </p>
              </div>
            )}

            {previousCoachFeedback && (
              <div className="rounded-2xl border border-smc-gold/20 bg-smc-gold/[0.05] p-3.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-smc-gold">
                  Last Coach Note
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">
                  {previousCoachFeedback}
                </p>
              </div>
            )}

            {previousPerformance && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-smc-gold">
                      Previous Session
                    </p>

                    <p className="mt-2 text-lg font-black text-white">
                      {previousPerformance.bestSet.weight}kg ×{" "}
                      {previousPerformance.bestSet.reps}
                    </p>
                  </div>

                  <p className="text-right text-[10px] font-bold text-white/35">
                    {previousPerformance.date}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/[0.05] bg-black/30 px-3 py-2.5 text-center">
                    <p className="text-base font-black text-white">
                      {previousPerformance.setCount}
                    </p>

                    <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
                      Sets Logged
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.05] bg-black/30 px-3 py-2.5 text-center">
                    <p className="text-base font-black text-white">
                      {previousPerformance.bestSet.rpe || "—"}
                    </p>

                    <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
                      Best Set RPE
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!demo?.video_url &&
              !demo?.coach_notes &&
              !previousCoachFeedback &&
              !previousPerformance && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-center">
                  <p className="text-sm font-black text-white/55">
                    No exercise information yet
                  </p>

                  <p className="mt-1 text-xs leading-5 text-white/30">
                    History and coaching information will appear here.
                  </p>
                </div>
              )}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <Link
            href={`/dashboard/history/${encodeURIComponent(exerciseName)}`}
            className="flex min-h-11 items-center justify-center rounded-2xl bg-smc-gold px-4 text-sm font-black text-black transition active:scale-[0.99]"
          >
            View Full History
          </Link>
        </div>
      </section>
    </div>
  )
}