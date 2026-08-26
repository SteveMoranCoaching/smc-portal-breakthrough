"use client"

import Link from "next/link"
import {
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { isMainExercise } from "@/lib/exerciseSections"
import {
  checkForPBs,
  getPreviousPerformance,
  type PBResult,
  type SetEntry,
} from "@/lib/pbs"
import {
  getCircuitExerciseKey,
  getCircuitKey,
  getStretchKey,
  getWarmupKey,
} from "@/lib/workoutKeys"
import {
  getDemoForExercise,
  getExerciseDisplayLabel,
  getPreviousCoachFeedback,
  getPreviousLogForExercise,
} from "@/lib/exerciseHelpers"
import {
  hasSetData,
  isCompletedExercise,
} from "@/lib/setStatus"
import {
  normaliseAchievementUnlock,
  type AchievementUnlock,
} from "@/lib/achievementHelpers"
import AchievementUnlockToast from "@/components/AchievementUnlockToast"
import {
  checkWorkoutAchievements,
  checkPBAchievements,
} from "@/lib/achievements"
import WorkoutExerciseCard from "@/components/workouts/WorkoutExerciseCard"
import ExerciseDetailsModal from "@/components/workouts/ExerciseDetailsModal"
import useWorkoutEditor from "@/hooks/useWorkoutEditor"
import WorkoutNotes from "@/components/workouts/WorkoutNotes"
import WorkoutVideoUploader from "@/components/workouts/WorkoutVideoUploader"
import WorkoutSetList from "@/components/workouts/WorkoutSetList"
import useWorkoutProgress from "@/hooks/useWorkoutProgress"
import WorkoutWarmupSection from "@/components/workouts/WorkoutWarmupSection"
import WorkoutCircuitSection from "@/components/workouts/WorkoutCircuitSection"
import WorkoutStretchSection from "@/components/workouts/WorkoutStretchSection"
import PlateStack from "@/components/PlateStack"

import {
  BAR_OPTIONS,
  calculatePlates,
  type BarType,
  type PlateMode,
} from "@/lib/plateCalculator"
import {
  generateWarmup,
  type SMCBrainWarmupResponse,
} from "@/lib/smcBrain"

const card =
  "relative scroll-mt-24 overflow-hidden rounded-[1.35rem] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014))] shadow-[0_12px_30px_rgba(0,0,0,0.55)]"

function getAutosaveKey(userId: string, sessionId: string) {
  return `smc-workout-autosave-${userId}-${sessionId}`
}

export default function WorkoutSessionForm({
  session,
  programmeId,
  userId,
  previousLogs = [],
  exerciseDemos = [],
   existingLogs = [],
  isEditMode = false,
}: any) {
  const router = useRouter()
  const [saveError, setSaveError] = useState("")
  const exercises = useMemo(
    () => (Array.isArray(session?.exercises) ? session.exercises : []),
    [session?.exercises]
  )

  const {
  formData,
  setFormData,
  prefillMode,
  confirmedSets,
  fillFromPreviousSession,
  startBlankSession,
  confirmSet,
  updateSetField,
  addSet,
  removeSet,
  updateNotes,
  addUploadedVideo,
  clearUploadedVideos,
  removeUploadedVideo,
  setInputRef,
} = useWorkoutEditor({
  exercises,
  previousLogs,
  existingLogs,
  onEdit: () => setSaveError(""),
})

  const [activeDemo, setActiveDemo] = useState<any | null>(null)
  const [activeExerciseInfo, setActiveExerciseInfo] = useState<any | null>(null)

  const [
  activePlateWeight,
  setActivePlateWeight,
  ] = useState<number | null>(null)

  const [plateMode, setPlateMode] =
  useState<PlateMode>("calibrated")

  const [barType, setBarType] =
  useState<BarType>("standard")

  const [customBarWeight, setCustomBarWeight] =
  useState("20")

  const activePlateResult = useMemo(() => {
  if (
    activePlateWeight === null ||
    activePlateWeight <= 0
  ) {
    return null
  }

  return calculatePlates({
    targetWeight: activePlateWeight,
    mode: plateMode,
    barType,
    customBarWeight:
      barType === "custom"
        ? Number(customBarWeight)
        : undefined,
  })
}, [
  activePlateWeight,
  plateMode,
  barType,
  customBarWeight,
])

  const [warmupComplete, setWarmupComplete] = useState<Record<string, boolean>>({})
  const [warmupSectionComplete, setWarmupSectionComplete] = useState(false)
  
  const [
  generatedWarmupComplete,
  setGeneratedWarmupComplete,
] = useState<Record<string, boolean>>({})

const [
  expandedWarmups,
  setExpandedWarmups,
] = useState<Record<string, boolean>>({})

const [
  completingGeneratedWarmup,
  setCompletingGeneratedWarmup,
] = useState<string | null>(null)

const [
  warmupCompleteToast,
  setWarmupCompleteToast,
] = useState(false)

  const [stretchComplete, setStretchComplete] = useState<Record<string, boolean>>({})
  const [stretchSectionComplete, setStretchSectionComplete] = useState(false)
  const [circuitComplete, setCircuitComplete] = useState<Record<string, boolean>>({})
  const [circuitExerciseComplete, setCircuitExerciseComplete] = useState<Record<string, boolean>>({})
  const autosaveKey = getAutosaveKey(userId, session.id)

useEffect(() => {
  if (typeof window === "undefined") return

  const saved = window.localStorage.getItem(autosaveKey)

  if (!saved) return

  try {
    const parsed = JSON.parse(saved)

    if (Array.isArray(parsed?.formData)) {
      setFormData(
  parsed.formData.map((entry: any) => ({
    ...entry,
    videos: [],
  }))
)
    }

    if (parsed?.sessionRating) {
      setSessionRating(parsed.sessionRating)
    }

    if (parsed?.sessionNotes) {
      setSessionNotes(parsed.sessionNotes)
    }
    if (parsed?.warmupComplete) {
  setWarmupComplete(parsed.warmupComplete)
}

if (typeof parsed?.warmupSectionComplete === "boolean") {
  setWarmupSectionComplete(parsed.warmupSectionComplete)
}

if (parsed?.stretchComplete) {
  setStretchComplete(parsed.stretchComplete)
}

if (typeof parsed?.stretchSectionComplete === "boolean") {
  setStretchSectionComplete(parsed.stretchSectionComplete)
}

if (parsed?.circuitComplete) {
  setCircuitComplete(parsed.circuitComplete)
}

if (parsed?.circuitExerciseComplete) {
  setCircuitExerciseComplete(parsed.circuitExerciseComplete)
}
  } catch {}
}, [autosaveKey])

  const [keyboardActive, setKeyboardActive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [uploadingExercise, setUploadingExercise] = useState("")
  const [complete, setComplete] = useState(false)
  const [pbResults, setPbResults] = useState<PBResult[]>([])
  const [showPBModal, setShowPBModal] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [sessionRating, setSessionRating] = useState("")
  const [sessionNotes, setSessionNotes] = useState("")
  const [achievementUnlock, setAchievementUnlock] =
    useState<AchievementUnlock | null>(null)
  const {
  warmupExercises,
  mainExercises,
  stretchExercises,
  circuitExercises,
  supersetExercises,
  warmupCompletedCount,
  warmupAllComplete,
  stretchCompletedCount,
  stretchAllComplete,
  circuitCompletedCount,
  circuitAnyCompletedCount,
  sessionStats,
} = useWorkoutProgress({
  exercises,
  formData,
  warmupComplete,
  warmupSectionComplete,
  stretchComplete,
  stretchSectionComplete,
  circuitComplete,
  circuitExerciseComplete,
})

 useEffect(() => {
  if (typeof window === "undefined") return
  if (complete) return

  setAutosaveStatus("saving")

  const timeout = window.setTimeout(() => {
    window.localStorage.setItem(
  autosaveKey,
  JSON.stringify({
  formData: formData.map((entry) => ({
    ...entry,
    videos: [],
  })),
  sessionRating,
  sessionNotes,
  warmupComplete,
  warmupSectionComplete,
  stretchComplete,
  stretchSectionComplete,
  circuitComplete,
  circuitExerciseComplete,
  savedAt: new Date().toISOString(),
})
)

    setAutosaveStatus("saved")
  }, 750)

  return () => window.clearTimeout(timeout)
}, [
  autosaveKey,
  formData,
  sessionRating,
  sessionNotes,
  warmupComplete,
  warmupSectionComplete,
  stretchComplete,
  stretchSectionComplete,
  circuitComplete,
  circuitExerciseComplete,
  complete,
])  

    const biggestLift = useMemo(() => {
  if (pbResults.length === 0) return null

  return [...pbResults].sort((a, b) => {
    const aScore = a.weight * a.reps
    const bScore = b.weight * b.reps
    return bScore - aScore
  })[0]
}, [pbResults])

  function handleInputFocus() {
    setKeyboardActive(true)
  }

  function handleInputBlur() {
    setTimeout(() => {
      const activeElement = document.activeElement

      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement
      ) {
        return
      }

      setKeyboardActive(false)
    }, 140)
  }

  function getSaveButtonText() {
    if (saving) return uploadingExercise || "Saving workout..."
    if (isEditMode) return "Save Changes"
    if (!sessionStats.hasAnyLoggedWork) return "Log your first set"
    return "Complete Workout"
  }

  function toggleWarmupItem(exerciseIndex: number, exerciseName: string) {
    const key = getWarmupKey(exerciseIndex, exerciseName)

    setWarmupComplete((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  function toggleGeneratedWarmups(exerciseIndex: number) {
  const key = `generated-warmups-${exerciseIndex}`

  setExpandedWarmups((current) => ({
    ...current,
    [key]: !current[key],
  }))
}

  function getGeneratedWarmupKey(
  exerciseIndex: number,
  warmupIndex: number
) {
  return `generated-warmup-${exerciseIndex}-${warmupIndex}`
}

function completeGeneratedWarmup(
  exerciseIndex: number,
  warmupIndex: number,
  totalWarmups: number
) {
  const key = getGeneratedWarmupKey(
    exerciseIndex,
    warmupIndex
  )

  const isCompleting =
  completingGeneratedWarmup === key

  setCompletingGeneratedWarmup(key)

  if (
    typeof navigator !== "undefined" &&
    "vibrate" in navigator
  ) {
    navigator.vibrate(20)
  }

  const completedForExercise =
    Array.from(
      { length: totalWarmups },
      (_, index) =>
        generatedWarmupComplete[
          getGeneratedWarmupKey(
            exerciseIndex,
            index
          )
        ]
    ).filter(Boolean).length

  const isFinalWarmup =
    completedForExercise ===
    totalWarmups - 1

  window.setTimeout(() => {
    setGeneratedWarmupComplete((current) => ({
      ...current,
      [key]: true,
    }))

    setCompletingGeneratedWarmup(null)

    if (isFinalWarmup) {
      if (
        typeof navigator !== "undefined" &&
        "vibrate" in navigator
      ) {
        navigator.vibrate([25, 40, 25])
      }

      setWarmupCompleteToast(true)

      window.setTimeout(() => {
        setWarmupCompleteToast(false)
      }, 1800)
    }
  }, 250)
}

function toggleCircuitExerciseItem(
  exerciseIndex: number,
  circuitName: string,
  circuitExerciseIndex: number,
  circuitExerciseName: string
) {
  const key = getCircuitExerciseKey(
    exerciseIndex,
    circuitName,
    circuitExerciseIndex,
    circuitExerciseName
  )

  setCircuitExerciseComplete((current) => ({
    ...current,
    [key]: !current[key],
  }))
}

function toggleCircuitItem(exerciseIndex: number, circuitName: string) {
  const key = getCircuitKey(exerciseIndex, circuitName)

  setCircuitComplete((current) => ({
    ...current,
    [key]: !current[key],
  }))
}

  function toggleStretchItem(exerciseIndex: number, exerciseName: string) {
    const key = getStretchKey(exerciseIndex, exerciseName)

    setStretchComplete((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  async function fetchHistoricalLogsByExercise() {
    const exerciseNames = exercises
      .filter((exercise: any) => isMainExercise(exercise))
      .map((exercise: any) => exercise?.name)
      .filter(Boolean)

    if (exerciseNames.length === 0) return {}

    const { data, error } = await supabase
      .from("workout_logs")
      .select("exercise_name, sets_completed, created_at, coach_feedback")
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
    setComplete(true)
  }

  async function handleSave(completionConfirmed = false) {
    if (!sessionStats.hasAnyLoggedWork || saving) return

    if (
      !isEditMode &&
      getSaveButtonText() === "Complete Workout" &&
      !completionConfirmed
    ) {
      setShowCompletionModal(true)
      return
    }

    setSaving(true)
    setSaveError("")
    setMessage("Saving workout...")
    setUploadingExercise("")

    try {
      const historicalLogsByExercise = await fetchHistoricalLogsByExercise()
      const failedVideoRows: string[] = []

      for (let i = 0; i < formData.length; i++) {
        const ex = exercises[i]
        if (!isMainExercise(ex)) continue

        const data = formData[i]
        const exerciseName = ex?.name || `Exercise ${i + 1}`

        setMessage(`Saving ${exerciseName}...`)

        const completedSets = data.sets.filter(hasSetData)

        if (completedSets.length > 0 || data.notes.trim()) {
          const existingLog = existingLogs.find(
            (log: any) =>
              String(log.exercise_name || "").toLowerCase().trim() ===
              String(exerciseName).toLowerCase().trim()
          )

          const { error: logError } = await supabase.from("workout_logs").upsert({
            id: existingLog?.id,
            user_id: userId,
            programme_id: programmeId,
            session_id: session.id,
            exercise_name: exerciseName,
            sets_completed: completedSets,
            notes: data.notes,
            reviewed: false,
          })

          if (logError) throw logError
        }

        for (const video of data.videos) {
          const { error: videoError } = await supabase
            .from("exercise_videos")
            .insert({
              user_id: userId,
              programme_id: programmeId,
              session_id: session.id,
              exercise_name: exerciseName,
              exercise_index: i,
              video_path: video.path,
              reviewed: false,
            })

          if (videoError) {
            failedVideoRows.push(`${exerciseName}: ${videoError.message}`)
          }
        }
      }

      setMessage("Checking PBs...")

      const detectedPBs = checkForPBs(
  exercises,
  formData,
  historicalLogsByExercise
)

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
      }

      if (failedVideoRows.length > 0) {
        setSaveError(
          "Workout saved, but one or more video records failed to attach. The upload itself may still be in storage."
        )
      }

      const { error: completionError } = await supabase
        .from("session_completions")
        .upsert({
          user_id: userId,
          programme_id: programmeId,
          session_id: session.id,
          completed: true,
          session_rating: sessionRating ? Number(sessionRating) : null,
          notes: sessionNotes.trim() || null,
        })

      if (completionError) {
        throw completionError
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(autosaveKey)
      }

      setComplete(true)
      setMessage("")
      setUploadingExercise("")
      setSaving(false)
    } catch (err: any) {
      setSaveError(
        err?.message
          ? `Couldn’t save this workout: ${err.message}`
          : "Couldn’t save this workout. Check your connection and try again."
      )
      setMessage("")
      setUploadingExercise("")
      setSaving(false)
    }
  }

  if (exercises.length === 0) {
    return (
      <div className={`${card} p-4 text-white`}>
        <p className="text-sm font-black">No exercises found.</p>
        <p className="mt-1 text-xs leading-5 text-white/45">
          This session has loaded, but no exercises are attached to it.
        </p>
      </div>
    )
  }

  return (
    <>
      <AchievementUnlockToast
        achievement={achievementUnlock}
        onClose={() => setAchievementUnlock(null)}
      />

      <Link
  href={`/dashboard/workouts/${session.id}/preview`}
  className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-smc-gold/15 bg-smc-gold/[0.06] px-3 py-2 text-xs font-black text-smc-gold"
>
  ← Preview
</Link>

      <div className="sticky top-2 z-30 mb-3 rounded-[1.35rem] border border-white/[0.07] bg-black/85 p-2.5 shadow-[0_14px_34px_rgba(0,0,0,0.62)] backdrop-blur-xl supports-[padding:max(0px)]:top-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black text-white">
              {session?.title || "Workout Session"}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-white/40">
              {sessionStats.completedExercises}/{mainExercises.length} exercises ·{" "}
              {sessionStats.totalCompletedSets} sets logged
            </p>
            {autosaveStatus !== "idle" && !complete && (
  <p className="mt-0.5 text-[9px] font-bold text-white/30">
    {autosaveStatus === "saving" ? "Autosaving..." : "Autosaved"}
  </p>
)}
          </div>

          <div className="shrink-0 rounded-full border border-smc-gold/25 bg-smc-gold/[0.08] px-2.5 py-1 text-[10px] font-black text-smc-gold">
            {sessionStats.progress}%
          </div>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-smc-gold shadow-[0_0_14px_rgba(212,175,55,0.45)] transition-all duration-500"
            style={{ width: `${sessionStats.progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-3 pb-[calc(15rem+env(safe-area-inset-bottom))]">
        {prefillMode === "unset" && (
          <section className={`${card} p-2.5`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

            <div className="relative z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={fillFromPreviousSession}
                className="flex-1 rounded-2xl border border-smc-gold/30 bg-smc-gold/[0.08] px-3 py-3 text-xs font-black text-smc-gold transition active:scale-[0.98]"
              >
                Use Previous
              </button>

              <button
                type="button"
                onClick={startBlankSession}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 text-xs font-black text-white/65 transition active:scale-[0.98]"
              >
                Start Blank
              </button>
            </div>
          </section>
        )}

        {warmupExercises.length > 0 && (
  <WorkoutWarmupSection
    exercises={warmupExercises}
    exerciseDemos={exerciseDemos}
    completedItems={warmupComplete}
    completedCount={warmupCompletedCount}
    allComplete={warmupAllComplete}
    onToggleItem={toggleWarmupItem}
    onCompleteSection={() => setWarmupSectionComplete(true)}
    onOpenDemo={setActiveDemo}
  />
)}

        {circuitExercises.length > 0 && (
  <WorkoutCircuitSection
    exercises={circuitExercises}
    completedItems={circuitComplete}
    completedExerciseItems={circuitExerciseComplete}
    onToggleItem={toggleCircuitItem}
    onToggleExerciseItem={toggleCircuitExerciseItem}
  />
)}

        {supersetExercises.length > 0 && (
  <section className={`${card} p-3`}>
    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/70">
      Superset
    </p>

    <div className="mt-3 space-y-2">
      {supersetExercises.map((item: any) => {
        const superset = item.exercise
        const nestedExercises = Array.isArray(superset?.circuit?.exercises)
  ? superset.circuit.exercises
  : []

        return (
          <div
            key={`superset-${item.originalIndex}`}
            className="rounded-2xl border border-white/[0.06] bg-black/25 p-3"
          >
            <p className="text-sm font-black text-white">
              {superset?.name || `Superset ${item.originalIndex + 1}`}
            </p>

            <p className="mt-1 text-xs text-white/45">
              {superset?.prescription || "Complete exercises back-to-back."}
            </p>

            <div className="mt-3 space-y-2">
              {nestedExercises.map((nested: any, nestedIndex: number) => (
                <div
                  key={`${nested?.name || "exercise"}-${nestedIndex}`}
                  className="rounded-xl border border-white/[0.055] bg-black/30 px-3 py-2"
                >
                  <p className="text-sm font-black text-white">
                    {nested?.name || `Exercise ${nestedIndex + 1}`}
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-white/45">
                    {nested?.prescription || "No prescription"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  </section>
)}

        {exercises.map((ex: any, exerciseIndex: number) => {
          if (!isMainExercise(ex)) return null

          const exerciseName = ex?.name || `Exercise ${exerciseIndex + 1}`
          const previousLog = getPreviousLogForExercise(previousLogs, exerciseName)
          const previousPerformance = getPreviousPerformance(previousLog)
          const previousCoachFeedback = getPreviousCoachFeedback(previousLog)
          const previousSessions = previousLogs
  .filter(
    (log: any) =>
      String(log?.exercise_name || "")
        .toLowerCase()
        .trim() ===
      String(exerciseName)
        .toLowerCase()
        .trim()
  )
  .sort(
    (a: any, b: any) =>
      new Date(b?.created_at || 0).getTime() -
      new Date(a?.created_at || 0).getTime()
  )
  .slice(0, 3)
          const demo = getDemoForExercise(exerciseDemos, exerciseName)
          const entry = formData[exerciseIndex]
          const exerciseComplete = isCompletedExercise(entry?.sets ?? [])

const prescribedWeights =
  String(ex.prescription || "")
    .match(/\d+(?:\.\d+)?\s*kg/gi)
    ?.map((value) =>
      Number(
        value
          .toLowerCase()
          .replace("kg", "")
          .trim()
      )
    )
    .filter((value) =>
      Number.isFinite(value)
    ) ?? []

const workingWeight =
  prescribedWeights.length > 0
    ? Math.max(...prescribedWeights)
    : Number(
        entry?.sets?.find(
          (set: any) =>
            Number(set?.weight) > 0
        )?.weight || 0
      )

const generatedWarmup =
  workingWeight > 0
    ? generateWarmup({
        targetWeight: workingWeight,
        profile: "competition",
        barWeight: 20,
      })
    : null

    const remainingGeneratedWarmups =
  generatedWarmup?.sets.filter(
    (_, warmupIndex) =>
      !generatedWarmupComplete[
        getGeneratedWarmupKey(
          exerciseIndex,
          warmupIndex
        )
      ]
  ) ?? []

  const generatedWarmupsKey =
  `generated-warmups-${exerciseIndex}`

const generatedWarmupsExpanded =
  Boolean(expandedWarmups[generatedWarmupsKey])

  const prescriptionBlocks =
  Array.isArray(ex?.prescriptions)
    ? ex.prescriptions
    : []

          return (
  <WorkoutExerciseCard
    key={`${exerciseName}-${exerciseIndex}`}
    exerciseName={exerciseName}
    exerciseIndex={exerciseIndex}
    exerciseComplete={exerciseComplete}
    prescription={ex?.prescription}
    demo={demo}
    previousPerformance={previousPerformance}
    previousCoachFeedback={previousCoachFeedback}
    previousSessions={previousSessions}
    onOpenDetails={() =>
      setActiveExerciseInfo({
        exercise: ex,
        exerciseName,
        demo,
        previousPerformance,
        previousCoachFeedback,
      })
    }
    onOpenDemo={() => {
      if (demo?.video_url) {
        setActiveDemo(demo)
      }
    }}

  >

    {generatedWarmup &&
  remainingGeneratedWarmups.length > 0 && (
    <div className="mb-3 overflow-hidden rounded-2xl border border-smc-gold/15 bg-smc-gold/[0.025] shadow-[0_8px_22px_rgba(0,0,0,0.22)]">

      <button
        type="button"
        onClick={() =>
          toggleGeneratedWarmups(exerciseIndex)
        }
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3.5 text-left transition active:scale-[0.99]"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold/80">
            Top Set Warm Ups
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-white/30">
            {remainingGeneratedWarmups.length} remaining
          </span>

          <span
            className={`text-sm font-black text-smc-gold/70 transition-transform duration-200 ${
              generatedWarmupsExpanded
                ? "rotate-180"
                : ""
            }`}
          >
            ▾
          </span>
        </div>
      </button>

      {generatedWarmupsExpanded && (
        <div className="border-t border-smc-gold/10 px-3 pb-2.5 pt-2 space-y-1">
          {generatedWarmup.sets.map(
            (warmupSet, warmupIndex) => {
              const key =
                getGeneratedWarmupKey(
                  exerciseIndex,
                  warmupIndex
                )

              const isCompleting =
                completingGeneratedWarmup === key

              if (generatedWarmupComplete[key]) {
                return null
              }

              return (
  <div
    key={key}
    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 transition-all duration-200 ${
      isCompleting
        ? "scale-[0.99] border-smc-gold/35 bg-smc-gold/[0.08]"
        : "border-white/[0.07] bg-black/10"
    }`}
  >
    {/* LEFT — PRESCRIPTION */}
    <p className="min-w-0 flex-1 text-[11px] font-black text-white/50">
      {warmupSet.weight}kg × {warmupSet.reps}
    </p>

    {/* CENTRE — BAR MATH */}
    {warmupSet.weight > 0 ? (
      <button
        type="button"
        onClick={() => setActivePlateWeight(warmupSet.weight)}
        className="flex h-8 w-[124px] shrink-0 items-center justify-center gap-2 rounded-lg border border-smc-gold/15 bg-black/20 px-2.5 text-smc-gold transition active:scale-95"
      >
        <svg
  viewBox="0 0 32 18"
  aria-hidden="true"
  className="h-[16px] w-[29px] shrink-0 text-smc-gold"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M2 9H30"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  />
  <path
    d="M6 5V13"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  />
  <path
    d="M10 3V15"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
  />
  <path
    d="M22 3V15"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
  />
  <path
    d="M26 5V13"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  />
</svg>

<span className="whitespace-nowrap text-[8px] font-black uppercase tracking-[0.08em]">
  Bar Math
</span>
      </button>
    ) : (
      <div className="w-[124px] shrink-0" />
    )}

    {/* RIGHT — COMPLETE */}
    <button
      type="button"
      onClick={() =>
        completeGeneratedWarmup(
          exerciseIndex,
          warmupIndex,
          generatedWarmup.sets.length
        )
      }
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black transition-all ${
        isCompleting
          ? "scale-110 border-smc-gold bg-smc-gold text-black"
          : "border-white/10 bg-white/[0.02] text-white/40"
      }`}
    >
      ✓
    </button>
  </div>
)
            }
          )}
        </div>
      )}
    </div>
  )}

    <WorkoutSetList
      exercise={ex}
        onOpenBarMath={(weight) =>
          setActivePlateWeight(weight)
        }
      prescriptionBlocks={prescriptionBlocks}
      exerciseIndex={exerciseIndex}
      sets={formData[exerciseIndex]?.sets || []}
      previousLog={previousLog}
      prefillMode={prefillMode}
      confirmedSets={confirmedSets}
      disabled={saving || complete}
      onConfirmSet={(setIndex) =>
        confirmSet(exerciseIndex, setIndex)
      }
      onRemoveSet={(setIndex) =>
        removeSet(exerciseIndex, setIndex)
      }
      onAddSet={() => addSet(exerciseIndex)}
      onFocus={handleInputFocus}
      onBlur={handleInputBlur}
      onChangeSet={(setIndex, field, value) =>
        updateSetField(
          exerciseIndex,
          setIndex,
          field,
          value
        )
      }
      setInputRef={(setIndex, field, element) =>
        setInputRef(
          exerciseIndex,
          setIndex,
          field,
          element
        )
      }
    />

    <WorkoutNotes
      value={formData[exerciseIndex]?.notes || ""}
      disabled={saving || complete}
      onFocus={handleInputFocus}
      onBlur={handleInputBlur}
      onChange={(value) =>
        updateNotes(exerciseIndex, value)
      }
    />

    <WorkoutVideoUploader
      userId={userId}
      sessionId={session.id}
      exerciseIndex={exerciseIndex}
      videos={formData[exerciseIndex]?.videos || []}
      disabled={saving || complete}
      onUploaded={(video) =>
        addUploadedVideo(exerciseIndex, video)
      }
      onClear={() =>
        clearUploadedVideos(exerciseIndex)
      }
      onRemove={(videoIndex) =>
        removeUploadedVideo(
          exerciseIndex,
          videoIndex
        )
      }
    />
  </WorkoutExerciseCard>
)
          
        })}

      {stretchExercises.length > 0 && (
  <WorkoutStretchSection
    exercises={stretchExercises}
    exerciseDemos={exerciseDemos}
    completedItems={stretchComplete}
    completedCount={stretchCompletedCount}
    allComplete={stretchAllComplete}
    onToggleItem={toggleStretchItem}
    onCompleteSection={() => setStretchSectionComplete(true)}
    onOpenDemo={setActiveDemo}
  />
)}
              </div>

     {!keyboardActive && (
  <div className="fixed inset-x-0 bottom-[calc(5.9rem+env(safe-area-inset-bottom))] z-40 px-3"> 
  <div className="mx-auto w-full max-w-5xl rounded-[1.35rem] border border-white/[0.07] bg-black/90 p-2 shadow-[0_-10px_32px_rgba(0,0,0,0.78)] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[10px] font-bold text-white/40">
                {sessionStats.completedExercises}/{mainExercises.length} exercises
                complete
              </p>
              <p className="text-[10px] font-black text-smc-gold">
                {sessionStats.progress}%
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving || !sessionStats.hasAnyLoggedWork}
              className="min-h-12 w-full rounded-2xl bg-smc-gold py-3 text-[15px] font-black text-black shadow-[0_0_20px_rgba(212,175,55,0.18)] transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
            >
              {getSaveButtonText()}
            </button>

            {(message || saveError) && !complete && (
              <p
                className={`mt-1.5 text-center text-[11px] font-medium ${
                  saveError ? "text-red-300/85" : "text-white/45"
                }`}
              >
                {saveError || message}
              </p>
            )}
          </div>
        </div>
      )}

      {warmupCompleteToast && (
  <div className="pointer-events-none fixed left-1/2 top-6 z-[100] -translate-x-1/2">
    <div className="flex items-center gap-2 rounded-full border border-smc-gold/30 bg-[#111111]/95 px-4 py-2.5 shadow-2xl backdrop-blur-xl">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-smc-gold text-[11px] font-black text-black">
        ✓
      </div>

      <span className="whitespace-nowrap text-xs font-black text-white">
        Warm-ups complete
      </span>
    </div>
  </div>
)}

{activePlateWeight !== null && activePlateResult && (
  <div
    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 px-5 backdrop-blur-[2px]"
    onClick={() => setActivePlateWeight(null)}
  >
    <div
      className="w-full max-w-[360px] rounded-[1.5rem] border border-white/[0.08] bg-[#080808] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.78)]"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
    
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-smc-gold/70">
            Bar Math
          </p>

          <h2 className="mt-0.5 text-xl font-black text-white">
            {activePlateWeight}kg
          </h2>
        </div>

        <button
          type="button"
          onClick={() =>
            setActivePlateWeight(null)
          }
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-lg font-black text-white/50"
        >
          ×
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div>
          <label className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
            Plates
          </label>

          <select
            value={plateMode}
            onChange={(event) =>
              setPlateMode(
                event.target.value as PlateMode
              )
            }
            className="mt-1 h-9 w-full rounded-lg border border-white/[0.08] bg-black/40 px-2.5 text-[11px] font-bold text-white outline-none"
          >
            <option value="calibrated">
              Calibrated
            </option>

            <option value="gym">
              Gym Plates
            </option>
          </select>
        </div>

        <div>
          <label className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
            Bar
          </label>

          <select
            value={barType}
            onChange={(event) =>
              setBarType(
                event.target.value as BarType
              )
            }
            className="mt-1 h-9 w-full rounded-lg border border-white/[0.08] bg-black/40 px-2.5 text-[11px] font-bold text-white outline-none"
          >
            {BAR_OPTIONS.map((bar) => (
              <option
                key={bar.id}
                value={bar.id}
              >
                {bar.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {barType === "custom" && (
        <div className="mt-3">
          <label className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
            Custom Bar Weight
          </label>

          <div className="mt-1.5 flex items-center rounded-xl border border-white/[0.08] bg-black/40">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={customBarWeight}
              onChange={(event) =>
                setCustomBarWeight(
                  event.target.value
                )
              }
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-xs font-bold text-white outline-none"
            />

            <span className="pr-3 text-[10px] font-black text-white/30">
              kg
            </span>
          </div>
        </div>
      )}

      <div className="mt-2 [&>div]:mt-0 [&>div]:p-2.5">
        <PlateStack
          plates={activePlateResult.platesPerSide}
          mode={activePlateResult.mode}
          barWeight={activePlateResult.barWeight}
          targetWeight={activePlateResult.targetWeight}
        />
      </div>

      <button
        type="button"
        onClick={() =>
          setActivePlateWeight(null)
        }
        className="mt-2 w-full rounded-xl bg-smc-gold px-4 py-2 text-xs font-black text-black transition active:scale-[0.98]"
      >
        Done
      </button>
    </div>
  </div>
)}

<ExerciseDetailsModal
  exerciseInfo={activeExerciseInfo}
  onClose={() => setActiveExerciseInfo(null)}
  onOpenDemo={(demo) => setActiveDemo(demo)}
/>

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

{showCompletionModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 py-6 backdrop-blur-xl">
    <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-smc-gold/25 bg-[linear-gradient(180deg,rgba(20,20,20,0.98),rgba(3,3,3,0.99))] p-5 text-white shadow-[0_0_80px_rgba(212,175,55,0.16)]">

      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-smc-gold/80">
          Session Complete
        </p>

        <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
          Rate This Session
        </h2>

        <p className="mt-2 text-sm leading-6 text-white/45">
          Quick feedback helps improve coaching decisions and tracking.
        </p>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
          Session Rating /10
        </label>

        <input
          type="number"
          min="1"
          max="10"
          value={sessionRating}
          onChange={(e) => setSessionRating(e.target.value)}
          placeholder="8"
          className="h-12 w-full rounded-2xl border border-white/[0.07] bg-black/35 px-4 text-center text-lg font-black text-white outline-none placeholder:text-white/20 focus:border-smc-gold/70"
        />
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
          Session Notes
        </label>

        <textarea
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="How did the session feel?"
          rows={4}
          className="w-full rounded-2xl border border-white/[0.07] bg-black/25 p-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/60"
        />
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => setShowCompletionModal(false)}
          className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/65"
        >
          Back
        </button>

        <button
          type="button"
          onClick={() => {
            setShowCompletionModal(false)
            handleSave(true)
          }}
          className="flex-1 rounded-2xl bg-smc-gold px-4 py-3 text-sm font-black text-black"
        >
          Complete Session
        </button>
      </div>
    </div>
  </div>
)}

      {showPBModal && pbResults.length > 0 && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/95 px-4 py-6 backdrop-blur-xl">
   <div className="pointer-events-none absolute inset-0 overflow-hidden">
  {Array.from({ length: 22 }).map((_, index) => (
    <span
      key={index}
      className="absolute h-1.5 w-1.5 animate-[smcConfetti_1.4s_ease-out_forwards] rounded-full bg-smc-gold/80"
      style={{
        left: `${8 + Math.random() * 84}%`,
        top: `${18 + Math.random() * 18}%`,
        animationDelay: `${Math.random() * 0.25}s`,
      }}
    />
  ))}
</div>
    <div className="w-full max-w-sm">
      <div className="overflow-hidden rounded-[2rem] border border-smc-gold/30 bg-black p-5 text-white shadow-[0_0_80px_rgba(212,175,55,0.18)]">
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-smc-gold">
            Steve Moran Coaching
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
            PBs UNLOCKED
          </h2>

          {biggestLift && (
  <div className="mt-5 overflow-hidden rounded-[1.7rem] border border-smc-gold/30 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.14),transparent_72%),#0a0a0a] p-5 text-left shadow-[0_0_40px_rgba(212,175,55,0.12)]">
    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-smc-gold/75">
      Biggest Lift Today
    </p>

    <h3 className="mt-2 text-2xl font-black text-white">
      {biggestLift.exerciseName}
    </h3>

    <div className="mt-3 flex items-end justify-between gap-3">
      <p className="text-4xl font-black leading-none text-white">
        {biggestLift.weight}kg × {biggestLift.reps}
      </p>

      {biggestLift.previousBest &&
      biggestLift.previousBest > 0 ? (
        <div className="rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1.5 text-sm font-black text-green-300">
          ↑{" "}
          {(
            biggestLift.weight - biggestLift.previousBest
          )
            .toFixed(1)
            .replace(".0", "")}
          kg
        </div>
      ) : null}
    </div>
  </div>
)}
        </div>

        <div className="mt-4 space-y-2">
  {pbResults.map((pb, index) => {
    const progress =
      pb.previousBest && pb.previousBest > 0
        ? pb.weight - pb.previousBest
        : null

    function getPBDisplayLabel() {
  if (pb.type === "heaviest") {
    return "Heaviest Set PB"
  }

  if (pb.type === "rep") {
    return `${pb.reps}RM PB`
  }

  return "PB"
}

    return (
      <div
        key={`${pb.exerciseName}-${pb.type}-${index}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">
            {pb.exerciseName}
          </p>

          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-smc-gold/80">
            {getPBDisplayLabel()}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-black text-white">
            {pb.weight}kg × {pb.reps}
          </p>

          {progress && progress > 0 ? (
            <p className="mt-0.5 text-xs font-black text-green-300">
              ↑ {progress.toFixed(1).replace(".0", "")}kg
            </p>
          ) : null}
        </div>
      </div>
    )
  })}
</div>
      </div>

      <button
  type="button"
  onClick={closePBModal}
  className="mt-4 mb-24 w-full rounded-2xl bg-smc-gold px-5 py-3 text-sm font-black text-black"
>
  Continue
</button>
    </div>
  </div>
)}

      {complete && !showPBModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 px-5 py-6 backdrop-blur-xl">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-smc-gold/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-5 text-center shadow-[0_0_80px_rgba(212,175,55,0.16)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_42%)]" />

            <div className="relative z-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-smc-gold/35 bg-smc-gold/[0.12] text-2xl text-smc-gold shadow-[0_0_34px_rgba(212,175,55,0.18)]">
                ✓
              </div>

              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-smc-gold/80">
                Workout Complete
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                Session locked in
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/50">
                Strong work. Your training has been saved and Steve can review
                anything uploaded from this session.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-lg font-black text-white">
                    {sessionStats.completedExercises}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
                    Exercises
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-lg font-black text-white">
                    {sessionStats.totalLoggedSets}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
                    Sets
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-lg font-black text-smc-gold">
                    {pbResults.length}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
                    PBs
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                {pbResults.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPBModal(true)}
                    className="w-full rounded-2xl border border-smc-gold/30 bg-smc-gold/[0.08] px-5 py-3 text-sm font-black text-smc-gold transition active:scale-[0.98]"
                  >
                    View PBs
                  </button>
                )}

                <Link
                  href="/dashboard"
                  className="w-full rounded-2xl bg-smc-gold px-5 py-3 text-sm font-black text-black shadow-[0_0_30px_rgba(212,175,55,0.22)] transition active:scale-[0.98]"
                >
                  Return Home
                </Link>

                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3 text-xs font-bold text-white/55 transition active:scale-[0.98]"
                >
                  Stay on session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}