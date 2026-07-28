"use client"

import type { SetEntry } from "@/lib/pbs"
import {
  formatFlexibleSet,
  getExerciseLogType,
  getSetFieldValue,
  primaryFieldConfig,
  secondaryFieldConfig,
} from "@/lib/exerciseLogTypes"

type WorkoutSetCardProps = {
  exercise: any
  set: SetEntry
  previousSet?: any
  setIndex: number
  setComplete: boolean
  setHasData: boolean
  isConfirmed: boolean
  isPrefilledUnconfirmed: boolean
  allowRemove: boolean
  onConfirm: () => void
  onRemove: () => void
  onFocus: () => void
  onBlur: () => void
  onChange: (field: keyof SetEntry, value: string) => void
  setInputRef: (
    field: keyof SetEntry,
    element: HTMLInputElement | null
  ) => void
}

const inputStyle =
  "h-10 min-h-10 w-full rounded-xl border border-white/[0.07] bg-black/35 px-2 text-center text-sm font-black text-white outline-none placeholder:text-white/20 transition focus:border-smc-gold/70 focus:bg-black/50 focus:shadow-[0_0_14px_rgba(212,175,55,0.12)]"

export default function WorkoutSetCard({
  exercise,
  set,
  previousSet,
  setIndex,
  setComplete,
  setHasData,
  isConfirmed,
  isPrefilledUnconfirmed,
  allowRemove,
  onConfirm,
  onRemove,
  onFocus,
  onBlur,
  onChange,
  setInputRef,
}: WorkoutSetCardProps) {
  const logType = getExerciseLogType(exercise)
  const primaryField = primaryFieldConfig[logType.primary]
  const secondaryField = secondaryFieldConfig[logType.secondary]
  const primaryKey = primaryField.key
  const secondaryKey = secondaryField.key

  return (
    <div
      className={`rounded-xl border px-2.5 py-2 transition ${
        setComplete
          ? "border-smc-gold/45 bg-smc-gold/[0.075] shadow-[0_0_14px_rgba(212,175,55,0.08)]"
          : isConfirmed
            ? "border-smc-gold/30 bg-smc-gold/[0.05]"
            : isPrefilledUnconfirmed
              ? "border-white/5 bg-white/[0.02] opacity-80"
              : setHasData
                ? "border-smc-gold/25 bg-smc-gold/[0.04]"
                : "border-white/[0.055] bg-black/20"
      }`}
    >
      <div className="mb-1.5 flex min-h-8 items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="shrink-0 text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
              Set {setIndex + 1}
            </p>

            {previousSet && (
              <p className="min-w-0 truncate text-[9px] font-semibold text-white/35">
                Last: {formatFlexibleSet(previousSet, exercise)}
              </p>
            )}

            {setComplete && (
              <span className="shrink-0 text-[9px] font-black text-smc-gold">
                Logged
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onConfirm}
            className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-black transition active:scale-95 ${
              isConfirmed || setComplete
                ? "border-smc-gold/60 bg-smc-gold/25 text-smc-gold"
                : "border-white/10 bg-white/[0.035] text-white/35"
            }`}
            aria-label={`Confirm set ${setIndex + 1}`}
          >
            ✓
          </button>

          {allowRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-red-500/15 bg-red-500/[0.07] text-sm font-black text-red-300/75 transition active:scale-95"
              aria-label={`Remove set ${setIndex + 1}`}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {primaryKey && (
          <input
            ref={(element) => setInputRef(primaryKey, element)}
            type={primaryField.type}
            inputMode={primaryField.inputMode}
            placeholder={primaryField.placeholder}
            value={getSetFieldValue(set, primaryKey)}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(event) => onChange(primaryKey, event.target.value)}
            className={`${inputStyle} ${
              isPrefilledUnconfirmed ? "text-white/45" : "text-white"
            }`}
          />
        )}

        {secondaryKey && (
          <input
            ref={(element) => setInputRef(secondaryKey, element)}
            type={secondaryField.type}
            inputMode={secondaryField.inputMode}
            placeholder={secondaryField.placeholder}
            value={getSetFieldValue(set, secondaryKey)}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(event) => onChange(secondaryKey, event.target.value)}
            className={`${inputStyle} ${
              isPrefilledUnconfirmed ? "text-white/45" : "text-white"
            }`}
          />
        )}

        <input
          ref={(element) => setInputRef("rpe", element)}
          type="number"
          inputMode="decimal"
          placeholder="RPE"
          value={set.rpe}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(event) => onChange("rpe", event.target.value)}
          className={`${inputStyle} ${
            isPrefilledUnconfirmed ? "text-white/45" : "text-white"
          }`}
        />
      </div>
    </div>
  )
}