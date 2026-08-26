"use client"

import type { SetEntry } from "@/lib/pbs"
import { getSetKey } from "@/lib/workoutKeys"
import { hasSetData, isCompletedSet } from "@/lib/setStatus"
import WorkoutSetCard from "@/components/workouts/WorkoutSetCard"

type WorkoutSetListProps = {
  exercise: any
    onOpenBarMath?: (weight: number) => void
    prescriptionBlocks?: Array<{
    label?: string
    sets?: string
    reps?: string
    load?: string
    notes?: string
  }>
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
  onOpenBarMath,
  prescriptionBlocks = [],
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

  const prescriptionGroups = prescriptionBlocks.map(
    (block, blockIndex) => {
      const setCount = Math.max(
        1,
        Number(block.sets) || 1
      )

      const previousSetCount =
        prescriptionBlocks
          .slice(0, blockIndex)
          .reduce(
            (total, previousBlock) =>
              total +
              Math.max(
                1,
                Number(previousBlock.sets) || 1
              ),
            0
          )

      return {
        ...block,
        startIndex: previousSetCount,
        endIndex:
          previousSetCount + setCount - 1,
      }
    }
  )

  return (
    <div className="mt-3 space-y-2">
      {sets.map((set, setIndex) => {
        const prescriptionGroup =
  prescriptionGroups.find(
    (group) =>
      setIndex >= group.startIndex &&
      setIndex <= group.endIndex
  )

const previousPrescriptionGroup =
  setIndex > 0
    ? prescriptionGroups.find(
        (group) =>
          setIndex - 1 >= group.startIndex &&
          setIndex - 1 <= group.endIndex
      )
    : undefined

const showPrescriptionHeader =
  Boolean(prescriptionGroup) &&
  prescriptionGroup !==
    previousPrescriptionGroup
        const previousSet = previousLog?.sets_completed?.[setIndex]
        const setKey = getSetKey(exerciseIndex, setIndex)
        const isConfirmed = Boolean(confirmedSets[setKey])
        const setHasData = hasSetData(set)
        const setComplete = isCompletedSet(set)

        const isPrefilledUnconfirmed =
          prefillMode === "previous" && setHasData && !isConfirmed

        return (
  <div key={setIndex}>
    {showPrescriptionHeader &&
  prescriptionGroup && (() => {
    const prescriptionWeight =
      Number(
        String(
          prescriptionGroup.load || ""
        )
          .replace(/kg/gi, "")
          .trim()
      )

    const canLoadBar =
      Number.isFinite(prescriptionWeight) &&
      prescriptionWeight > 0

    return (
      <div className="mb-2 mt-3 flex items-center justify-between gap-2 rounded-xl border border-smc-gold/10 bg-smc-gold/[0.025] px-3 py-2">
  <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
    <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-smc-gold/70">
      {prescriptionGroup.label ||
        "Working Sets"}
    </span>

    <div className="flex min-w-0 items-center gap-1.5">
      {prescriptionGroup.sets && (
        <span className="whitespace-nowrap text-xs font-black text-white">
          {prescriptionGroup.sets} ×{" "}
          {prescriptionGroup.reps || "—"}
        </span>
      )}

      {prescriptionGroup.load && (
        <span className="whitespace-nowrap text-xs font-black text-white/55">
          @ {prescriptionGroup.load}
        </span>
      )}
    </div>
  </div>

        {canLoadBar && onOpenBarMath && (
  <button
    type="button"
    onClick={() =>
      onOpenBarMath(prescriptionWeight)
    }
    className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-smc-gold/20 bg-black/30 px-2.5 text-smc-gold transition active:scale-95"
  >
    <svg
      viewBox="0 0 32 18"
      aria-hidden="true"
      className="h-4 w-7 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 9H30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M6 5V13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <path
        d="M10 3V15"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M22 3V15"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M26 5V13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>

    <span className="text-[8px] font-black uppercase tracking-[0.1em]">
      Bar Math
    </span>
  </button>
)}
      </div>
    )
  })()}

    <WorkoutSetCard
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
          </div>
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