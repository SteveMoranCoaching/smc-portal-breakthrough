
"use client"

import { useMemo, useState } from "react"
import PlateStack from "@/components/PlateStack"
import {
  BAR_OPTIONS,
  calculatePlates,
  type BarType,
  type PlateMode,
} from "@/lib/plateCalculator"

type BarMathCalculatorProps = {
  targetWeight: number
  onClose?: () => void
}

export default function BarMathCalculator({
  targetWeight,
  onClose,
}: BarMathCalculatorProps) {
  const [plateMode, setPlateMode] =
    useState<PlateMode>("calibrated")

  const [barType, setBarType] =
    useState<BarType>("standard")

  const [customBarWeight, setCustomBarWeight] =
    useState("20")

  const result = useMemo(() => {
    if (!Number.isFinite(targetWeight) || targetWeight <= 0) {
      return null
    }

    return calculatePlates({
      targetWeight,
      mode: plateMode,
      barType,
      customBarWeight:
        barType === "custom"
          ? Number(customBarWeight)
          : undefined,
    })
  }, [targetWeight, plateMode, barType, customBarWeight])

  return (
    <div className="w-full rounded-[1.5rem] border border-white/[0.08] bg-[#080808] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-smc-gold/70">
            Bar Math
          </p>

          <h2 className="mt-0.5 text-xl font-black text-white">
            {targetWeight}kg
          </h2>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bar maths"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-lg font-black text-white/50"
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor="bar-math-plate-mode"
            className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30"
          >
            Plates
          </label>

          <select
            id="bar-math-plate-mode"
            value={plateMode}
            onChange={(event) =>
              setPlateMode(event.target.value as PlateMode)
            }
            className="mt-1 h-9 w-full rounded-lg border border-white/[0.08] bg-black/40 px-2.5 text-[11px] font-bold text-white outline-none"
          >
            <option value="calibrated">Calibrated</option>
            <option value="gym">Gym Plates</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="bar-math-bar-type"
            className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30"
          >
            Bar
          </label>

          <select
            id="bar-math-bar-type"
            value={barType}
            onChange={(event) =>
              setBarType(event.target.value as BarType)
            }
            className="mt-1 h-9 w-full rounded-lg border border-white/[0.08] bg-black/40 px-2.5 text-[11px] font-bold text-white outline-none"
          >
            {BAR_OPTIONS.map((bar) => (
              <option key={bar.id} value={bar.id}>
                {bar.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {barType === "custom" && (
        <div className="mt-3">
          <label
            htmlFor="bar-math-custom-weight"
            className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30"
          >
            Custom Bar Weight
          </label>

          <div className="mt-1.5 flex items-center rounded-xl border border-white/[0.08] bg-black/40">
            <input
              id="bar-math-custom-weight"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={customBarWeight}
              onChange={(event) =>
                setCustomBarWeight(event.target.value)
              }
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-xs font-bold text-white outline-none"
            />
            <span className="pr-3 text-[10px] font-black text-white/30">
              kg
            </span>
          </div>
        </div>
      )}

      {result ? (
        <div className="mt-2 [&>div]:mt-0 [&>div]:p-2.5">
          <PlateStack
            plates={result.platesPerSide}
            mode={result.mode}
            barWeight={result.barWeight}
            targetWeight={result.targetWeight}
          />
        </div>
      ) : (
        <p className="mt-4 text-xs text-white/45">
          Enter a valid target weight.
        </p>
      )}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-xl bg-smc-gold px-4 py-2 text-xs font-black text-black transition active:scale-[0.98]"
        >
          Done
        </button>
      )}
    </div>
  )
}
