"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

const reviewedStyle = {
  backgroundColor: "#22c55e",
  color: "#000000",
  border: "1px solid #86efac",
}

const notReviewedStyle = {
  backgroundColor: "#27272a",
  color: "#d4d4d8",
  border: "1px solid #3f3f46",
}

export default function FeedbackBox({
  videoId,
  initialFeedback,
  initialReviewed,
}: {
  videoId: string
  initialFeedback: string | null
  initialReviewed: boolean | null
}) {
  const [feedback, setFeedback] = useState(initialFeedback || "")
  const [reviewed, setReviewed] = useState(Boolean(initialReviewed))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveFeedback() {
    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from("exercise_videos")
      .update({ feedback })
      .eq("id", videoId)

    setSaving(false)

    if (!error) {
      setSaved(true)
    }
  }

  async function toggleReviewed() {
    const previousReviewed = reviewed
    const nextReviewed = !reviewed

    setReviewed(nextReviewed)

    const { error } = await supabase
      .from("exercise_videos")
      .update({ reviewed: nextReviewed })
      .eq("id", videoId)

    if (error) {
      setReviewed(previousReviewed)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-zinc-800 bg-black p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-sm text-zinc-400">
          Feedback
        </label>

        <button
          onClick={toggleReviewed}
          style={reviewed ? reviewedStyle : notReviewedStyle}
          className="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
        >
          {reviewed ? "Reviewed" : "Mark reviewed"}
        </button>
      </div>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Write feedback..."
        className="min-h-24 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-white"
      />

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={saveFeedback}
          disabled={saving}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Feedback"}
        </button>

        {saved && (
          <span className="text-sm text-zinc-400">
            Saved
          </span>
        )}
      </div>
    </div>
  )
}