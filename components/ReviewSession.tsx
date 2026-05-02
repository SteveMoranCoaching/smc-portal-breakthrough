"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type SetEntry = {
  weight: string
  reps: string
  rpe: string
}

type ReviewItem =
  | {
      type: "video"
      id: string
      user_id: string
      clientId: string
      clientName: string
      exercise_name: string
      created_at: string
      feedback: string
      signedUrl: string
    }
  | {
      type: "log"
      id: string
      user_id: string
      clientId: string
      clientName: string
      exercise_name: string
      created_at: string
      coach_feedback: string
      sets_completed: SetEntry[] | null
      notes: string | null
    }

export default function ReviewSession({ items }: { items: ReviewItem[] }) {
  const [reviewItems] = useState(items)
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [lastAction, setLastAction] = useState<{
    item: ReviewItem
    feedback: string
  } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const current = reviewItems[index]
  const remainingAfterThis = Math.max(reviewItems.length - index - 1, 0)

  useEffect(() => {
    if (!current) return

    setFeedback(
      current.type === "video"
        ? current.feedback || ""
        : current.coach_feedback || ""
    )

    setMessage("")

    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }, [current])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (saving || !current) return

      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault()
        saveFeedback(true)
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        saveFeedback(false)
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        goNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [saving, feedback, current])

  function formatDateTime(dateString: string) {
    const date = new Date(dateString)

    const day = date.getDate().toString().padStart(2, "0")
    const month = date.toLocaleString("en-GB", { month: "short" })
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return `${day} ${month}, ${hours}:${minutes}`
  }

  function formatTopSet(sets: SetEntry[] | null) {
    if (!sets || sets.length === 0) return "No sets logged"

    const firstSet = sets[0]

    return `${firstSet.weight || "?"}kg x ${firstSet.reps || "?"} @ ${
      firstSet.rpe || "?"
    }`
  }

  function goNext() {
    setIndex((prev) => prev + 1)
  }

  async function saveFeedback(markReviewed: boolean) {
    if (!current) return

    const currentItem = current

    if (markReviewed) {
      setLastAction({
        item: currentItem,
        feedback,
      })

      goNext()
    }

    setSaving(true)
    setMessage("")

    const table =
      currentItem.type === "video" ? "exercise_videos" : "workout_logs"

    const updateData =
      currentItem.type === "video"
        ? {
            feedback,
            feedback_read: false,
            ...(markReviewed ? { reviewed: true } : {}),
          }
        : {
            coach_feedback: feedback,
            feedback_read: false,
            ...(markReviewed ? { reviewed: true } : {}),
          }

    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq("id", currentItem.id)

    setSaving(false)

    if (error) {
      setMessage("Save failed — refresh later.")
      return
    }

    if (!markReviewed) {
      setMessage("Saved.")
    }
  }

  async function undoLast() {
    if (!lastAction) return

    const table =
      lastAction.item.type === "video" ? "exercise_videos" : "workout_logs"

    await supabase
      .from(table)
      .update({
        reviewed: false,
      })
      .eq("id", lastAction.item.id)

    setLastAction(null)
    setMessage("Undo complete.")
  }

  if (reviewItems.length === 0 || !current) {
    return (
      <section className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center">
        <p className="text-4xl">✅</p>
        <h2 className="mt-4 text-2xl font-bold text-green-400">
          All caught up
        </h2>
        <p className="mt-2 text-zinc-300">
          No new logs or videos waiting for review.
        </p>

        <Link
          href="/coach"
          className="mt-6 inline-flex rounded-xl bg-yellow-500 px-4 py-2 font-semibold text-black transition hover:bg-yellow-400"
        >
          Back to dashboard
        </Link>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-400">
            Item {index + 1} of {reviewItems.length} · {remainingAfterThis}{" "}
            remaining after this
          </p>

          <h2 className="mt-1 text-2xl font-bold">{current.clientName}</h2>

          <p className="mt-1 text-sm text-zinc-400">
            {current.exercise_name} · {formatDateTime(current.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
              current.type === "video"
                ? "bg-yellow-500 text-black"
                : "bg-indigo-500 text-white"
            }`}
          >
            {current.type === "video" ? "Video" : "Workout Log"}
          </span>

          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
            New
          </span>
        </div>
      </div>

      {current.type === "video" ? (
        <div className="rounded-xl border border-zinc-800 bg-black p-4">
          {current.signedUrl ? (
            <video
              src={current.signedUrl}
              controls
              className="max-h-[520px] w-full rounded-xl object-contain"
            />
          ) : (
            <p className="text-sm text-zinc-400">Video unavailable.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-black p-4">
          <p className="text-sm font-semibold text-yellow-400">
            First set: {formatTopSet(current.sets_completed)}
          </p>

          {current.sets_completed?.map((set, setIndex) => (
            <div
              key={setIndex}
              className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-950 p-3 text-sm"
            >
              <p>
                <span className="text-zinc-500">Weight:</span>{" "}
                {set.weight || "-"}kg
              </p>

              <p>
                <span className="text-zinc-500">Reps:</span>{" "}
                {set.reps || "-"}
              </p>

              <p>
                <span className="text-zinc-500">RPE:</span>{" "}
                {set.rpe || "-"}
              </p>
            </div>
          ))}

          {current.notes && (
            <div className="rounded-lg bg-zinc-950 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Client notes
              </p>
              <p className="whitespace-pre-wrap text-sm text-zinc-300">
                {current.notes}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-5">
        <label className="mb-2 block text-sm font-semibold text-zinc-300">
          Coach feedback
        </label>

        <textarea
          ref={textareaRef}
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          rows={6}
          className="w-full rounded-xl border border-zinc-800 bg-black p-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-500"
          placeholder="Write feedback for this item..."
        />

        <p className="mt-2 text-xs text-zinc-500">
          Enter = save · Shift + Enter = save & next · → = skip
        </p>

        {message && <p className="mt-2 text-sm text-zinc-400">{message}</p>}
      </div>

      {lastAction && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="text-sm text-yellow-300">Marked as reviewed</p>

          <button
            onClick={undoLast}
            className="text-sm font-semibold text-yellow-400 hover:text-yellow-300"
          >
            Undo
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/coach/${current.clientId}?exercise=${encodeURIComponent(
            current.exercise_name
          )}`}
          className="rounded-xl border border-zinc-700 px-4 py-2 text-center text-sm text-zinc-300 transition hover:border-yellow-500 hover:text-white"
        >
          Open full client page
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={goNext}
            disabled={saving}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-50"
          >
            Skip →
          </button>

          <button
            onClick={() => saveFeedback(false)}
            disabled={saving}
            className="rounded-xl border border-yellow-500/40 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500/10 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Feedback"}
          </button>

          <button
            onClick={() => saveFeedback(true)}
            disabled={saving}
            className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Mark Reviewed & Next →"}
          </button>
        </div>
      </div>
    </section>
  )
}