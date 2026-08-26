"use client"

import type { ReactNode } from "react"

type ExerciseLibraryManagerTileProps = {
  exerciseName: string
  movement?: string | null
  equipment?: string | null
  hasVideo?: boolean
  hasCoachNotes?: boolean
  favourite?: boolean
  isOpen: boolean
  children: ReactNode
  onToggle: () => void
}

export default function ExerciseLibraryManagerTile({
  exerciseName,
  movement,
  equipment,
  hasVideo,
  hasCoachNotes,
  favourite,
  isOpen,
  children,
  onToggle,
}: ExerciseLibraryManagerTileProps) {
  return (
    <article
      className={`overflow-hidden rounded-[1rem] border transition ${
        isOpen
          ? "border-smc-gold/30 bg-black/45"
          : "border-white/[0.06] bg-black/30 hover:border-white/[0.10]"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {favourite && (
                <span className="text-sm text-smc-gold">
                  ⭐
                </span>
              )}

              <h3 className="truncate text-sm font-black text-white">
                {exerciseName}
              </h3>
            </div>

            <p className="mt-1 text-[11px] text-white/35">
              {[movement, equipment]
                .filter(Boolean)
                .join(" • ") || "No category"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${
                  hasVideo
                    ? "border-green-500/25 bg-green-500/10 text-green-300"
                    : "border-white/[0.06] bg-white/[0.03] text-white/30"
                }`}
              >
                🎥 {hasVideo ? "Video" : "No Video"}
              </span>

              <span
                className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${
                  hasCoachNotes
                    ? "border-blue-400/25 bg-blue-400/10 text-blue-300"
                    : "border-white/[0.06] bg-white/[0.03] text-white/30"
                }`}
              >
                📝 {hasCoachNotes ? "Notes" : "No Notes"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className={`rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] transition ${
              isOpen
                ? "border-smc-gold/35 bg-smc-gold/10 text-smc-gold"
                : "border-white/[0.07] bg-white/[0.03] text-white/40 hover:border-smc-gold/25 hover:text-smc-gold"
            }`}
          >
            {isOpen ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-smc-gold/15 bg-black/20 p-4">
          {children}
        </div>
      )}
    </article>
  )
}