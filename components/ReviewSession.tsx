"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type SetEntry = {
  weight?: string
  bodyweight?: string
  height?: string
  speed?: string
  distance?: string
  reps?: string
  time?: string
  calories?: string
  rounds?: string
  rpe?: string
}

type LogItem = {
  type: "log"
  id: string
  exercise_name: string
  coach_feedback: string
  sets_completed: SetEntry[] | null
  notes: string | null
  previousPerformance?: {
    id: string
    created_at: string
    session_id: string
    sets_completed: SetEntry[] | null
  } | null
}



type LogPrimaryField = "kg" | "bodyweight" | "height" | "speed" | "distance" | "none"
type LogSecondaryField = "reps" | "time" | "distance" | "calories" | "rounds" | "none"

const primaryLabels: Record<LogPrimaryField, string> = {
  kg: "kg",
  bodyweight: "BW",
  height: "height",
  speed: "speed",
  distance: "distance",
  none: "",
}

const secondaryLabels: Record<LogSecondaryField, string> = {
  reps: "reps",
  time: "time",
  distance: "distance",
  calories: "calories",
  rounds: "rounds",
  none: "",
}

function getExerciseLogTypeFromExercise(exercise: any) {
  return {
    primary: exercise?.logType?.primary || "kg",
    secondary: exercise?.logType?.secondary || "reps",
  } as { primary: LogPrimaryField; secondary: LogSecondaryField }
}

function getPrimaryValue(set: SetEntry, primary: LogPrimaryField) {
  if (primary === "kg") return set.weight ? `${set.weight}kg` : ""
  if (primary === "bodyweight") return set.bodyweight || "BW"
  if (primary === "height") return set.height ? `${set.height} height` : ""
  if (primary === "speed") return set.speed ? `${set.speed} speed` : ""
  if (primary === "distance") return set.distance ? `${set.distance} distance` : ""
  return ""
}

function getSecondaryValue(set: SetEntry, secondary: LogSecondaryField) {
  if (secondary === "reps") return set.reps ? `× ${set.reps}` : ""
  if (secondary === "time") return set.time ? `${set.time} time` : ""
  if (secondary === "distance") return set.distance ? `${set.distance} distance` : ""
  if (secondary === "calories") return set.calories ? `${set.calories} calories` : ""
  if (secondary === "rounds") return set.rounds ? `${set.rounds} rounds` : ""
  return ""
}

type VideoItem = {
  type: "video"
  id: string
  exercise_name: string
  feedback: string
  signedUrl: string
}

type SessionReviewItem = {
type: "session"
id: string
session_id: string
programme_id: string
user_id: string
clientId: string
clientName: string
created_at: string

session_title?: string | null
session_day?: string | null
week_number?: number | null
prescribed_exercises?: any[] | null

completion?: any
latestCheckIn?: any
attention?: any
logs: LogItem[]
videos: VideoItem[]
}


type DailyMetric = {
  id: string
  user_id: string
  check_in_id: string | null
  metric_date: string
  bodyweight: number | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  steps: number | null
  cardio_minutes: number | null
}

type CheckInReviewItem = {
  type: "check-in"
  id: string
  user_id: string
  clientId: string
  clientName: string
  created_at: string

  bodyweight?: number | null

  training_rating?: number | null
  training_enjoyment?: number | null
  pain_niggles?: boolean | null
  pain_notes?: string | null

  recovery_rating?: number | null
  sleep_hours?: number | null
  sleep_quality?: number | null
  stress_rating?: number | null
  fatigue_rating?: number | null

  nutrition_rating?: number | null

  cardio_steps?: string | null
  notes?: string | null

  weekly_win?: string | null
  weekly_challenge?: string | null
  support_needed?: string | null

  dailyMetrics: DailyMetric[]

  coach_feedback?: string | null
  feedback_seen?: boolean | null

  previousCheckInFeedback?: {
    id: string
    created_at: string
    coach_feedback: string
  } | null

  attention?: any
}

type ReviewItem = SessionReviewItem | CheckInReviewItem

function averageNumbers(values: Array<number | null | undefined>) {
  const validValues = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  )

  if (validValues.length === 0) return null

  return (
    validValues.reduce((total, value) => total + value, 0) /
    validValues.length
  )
}

function totalNumbers(values: Array<number | null | undefined>) {
  const validValues = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  )

  if (validValues.length === 0) return null

  return validValues.reduce((total, value) => total + value, 0)
}

function formatAverage(
  value: number | null,
  decimals = 0
) {
  if (value === null) return "-"

  return value.toFixed(decimals)
}

export default function ReviewSession({
  items,
}: {
  items: ReviewItem[]
}) {
  const [reviewItems, setReviewItems] = useState(items)
  const [savingId, setSavingId] = useState("")
  const [message, setMessage] = useState("")
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({})

  const current = reviewItems[0]

    function scrollReviewToTop() {
requestAnimationFrame(() => {
window.scrollTo(0, 0)
})
}


  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function formatSet(set: SetEntry, exerciseName?: string) {
    const prescribedExercise =
      current?.type === "session"
        ? current.prescribed_exercises?.find(
            (exercise: any) =>
              exercise.name?.toLowerCase().trim() ===
              String(exerciseName || "").toLowerCase().trim()
          )
        : null

    const logType = getExerciseLogTypeFromExercise(prescribedExercise)
    const parts = [
      getPrimaryValue(set, logType.primary),
      getSecondaryValue(set, logType.secondary),
      set.rpe ? `@ RPE ${set.rpe}` : "",
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(" ") : "No data"
  }

  function getWeightDelta(
  currentSet: SetEntry,
  previousSet?: SetEntry
) {
  if (!currentSet?.weight || !previousSet?.weight) return null

  const currentWeight = Number(currentSet.weight)
  const previousWeight = Number(previousSet.weight)

  if (
    !Number.isFinite(currentWeight) ||
    !Number.isFinite(previousWeight)
  ) {
    return null
  }

  const difference = currentWeight - previousWeight

  if (difference === 0) return null

  return {
    difference,
    label:
      difference > 0
        ? `(+${difference}kg)`
        : `(${difference}kg)`,
  }
}

  function formatFlag(flag: string) {
    return flag.replaceAll("_", " ")
  }

  function getPrescriptionForExercise(exerciseName: string) {
if (!current || current.type !== "session") return ""

const prescribedExercise = current.prescribed_exercises?.find(
(exercise: any) =>
exercise.name?.toLowerCase().trim() ===
exerciseName.toLowerCase().trim()
)

return prescribedExercise?.prescription || ""
}


  function getFeedbackValue(type: "log" | "video", item: LogItem | VideoItem) {
    const key = `${type}-${item.id}`
    if (feedbackById[key] !== undefined) return feedbackById[key]

    return type === "log"
      ? (item as LogItem).coach_feedback || ""
      : (item as VideoItem).feedback || ""
  }

  function setFeedbackValue(type: "log" | "video", itemId: string, value: string) {
    setFeedbackById((current) => ({
      ...current,
      [`${type}-${itemId}`]: value,
    }))
  }

  function getSessionFeedbackValue() {
    if (!current || current.type !== "session") return ""

    const key = `session-${current.id}`

    if (feedbackById[key] !== undefined) {
      return feedbackById[key]
    }

    return current.completion?.coach_feedback || ""
  }

  function setSessionFeedbackValue(value: string) {
    if (!current || current.type !== "session") return

    setFeedbackById((currentFeedback) => ({
      ...currentFeedback,
      [`session-${current.id}`]: value,
    }))
  }

  async function saveSessionFeedback() {
    if (!current || current.type !== "session") return

    setSavingId("session-feedback")
    setMessage("")

    const { error } = await supabase
      .from("session_completions")
      .update({
        coach_feedback: getSessionFeedbackValue(),
        feedback_read: false,
      })
      .eq("id", current.completion?.id)

    setSavingId("")

    if (error) {
      setMessage(`Save failed: ${error.message}`)
      return
    }

    setReviewItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== current.id || item.type !== "session") return item

        return {
          ...item,
          completion: {
            ...(item.completion || {}),
            coach_feedback: getSessionFeedbackValue(),
            feedback_read: false,
          },
        }
      })
    )

    setMessage("Session feedback saved.")
  }

  async function saveItemFeedback({
    type,
    item,
    markReviewed,
  }: {
    type: "log" | "video"
    item: LogItem | VideoItem
    markReviewed: boolean
  }) {
    if (!current || current.type !== "session") return

    setSavingId(`${type}-${item.id}`)
    setMessage("")

    const feedback = getFeedbackValue(type, item)
    const table = type === "video" ? "exercise_videos" : "workout_logs"

    const updateData =
      type === "video"
        ? {
            feedback,
            ...(markReviewed ? { reviewed: true } : {}),
          }
        : {
            coach_feedback: feedback,
            feedback_read: false,
            ...(markReviewed ? { reviewed: true } : {}),
          }

    const { error } = await supabase.from(table).update(updateData).eq("id", item.id)

    setSavingId("")

    if (error) {
      setMessage(`Save failed: ${error.message}`)
      return
    }

    setMessage(markReviewed ? "Marked reviewed." : "Feedback saved.")

    if (markReviewed) {
      setReviewItems((currentItems) =>
        currentItems
          .map((session) => {
            if (session.id !== current.id || session.type !== "session") {
              return session
            }

            return {
              ...session,
              logs:
                type === "log"
                  ? session.logs.filter((log) => log.id !== item.id)
                  : session.logs,
              videos:
                type === "video"
                  ? session.videos.filter((video) => video.id !== item.id)
                  : session.videos,
            }
          })
          .filter(
            (session) =>
              session.type !== "session" ||
              session.logs.length > 0 ||
              session.videos.length > 0
          )
      )

      scrollReviewToTop()
    }
  }

  async function markWholeSessionReviewed() {
  if (!current || current.type !== "session") return

  setSavingId("whole-session")
  setMessage("")

  const logUpdates = session.logs
    .filter((log) => log.id)
    .map((log) =>
      supabase
        .from("workout_logs")
        .update({
          coach_feedback: getFeedbackValue("log", log),
          feedback_read: false,
          reviewed: true,
        })
        .eq("id", log.id)
    )

  const videoUpdates = session.videos
    .filter((video) => video.id)
    .map((video) =>
      supabase
        .from("exercise_videos")
        .update({
          feedback: getFeedbackValue("video", video),
          reviewed: true,
        })
        .eq("id", video.id)
    )

  const updates = [...logUpdates, ...videoUpdates]

  if (current.completion?.id) {
    updates.unshift(
      supabase
        .from("session_completions")
        .update({
          coach_feedback: getSessionFeedbackValue(),
          feedback_read: false,
        })
        .eq("id", current.completion.id)
    )
  }

  const results = await Promise.all(updates)
  const firstError = results.find((result) => result.error)?.error

  setSavingId("")

  if (firstError) {
    setMessage(`Save failed: ${firstError.message}`)
    return
  }

  setReviewItems((items) => items.filter((item) => item.id !== current.id))
  setMessage("Session reviewed.")
  scrollReviewToTop()
}

  function skipSession() {
  setReviewItems((items) => {
    const updated = [...items.slice(1), items[0]]

    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })

    return updated
  })
}

  if (!current) {
    return (
      <section className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center">
        <p className="text-4xl">✅</p>
        <h2 className="mt-4 text-2xl font-bold text-green-400">All caught up</h2>
        <p className="mt-2 text-zinc-300">No sessions waiting for review.</p>

        <Link
          href="/coach"
          className="mt-6 inline-flex rounded-xl bg-yellow-500 px-4 py-2 font-semibold text-black transition hover:bg-yellow-400"
        >
          Back to dashboard
        </Link>
      </section>
    )
  }

  if (current.type === "check-in") {
    const checkInFeedbackKey = `check-in-${current.id}`

    const checkInFeedback =
      feedbackById[checkInFeedbackKey] !== undefined
        ? feedbackById[checkInFeedbackKey]
        : current.coach_feedback || ""

    function setCheckInFeedback(value: string) {
      setFeedbackById((currentFeedback) => ({
        ...currentFeedback,
        [checkInFeedbackKey]: value,
      }))
    }

    async function markCheckInReviewed() {
      setSavingId(`check-in-${current.id}`)
      setMessage("")

      const { error } = await supabase
        .from("check_ins")
        .update({
          reviewed: true,
          coach_feedback: checkInFeedback,
          feedback_seen: false,
        })
        .eq("id", current.id)

      setSavingId("")

      if (error) {
        setMessage(`Save failed: ${error.message}`)
        return
      }

      setReviewItems((items) => items.filter((item) => item.id !== current.id))
      setMessage("Check-in reviewed.")
      scrollReviewToTop()
    }

    const averageCalories = averageNumbers(
  current.dailyMetrics.map((day) => day.calories)
)

const averageProtein = averageNumbers(
  current.dailyMetrics.map((day) => day.protein)
)

const averageCarbs = averageNumbers(
  current.dailyMetrics.map((day) => day.carbs)
)

const averageFat = averageNumbers(
  current.dailyMetrics.map((day) => day.fat)
)

const averageBodyweight = averageNumbers(
  current.dailyMetrics.map((day) => day.bodyweight)
)

const averageSteps = averageNumbers(
  current.dailyMetrics.map((day) => day.steps)
)

const totalCardio = totalNumbers(
  current.dailyMetrics.map((day) => day.cardio_minutes)
)

    return (
  <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-yellow-400">
          Weekly Check-In
        </p>

        <h2 className="mt-1 text-2xl font-bold">
          {current.clientName}
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          {formatDateTime(current.created_at)}
        </p>
      </div>

      <span className="w-fit rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold uppercase text-black">
        Needs Review
      </span>
    </div>

    <div className="mt-6 space-y-5">
      {/* Training */}
      <div className="rounded-2xl border border-zinc-800 bg-black p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
          Training
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <MetricCard
            label="Performance"
            value={
              current.training_rating != null
                ? `${current.training_rating}/10`
                : "-"
            }
          />

          <MetricCard
            label="Enjoyment"
            value={
              current.training_enjoyment != null
                ? `${current.training_enjoyment}/10`
                : "-"
            }
          />
        </div>

        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Pain / Niggles
          </p>

          <p
            className={`mt-1 text-sm font-bold ${
              current.pain_niggles
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {current.pain_niggles ? "Yes" : "No"}
          </p>

          {current.pain_niggles && current.pain_notes && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
              {current.pain_notes}
            </p>
          )}
        </div>

        {current.notes && (
          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              Training Comments
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
              {current.notes}
            </p>
          </div>
        )}
      </div>

      {/* Recovery */}
      <div className="rounded-2xl border border-zinc-800 bg-black p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
          Recovery
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <MetricCard
            label="Overall"
            value={
              current.recovery_rating != null
                ? `${current.recovery_rating}/10`
                : "-"
            }
          />

          <MetricCard
            label="Avg Sleep"
            value={
              current.sleep_hours != null
                ? `${current.sleep_hours}h`
                : "-"
            }
          />

          <MetricCard
            label="Sleep Quality"
            value={
              current.sleep_quality != null
                ? `${current.sleep_quality}/10`
                : "-"
            }
          />

          <MetricCard
            label="Stress"
            value={
              current.stress_rating != null
                ? `${current.stress_rating}/10`
                : "-"
            }
          />

          <MetricCard
            label="Fatigue"
            value={
              current.fatigue_rating != null
                ? `${current.fatigue_rating}/10`
                : "-"
            }
          />
        </div>
      </div>

      {/* Nutrition */}
      <div className="rounded-2xl border border-zinc-800 bg-black p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
            Nutrition
          </p>

          <span className="text-sm font-bold text-white">
            {current.nutrition_rating != null
              ? `${current.nutrition_rating}/10 adherence`
              : "-"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Avg Calories"
            value={formatAverage(averageCalories)}
          />

          <MetricCard
            label="Avg Protein"
            value={
              averageProtein !== null
                ? `${formatAverage(averageProtein)}g`
                : "-"
            }
          />

          <MetricCard
            label="Avg Carbs"
            value={
              averageCarbs !== null
                ? `${formatAverage(averageCarbs)}g`
                : "-"
            }
          />

          <MetricCard
            label="Avg Fat"
            value={
              averageFat !== null
                ? `${formatAverage(averageFat)}g`
                : "-"
            }
          />
        </div>
      </div>

      {/* Body & Activity */}
      <div className="rounded-2xl border border-zinc-800 bg-black p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
          Body & Activity
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard
            label="Avg Bodyweight"
            value={
              averageBodyweight !== null
                ? `${formatAverage(averageBodyweight, 1)}kg`
                : current.bodyweight != null
                  ? `${current.bodyweight}kg`
                  : "-"
            }
          />

          <MetricCard
            label="Avg Steps"
            value={
              averageSteps !== null
                ? Math.round(averageSteps).toLocaleString("en-GB")
                : "-"
            }
          />

          <MetricCard
            label="Total Cardio"
            value={
              totalCardio !== null
                ? `${Math.round(totalCardio)} min`
                : "-"
            }
          />
        </div>
      </div>

      {/* Weekly Reflection */}
      <div className="rounded-2xl border border-zinc-800 bg-black p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
          Weekly Reflection
        </p>

        <div className="mt-3 space-y-3">
          <ReflectionCard
            label="What went well?"
            value={current.weekly_win}
          />

          <ReflectionCard
            label="Biggest challenge"
            value={current.weekly_challenge}
          />

          <ReflectionCard
            label="What do they need from Steve?"
            value={current.support_needed}
            highlight
          />
        </div>
      </div>

      {/* Previous Feedback */}
      {current.previousCheckInFeedback?.coach_feedback && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-yellow-400">
            Previous Check-In Feedback
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Given after{" "}
            {formatDateTime(
              current.previousCheckInFeedback.created_at
            )}
          </p>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
            {current.previousCheckInFeedback.coach_feedback}
          </p>
        </div>
      )}

      {/* Coach Feedback */}
      <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.06] p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
          Coach Feedback
        </p>

        <textarea
          value={checkInFeedback}
          onChange={(event) =>
            setCheckInFeedback(event.target.value)
          }
          rows={6}
          className="mt-3 w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-500"
          placeholder="Feedback for this check-in..."
        />
      </div>
    </div>

    {message && (
      <p className="mt-4 text-sm text-zinc-400">{message}</p>
    )}

    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href={`/coach/${current.clientId}?tab=check-ins`}
        className="rounded-xl border border-zinc-700 px-4 py-2 text-center text-sm text-zinc-300 transition hover:border-yellow-500 hover:text-white"
      >
        Open Full Check-In
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={skipSession}
          disabled={savingId !== ""}
          className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 disabled:opacity-50"
        >
          Skip →
        </button>

        <button
          onClick={markCheckInReviewed}
          disabled={savingId !== ""}
          className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {savingId === `check-in-${current.id}`
            ? "Saving..."
            : "Review Complete"}
        </button>
      </div>
    </div>
  </section>
)
  }

  const session = current as SessionReviewItem

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-400">Session 1 of {reviewItems.length}</p>
          <h2 className="mt-1 text-2xl font-bold">{current.clientName}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {session.logs.length} logs · {session.videos.length} videos ·{" "}
            {formatDateTime(current.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold uppercase text-black">
            Session Review
          </span>
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
            New
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.06] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-yellow-400/80">
                  Session Context
                </p>
                <h3 className="mt-1 text-xl font-black text-white">
                  {current.clientName}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {formatDateTime(current.created_at)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Session Rating
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {session.completion?.session_rating || "-"}
                    <span className="ml-1 text-sm text-zinc-500">/10</span>
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Recovery
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {session.latestCheckIn?.recovery_rating || "-"}
                    <span className="ml-1 text-sm text-zinc-500">/10</span>
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Training
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {session.latestCheckIn?.training_rating || "-"}
                    <span className="ml-1 text-sm text-zinc-500">/10</span>
                  </p>
                </div>

                {session.attention && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-red-300/70">
                      Attention Score
                    </p>
                    <p className="mt-1 text-lg font-bold text-red-300">
                      {session.attention.score}
                    </p>
                  </div>
                )}
              </div>

              {session.completion?.notes && (
                <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Session Notes
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300">
                    {session.completion.notes}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-yellow-500/20 bg-black/40 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-yellow-400">
                  Overall Session Feedback
                </p>

                <textarea
                  value={getSessionFeedbackValue()}
                  onChange={(event) => setSessionFeedbackValue(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-yellow-500"
                  placeholder="Overall feedback for the full session..."
                />

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={saveSessionFeedback}
                    disabled={savingId !== ""}
                    className="rounded-xl border border-yellow-500/40 px-4 py-2 text-sm font-semibold text-yellow-400 disabled:opacity-50"
                  >
                    {savingId === "session-feedback" ? "Saving..." : "Save Session Feedback"}
                  </button>
                </div>
              </div>
            </div>

            {session.attention?.flags?.length > 0 && (
              <div className="w-full max-w-xs rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-300">
                  Coach Attention
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {session.attention.flags.map((flag: string) => (
                    <span
                      key={flag}
                      className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold capitalize text-red-200"
                    >
                      {formatFlag(flag)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {session.videos.map((video) => {
          const saving = savingId === `video-${video.id}`

          return (
            <div key={video.id} className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-yellow-400">
                Video
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">{video.exercise_name}</h3>

              {video.signedUrl ? (
                <video
                  src={video.signedUrl}
                  controls
                  className="mt-3 max-h-[260px] w-full rounded-xl bg-black object-contain"
                />
              ) : (
                <p className="mt-3 text-sm text-zinc-400">Video unavailable.</p>
              )}

              <textarea
                value={getFeedbackValue("video", video)}
                onChange={(event) => setFeedbackValue("video", video.id, event.target.value)}
                rows={4}
                className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-yellow-500"
                placeholder={`Feedback for ${video.exercise_name} video...`}
              />

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() =>
                    saveItemFeedback({ type: "video", item: video, markReviewed: false })
                  }
                  disabled={saving}
                  className="rounded-xl border border-yellow-500/40 px-4 py-2 text-sm font-semibold text-yellow-400 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Feedback"}
                </button>

                <button
                  onClick={() =>
                    saveItemFeedback({ type: "video", item: video, markReviewed: true })
                  }
                  disabled={saving}
                  className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Review Video"}
                </button>
              </div>
            </div>
          )
        })}        {session.logs.map((log) => {
          const saving = savingId === `log-${log.id}`

          return (
            <div key={log.id} className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-yellow-400">
                Workout Log
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">{log.exercise_name}</h3>

              {getPrescriptionForExercise(log.exercise_name) && (

  <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
    <p className="text-xs font-bold uppercase tracking-wide text-yellow-400">
      Prescribed
    </p>

    <p className="mt-1 text-sm font-semibold text-white">
      {getPrescriptionForExercise(log.exercise_name)}
    </p>
  </div>
)}


              <div className="mt-3 space-y-2">
  {log.sets_completed?.map((set, index) => {
    const previousSet =
      log.previousPerformance?.sets_completed?.[index]

    const weightDelta = getWeightDelta(set, previousSet)

    return (
      <div
        key={index}
        className="flex items-center justify-between rounded-lg bg-zinc-950 px-3 py-2 text-sm"
      >
        <span className="text-zinc-500">
          Set {index + 1}
        </span>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">
            {formatSet(set, log.exercise_name)}
          </span>

          {weightDelta && (
            <span
              className={
                weightDelta.difference > 0
                  ? "text-xs font-bold text-green-400"
                  : "text-xs font-bold text-zinc-500"
              }
            >
              {weightDelta.label}
            </span>
          )}
        </div>
      </div>
    )
  })}
</div>

              {log.notes && (
                <div className="mt-3 rounded-lg bg-zinc-950 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Client notes
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300">
                    {log.notes}
                  </p>
                </div>
              )}

              <textarea
                value={getFeedbackValue("log", log)}
                onChange={(event) => setFeedbackValue("log", log.id, event.target.value)}
                rows={4}
                className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-yellow-500"
                placeholder={`Feedback for ${log.exercise_name}...`}
              />

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => saveItemFeedback({ type: "log", item: log, markReviewed: false })}
                  disabled={saving}
                  className="rounded-xl border border-yellow-500/40 px-4 py-2 text-sm font-semibold text-yellow-400 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Feedback"}
                </button>

                <button
                  onClick={() => saveItemFeedback({ type: "log", item: log, markReviewed: true })}
                  disabled={saving}
                  className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Review Exercise"}
                </button>
              </div>
            </div>
          )
        })}


      </div>

      {message && <p className="mt-4 text-sm text-zinc-400">{message}</p>}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/coach/${current.clientId}`}
          className="rounded-xl border border-zinc-700 px-4 py-2 text-center text-sm text-zinc-300 transition hover:border-yellow-500 hover:text-white"
        >
          Open full client page
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={skipSession}
            disabled={savingId !== ""}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 disabled:opacity-50"
          >
            Skip Session →
          </button>

          <button
            onClick={markWholeSessionReviewed}
            disabled={savingId !== ""}
            className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {savingId === "whole-session" ? "Saving..." : "Mark Whole Session Reviewed"}
          </button>
        </div>
      </div>
    </section>
  )
}

function MetricCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-white">
        {value}
      </p>
    </div>
  )
}

function ReflectionCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value?: string | null
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-yellow-500/20 bg-yellow-500/[0.06]"
          : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wide ${
          highlight ? "text-yellow-400" : "text-zinc-500"
        }`}
      >
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
        {value || "Nothing added."}
      </p>
    </div>
  )
}