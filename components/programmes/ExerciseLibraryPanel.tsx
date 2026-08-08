"use client"

import { useMemo, useState } from "react"
import ExerciseLibraryTile from "./ExerciseLibraryTile"

type LibraryExercise = {
  id: string
  exercise_name: string
  coach_notes?: string | null
  thumbnail_url?: string | null
}

type ExerciseLibraryPanelProps = {
  exercises: LibraryExercise[]
  onAddExercise: (exercise: LibraryExercise) => void
}

export default function ExerciseLibraryPanel({
  exercises,
  onAddExercise,
}: ExerciseLibraryPanelProps) {
  const [search, setSearch] = useState("")

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return exercises

    return exercises.filter((exercise) => {
      const name = exercise.exercise_name.toLowerCase()
      const notes = String(exercise.coach_notes || "").toLowerCase()

      return name.includes(query) || notes.includes(query)
    })
  }, [exercises, search])

  return (
    <aside className="sticky top-4 overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] shadow-[0_16px_38px_rgba(0,0,0,0.62)]">
      <div className="border-b border-white/[0.06] p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-smc-gold">
          Exercise Library
        </p>

        <h3 className="mt-1 text-base font-black text-white">
          Add Exercises
        </h3>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search bench, squat, deadlift..."
          className="mt-3 w-full rounded-[0.9rem] border border-white/[0.08] bg-black/45 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/45"
        />

        <p className="mt-2 text-[10px] text-white/30">
          {filteredExercises.length} exercise
          {filteredExercises.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-3">
        {filteredExercises.length > 0 ? (
          <div className="space-y-2">
            {filteredExercises.map((exercise) => (
              <ExerciseLibraryTile
                key={exercise.id}
                exercise={exercise}
                onAdd={() => onAddExercise(exercise)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 text-center">
            <p className="text-xs font-bold text-white/35">
              No exercises found.
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

export type { LibraryExercise }