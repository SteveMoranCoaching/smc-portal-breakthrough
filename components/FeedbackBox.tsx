"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

type Props = {
  videoId: string
  initialFeedback?: string | null
  initialReviewed?: boolean | null
  existingFeedback?: string | null
}

export default function FeedbackBox({
  videoId,
  initialFeedback,
  initialReviewed,
  existingFeedback,
}: Props) {
  const [feedback, setFeedback] = useState(
    initialFeedback ?? existingFeedback ?? ""
  )
  const [message, setMessage] = useState("")
  const [reviewed, setReviewed] = useState(Boolean(initialReviewed))

  async function saveFeedback() {
    setMessage("Saving...")

    const { error } = await supabase
      .from("exercise_videos")
      .update({
        feedback,
        reviewed: true,
      })
      .eq("id", videoId)

    if (error) {
      setMessage(`Failed: ${error.message}`)
      return
    }

    setReviewed(true)
    setMessage("Feedback saved ✅")
  }

  return (
    <div className="mt-2">
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Add coach feedback..."
        className="w-full rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white placeholder:text-zinc-500"
        rows={3}
      />

      <button
        onClick={saveFeedback}
        className="mt-2 rounded-lg border border-zinc-700 px-3 py-1 text-sm font-medium text-white"
      >
        Save feedback
      </button>

      {reviewed && (
        <p className="mt-1 text-xs text-green-400">Marked as reviewed</p>
      )}

      {message && <p className="mt-1 text-xs text-zinc-500">{message}</p>}
    </div>
  )
}