"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function WorkoutLogFeedbackBox({
  logId,
  initialFeedback,
  initialReviewed,
}: {
  logId: string
  initialFeedback: string | null
  initialReviewed: boolean | null
}) {
  const router = useRouter()

  const [feedback, setFeedback] = useState(initialFeedback || "")
  const [reviewed, setReviewed] = useState(Boolean(initialReviewed))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  async function saveFeedback() {
    setSaving(true)
    setSaved(false)
    setErrorMessage("")

    const shouldMarkReviewed = feedback.trim().length > 0

    const { error } = await supabase
      .from("workout_logs")
      .update({
        coach_feedback: feedback,
        reviewed: shouldMarkReviewed ? true : reviewed,
      })
      .eq("id", logId)

    setSaving(false)

    if (error) {
      console.error("Workout log feedback save error:", error)
      setErrorMessage(error.message || "Feedback failed to save.")
      return
    }

    if (shouldMarkReviewed) {
      setReviewed(true)
    }

    setSaved(true)
    router.refresh()
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-800 bg-black p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-zinc-500">
          Coach feedback
        </p>

        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
            reviewed
              ? "bg-green-500 text-black"
              : "bg-yellow-500 text-black"
          }`}
        >
          {reviewed ? "Reviewed" : "New"}
        </span>
      </div>

      <textarea
        value={feedback}
        onChange={(e) => {
          setFeedback(e.target.value)
          setSaved(false)
          setErrorMessage("")
        }}
        placeholder="Add feedback for this workout log..."
        className="min-h-[90px] w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-600"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveFeedback}
          disabled={saving}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save feedback"}
        </button>

        {saved && <p className="text-sm text-green-400">Saved</p>}

        {errorMessage && (
          <p className="text-sm text-red-400">{errorMessage}</p>
        )}
      </div>
    </div>
  )
}