"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function WorkoutLogReviewButton({
  logId,
  initialReviewed,
}: {
  logId: string
  initialReviewed: boolean | null
}) {
  const [reviewed, setReviewed] = useState(Boolean(initialReviewed))
  const [saving, setSaving] = useState(false)

  async function toggleReviewed() {
    setSaving(true)

    const nextReviewed = !reviewed

    const { error } = await supabase
      .from("workout_logs")
      .update({ reviewed: nextReviewed })
      .eq("id", logId)

    if (!error) {
      setReviewed(nextReviewed)
    }

    setSaving(false)
  }

  return (
    <button
      type="button"
      onClick={toggleReviewed}
      disabled={saving}
      className={`rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50 ${
        reviewed
          ? "bg-green-500 text-black"
          : "bg-yellow-500 text-black"
      }`}
    >
      {saving ? "Saving..." : reviewed ? "Reviewed" : "New"}
    </button>
  )
}