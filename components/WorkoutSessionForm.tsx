"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import AchievementUnlockToast from "@/components/AchievementUnlockToast"
import {
  checkWorkoutAchievements,
  checkPBAchievements,
} from "@/lib/achievements"

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

type PBType = "heaviest" | "rep" | "estimated_1rm"

type PBResult = {
  exerciseName: string
  type: PBType
  weight: number
  reps: number
  estimated1RM: number
  previousBest?: number
  label: string
  summary: string
}

type ParsedSet = {
  weight: number
  reps: number
  estimated1RM: number
}

type AchievementUnlock = {
  title: string
  description?: string
  category?: string
}

const card =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014))] shadow-[0_12px_30px_rgba(0,0,0,0.55)]"

const inputStyle =
  "h-[40px] rounded-xl border border-white/[0.07] bg-black/30 px-2 text-center text-sm font-bold text-white outline-none placeholder:text-white/20 focus:border-smc-gold/70 focus:shadow-[0_0_14px_rgba(212,175,55,0.12)]"

function normaliseAchievementUnlock(result: any): AchievementUnlock | null {
  const achievement = Array.isArray(result) ? result[0] : result
  if (!achievement) return null

  if (achievement.title) {
    return {
      title: achievement.title,
      description: achievement.description || undefined,
      category: achievement.category || undefined,
    }
  }

  if (achievement.achievement_definition?.title) {
    return {
      title: achievement.achievement_definition.title,
      description: achievement.achievement_definition.description || undefined,
      category: achievement.achievement_definition.category || undefined,
    }
  }

  return null
}

function getPrescribedSetCount(exercise: any) {
  const prescription = exercise?.prescription || ""
  const match = prescription.match(/^(\d+)\s*x/i)
  if (match) return Number(match[1])

  const setsMatch = prescription.match(/(\d+)\s*sets?/i)
  if (setsMatch) return Number(setsMatch[1])

  return 1
}

function getPreviousLogForExercise(previousLogs: any[], exerciseName: string) {
  return previousLogs.find(
    (log) =>
      String(log.exercise_name || "").toLowerCase().trim() ===
      String(exerciseName || "").toLowerCase().trim()
  )
}

function getDemoForExercise(exerciseDemos: any[], exerciseName: string) {
  return exerciseDemos.find(
    (demo) =>
      String(demo.exercise_name || "").toLowerCase().trim() ===
      String(exerciseName || "").toLowerCase().trim()
  )
}

function toNumber(value: string | number | null | undefined) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function estimateOneRM(weight: number, reps: number) {
  if (!weight || !reps) return 0
  return Math.round(weight * (1 + reps / 30))
}

function groupPBResults(results: PBResult[]) {
  const priority: Record<PBType, number> = {
    heaviest: 1,
    estimated_1rm: 2,
    rep: 3,
  }

  return results.sort((a, b) => priority[a.type] - priority[b.type]).slice(0, 3)
}

function detectPBs({
  exerciseName,
  currentSets,
  previousLogs,
}: {
  exerciseName: string
  currentSets: SetEntry[]
  previousLogs: any[]
}): PBResult[] {
  const previousSets: ParsedSet[] = previousLogs.flatMap((log) => {
    if (!Array.isArray(log.sets_completed)) return []

    return log.sets_completed
      .map((set: SetEntry) => {
        const weight = toNumber(set.weight)
        const reps = toNumber(set.reps)

        return {
          weight,
          reps,
          estimated1RM: estimateOneRM(weight, reps),
        }
      })
      .filter((set: ParsedSet) => set.weight > 0 && set.reps > 0)
  })

  const currentParsedSets: ParsedSet[] = currentSets
    .map((set) => {
      const weight = toNumber(set.weight)
      const reps = toNumber(set.reps)

      return {
        weight,
        reps,
        estimated1RM: estimateOneRM(weight, reps),
      }
    })
    .filter((set: ParsedSet) => set.weight > 0 && set.reps > 0)

  if (currentParsedSets.length === 0) return []

  const previousHeaviest = Math.max(0, ...previousSets.map((set) => set.weight))
  const previousBestEstimated = Math.max(
    0,
    ...previousSets.map((set) => set.estimated1RM)
  )

  const previousRepMap = new Map<number, number>()

  previousSets.forEach((set) => {
    const currentBestWeightForReps = previousRepMap.get(set.reps) || 0
    if (set.weight > currentBestWeightForReps) {
      previousRepMap.set(set.reps, set.weight)
    }
  })

  const bestCurrentHeaviest = currentParsedSets.reduce((best, set) =>
    set.weight > best.weight ? set : best
  )

  const bestCurrentEstimated = currentParsedSets.reduce((best, set) =>
    set.estimated1RM > best.estimated1RM ? set : best
  )

  const pbResults: PBResult[] = []

  if (bestCurrentHeaviest.weight > previousHeaviest) {
    pbResults.push({
      exerciseName,
      type: "heaviest",
      weight: bestCurrentHeaviest.weight,
      reps: bestCurrentHeaviest.reps,
      estimated1RM: bestCurrentHeaviest.estimated1RM,
      previousBest: previousHeaviest,
      label: "New Heaviest",
      summary: `${bestCurrentHeaviest.weight}kg × ${bestCurrentHeaviest.reps}`,
    })
  }

  const repPBs = currentParsedSets
    .filter((set) => {
      const previousBestWeightForReps = previousRepMap.get(set.reps) || 0
      return set.weight > previousBestWeightForReps
    })
    .sort((a, b) => b.weight - a.weight || b.reps - a.reps)

  const bestRepPB = repPBs[0]

  if (bestRepPB) {
    pbResults.push({
      exerciseName,
      type: "rep",
      weight: bestRepPB.weight,
      reps: bestRepPB.reps,
      estimated1RM: bestRepPB.estimated1RM,
      previousBest: previousRepMap.get(bestRepPB.reps) || 0,
      label: `${bestRepPB.reps} Rep PB`,
      summary: `${bestRepPB.weight}kg × ${bestRepPB.reps}`,
    })
  }

  if (bestCurrentEstimated.estimated1RM > previousBestEstimated) {
    pbResults.push({
      exerciseName,
      type: "estimated_1rm",
      weight: bestCurrentEstimated.weight,
      reps: bestCurrentEstimated.reps,
      estimated1RM: bestCurrentEstimated.estimated1RM,
      previousBest: previousBestEstimated,
      label: "New Estimated Max",
      summary: `${bestCurrentEstimated.estimated1RM}kg estimated 1RM`,
    })
  }

  return groupPBResults(
    pbResults.filter((pb, index, array) => {
      return (
        array.findIndex(
          (item) =>
            item.exerciseName === pb.exerciseName &&
            item.type === pb.type &&
            item.weight === pb.weight &&
            item.reps === pb.reps
        ) === index
      )
    })
  )
}

export default function WorkoutSessionForm({
  session,
  programmeId,
  userId,
  previousLogs = [],
  exerciseDemos = [],
}: any) {
  const router = useRouter()
  const inputRefs = useRef<any[]>([])
  const exercises = Array.isArray(session?.exercises) ? session.exercises : []

  const [activeDemo, setActiveDemo] = useState<any | null>(null)
  const [prefillMode, setPrefillMode] = useState<"unset" | "previous" | "blank">(
    "unset"
  )
  const [confirmedSets, setConfirmedSets] = useState<Record<string, boolean>>({})

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
  const [pbResults, setPbResults] = useState<PBResult[]>([])
  const [showPBModal, setShowPBModal] = useState(false)
  const [achievementUnlock, setAchievementUnlock] =
    useState<AchievementUnlock | null>(null)

  function getSetKey(exerciseIndex: number, setIndex: number) {
    return `${exerciseIndex}-${setIndex}`
  }

  function fillFromPreviousSession() {
    setPrefillMode("previous")
    setConfirmedSets({})

    setFormData((current) =>
      current.map((exerciseEntry, exerciseIndex) => {
        const exercise = exercises[exerciseIndex]
        const previousLog = getPreviousLogForExercise(previousLogs, exercise?.name)

        if (!previousLog?.sets_completed) return exerciseEntry

        return {
          ...exerciseEntry,
          sets: exerciseEntry.sets.map((set, setIndex) => {
            const previousSet = previousLog.sets_completed?.[setIndex]
            if (!previousSet) return set

            return {
              weight: previousSet.weight?.toString() || "",
              reps: previousSet.reps?.toString() || "",
              rpe: previousSet.rpe?.toString() || "",
            }
          }),
        }
      })
    )
  }

  function startBlankSession() {
    setPrefillMode("blank")
    setConfirmedSets({})
  }

  function confirmSet(exerciseIndex: number, setIndex: number) {
    setConfirmedSets((current) => ({
      ...current,
      [getSetKey(exerciseIndex, setIndex)]: true,
    }))
  }

  function markSetActive(exerciseIndex: number, setIndex: number) {
    setConfirmedSets((current) => ({
      ...current,
      [getSetKey(exerciseIndex, setIndex)]: true,
    }))
  }

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
    markSetActive(exerciseIndex, setIndex)

    setFormData((current) =>
      current.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise

        return {
          ...exercise,
          sets: exercise.sets.map((set, j) => {
            if (j !== setIndex) return set
            return { ...set, [field]: value }
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
      current.map((exercise, i) =>
        i === exerciseIndex ? { ...exercise, notes: value } : exercise
      )
    )
  }

  function updateVideo(exerciseIndex: number, file: File | null) {
    setFormData((current) =>
      current.map((exercise, i) =>
        i === exerciseIndex ? { ...exercise, video: file } : exercise
      )
    )
  }

  async function fetchHistoricalLogsByExercise() {
    const exerciseNames = exercises
      .map((exercise: any) => exercise?.name)
      .filter(Boolean)

    if (exerciseNames.length === 0) return {}

    const { data, error } = await supabase
      .from("workout_logs")
      .select("exercise_name, sets_completed, created_at")
      .eq("user_id", userId)
      .in("exercise_name", exerciseNames)
      .order("created_at", { ascending: false })

    if (error) throw error

    return (data || []).reduce((acc: Record<string, any[]>, log: any) => {
      const key = String(log.exercise_name || "").toLowerCase().trim()
      if (!acc[key]) acc[key] = []
      acc[key].push(log)
      return acc
    }, {})
  }

  function checkForPBs(historicalLogsByExercise: Record<string, any[]>) {
    const detectedPBs: PBResult[] = []

    formData.forEach((entry, exerciseIndex) => {
      const exercise = exercises[exerciseIndex]
      const exerciseName = exercise?.name
      if (!exerciseName) return

      const key = String(exerciseName).toLowerCase().trim()
      const previousExerciseLogs = historicalLogsByExercise[key] || []

      detectedPBs.push(
        ...detectPBs({
          exerciseName,
          currentSets: entry.sets,
          previousLogs: previousExerciseLogs,
        })
      )
    })

    return detectedPBs
  }

  async function saveDetectedPBs(pbs: PBResult[]) {
    if (!pbs || pbs.length === 0) return

    const pbRows = pbs.map((pb) => ({
      user_id: userId,
      programme_id: programmeId,
      session_id: session.id,
      exercise_name: pb.exerciseName,
      pb_type: pb.type,
      weight: pb.weight,
      reps: pb.reps,
      estimated_1rm: pb.estimated1RM,
      previous_best: pb.previousBest ?? null,
    }))

    const { error } = await supabase.from("exercise_pbs").upsert(pbRows, {
      onConflict:
        "user_id,programme_id,session_id,exercise_name,pb_type,weight,reps,estimated_1rm",
      ignoreDuplicates: true,
    })

    if (error) throw error
  }

  function closePBModal() {
    setShowPBModal(false)

    if (!achievementUnlock) {
      router.push("/dashboard")
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage("Saving workout...")

    try {
      const historicalLogsByExercise = await fetchHistoricalLogsByExercise()

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

      const detectedPBs = checkForPBs(historicalLogsByExercise)

      const workoutAchievementResult = await checkWorkoutAchievements(
        supabase,
        userId
      )

      const workoutUnlock = normaliseAchievementUnlock(workoutAchievementResult)

      if (workoutUnlock) {
        setAchievementUnlock(workoutUnlock)
      }

      if (detectedPBs.length > 0) {
        await saveDetectedPBs(detectedPBs)

        const pbAchievementResult = await checkPBAchievements(supabase, userId)
        const pbUnlock = normaliseAchievementUnlock(pbAchievementResult)

        if (pbUnlock) {
          setAchievementUnlock(pbUnlock)
        }

        setPbResults(detectedPBs)
        setShowPBModal(true)
        setMessage("")
        setSaving(false)
        return
      }

      setComplete(true)
      setMessage("Workout saved successfully ✅")
      setSaving(false)

      if (!workoutUnlock) {
        setTimeout(() => {
          router.push("/dashboard")
        }, 1200)
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
      setSaving(false)
    }
  }

  if (exercises.length === 0) {
    return <div className={`${card} p-4 text-white`}>No exercises found.</div>
  }

  return (
    <>
      <AchievementUnlockToast
        achievement={achievementUnlock}
        onClose={() => setAchievementUnlock(null)}
      />

      <div className="space-y-3 pb-40">
        {prefillMode === "unset" && (
          <section className={`${card} p-2.5`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

            <div className="relative z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={fillFromPreviousSession}
                className="flex-1 rounded-2xl border border-smc-gold/30 bg-smc-gold/[0.08] px-3 py-2.5 text-xs font-black text-smc-gold transition active:scale-[0.98]"
              >
                Use Previous
              </button>

              <button
                type="button"
                onClick={startBlankSession}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-xs font-black text-white/65 transition active:scale-[0.98]"
              >
                Start Blank
              </button>
            </div>
          </section>
        )}

        {exercises.map((ex: any, exerciseIndex: number) => {
          const previousLog = getPreviousLogForExercise(previousLogs, ex.name)
          const demo = getDemoForExercise(exerciseDemos, ex.name)

          return (
            <div key={`${ex.name}-${exerciseIndex}`} className={`${card} p-3`}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

              <div className="relative z-10">
                <div className="text-center">
  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/70">
    Exercise {exerciseIndex + 1}
  </p>

  <h3 className="mt-1 text-xl font-black leading-tight text-white">
    {ex.name}
  </h3>

  <div className="mt-2 flex justify-center">
    <span className="rounded-full border border-smc-gold/25 bg-smc-gold/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-smc-gold">
      {ex.prescription || "No prescription"}
    </span>
  </div>
</div>

                {demo && (
                  <button
                    type="button"
                    onClick={() => demo?.video_url && setActiveDemo(demo)}
                    disabled={!demo?.video_url}
                    className="group relative mt-2.5 h-[86px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-left disabled:cursor-default"
                  >
                    {demo?.thumbnail_url ? (
                      <img
                        src={demo.thumbnail_url}
                        alt={`${ex.name} demo`}
                        className="h-full w-full object-cover opacity-80 transition group-hover:scale-[1.03] group-hover:opacity-100"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.10),transparent_55%),#070707] px-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-smc-gold/65">
                          Demo coming soon
                        </p>
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                    <div className="absolute bottom-2 left-2">
                      <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/70 backdrop-blur">
                        Video Demo
                      </span>
                    </div>

                    {demo?.video_url && (
                      <div className="absolute bottom-2 right-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-smc-gold/60 bg-black/55 text-smc-gold shadow-[0_0_14px_rgba(212,175,55,0.20)] backdrop-blur">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5 fill-current"
                            aria-hidden="true"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </div>
                    )}
                  </button>
                )}

                {ex.notes && (
                  <p className="mt-2 text-xs leading-5 text-white/45">
                    {ex.notes}
                  </p>
                )}

                <div className="mt-3 space-y-2">
                  {formData[exerciseIndex]?.sets.map((set, setIndex) => {
                    const setHasData = set.weight || set.reps || set.rpe
                    const previousSet = previousLog?.sets_completed?.[setIndex]
                    const setKey = getSetKey(exerciseIndex, setIndex)
                    const isConfirmed = confirmedSets[setKey]
                    const isPrefilledUnconfirmed =
                      prefillMode === "previous" && setHasData && !isConfirmed

                    return (
                      <div
                        key={setIndex}
                        className={`rounded-2xl border px-2.5 py-2 transition ${
                          isConfirmed
                            ? "border-smc-gold/45 bg-smc-gold/[0.075] shadow-[0_0_16px_rgba(212,175,55,0.09)]"
                            : isPrefilledUnconfirmed
                              ? "border-white/5 bg-white/[0.02] opacity-70"
                              : setHasData
                                ? "border-smc-gold/22 bg-smc-gold/[0.04]"
                                : "border-white/[0.055] bg-black/20"
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                                Set {setIndex + 1}
                              </p>

                              {previousSet && (
                                <p className="text-[10px] font-semibold text-white/45">
  Last: {previousSet.weight || "-"}kg × {previousSet.reps || "-"} @ RPE
  {previousSet.rpe || "-"}
</p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => confirmSet(exerciseIndex, setIndex)}
                              className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-black transition active:scale-95 ${
                                isConfirmed
                                  ? "border-smc-gold/60 bg-smc-gold/25 text-smc-gold"
                                  : "border-white/10 bg-white/[0.035] text-white/35"
                              }`}
                              aria-label={`Confirm set ${setIndex + 1}`}
                            >
                              ✓
                            </button>

                            {formData[exerciseIndex].sets.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeSet(exerciseIndex, setIndex)
                                }
                                className="rounded-full border border-red-500/15 bg-red-500/[0.07] px-2 py-1 text-[10px] font-bold text-red-300/80 transition active:scale-[0.98]"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
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
                            className={`${inputStyle} ${
                              isPrefilledUnconfirmed
                                ? "text-white/45"
                                : "text-white"
                            }`}
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
                            className={`${inputStyle} ${
                              isPrefilledUnconfirmed
                                ? "text-white/45"
                                : "text-white"
                            }`}
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
                            className={`${inputStyle} ${
                              isPrefilledUnconfirmed
                                ? "text-white/45"
                                : "text-white"
                            }`}
                          />
                        </div>
                      </div>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => addSet(exerciseIndex)}
                    className="w-full rounded-2xl border border-smc-gold/25 bg-smc-gold/[0.06] px-4 py-2 text-xs font-black text-smc-gold transition active:scale-[0.98]"
                  >
                    + Add Extra Set
                  </button>
                </div>

                <textarea
                  placeholder="Exercise notes..."
                  value={formData[exerciseIndex]?.notes || ""}
                  onChange={(e) => updateNotes(exerciseIndex, e.target.value)}
                  className="mt-2.5 w-full rounded-2xl border border-white/5 bg-black/20 p-2.5 text-xs text-white outline-none placeholder:text-white/25 focus:border-smc-gold/60"
                  rows={2}
                />

                <div className="mt-2.5 rounded-2xl border border-white/[0.055] bg-black/20 p-2.5">
                  <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                    Upload video
                  </p>

                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) =>
                      updateVideo(exerciseIndex, e.target.files?.[0] || null)
                    }
                    className="w-full text-[11px] text-white/55 file:mr-2 file:rounded-xl file:border-0 file:bg-white/[0.07] file:px-2.5 file:py-1.5 file:text-[11px] file:font-bold file:text-white/75"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-[5.05rem] left-0 right-0 z-40 px-4 pb-1 sm:bottom-0">
        <div className="mx-auto w-full max-w-5xl rounded-[1.35rem] border border-white/[0.07] bg-black/80 p-2 shadow-[0_-10px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-smc-gold py-2.5 text-[15px] font-black text-black shadow-[0_0_20px_rgba(212,175,55,0.18)] transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Workout"}
          </button>

          {message && !complete && (
            <p className="mt-1.5 text-center text-[11px] font-medium text-white/45">
              {message}
            </p>
          )}
        </div>
      </div>

      {activeDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 px-3 backdrop-blur-xl">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-smc-gold/20 bg-[#050505] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-smc-gold">
                  Exercise Demo
                </p>
                <h2 className="mt-1 text-lg font-black text-white">
                  {activeDemo.exercise_name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveDemo(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xl font-black text-white"
              >
                ×
              </button>
            </div>

            <video
              src={activeDemo.video_url}
              controls
              playsInline
              className="max-h-[70vh] w-full bg-black"
            />

            {activeDemo.coach_notes && (
              <div className="border-t border-white/10 p-4">
                <p className="text-sm leading-6 text-white/55">
                  {activeDemo.coach_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showPBModal && pbResults.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 py-6 backdrop-blur-xl">
          <div className="relative flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-smc-gold/25 bg-[linear-gradient(180deg,rgba(20,20,20,0.98),rgba(3,3,3,0.99))] text-white shadow-[0_0_80px_rgba(212,175,55,0.16)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_42%)]" />

            <div className="relative shrink-0 border-b border-white/10 px-5 py-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-smc-gold/80">
                Team SMC
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                NEW PB
              </h2>

              <p className="mt-1 text-xs leading-5 text-white/45">
                Strong work. Logged and locked in.
              </p>
            </div>

            <div className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {pbResults.map((pb, index) => (
                <div
                  key={`${pb.exerciseName}-${pb.type}-${index}`}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-smc-gold/80">
                    {pb.label}
                  </p>

                  <h3 className="mt-1 text-lg font-black tracking-tight text-white">
                    {pb.exerciseName}
                  </h3>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-3xl font-black tracking-tight text-white">
                      {pb.weight}kg × {pb.reps}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="text-xs font-medium text-white/45">
                        Estimated 1RM
                      </span>

                      <span className="text-base font-black text-smc-gold">
                        {pb.estimated1RM}kg
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative shrink-0 border-t border-white/10 bg-black/60 p-4 backdrop-blur-xl">
              <button
                type="button"
                onClick={closePBModal}
                className="w-full rounded-2xl bg-smc-gold px-5 py-3 text-sm font-black text-black shadow-[0_0_30px_rgba(212,175,55,0.25)] transition hover:brightness-110 active:scale-[0.98]"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {complete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6 backdrop-blur-xl">
          <div className="w-full max-w-sm rounded-3xl border border-smc-gold/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-6 text-center shadow-2xl">
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