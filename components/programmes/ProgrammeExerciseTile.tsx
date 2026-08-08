"use client"

import type { ReactNode } from "react"

type ProgrammeExerciseTileProps = {
  exerciseName: string
  exerciseIndex: number
  section?: "main" | "warmup" | "stretch" | "circuit" | "superset"
  prescription?: string
  isOpen: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  children: ReactNode
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

function getSectionLabel(
  section?: ProgrammeExerciseTileProps["section"]
) {
  if (section === "warmup") return "Warm-up"
  if (section === "stretch") return "Stretch"
  if (section === "circuit") return "Circuit"
  if (section === "superset") return "Superset"

  return "Main"
}

export default function ProgrammeExerciseTile({
  exerciseName,
  exerciseIndex,
  section,
  prescription,
  isOpen,
  canMoveUp,
  canMoveDown,
  children,
  onToggle,
  onMoveUp,
  onMoveDown,
  onRemove,
}: ProgrammeExerciseTileProps) {
  const sectionLabel = getSectionLabel(section)

  return (
    <article
      className={`overflow-hidden rounded-[1rem] border transition ${
        isOpen
          ? "border-smc-gold/25 bg-black/45"
          : "border-white/[0.06] bg-black/30 hover:border-white/[0.10]"
      }`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
                Exercise {exerciseIndex + 1}
              </p>

              <span
                className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] ${
                  section === "warmup"
                    ? "border-smc-gold/25 bg-smc-gold/10 text-smc-gold"
                    : section === "stretch"
                      ? "border-blue-400/20 bg-blue-400/[0.08] text-blue-300"
                      : section === "circuit" ||
                          section === "superset"
                        ? "border-purple-400/20 bg-purple-400/[0.08] text-purple-300"
                        : "border-white/[0.07] bg-white/[0.035] text-white/40"
                }`}
              >
                {sectionLabel}
              </span>
            </div>

            <h3 className="mt-1 truncate text-sm font-black text-white">
              {exerciseName || "Untitled exercise"}
            </h3>

            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/38">
              {prescription || "No prescription yet"}
            </p>
          </button>

          <button
            type="button"
            onClick={onToggle}
            className={`flex h-8 shrink-0 items-center justify-center rounded-xl border px-3 text-[9px] font-black uppercase tracking-[0.1em] transition ${
              isOpen
                ? "border-smc-gold/35 bg-smc-gold/10 text-smc-gold"
                : "border-white/[0.07] bg-white/[0.03] text-white/45 hover:border-smc-gold/25 hover:text-smc-gold"
            }`}
          >
            {isOpen ? "Close" : "Edit"}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-white/[0.05] pt-2">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs font-black text-white/45 transition hover:border-smc-gold/30 hover:text-smc-gold disabled:pointer-events-none disabled:opacity-20"
              aria-label="Move exercise up"
            >
              ↑
            </button>

            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs font-black text-white/45 transition hover:border-smc-gold/30 hover:text-smc-gold disabled:pointer-events-none disabled:opacity-20"
              aria-label="Move exercise down"
            >
              ↓
            </button>
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] font-bold text-white/28 transition hover:text-red-300"
          >
            Remove
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-smc-gold/15 bg-black/20 p-3">
          {children}
        </div>
      )}
    </article>
  )
}