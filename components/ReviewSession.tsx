"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type SetEntry = {
  weight: string
  reps: string
  rpe: string
}

type LogItem = {
  type: "log"
  id: string
  exercise_name: string
  coach_feedback: string
  sets_completed: SetEntry[] | null
  notes: string | null
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


type CheckInReviewItem = {
  type: "check-in"
  id: string
  user_id: string
  clientId: string
  clientName: string
  created_at: string
  bodyweight?: number | null
  training_rating?: number | null
  recovery_rating?: number | null
  nutrition_rating?: number | null
  cardio_steps?: string | null
  notes?: string | null
  coach_feedback?: string | null
  feedback_seen?: boolean | null
  attention?: any
}

type ReviewItem = SessionReviewItem | CheckInReviewItem

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

  function formatSet(set: SetEntry) {
    return `${set.weight || "?"}kg × ${set.reps || "?"} @ ${set.rpe || "?"}`
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
      .eq("id", current.id)

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

    const logUpdates = session.logs.map((log) =>
      supabase
        .from("workout_logs")
        .update({
          coach_feedback: getFeedbackValue("log", log),
          feedback_read: false,
          reviewed: true,
        })
        .eq("id", log.id)
    )

    const videoUpdates = session.videos.map((video) =>
      supabase
        .from("exercise_videos")
        .update({
          feedback: getFeedbackValue("video", video),
          reviewed: true,
        })
        .eq("id", video.id)
    )

    const sessionFeedbackUpdate = supabase
      .from("session_completions")
      .update({
        coach_feedback: getSessionFeedbackValue(),
        feedback_read: false,
      })
      .eq("id", current.id)

    const results = await Promise.all([
      sessionFeedbackUpdate,
      ...logUpdates,
      ...videoUpdates,
    ])
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

    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-sm text-zinc-400">Check-In Review</p>

        <h2 className="mt-1 text-2xl font-bold">{current.clientName}</h2>

        <p className="mt-1 text-sm text-zinc-400">
          Check-in · {formatDateTime(current.created_at)}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-black p-3">
            <p className="text-xs uppercase text-zinc-500">Bodyweight</p>
            <p className="mt-1 text-xl font-bold text-white">
              {current.bodyweight ?? "-"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black p-3">
            <p className="text-xs uppercase text-zinc-500">Recovery</p>
            <p className="mt-1 text-xl font-bold text-white">
              {current.recovery_rating ?? "-"} / 10
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black p-3">
            <p className="text-xs uppercase text-zinc-500">Training</p>
            <p className="mt-1 text-xl font-bold text-white">
              {current.training_rating ?? "-"} / 10
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black p-3">
            <p className="text-xs uppercase text-zinc-500">Nutrition</p>
            <p className="mt-1 text-xl font-bold text-white">
              {current.nutrition_rating ?? "-"} / 10
            </p>
          </div>
        </div>

        {current.cardio_steps && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              Steps / Cardio
            </p>

            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">
              {current.cardio_steps}
            </p>
          </div>
        )}

        {current.notes && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-yellow-400">
              Check-in Notes
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
              {current.notes}
            </p>
          </div>
        )}

        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-yellow-400">
            Coach Feedback
          </p>

          <textarea
            value={checkInFeedback}
            onChange={(event) => setCheckInFeedback(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-yellow-500"
            placeholder="Feedback for this check-in..."
          />
        </div>

        {message && <p className="mt-4 text-sm text-zinc-400">{message}</p>}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/coach/${current.clientId}?tab=check-ins`}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-center text-sm text-zinc-300 transition hover:border-yellow-500 hover:text-white"
          >
            Open client check-ins
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
                {log.sets_completed?.map((set, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-zinc-950 px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-500">Set {index + 1}</span>
                    <span className="font-semibold text-white">{formatSet(set)}</span>
                  </div>
                ))}
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