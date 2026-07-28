import {
  getDemoForExercise,
  getExerciseDisplayLabel,
} from "@/lib/exerciseHelpers"
import { getWarmupKey } from "@/lib/workoutKeys"

const card =
  "relative scroll-mt-24 overflow-hidden rounded-[1.35rem] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014))] shadow-[0_12px_30px_rgba(0,0,0,0.55)]"

type WorkoutWarmupSectionProps = {
  exercises: any[]
  exerciseDemos: any[]
  completedItems: Record<string, boolean>
  completedCount: number
  allComplete: boolean
  onToggleItem: (
    exerciseIndex: number,
    exerciseName: string
  ) => void
  onCompleteSection: () => void
  onOpenDemo: (demo: any) => void
}

export default function WorkoutWarmupSection({
  exercises,
  exerciseDemos,
  completedItems,
  completedCount,
  allComplete,
  onToggleItem,
  onCompleteSection,
  onOpenDemo,
}: WorkoutWarmupSectionProps) {
  if (exercises.length === 0) return null

  return (
    <details
      open={!allComplete}
      className={`${card} p-3 transition-all duration-300 ${
        allComplete
          ? "border-emerald-400/25 shadow-[0_0_28px_rgba(52,211,153,0.10)]"
          : "border-smc-gold/20"
      }`}
    >
      <summary className="cursor-pointer list-none">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

        {allComplete && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.10),transparent_34%)]" />
        )}

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/70">
              Warm-up / Mobility
            </p>

            <h3 className="mt-1 text-lg font-black text-white">
              Prep Work
            </h3>

            <p className="mt-1 text-xs text-white/45">
              {completedCount}/{exercises.length} complete · Tap to expand
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${
              allComplete
                ? "bg-emerald-400 text-black"
                : "border border-smc-gold/25 bg-smc-gold/[0.08] text-smc-gold"
            }`}
          >
            {allComplete ? "Done" : "Start"}
          </span>
        </div>
      </summary>

      <div className="relative z-10 mt-3 flex flex-col gap-2">
        {exercises.map((item: any) => {
          const warmup = item.exercise
          const exerciseIndex = item.originalIndex
          const exerciseName =
            warmup?.name || `Warm-up ${exerciseIndex + 1}`

          const demo = getDemoForExercise(
            exerciseDemos,
            exerciseName
          )

          const warmupKey = getWarmupKey(
            exerciseIndex,
            exerciseName
          )

          const itemComplete = Boolean(
            completedItems[warmupKey]
          )

          return (
            <div
              key={warmupKey}
              className={`rounded-2xl border p-3 transition ${
                itemComplete
                  ? "border-emerald-400/25 bg-emerald-400/[0.07]"
                  : "border-white/[0.06] bg-black/25"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-white">
                    {exerciseName}
                  </p>

                  <p className="mt-1 break-words text-xs leading-5 text-white/45">
                    {getExerciseDisplayLabel(warmup)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onToggleItem(
                      exerciseIndex,
                      exerciseName
                    )
                  }
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black transition active:scale-95 ${
                    itemComplete
                      ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-300"
                      : "border-white/10 bg-white/[0.035] text-white/35"
                  }`}
                  aria-label={`Mark ${exerciseName} complete`}
                >
                  ✓
                </button>
              </div>

              {demo && (
                <button
                  type="button"
                  onClick={() =>
                    demo?.video_url && onOpenDemo(demo)
                  }
                  disabled={!demo?.video_url}
                  className="group relative mt-2.5 h-[76px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-left disabled:cursor-default"
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
            </div>
          )
        })}

        <button
          type="button"
          onClick={onCompleteSection}
          disabled={completedCount < exercises.length}
          className="mt-1 min-h-11 w-full rounded-2xl bg-smc-gold px-4 py-2 text-xs font-black text-black transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          {completedCount >= exercises.length
            ? "Mark Warm-up Complete"
            : "Tick all warm-up items first"}
        </button>
      </div>
    </details>
  )
}