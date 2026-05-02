"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function WorkoutSessionForm({
  session,
  programmeId,
  userId,
}: any) {
  const [formData, setFormData] = useState(
    session.exercises.map(() => ({
      weight: "",
      reps: "",
      rpe: "",
      notes: "",
      video: null as File | null,
    }))
  )

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  function updateField(index: number, field: string, value: any) {
    const updated = [...formData]
    updated[index][field] = value
    setFormData(updated)
  }

  async function handleSave() {
    setSaving(true)
    setMessage("Saving workout...")

    try {
      for (let i = 0; i < formData.length; i++) {
        const ex = session.exercises[i]
        const data = formData[i]

        // 1. Save log
        const { error: logError } = await supabase
          .from("workout_logs")
          .insert({
            user_id: userId,
            programme_id: programmeId,
            session_id: session.id,
            exercise_name: ex.name,
            sets_completed: [
              {
                weight: data.weight,
                reps: data.reps,
                rpe: data.rpe,
              },
            ],
            notes: data.notes,
          })

        if (logError) throw logError

        // 2. Upload video (if exists)
        if (data.video) {
          const filePath = `${userId}/${Date.now()}-${data.video.name}`

          const { error: uploadError } = await supabase.storage
            .from("exercise-videos")
            .upload(filePath, data.video)

          if (uploadError) throw uploadError

          await supabase.from("exercise_videos").insert({
            user_id: userId,
            programme_id: programmeId,
            session_id: session.id,
            exercise_name: ex.name,
            video_path: filePath,
          })
        }
      }

      setMessage("Workout saved successfully ✅")
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    }

    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {session.exercises.map((ex: any, i: number) => (
        <div
          key={i}
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
        >
          <h3 className="text-lg font-semibold text-white">{ex.name}</h3>
          <p className="text-sm text-yellow-400">
            {ex.prescription || "No prescription"}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <input
              placeholder="Weight"
              value={formData[i].weight}
              onChange={(e) =>
                updateField(i, "weight", e.target.value)
              }
              className="rounded bg-black p-2 text-sm"
            />
            <input
              placeholder="Reps"
              value={formData[i].reps}
              onChange={(e) =>
                updateField(i, "reps", e.target.value)
              }
              className="rounded bg-black p-2 text-sm"
            />
            <input
              placeholder="RPE"
              value={formData[i].rpe}
              onChange={(e) =>
                updateField(i, "rpe", e.target.value)
              }
              className="rounded bg-black p-2 text-sm"
            />
          </div>

          <textarea
            placeholder="Notes"
            value={formData[i].notes}
            onChange={(e) =>
              updateField(i, "notes", e.target.value)
            }
            className="mt-3 w-full rounded bg-black p-2 text-sm"
          />

          <input
            type="file"
            accept="video/*"
            onChange={(e) =>
              updateField(i, "video", e.target.files?.[0] || null)
            }
            className="mt-3 text-sm"
          />
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-yellow-500 py-3 font-bold text-black"
      >
        {saving ? "Saving..." : "Save Workout"}
      </button>

      {message && (
        <p className="text-center text-sm text-zinc-400">{message}</p>
      )}
    </div>
  )
}