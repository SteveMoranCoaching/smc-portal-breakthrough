"use client"

import { useState, type ReactNode } from "react"

const card =
  "relative scroll-mt-24 overflow-hidden rounded-[1.35rem] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014))] shadow-[0_12px_30px_rgba(0,0,0,0.55)]"

type ExerciseTab =
  | "previous"
  | "demo"

type WorkoutExerciseCardProps = {
  exerciseName: string
  exerciseIndex: number
  exerciseComplete: boolean
  prescription?: string
  demo?: any
  previousPerformance?: any
  previousCoachFeedback?: string
  previousSessions?: any[]
  children: ReactNode
  onOpenDetails: () => void
  onOpenDemo: () => void
}

function formatPreviousDate(dateString?: string | null) {
  if (!dateString) return "—"

  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}

function formatPreviousSets(sets: any[] = []) {
  const validSets = sets
    .map((set: any) => ({
      weight: String(set?.weight || "").trim(),
      reps: String(set?.reps || "").trim(),
    }))
    .filter((set) => set.weight && set.reps)

  if (validSets.length === 0) {
    return "Session logged"
  }

  const grouped: {
    weight: string
    reps: string
    count: number
  }[] = []

  validSets.forEach((set) => {
    const existing = grouped.find(
      (item) =>
        item.weight === set.weight &&
        item.reps === set.reps
    )

    if (existing) {
      existing.count += 1
    } else {
      grouped.push({
        weight: set.weight,
        reps: set.reps,
        count: 1,
      })
    }
  })

  return grouped
    .map(
      (set) =>
        `${set.count}×${set.reps} @ ${set.weight}kg`
    )
    .join(" · ")
}

export default function WorkoutExerciseCard({
  exerciseName,
  exerciseIndex,
  exerciseComplete,
  prescription,
  demo,
  previousPerformance,
  previousCoachFeedback,
  previousSessions = [],
  children,
  onOpenDetails,
  onOpenDemo,
}: WorkoutExerciseCardProps) {
  const [activeTab, setActiveTab] =
    useState<ExerciseTab | null>(null)

  function toggleTab(tab: ExerciseTab) {
    setActiveTab((current) =>
      current === tab ? null : tab
    )
  }

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
  <div className="max-w-full rounded-2xl border border-smc-gold/25 px-4 py-2 text-center">
    {prescription ? (
      prescription
        .split("|")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => (
          <p
            key={`${line}-${index}`}
            className="text-[10px] font-black uppercase leading-[1.65] tracking-[0.14em] text-smc-gold"
          >
            {line}
          </p>
        ))
    ) : (
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-smc-gold">
        No prescription
      </p>
    )}
  </div>
</div>
        </header>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
  <button
    type="button"
    onClick={onOpenDetails}
    className="rounded-xl border border-white/[0.065] bg-black/30 px-1.5 py-2 text-white/48 transition active:scale-[0.97]"
  >
    <span className="block text-sm leading-none">
      🎯
    </span>

    <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.08em]">
      Info
    </span>
  </button>

  <button
    type="button"
    onClick={() => toggleTab("previous")}
    className={`rounded-xl border px-1.5 py-2 transition active:scale-[0.97] ${
      activeTab === "previous"
        ? "border-smc-gold/45 bg-smc-gold/[0.12] text-smc-gold"
        : "border-white/[0.065] bg-black/30 text-white/48"
    }`}
  >
    <span className="block text-sm leading-none">
      📊
    </span>

    <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.08em]">
      Previous
    </span>
  </button>

  <button
    type="button"
    onClick={() => toggleTab("demo")}
    disabled={!demo}
    className={`rounded-xl border px-1.5 py-2 transition active:scale-[0.97] disabled:cursor-default disabled:opacity-25 ${
      activeTab === "demo"
        ? "border-smc-gold/45 bg-smc-gold/[0.12] text-smc-gold"
        : "border-white/[0.065] bg-black/30 text-white/48"
    }`}
  >
    <span className="block text-sm leading-none">
      🎥
    </span>

    <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.08em]">
      Demo
    </span>
  </button>
</div>

{activeTab && (
  <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.055] bg-black/20">

            {activeTab === "previous" && (
  <div className="p-3">
    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-smc-gold/65">
      Previous
    </p>

    {previousSessions.length > 0 ? (
      <div className="mt-2 divide-y divide-white/[0.05]">
        {previousSessions.map(
          (previousSession: any, index: number) => (
            <div
              key={`${previousSession?.id || index}`}
              className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0"
            >
              <p className="w-[43px] shrink-0 text-[9px] font-black text-white/35">
                {formatPreviousDate(
                  previousSession?.created_at
                )}
              </p>

              <p className="min-w-0 flex-1 text-[9px] font-bold leading-4 text-white/50">
                {formatPreviousSets(
                  previousSession?.sets_completed
                )}
              </p>
            </div>
          )
        )}
      </div>
    ) : (
      <p className="mt-1.5 text-[9px] leading-4 text-white/25">
        No previous sessions logged.
      </p>
    )}

    {previousCoachFeedback && (
      <div className="mt-2 border-t border-white/[0.05] pt-2">
        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-300/55">
          Last Coach Note
        </p>

        <p className="mt-1 text-[9px] leading-4 text-white/40">
          {previousCoachFeedback}
        </p>
      </div>
    )}
  </div>
)}

            {activeTab === "demo" && (
              <div className="p-2.5">
                {demo?.thumbnail_url ? (
                  <button
                    type="button"
                    onClick={onOpenDemo}
                    disabled={!demo?.video_url}
                    className="group relative h-[100px] w-full overflow-hidden rounded-xl border border-white/[0.07] bg-black/40 text-left disabled:cursor-default"
                  >
                    <img
                      src={demo.thumbnail_url}
                      alt={`${exerciseName} demo`}
                      className="h-full w-full object-cover opacity-75 transition group-hover:scale-[1.02] group-hover:opacity-95"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                    <div className="absolute bottom-2 left-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/65">
                        Exercise Demo
                      </p>
                    </div>

                    {demo?.video_url && (
                      <div className="absolute bottom-2 right-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-smc-gold/50 bg-black/60 text-smc-gold">
                          ▶
                        </span>
                      </div>
                    )}
                  </button>
                ) : (
                  <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 text-center">
                    <p className="text-xs font-bold text-white/30">
                      Demo coming soon.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}