"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type SetEntry = {
  weight: string
  reps: string
  rpe: string
}

export default function WorkoutLogBox({
  programmeId,
  sessionId,
  exerciseName,
}: {
  programmeId: string
  sessionId: string
  exerciseName: string
}) {
  const router = useRouter()

  const [sets, setSets] = useState<SetEntry[]>([
    { weight: "", reps: "", rpe: "" },
  ])
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  function updateSet(index: number, field: keyof SetEntry, value: string) {
    const next = [...sets]
    next[index][field] = value
    setSets(next)
  }

  function addSet() {
    setSets([...sets, { weight: "", reps: "", rpe: "" }])
  }

  async function saveLog() {
    setSaving(true)
    setMessage("Saving...")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      setMessage("You must be logged in to save this.")
      return
    }

    const { error } = await supabase.from("workout_logs").insert({
      user_id: user.id,
      programme_id: programmeId,
      session_id: sessionId,
      exercise_name: exerciseName,
      sets_completed: sets,
      notes,
      reviewed: false,
      coach_feedback: null,
    })

    setSaving(false)

    if (error) {
      console.log(error)
      setMessage(error.message)
      return
    }

    setSets([{ weight: "", reps: "", rpe: "" }])
    setNotes("")
    setMessage("Log saved.")

    router.refresh()
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-800 bg-black p-3">
      <p className="mb-2 text-sm font-semibold text-zinc-300">
        Log what you completed
      </p>

      <div className="space-y-2">
        {sets.map((set, index) => (
          <div key={index} className="grid grid-cols-3 gap-2">
            <input
              value={set.weight}
              onChange={(e) => updateSet(index, "weight", e.target.value)}
              placeholder="kg"
              className="rounded-md border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
            />

            <input
              value={set.reps}
              onChange={(e) => updateSet(index, "reps", e.target.value)}
              placeholder="reps"
              className="rounded-md border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
            />

            <input
              value={set.rpe}
              onChange={(e) => updateSet(index, "rpe", e.target.value)}
              placeholder="RPE"
              className="rounded-md border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSet}
        className="mt-2 text-sm font-semibold text-yellow-400"
      >
        + Add set
      </button>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes e.g. felt strong, back-off moved well..."
        className="mt-3 min-h-20 w-full rounded-md border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
      />

      <button
        type="button"
        onClick={saveLog}
        disabled={saving}
        className="mt-3 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save log"}
      </button>

      {message && <p className="mt-2 text-xs text-zinc-400">{message}</p>}
    </div>
  )
}