"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type SetEntry = {
  weight: string
  reps: string
  rpe: string
}

type ExerciseEntry = {
  sets: SetEntry[]
  notes: string
  video: File | null
}

export default function WorkoutSessionForm({
  session,
  programmeId,
  userId,
}: any) {
  const router = useRouter()

  const exercises = Array.isArray(session?.exercises) ? session.exercises : []

  const [formData, setFormData] = useState<ExerciseEntry[]>(
    exercises.map(() => ({
      sets: [{ weight: "", reps: "", rpe: "" }],
      notes: "",
      video: null,
    }))
  )

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  function updateSetField(
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetEntry,
    value: string
  ) {
    const updated = [...formData]
    updated[exerciseIndex].sets[setIndex][field] = value
    setFormData(updated)
  }

  function addSet(exerciseIndex: number) {
    const updated = [...formData]
    updated[exerciseIndex].sets.push({ weight: "", reps: "", rpe: "" })
    setFormData(updated)
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    const updated = [...formData]
    if (updated[exerciseIndex].sets.length === 1) return
    updated[exerciseIndex].sets.splice(setIndex, 1)
    setFormData(updated)
  }

  function updateNotes(exerciseIndex: number, value: string) {
    const updated = [...formData]
    updated[exerciseIndex].notes = value
    setFormData(updated)
  }

  function updateVideo(exerciseIndex: number, file: File | null) {
    const updated = [...formData]
    updated[exerciseIndex].video = file
    setFormData(updated)
  }

  async function handleSave() {
    setSaving(true)
    setMessage("Saving workout...")

    try {
      for (let i = 0; i < formData.length; i++) {
        const ex = exercises[i]
        const data = formData[i]

        const completedSets = data.sets.filter(
          (set) => set.weight || set.reps || set.rpe
        )

        if (completedSets.length > 0 || data.notes) {
          const { error: logError } = await supabase
            .from("workout_logs")
            .insert({
              user_id: userId,
              programme_id: programmeId,
              session_id: session.id,
              exercise_name: ex.name,
              sets_completed: completedSets,
              notes: data.notes,
            })

          if (logError) throw logError
        }

        if (data.video) {
          const filePath = `${userId}/${Date.now()}-${data.video.name}`

          const { error: uploadError } = await supabase.storage
            .from("exercise-videos")
            .upload(filePath, data.video)

          if (uploadError) throw uploadError

          const { error: videoError } = await supabase
            .from("exercise_videos")
            .insert({
              user_id: userId,
              programme_id: programmeId,
              session_id: session.id,
              exercise_name: ex.name,
              exercise_index: i,
              video_path: filePath,
            })

          if (videoError) throw videoError
        }
      }

      setMessage("Workout saved successfully ✅")

      setTimeout(() => {
        router.push("/dashboard")
      }, 900)
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
      setSaving(false)
    }
  }

  if (exercises.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-white">
        No exercises found for this session.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {exercises.map((ex: any, exerciseIndex: number) => (
        <div
          key={exerciseIndex}
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
        >
          <h3 className="text-lg font-semibold text-white">{ex.name}</h3>

          <p className="text-sm text-yellow-400">
            {ex.prescription || "No prescription"}
          </p>

          {ex.notes && (
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {ex.notes}
            </p>
          )}

          <div className="mt-4 space-y-3">
            {formData[exerciseIndex].sets.map((set, setIndex) => (
              <div
                key={setIndex}
                className="rounded-xl border border-zinc-800 bg-black p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Set {setIndex + 1}
                  </p>

                  {formData[exerciseIndex].sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSet(exerciseIndex, setIndex)}
                      className="text-xs text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    placeholder="Kg"
                    value={set.weight}
                    onChange={(e) =>
                      updateSetField(
                        exerciseIndex,
                        setIndex,
                        "weight",
                        e.target.value
                      )
                    }
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-white"
                  />

                  <input
                    placeholder="Reps"
                    value={set.reps}
                    onChange={(e) =>
                      updateSetField(
                        exerciseIndex,
                        setIndex,
                        "reps",
                        e.target.value
                      )
                    }
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-white"
                  />

                  <input
                    placeholder="RPE"
                    value={set.rpe}
                    onChange={(e) =>
                      updateSetField(
                        exerciseIndex,
                        setIndex,
                        "rpe",
                        e.target.value
                      )
                    }
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-white"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addSet(exerciseIndex)}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-semibold text-white"
            >
              + Add set
            </button>
          </div>

          <textarea
            placeholder="Exercise notes..."
            value={formData[exerciseIndex].notes}
            onChange={(e) => updateNotes(exerciseIndex, e.target.value)}
            className="mt-4 w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-white placeholder:text-zinc-600"
            rows={3}
          />

          <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Upload video
            </p>

            <input
              type="file"
              accept="video/*"
              onChange={(e) =>
                updateVideo(exerciseIndex, e.target.files?.[0] || null)
              }
              className="w-full text-sm text-zinc-300"
            />
          </div>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-yellow-500 py-4 text-base font-bold text-black disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Workout"}
      </button>

      {message && (
        <p className="text-center text-sm text-zinc-400">{message}</p>
      )}
    </div>
  )
}