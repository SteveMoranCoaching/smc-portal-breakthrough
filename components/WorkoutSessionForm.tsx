"use client"

import { useRef, useState } from "react"
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

const premiumCard =
  "relative overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] shadow-2xl"

const innerPanel =
  "rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.24)]"

const inputStyle =
  "min-h-[50px] rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(0,0,0,0.28)] p-3 text-center text-base font-semibold text-white outline-none placeholder:text-white/25 focus:border-smc-gold/70 focus:shadow-[0_0_18px_rgba(212,175,55,0.14)]"

function getPrescribedSetCount(exercise: any) {
  const prescription = exercise?.prescription || ""
  const match = prescription.match(/^(\d+)\s*x/i)
  if (match) return Number(match[1])

  const setsMatch = prescription.match(/(\d+)\s*sets?/i)
  if (setsMatch) return Number(setsMatch[1])

  return 1
}

function getPreviousLogForExercise(previousLogs: any[], exerciseName: string) {
  return previousLogs.find((log) => log.exercise_name === exerciseName)
}

export default function WorkoutSessionForm({
  session,
  programmeId,
  userId,
  previousLogs = [],
}: any) {
  const router = useRouter()
  const inputRefs = useRef<any[]>([])
  const exercises = Array.isArray(session?.exercises) ? session.exercises : []

  const [formData, setFormData] = useState<ExerciseEntry[]>(
    exercises.map((exercise: any) => {
      const setCount = getPrescribedSetCount(exercise)

      return {
        sets: Array.from({ length: setCount }, () => ({
          weight: "",
          reps: "",
          rpe: "",
        })),
        notes: "",
        video: null,
      }
    })
  )

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [complete, setComplete] = useState(false)

  function setInputRef(
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetEntry,
    el: HTMLInputElement | null
  ) {
    if (!inputRefs.current[exerciseIndex]) inputRefs.current[exerciseIndex] = []
    if (!inputRefs.current[exerciseIndex][setIndex]) {
      inputRefs.current[exerciseIndex][setIndex] = {}
    }

    inputRefs.current[exerciseIndex][setIndex][field] = el
  }

  function focusInput(
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetEntry
  ) {
    setTimeout(() => {
      inputRefs.current?.[exerciseIndex]?.[setIndex]?.[field]?.focus()
    }, 60)
  }

  function updateSetField(
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetEntry,
    value: string
  ) {
    setFormData((current) =>
      current.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise

        return {
          ...exercise,
          sets: exercise.sets.map((set, j) => {
            if (j !== setIndex) return set

            return {
              ...set,
              [field]: value,
            }
          }),
        }
      })
    )
  }

  function addSet(exerciseIndex: number) {
    const nextSetIndex = formData[exerciseIndex]?.sets.length || 0

    setFormData((current) =>
      current.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise

        return {
          ...exercise,
          sets: [...exercise.sets, { weight: "", reps: "", rpe: "" }],
        }
      })
    )

    focusInput(exerciseIndex, nextSetIndex, "weight")
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setFormData((current) =>
      current.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise
        if (exercise.sets.length === 1) return exercise

        return {
          ...exercise,
          sets: exercise.sets.filter((_, j) => j !== setIndex),
        }
      })
    )
  }

  function updateNotes(exerciseIndex: number, value: string) {
    setFormData((current) =>
      current.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise

        return {
          ...exercise,
          notes: value,
        }
      })
    )
  }

  function updateVideo(exerciseIndex: number, file: File | null) {
    setFormData((current) =>
      current.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise

        return {
          ...exercise,
          video: file,
        }
      })
    )
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

        if (completedSets.length > 0 || data.notes.trim()) {
          const { error: logError } = await supabase.from("workout_logs").insert({
            user_id: userId,
            programme_id: programmeId,
            session_id: session.id,
            exercise_name: ex.name,
            sets_completed: completedSets,
            notes: data.notes,
            reviewed: false,
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
              reviewed: false,
            })

          if (videoError) throw videoError
        }
      }

      setComplete(true)
      setMessage("Workout saved successfully ✅")

      setTimeout(() => {
        router.push("/dashboard")
      }, 1200)
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
      setSaving(false)
    }
  }

  if (exercises.length === 0) {
    return (
      <div className={`${premiumCard} p-5 text-white`}>
        No exercises found for this session.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-5 pb-56">
        {exercises.map((ex: any, exerciseIndex: number) => {
          const previousLog = getPreviousLogForExercise(previousLogs, ex.name)

          return (
            <div key={`${ex.name}-${exerciseIndex}`} className={`${premiumCard} p-5`}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent" />

              <div className={`${innerPanel} p-4`}>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-smc-gold/75">
                  Exercise {exerciseIndex + 1}
                </p>

                <h3 className="mt-2 text-xl font-extrabold tracking-tight text-white">
                  {ex.name}
                </h3>

                <p className="mt-1 text-sm font-semibold text-smc-gold">
                  {ex.prescription || "No prescription"}
                </p>

                {ex.notes && (
                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {ex.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {formData[exerciseIndex]?.sets.map((set, setIndex) => {
                  const setHasData = set.weight || set.reps || set.rpe
                  const previousSet = previousLog?.sets_completed?.[setIndex]

                  return (
                    <div
                      key={setIndex}
                      className={`rounded-2xl border p-3 transition ${
                        setHasData
                          ? "border-smc-gold/35 bg-smc-gold/[0.07] shadow-[0_0_20px_rgba(212,175,55,0.08)]"
                          : "border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.22)]"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/35">
                            Set {setIndex + 1}
                          </p>

                          {previousSet && (
                            <p className="mt-1 text-[11px] font-medium leading-4 text-white/35">
                              Previous:{" "}
                              <span className="font-bold text-white">
                                {previousSet.weight || "-"}kg
                              </span>
                              <span> - {previousSet.reps || "-"} reps - </span>
                              <span className="font-bold text-smc-gold">
                                RPE{previousSet.rpe || "-"}
                              </span>
                            </p>
                          )}
                        </div>

                        {formData[exerciseIndex].sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSet(exerciseIndex, setIndex)}
                            className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/15 active:scale-[0.98]"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          ref={(el) =>
                            setInputRef(exerciseIndex, setIndex, "weight", el)
                          }
                          type="number"
                          inputMode="decimal"
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              focusInput(exerciseIndex, setIndex, "reps")
                            }
                          }}
                          className={inputStyle}
                        />

                        <input
                          ref={(el) =>
                            setInputRef(exerciseIndex, setIndex, "reps", el)
                          }
                          type="number"
                          inputMode="numeric"
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              focusInput(exerciseIndex, setIndex, "rpe")
                            }
                          }}
                          className={inputStyle}
                        />

                        <input
                          ref={(el) =>
                            setInputRef(exerciseIndex, setIndex, "rpe", el)
                          }
                          type="number"
                          inputMode="decimal"
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              focusInput(exerciseIndex, setIndex + 1, "weight")
                            }
                          }}
                          className={inputStyle}
                        />
                      </div>
                    </div>
                  )
                })}

                <button
                  type="button"
                  onClick={() => addSet(exerciseIndex)}
                  className="w-full rounded-2xl border border-smc-gold/30 bg-smc-gold/[0.08] px-4 py-3 text-sm font-extrabold text-smc-gold shadow-[0_0_18px_rgba(212,175,55,0.08)] transition hover:bg-smc-gold/[0.12] active:scale-[0.98]"
                >
                  + Add Extra Set
                </button>
              </div>

              <textarea
                placeholder="Exercise notes..."
                value={formData[exerciseIndex]?.notes || ""}
                onChange={(e) => updateNotes(exerciseIndex, e.target.value)}
                className="mt-4 w-full rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(0,0,0,0.24)] p-4 text-base text-white outline-none placeholder:text-white/25 focus:border-smc-gold/70 focus:shadow-[0_0_18px_rgba(212,175,55,0.12)]"
                rows={3}
              />

              <div className={`mt-4 ${innerPanel} p-4`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-white/35">
                  Upload video
                </p>

                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) =>
                    updateVideo(exerciseIndex, e.target.files?.[0] || null)
                  }
                  className="w-full text-sm text-white/65 file:mr-3 file:rounded-xl file:border-0 file:bg-[rgba(255,255,255,0.08)] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-24 left-0 right-0 z-40 border-t border-[rgba(255,255,255,0.06)] bg-[#050505]/95 p-4 backdrop-blur-xl sm:bottom-0">
        <div className="mx-auto w-full max-w-5xl px-0 sm:px-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-smc-gold py-3 text-sm font-extrabold text-black shadow-[0_0_22px_rgba(212,175,55,0.20)] transition hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Workout"}
          </button>

          {message && !complete && (
            <p className="mt-2 text-center text-xs font-medium text-white/45">
              {message}
            </p>
          )}
        </div>
      </div>

      {complete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6 backdrop-blur-xl">
          <div className="w-full max-w-sm rounded-3xl border border-smc-gold/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-smc-gold text-3xl shadow-[0_0_30px_rgba(212,175,55,0.28)]">
              ✅
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Session Complete
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/50">
              Workout saved successfully. Returning you to your programme.
            </p>
          </div>
        </div>
      )}
    </>
  )
}