"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

type Props = {
  videoId: string
  existingFeedback?: string | null
}

export default function FeedbackBox({ videoId, existingFeedback }: Props) {
  const [feedback, setFeedback] = useState(existingFeedback || "")
  const [message, setMessage] = useState("")

  async function saveFeedback() {
    setMessage("Saving...")

    const { error } = await supabase
      .from("exercise_videos")
      .update({ feedback })
      .eq("id", videoId)

    if (error) {
      setMessage(`Failed: ${error.message}`)
      return
    }

    setMessage("Feedback saved ✅")
  }

  return (
    <div className="mt-2">
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Add coach feedback..."
        className="w-full max-w-xs rounded-lg border p-2 text-sm"
        rows={3}
      />

      <br />

      <button
        onClick={saveFeedback}
        className="mt-2 rounded-lg border px-3 py-1 text-sm font-medium"
      >
        Save feedback
      </button>

      {message && <p className="mt-1 text-xs text-gray-500">{message}</p>}
    </div>
  )
}