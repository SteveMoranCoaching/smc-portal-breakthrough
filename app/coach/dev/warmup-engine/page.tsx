"use client"

import { useMemo, useState } from "react"
import {
  SMC_WARMUP_ANCHORS,
} from "@/lib/warmupEngine"

import {
  generateWarmup,
  getCoachingFocus,
} from "@/lib/smcBrain"

import {
  BAR_OPTIONS,
  calculatePlates,
  type BarType,
  type PlateMode,
} from "@/lib/plateCalculator"

import PlateStack from "@/components/PlateStack"

export default function WarmupEngineDevPage() {
  const [targetWeight, setTargetWeight] =
    useState("185")

  const [plateMode, setPlateMode] =
  useState<PlateMode>("calibrated")

  const [barType, setBarType] =
  useState<BarType>("standard")

  const [customBarWeight, setCustomBarWeight] =
  useState("20")  

  const [experience, setExperience] =
  useState<
    "beginner" | "developing" | "experienced"
  >("beginner")

  const [objective, setObjective] =
  useState<
    | "technique"
    | "strength"
    | "peak_strength"
    | "volume"
    | "hypertrophy"
    | "recovery"
  >("strength")

  const [secondaryObjective, setSecondaryObjective] =
  useState<
    | "none"
    | "technique"
    | "strength"
    | "peak_strength"
    | "volume"
    | "hypertrophy"
    | "recovery"
  >("none")  

  const [movement, setMovement] =
  useState<
    "squat" | "bench" | "deadlift"
  >("squat")  

  const [technicalPriority, setTechnicalPriority] =
  useState<"normal" | "high">("normal")  

  const result = useMemo(() => {
    const target = Number(targetWeight)

    if (!target || target <= 0) {
      return null
    }

    return generateWarmup({
  targetWeight: target,
})
  }, [targetWeight])

  const plateResult = useMemo(() => {
  const target = Number(targetWeight)

  if (!target || target <= 0) {
    return null
  }

  return calculatePlates({
    targetWeight: target,
    mode: plateMode,
    barType,
    customBarWeight:
      barType === "custom"
        ? Number(customBarWeight)
        : undefined,
  })
}, [
  targetWeight,
  plateMode,
  barType,
  customBarWeight,
])

  const coachingFocus = useMemo(() => {
  return getCoachingFocus(
    {
      primaryObjective: objective,
      secondaryObjective:
        secondaryObjective === "none"
      ? undefined
      : secondaryObjective,
      experience,
      technicalPriority,
    },
    {
      name: movement,
      movement,
    }
  )
}, [
  objective,
  secondaryObjective,
  experience,
  technicalPriority,
  movement,
])

  function randomiseWeight() {
    const min = 40
    const max = 280

    const random =
      Math.round(
        (min + Math.random() * (max - min)) /
          2.5
      ) * 2.5

    setTargetWeight(String(random))
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-smc-gold">
            Coach Dev Tool
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            SMC Warm-up Engine
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/40">
            Test and tune generated warm-ups without
            touching the athlete workout logger.
          </p>
        </div>

        <section className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.025] p-4">
          <label className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
            Working Weight
          </label>

          <div className="mt-2 flex gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-xl border border-white/[0.08] bg-black/40">
              <input
                type="number"
                inputMode="decimal"
                step="2.5"
                value={targetWeight}
                onChange={(event) =>
                  setTargetWeight(
                    event.target.value
                  )
                }
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base font-black text-white outline-none"
              />

              <span className="pr-3 text-xs font-black text-white/30">
                kg
              </span>
            </div>

            <button
              type="button"
              onClick={randomiseWeight}
              className="rounded-xl border border-smc-gold/25 bg-smc-gold/[0.07] px-3 text-[9px] font-black uppercase tracking-[0.1em] text-smc-gold transition active:scale-[0.98]"
            >
              Random
            </button>
          </div>
        </section>

        <section className="mt-3 rounded-[1.5rem] border border-white/[0.07] bg-white/[0.025] p-4">
  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-smc-gold">
    Plate Calculator
  </p>

  <h2 className="mt-1 text-lg font-black text-white">
    Bar Setup
  </h2>

  <div className="mt-4 grid grid-cols-2 gap-2">
    <div>
      <label className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
        Plates
      </label>

      <select
        value={plateMode}
        onChange={(event) =>
          setPlateMode(
            event.target.value as PlateMode
          )
        }
        className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-xs font-bold text-white outline-none"
      >
        <option value="calibrated">
          Calibrated
        </option>

        <option value="gym">
          Gym Plates
        </option>
      </select>
    </div>

    <div>
      <label className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
        Bar
      </label>

      <select
        value={barType}
        onChange={(event) =>
          setBarType(
            event.target.value as BarType
          )
        }
        className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-xs font-bold text-white outline-none"
      >
        {BAR_OPTIONS.map((bar) => (
          <option
            key={bar.id}
            value={bar.id}
          >
            {bar.label}
          </option>
        ))}
      </select>
    </div>
  </div>

  {barType === "custom" && (
    <div className="mt-3">
      <label className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
        Custom Bar Weight
      </label>

      <div className="mt-1.5 flex items-center rounded-xl border border-white/[0.08] bg-black/40">
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          value={customBarWeight}
          onChange={(event) =>
            setCustomBarWeight(
              event.target.value
            )
          }
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-xs font-bold text-white outline-none"
        />

        <span className="pr-3 text-[10px] font-black text-white/30">
          kg
        </span>
      </div>
    </div>
  )}

  {plateResult && (
  <PlateStack
    plates={plateResult.platesPerSide}
    mode={plateResult.mode}
    barWeight={plateResult.barWeight}
    targetWeight={plateResult.targetWeight}
  />
  )}
</section>

        <section className="mt-3 rounded-[1.5rem] border border-white/[0.07] bg-white/[0.025] p-4">
  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-smc-gold">
    SMC Brain
  </p>

  <h2 className="mt-1 text-lg font-black text-white">
    Coaching Context
  </h2>

  <div className="mt-4 space-y-3">
    <div>
      <label className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
        Experience
      </label>

      <select
        value={experience}
        onChange={(event) =>
          setExperience(
            event.target.value as
              | "beginner"
              | "developing"
              | "experienced"
          )
        }
        className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-xs font-bold text-white outline-none"
      >
        <option value="beginner">
          Beginner
        </option>
        <option value="developing">
          Developing
        </option>
        <option value="experienced">
          Experienced
        </option>
      </select>
    </div>

    <div>
  <label className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
    Technical Priority
  </label>

  <select
    value={technicalPriority}
    onChange={(event) =>
      setTechnicalPriority(
        event.target.value as
          | "normal"
          | "high"
      )
    }
    className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-xs font-bold text-white outline-none"
  >
    <option value="normal">
      Normal
    </option>

    <option value="high">
      High
    </option>
  </select>
</div>

    <div>
      <label className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
        Objective
      </label>

      <select
        value={objective}
        onChange={(event) =>
          setObjective(
            event.target.value as
              | "technique"
              | "strength"
              | "peak_strength"
              | "volume"
              | "hypertrophy"
              | "recovery"
          )
        }
        className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-xs font-bold text-white outline-none"
      >
        <option value="technique">
          Technique
        </option>
        <option value="strength">
          Strength
        </option>
        <option value="peak_strength">
          Peak Strength
        </option>
        <option value="volume">
          Volume
        </option>
        <option value="hypertrophy">
          Hypertrophy
        </option>
        <option value="recovery">
          Recovery
        </option>
      </select>
    </div>

    <div>
  <label className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
    Secondary Objective
  </label>

  <select
    value={secondaryObjective}
    onChange={(event) =>
      setSecondaryObjective(
        event.target.value as
          | "none"
          | "technique"
          | "strength"
          | "peak_strength"
          | "volume"
          | "hypertrophy"
          | "recovery"
      )
    }
    className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-xs font-bold text-white outline-none"
  >
    <option value="none">None</option>
    <option value="technique">Technique</option>
    <option value="strength">Strength</option>
    <option value="peak_strength">Peak Strength</option>
    <option value="volume">Volume</option>
    <option value="hypertrophy">Hypertrophy</option>
    <option value="recovery">Recovery</option>
  </select>
</div>

    <div>
      <label className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
        Movement
      </label>

      <select
        value={movement}
        onChange={(event) =>
          setMovement(
            event.target.value as
              | "squat"
              | "bench"
              | "deadlift"
          )
        }
        className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-xs font-bold text-white outline-none"
      >
        <option value="squat">
          Squat
        </option>
        <option value="bench">
          Bench
        </option>
        <option value="deadlift">
          Deadlift
        </option>
      </select>
    </div>
  </div>
</section>

<section className="mt-3 rounded-[1.5rem] border border-white/[0.07] bg-black/30 p-4">
  <div className="flex items-center justify-between gap-3">
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-smc-gold">
        SMC Brain Decision
      </p>

      <h2 className="mt-1 text-lg font-black text-white">
        {coachingFocus.title}
      </h2>
    </div>

    {coachingFocus.objective && (
      <span className="rounded-full border border-smc-gold/20 bg-smc-gold/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-smc-gold">
        {coachingFocus.objective.replaceAll("_", " ")}
      </span>
    )}
  </div>

  <div className="mt-3 grid grid-cols-2 gap-2">
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
        Requested
      </p>

      <p className="mt-1 text-sm font-black capitalize text-white">
        {objective.replaceAll("_", " ")}
      </p>
    </div>

    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
        Resolved
      </p>

      <p className="mt-1 text-sm font-black capitalize text-white">
        {coachingFocus.objective
          ? coachingFocus.objective.replaceAll("_", " ")
          : "—"}
      </p>
    </div>
  </div>

  <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
      Reason
    </p>

    <p className="mt-1 text-[10px] font-bold capitalize text-white/45">
      {coachingFocus.reason
        ? coachingFocus.reason.replaceAll("_", " ")
        : "No decision metadata"}
    </p>
  </div>

  {coachingFocus.cues.length > 0 ? (
    <div className="mt-3">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
        Coaching Cues
      </p>

      <div className="mt-2 space-y-1.5">
        {coachingFocus.cues.map((cue, index) => (
          <p
            key={`${cue}-${index}`}
            className="text-[10px] font-bold leading-4 text-white/50"
          >
            {cue}
          </p>
        ))}
      </div>
    </div>
  ) : (
    <p className="mt-3 text-[10px] text-white/25">
      No coaching cues returned.
    </p>
  )}
</section>

        <section className="mt-3 rounded-[1.5rem] border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-smc-gold">
              Generated Warm-up
            </p>

            {result && (
              <span className="text-[9px] font-bold text-white/25">
                Target {result.targetWeight}kg
              </span>
            )}
          </div>

          {result && result.sets.length > 0 ? (
            <div className="mt-3 divide-y divide-white/[0.05]">
              {result.sets.map((set, index) => (
                <div
                  key={`${set.weight}-${set.reps}-${index}`}
                  className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                >
                  <p className="text-sm font-black text-white">
                    {set.weight}kg
                  </p>

                  <p className="text-xs font-bold text-white/40">
                    × {set.reps}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-white/30">
              Enter a valid target weight.
            </p>
          )}
        </section>

        {result && (
          <section className="mt-3 rounded-[1.5rem] border border-white/[0.07] bg-black/30 p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
              Engine Info
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">

  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
      Lower
    </p>

    <p className="mt-1 text-lg font-black text-white">
      {result.lowerAnchor}kg
    </p>
  </div>

  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
      Upper
    </p>

    <p className="mt-1 text-lg font-black text-white">
      {result.upperAnchor}kg
    </p>
  </div>

  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
      Source
    </p>

    <p className="mt-1 text-lg font-black text-white">
      {result.sourceTarget}kg
    </p>
  </div>

  <div className="rounded-xl border border-smc-gold/20 bg-smc-gold/[0.05] p-3">
    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-smc-gold/60">
      Confidence
    </p>

    <p className="mt-1 text-lg font-black text-smc-gold">
      {result.confidence}%
    </p>
  </div>

</div>
          </section>
        )}

        <section className="mt-3 rounded-[1.5rem] border border-white/[0.07] bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
              SMC Anchor Library
            </p>

            <span className="text-[9px] font-black text-smc-gold/60">
              {SMC_WARMUP_ANCHORS.length} anchors
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {SMC_WARMUP_ANCHORS.map(
              (anchor) => (
                <button
                  key={anchor.target}
                  type="button"
                  onClick={() =>
                    setTargetWeight(
                      String(anchor.target)
                    )
                  }
                  className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[8px] font-black text-white/35 transition hover:border-smc-gold/25 hover:text-smc-gold"
                >
                  {anchor.target}
                </button>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  )
}