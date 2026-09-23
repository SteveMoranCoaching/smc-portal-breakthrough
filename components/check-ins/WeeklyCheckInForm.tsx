"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

const premiumCard =
  "relative overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] shadow-2xl"

const innerPanel =
  "rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.35)]"

const inputClass =
  "w-full rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-500/70"

function RatingField({
  name,
  label,
  description,
}: {
  name: string
  label: string
  description?: string
}) {
  const [value, setValue] = useState<number | null>(null)

  return (
    <div className={`${innerPanel} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-white">{label}</p>

          {description && (
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {description}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <span className="text-xl font-black text-yellow-500">
            {value ?? "—"}
          </span>
          <span className="text-xs font-bold text-zinc-500"> / 10</span>
        </div>
      </div>

      <input type="hidden" name={name} value={value ?? ""} />

      <div className="mt-4 grid grid-cols-10 gap-1.5">
        {Array.from({ length: 10 }, (_, index) => {
          const rating = index + 1
          const selected = value !== null && rating <= value

          return (
            <button
              key={rating}
              type="button"
              onClick={() => setValue(rating)}
              aria-label={`${label}: ${rating} out of 10`}
              className={`h-9 rounded-lg border text-xs font-black transition ${
                selected
                  ? "border-yellow-400 bg-yellow-500 text-black"
                  : "border-zinc-800 bg-black/60 text-zinc-500 hover:border-yellow-500/50 hover:text-yellow-500"
              }`}
            >
              {rating}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type NutritionDay = {
  key: string
  label: string
  calories: string
  protein: string
  carbs: string
  fat: string
}

const initialNutritionDays: NutritionDay[] = [
  { key: "mon", label: "Monday", calories: "", protein: "", carbs: "", fat: "" },
  { key: "tue", label: "Tuesday", calories: "", protein: "", carbs: "", fat: "" },
  { key: "wed", label: "Wednesday", calories: "", protein: "", carbs: "", fat: "" },
  { key: "thu", label: "Thursday", calories: "", protein: "", carbs: "", fat: "" },
  { key: "fri", label: "Friday", calories: "", protein: "", carbs: "", fat: "" },
  { key: "sat", label: "Saturday", calories: "", protein: "", carbs: "", fat: "" },
  { key: "sun", label: "Sunday", calories: "", protein: "", carbs: "", fat: "" },
]

function averageFilledValues(
  days: NutritionDay[],
  field: "calories" | "protein" | "carbs" | "fat"
) {
  const values = days
    .map((day) => Number(day[field]))
    .filter((value) => Number.isFinite(value) && value > 0)

  if (!values.length) return null

  return values.reduce((total, value) => total + value, 0) / values.length
}

type BodyActivityDay = {
  key: string
  label: string
  bodyweight: string
  steps: string
  cardioMinutes: string
}

const initialBodyActivityDays: BodyActivityDay[] = [
  { key: "mon", label: "Monday", bodyweight: "", steps: "", cardioMinutes: "" },
  { key: "tue", label: "Tuesday", bodyweight: "", steps: "", cardioMinutes: "" },
  { key: "wed", label: "Wednesday", bodyweight: "", steps: "", cardioMinutes: "" },
  { key: "thu", label: "Thursday", bodyweight: "", steps: "", cardioMinutes: "" },
  { key: "fri", label: "Friday", bodyweight: "", steps: "", cardioMinutes: "" },
  { key: "sat", label: "Saturday", bodyweight: "", steps: "", cardioMinutes: "" },
  { key: "sun", label: "Sunday", bodyweight: "", steps: "", cardioMinutes: "" },
]

type ProgressPhotoKey = "front" | "side" | "back"

type ProgressPhotoState = Record<
  ProgressPhotoKey,
  {
    file: File | null
    previewUrl: string | null
  }
>

const initialProgressPhotos: ProgressPhotoState = {
  front: { file: null, previewUrl: null },
  side: { file: null, previewUrl: null },
  back: { file: null, previewUrl: null },
}

export default function WeeklyCheckInForm({
  previousCoachFeedback,
  previousCoachFeedbackDate,
}: {
  previousCoachFeedback?: string | null
  previousCoachFeedbackDate?: string | null
}) {

  const [hasPain, setHasPain] = useState(false)

  const [didNotTrackNutrition, setDidNotTrackNutrition] = useState(false)

  const [hasProgressPhotos, setHasProgressPhotos] = useState(false)

const [isSubmitting, setIsSubmitting] = useState(false)
const [submitError, setSubmitError] = useState<string | null>(null)

  const [progressPhotos, setProgressPhotos] =
  useState<ProgressPhotoState>(initialProgressPhotos)

function selectProgressPhoto(
  view: ProgressPhotoKey,
  file: File | null
) {
  if (!file) return

  setProgressPhotos((current) => {
    if (current[view].previewUrl) {
      URL.revokeObjectURL(current[view].previewUrl)
    }

    return {
      ...current,
      [view]: {
        file,
        previewUrl: URL.createObjectURL(file),
      },
    }
  })
}

function removeProgressPhoto(view: ProgressPhotoKey) {
  setProgressPhotos((current) => {
    if (current[view].previewUrl) {
      URL.revokeObjectURL(current[view].previewUrl)
    }

    return {
      ...current,
      [view]: {
        file: null,
        previewUrl: null,
      },
    }
  })
}

  const [nutritionDays, setNutritionDays] =
  useState<NutritionDay[]>(initialNutritionDays)

function updateNutritionDay(
  dayKey: string,
  field: "calories" | "protein" | "carbs" | "fat",
  value: string
) {
  setNutritionDays((current) =>
    current.map((day) =>
      day.key === dayKey
        ? { ...day, [field]: value }
        : day
    )
  )
}

const [bodyActivityDays, setBodyActivityDays] =
  useState<BodyActivityDay[]>(initialBodyActivityDays)

function updateBodyActivityDay(
  dayKey: string,
  field: "bodyweight" | "steps" | "cardioMinutes",
  value: string
) {
  setBodyActivityDays((current) =>
    current.map((day) =>
      day.key === dayKey
        ? { ...day, [field]: value }
        : day
    )
  )
}

const nutritionAverages = useMemo(
  () => ({
    calories: averageFilledValues(nutritionDays, "calories"),
    protein: averageFilledValues(nutritionDays, "protein"),
    carbs: averageFilledValues(nutritionDays, "carbs"),
    fat: averageFilledValues(nutritionDays, "fat"),
  }),
  [nutritionDays]
)

const nutritionDaysTracked = nutritionDays.filter((day) =>
  [day.calories, day.protein, day.carbs, day.fat].some(
    (value) => value.trim() !== ""
  )
).length

const bodyweightValues = bodyActivityDays
  .map((day) => Number(day.bodyweight))
  .filter((value) => Number.isFinite(value) && value > 0)

const stepValues = bodyActivityDays
  .map((day) => Number(day.steps))
  .filter((value) => Number.isFinite(value) && value > 0)

const cardioValues = bodyActivityDays
  .map((day) => Number(day.cardioMinutes))
  .filter((value) => Number.isFinite(value) && value > 0)

const averageBodyweight =
  bodyweightValues.length > 0
    ? bodyweightValues.reduce((total, value) => total + value, 0) /
      bodyweightValues.length
    : null

const averageSteps =
  stepValues.length > 0
    ? stepValues.reduce((total, value) => total + value, 0) /
      stepValues.length
    : null

const totalCardio =
  cardioValues.length > 0
    ? cardioValues.reduce((total, value) => total + value, 0)
    : null

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()

  if (isSubmitting) return

  setIsSubmitting(true)
  setSubmitError(null)

  const formData = new FormData(event.currentTarget)

  // The real photo Files live in React state.
  // Remove the empty native file inputs from the Server Action payload.
  formData.delete("progress_photo_front")
  formData.delete("progress_photo_side")
  formData.delete("progress_photo_back")

  try {
    if (hasProgressPhotos) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error(
          "Unable to confirm your account before uploading photos."
        )
      }

      const photoDate = new Date().toLocaleDateString("en-CA")
      const views: ProgressPhotoKey[] = ["front", "side", "back"]

      for (const view of views) {
        const file = progressPhotos[view].file

        if (!file) continue

        const extension =
          file.name.split(".").pop()?.toLowerCase() || "jpg"

        const storagePath =
          `${user.id}/${photoDate}/${view}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from("progress-photos")
          .upload(storagePath, file, {
            contentType: file.type || undefined,
            upsert: true,
          })

        if (uploadError) {
          throw new Error(
            `Could not upload ${view} progress photo: ${uploadError.message}`
          )
        }

        formData.set(`progress_photo_${view}_path`, storagePath)
      }
    }
  } catch (error) {
    console.error("Check-in photo upload error:", error)

    setSubmitError(
      error instanceof Error
        ? error.message
        : "Something went wrong while uploading your progress photos."
    )

    setIsSubmitting(false)
    return
  }

  try {
    const response = await fetch("/api/check-ins", {
      method: "POST",
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(
        result?.error ||
          "Something went wrong while submitting your check-in."
      )
    }

    window.location.assign(
      "/dashboard/check-ins?submitted=true"
    )
  } catch (error) {
    console.error("Check-in submission error:", error)

    setSubmitError(
      error instanceof Error
        ? error.message
        : "Something went wrong while submitting your check-in."
    )

    setIsSubmitting(false)
  }
}

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* TRAINING */}
      <section className={`${premiumCard} p-5 sm:p-6`}>
        <div className="relative z-10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-lg">
              🏋️
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">
                01 · Training
              </p>

              <h2 className="mt-1 text-xl font-black text-white">
                How did training go this week?
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Give Steve a quick picture of performance, enjoyment and
                anything that affected your sessions.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <RatingField
              name="training_rating"
              label="Training performance"
              description="How well did you perform across the week?"
            />

            <RatingField
              name="training_enjoyment"
              label="Training enjoyment"
              description="How much did you enjoy your training this week?"
            />
          </div>

          <div className={`${innerPanel} mt-4 p-4`}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-black text-white">
                  Any pain or niggles?
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Anything Steve should know about before your next week of
                  training.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:w-56">
                <button
                  type="button"
                  onClick={() => setHasPain(false)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-black transition ${
                    !hasPain
                      ? "border-yellow-500 bg-yellow-500 text-black"
                      : "border-zinc-800 bg-black/50 text-zinc-400"
                  }`}
                >
                  No
                </button>

                <button
                  type="button"
                  onClick={() => setHasPain(true)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-black transition ${
                    hasPain
                      ? "border-yellow-500 bg-yellow-500 text-black"
                      : "border-zinc-800 bg-black/50 text-zinc-400"
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>

            <input
              type="hidden"
              name="pain_niggles"
              value={hasPain ? "yes" : "no"}
            />

            {hasPain && (
              <div className="mt-4">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wide text-yellow-500">
                    Tell me what&apos;s going on
                  </span>

                  <textarea
                    name="pain_notes"
                    rows={3}
                    placeholder="Where is it, when do you notice it, and has it affected any exercises?"
                    className={inputClass}
                  />
                </label>
              </div>
            )}
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm font-black text-white">
              Training comments
            </span>

            <textarea
              name="notes"
              rows={4}
              placeholder="PBs, missed sessions, movements that felt great, anything you want Steve to know..."
              className={inputClass}
            />
          </label>
        </div>
      </section>

      {/* RECOVERY */}
      <section className={`${premiumCard} p-5 sm:p-6`}>
        <div className="relative z-10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-lg">
              🌙
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">
                02 · Recovery
              </p>

              <h2 className="mt-1 text-xl font-black text-white">
                How are you recovering?
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Sleep, stress and fatigue help put your training performance
                into context.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <RatingField
              name="recovery_rating"
              label="Overall recovery"
              description="How recovered have you generally felt?"
            />

            <RatingField
              name="sleep_quality"
              label="Sleep quality"
              description="How good has the quality of your sleep been?"
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <label className={`${innerPanel} block p-4`}>
              <span className="text-sm font-black text-white">
                Average sleep
              </span>

              <span className="mt-1 block text-xs text-zinc-500">
                Hours per night
              </span>

              <div className="relative mt-4">
                <input
                  name="sleep_hours"
                  type="number"
                  min="0"
                  max="24"
                  step="0.1"
                  placeholder="e.g. 7.5"
                  className={`${inputClass} pr-16`}
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                  HRS
                </span>
              </div>
            </label>

            <RatingField
              name="stress_rating"
              label="Stress"
              description="1 = very low, 10 = extremely high"
            />

            <RatingField
              name="fatigue_rating"
              label="Fatigue"
              description="1 = fresh, 10 = completely drained"
            />
          </div>
        </div>
      </section>

      {/* PREVIOUS COACH FEEDBACK */}
      {previousCoachFeedback && (
        <section className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-500">
            Last Week&apos;s Coach Feedback
          </p>

          {previousCoachFeedbackDate && (
            <p className="mt-1 text-xs text-zinc-500">
              From {previousCoachFeedbackDate}
            </p>
          )}

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
            {previousCoachFeedback}
          </p>
        </section>
      )}

      {/* NUTRITION */}
<section className={`${premiumCard} p-5 sm:p-6`}>
  <div className="relative z-10">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-lg">
        🍽️
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">
          03 · Nutrition
        </p>

        <h2 className="mt-1 text-xl font-black text-white">
          How did nutrition look this week?
        </h2>

        <p className="mt-1 text-sm leading-5 text-zinc-500">
          Add whatever you tracked through the week. You don&apos;t need to
          complete every day to submit your check-in.
        </p>
      </div>
    </div>

    <div className="mt-5">
      <RatingField
        name="nutrition_rating"
        label="Nutrition adherence"
        description="How well did you stick to your nutrition targets this week?"
      />
    </div>

    <div className="my-5 flex items-center gap-3">
  <div className="h-px flex-1 bg-yellow-500/30" />

  <p className="shrink-0 text-center text-[9px] font-black uppercase leading-4 tracking-[0.16em] text-yellow-500">
  Enter tracked calories
  <br />
  & macros below
</p>

  <div className="h-px flex-1 bg-yellow-500/30" />
</div>

    <div className="mt-4">
  <button
    type="button"
    onClick={() => setDidNotTrackNutrition((current) => !current)}
    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
      didNotTrackNutrition
        ? "border-yellow-500/50 bg-yellow-500/10"
        : "border-zinc-800 bg-black/40 hover:border-zinc-700"
    }`}
  >
    <div
  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black transition ${
    didNotTrackNutrition
      ? "border-yellow-500 bg-yellow-500 text-black"
      : "border-zinc-700 bg-zinc-950"
  }`}
>
  {didNotTrackNutrition && "✓"}
</div>

<div>
  <p
    className={`text-sm font-bold leading-5 transition ${
      didNotTrackNutrition ? "text-yellow-500" : "text-zinc-500"
    }`}
  >
        I didn&apos;t track my nutrition this week because I like to make
        Steve&apos;s life harder
      </p>

      {didNotTrackNutrition && (
        <p className="mt-1 text-xs text-zinc-500">
          Fair enough. We&apos;ll work with what we&apos;ve got 😂
        </p>
      )}
    </div>
  </button>

  <input
    type="hidden"
    name="nutrition_not_tracked"
    value={didNotTrackNutrition ? "yes" : "no"}
  />
</div>

{!didNotTrackNutrition && (
  <>
    <div className="mt-5 space-y-3">
      {nutritionDays.map((day) => (
        <div key={day.key} className={`${innerPanel} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-white">
              {day.label}
            </p>

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
              Daily intake
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label>
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
                Calories
              </span>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  name={`nutrition_${day.key}_calories`}
                  value={day.calories}
                  onChange={(event) =>
                    updateNutritionDay(
                      day.key,
                      "calories",
                      event.target.value
                    )
                  }
                  placeholder="2450"
                  className={`${inputClass} pr-12`}
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
                  KCAL
                </span>
              </div>
            </label>

            <label>
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
                Protein
              </span>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  name={`nutrition_${day.key}_protein`}
                  value={day.protein}
                  onChange={(event) =>
                    updateNutritionDay(
                      day.key,
                      "protein",
                      event.target.value
                    )
                  }
                  placeholder="180"
                  className={`${inputClass} pr-9`}
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
                  G
                </span>
              </div>
            </label>

            <label>
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
                Carbs
              </span>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  name={`nutrition_${day.key}_carbs`}
                  value={day.carbs}
                  onChange={(event) =>
                    updateNutritionDay(
                      day.key,
                      "carbs",
                      event.target.value
                    )
                  }
                  placeholder="275"
                  className={`${inputClass} pr-9`}
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
                  G
                </span>
              </div>
            </label>

            <label>
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
                Fat
              </span>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  name={`nutrition_${day.key}_fat`}
                  value={day.fat}
                  onChange={(event) =>
                    updateNutritionDay(
                      day.key,
                      "fat",
                      event.target.value
                    )
                  }
                  placeholder="70"
                  className={`${inputClass} pr-9`}
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
                  G
                </span>
              </div>
            </label>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.06] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-500">
            Weekly Averages
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Based on {nutritionDaysTracked} tracked{" "}
            {nutritionDaysTracked === 1 ? "day" : "days"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xl font-black text-white">
            {nutritionAverages.calories !== null
              ? Math.round(nutritionAverages.calories).toLocaleString()
              : "—"}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Avg kcal
          </p>
        </div>

        <div>
          <p className="text-xl font-black text-white">
            {nutritionAverages.protein !== null
              ? `${Math.round(nutritionAverages.protein)}g`
              : "—"}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Avg protein
          </p>
        </div>

        <div>
          <p className="text-xl font-black text-white">
            {nutritionAverages.carbs !== null
              ? `${Math.round(nutritionAverages.carbs)}g`
              : "—"}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Avg carbs
          </p>
        </div>

        <div>
          <p className="text-xl font-black text-white">
            {nutritionAverages.fat !== null
              ? `${Math.round(nutritionAverages.fat)}g`
              : "—"}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Avg fat
          </p>
                </div>
      </div>
    </div>
  </>
)}
  </div>
</section>


{/* BODY & ACTIVITY */}
<section className={`${premiumCard} p-5 sm:p-6`}>
  <div className="relative z-10">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-lg">
        ⚖️
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">
          04 · Body & Activity
        </p>

        <h2 className="mt-1 text-xl font-black text-white">
          Bodyweight & movement
        </h2>

        <p className="mt-1 text-sm leading-5 text-zinc-500">
          Add whatever you tracked this week. Every day is optional.
        </p>
      </div>
    </div>

    <div className="mt-5 space-y-3">
      {bodyActivityDays.map((day) => (
        <div key={day.key} className={`${innerPanel} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-white">
              {day.label}
            </p>

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
              Daily metrics
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label>
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
                Bodyweight
              </span>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  name={`activity_${day.key}_bodyweight`}
                  value={day.bodyweight}
                  onChange={(event) =>
                    updateBodyActivityDay(
                      day.key,
                      "bodyweight",
                      event.target.value
                    )
                  }
                  placeholder="89.4"
                  className={`${inputClass} pr-10`}
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
                  KG
                </span>
              </div>
            </label>

            <label>
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
                Steps
              </span>

              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                name={`activity_${day.key}_steps`}
                value={day.steps}
                onChange={(event) =>
                  updateBodyActivityDay(
                    day.key,
                    "steps",
                    event.target.value
                  )
                }
                placeholder="8450"
                className={inputClass}
              />
            </label>

            <label className="col-span-2">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
                Cardio
              </span>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  name={`activity_${day.key}_cardio`}
                  value={day.cardioMinutes}
                  onChange={(event) =>
                    updateBodyActivityDay(
                      day.key,
                      "cardioMinutes",
                      event.target.value
                    )
                  }
                  placeholder="30"
                  className={`${inputClass} pr-14`}
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
                  MIN
                </span>
              </div>
            </label>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.06] p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-500">
        Weekly Summary
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xl font-black text-white">
            {averageBodyweight !== null
              ? `${averageBodyweight.toFixed(1)}kg`
              : "—"}
          </p>

          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Avg bodyweight
          </p>
        </div>

        <div>
          <p className="text-xl font-black text-white">
            {averageSteps !== null
              ? Math.round(averageSteps).toLocaleString()
              : "—"}
          </p>

          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Avg daily steps
          </p>
        </div>

        <div>
          <p className="text-xl font-black text-white">
            {totalCardio !== null
              ? `${Math.round(totalCardio)} min`
              : "—"}
          </p>

          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Total cardio
          </p>
        </div>

        <div>
          <p className="text-xl font-black text-zinc-600">
            —
          </p>

          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-500">
            BW change
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

{/* PROGRESS PHOTOS */}
<section className={`${premiumCard} p-5 sm:p-6`}>
  <div className="relative z-10">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-lg">
        📸
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">
          05 · Progress Photos
        </p>

        <h2 className="mt-1 text-xl font-black text-white">
          Have you taken progress photos this week?
        </h2>

        <p className="mt-1 text-sm leading-5 text-zinc-500">
          Optional, but useful for tracking physical changes over time.
        </p>
      </div>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => setHasProgressPhotos(false)}
        className={`rounded-xl border px-4 py-3 text-sm font-black transition ${
          !hasProgressPhotos
            ? "border-yellow-500 bg-yellow-500 text-black"
            : "border-zinc-800 bg-black/50 text-zinc-400"
        }`}
      >
        No
      </button>

      <button
        type="button"
        onClick={() => setHasProgressPhotos(true)}
        className={`rounded-xl border px-4 py-3 text-sm font-black transition ${
          hasProgressPhotos
            ? "border-yellow-500 bg-yellow-500 text-black"
            : "border-zinc-800 bg-black/50 text-zinc-400"
        }`}
      >
        Yes
      </button>
    </div>

    <input
      type="hidden"
      name="has_progress_photos"
      value={hasProgressPhotos ? "yes" : "no"}
    />

    {hasProgressPhotos && (
  <div className="mt-5 space-y-3">
    {[
      {
        key: "front" as ProgressPhotoKey,
        label: "Front",
        description: "Front-facing progress photo",
      },
      {
        key: "side" as ProgressPhotoKey,
        label: "Side",
        description: "Side-facing progress photo",
      },
      {
        key: "back" as ProgressPhotoKey,
        label: "Back",
        description: "Back-facing progress photo",
      },
    ].map((photo) => {
      const selectedPhoto = progressPhotos[photo.key]

      return (
        <div
          key={photo.key}
          className={`${innerPanel} overflow-hidden`}
        >
          {selectedPhoto.previewUrl ? (
            <>
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
                <Image
  src={selectedPhoto.previewUrl}
  alt={`${photo.label} progress preview`}
  fill
  unoptimized
  className="object-cover"
/>

                <div className="absolute left-3 top-3 rounded-full border border-yellow-500/30 bg-black/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-500 backdrop-blur">
                  {photo.label}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white">
                      {photo.label} photo
                    </p>

                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {selectedPhoto.file?.name}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <label className="cursor-pointer rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs font-black text-yellow-500 transition hover:bg-yellow-500/20">
                      Replace

                      <input
                        type="file"
                        name={`progress_photo_${photo.key}`}
                        accept="image/*"
                        className="hidden"
                        onChange={(event) =>
                          selectProgressPhoto(
                            photo.key,
                            event.target.files?.[0] ?? null
                          )
                        }
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => removeProgressPhoto(photo.key)}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-400 transition hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <label className="block cursor-pointer p-4 transition hover:bg-white/[0.02]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-white">
                    {photo.label}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {photo.description}
                  </p>
                </div>

                <div className="shrink-0 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs font-black text-yellow-500">
                  + Add photo
                </div>
              </div>

              <input
                type="file"
                name={`progress_photo_${photo.key}`}
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  selectProgressPhoto(
                    photo.key,
                    event.target.files?.[0] ?? null
                  )
                }
              />
                        </label>
          )}
        </div>
      )
    })}
  </div>
)}
</div>
</section>

{/* WEEKLY REFLECTION */}
<section className={`${premiumCard} p-5 sm:p-6`}>
  <div className="relative z-10">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-lg">
        💭
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">
          06 · Weekly Reflection
        </p>

        <h2 className="mt-1 text-xl font-black text-white">
          Anything else Steve should know?
        </h2>

        <p className="mt-1 text-sm leading-5 text-zinc-500">
          A quick look back at the week before we plan the next one.
        </p>
      </div>
    </div>

    <div className="mt-5 space-y-4">
      <label className={`${innerPanel} block p-4`}>
        <span className="text-sm font-black text-white">
          What went well this week?
        </span>

        <span className="mt-1 block text-xs leading-5 text-zinc-500">
          Training, nutrition, recovery, life — anything you&apos;re happy with.
        </span>

        <textarea
          name="weekly_win"
          rows={3}
          placeholder="Tell me about the wins..."
          className={`${inputClass} mt-4 resize-none`}
        />
      </label>

      <label className={`${innerPanel} block p-4`}>
        <span className="text-sm font-black text-white">
          What was your biggest challenge?
        </span>

        <span className="mt-1 block text-xs leading-5 text-zinc-500">
          Anything that made the week harder than it needed to be.
        </span>

        <textarea
          name="weekly_challenge"
          rows={3}
          placeholder="What got in the way?"
          className={`${inputClass} mt-4 resize-none`}
        />
      </label>

      <label className={`${innerPanel} block p-4`}>
        <span className="text-sm font-black text-white">
          Anything you need from Steve?
        </span>

        <span className="mt-1 block text-xs leading-5 text-zinc-500">
          Programme changes, feedback, support, questions — fire away.
        </span>

        <textarea
          name="support_needed"
          rows={3}
          placeholder="Anything I can help with?"
          className={`${inputClass} mt-4 resize-none`}
        />
      </label>
    </div>
  </div>
</section>

{submitError && (
  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
    <p className="text-sm font-bold text-red-400">
      {submitError}
    </p>
  </div>
)}

      <button
  type="submit"
  disabled={isSubmitting}
  className="w-full rounded-2xl bg-yellow-500 px-5 py-4 text-sm font-black text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
>
  {isSubmitting ? "Submitting Check-In..." : "Submit Check-In →"}
</button>
    </form>
  )
}