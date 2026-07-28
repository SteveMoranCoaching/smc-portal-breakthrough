"use client"

import type { SetEntry } from "@/lib/pbs"
import { getSetKey } from "@/lib/workoutKeys"
import { hasSetData, isCompletedSet } from "@/lib/setStatus"
import WorkoutSetCard from "@/components/workouts/WorkoutSetCard"

type WorkoutSetListProps = {
  exercise: any
  exerciseIndex: number
  sets: SetEntry[]
  previousLog?: any
  prefillMode: "unset" | "previous" | "blank"
  confirmedSets: Record<string, boolean>
  disabled?: boolean
  onConfirmSet: (setIndex: number) => void
  onRemoveSet: (setIndex: number) => void
  onAddSet: () => void
  onFocus: () => void
  onBlur: () => void
  onChangeSet: (
    setIndex: number,
    field: keyof SetEntry,
    value: string
  ) => void
  setInputRef: (
    setIndex: number,
    field: keyof SetEntry,
    element: HTMLInputElement | null
  ) => void
}

export default function WorkoutSetList({
  exercise,
  exerciseIndex,
  sets,
  previousLog,
  prefillMode,
  confirmedSets,
  disabled = false,
  onConfirmSet,
  onRemoveSet,
  onAddSet,
  onFocus,
  onBlur,
  onChangeSet,
  setInputRef,
}: WorkoutSetListProps) {
  return (
    <div className="mt-3 space-y-2">
      {sets.map((set, setIndex) => {
        const previousSet = previousLog?.sets_completed?.[setIndex]
        const setKey = getSetKey(exerciseIndex, setIndex)
        const isConfirmed = Boolean(confirmedSets[setKey])
        const setHasData = hasSetData(set)
        const setComplete = isCompletedSet(set)

        const isPrefilledUnconfirmed =
          prefillMode === "previous" && setHasData && !isConfirmed

        return (
          <WorkoutSetCard
            key={setIndex}
            exercise={exercise}
            set={set}
            previousSet={previousSet}
            setIndex={setIndex}
            setComplete={setComplete}
            setHasData={setHasData}
            isConfirmed={isConfirmed}
            isPrefilledUnconfirmed={isPrefilledUnconfirmed}
            allowRemove={sets.length > 1 && !disabled}
            onConfirm={() => {
              if (!disabled) onConfirmSet(setIndex)
            }}
            onRemove={() => {
              if (!disabled) onRemoveSet(setIndex)
            }}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(field, value) => {
              if (!disabled) {
                onChangeSet(setIndex, field, value)
              }
            }}
            setInputRef={(field, element) =>
              setInputRef(setIndex, field, element)
            }
          />
        )
      })}

      <button
        type="button"
        onClick={onAddSet}
        disabled={disabled}
        className="min-h-10 w-full rounded-xl border border-smc-gold/25 bg-smc-gold/[0.06] px-4 py-2 text-xs font-black text-smc-gold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Add Extra Set
      </button>
    </div>
  )
}