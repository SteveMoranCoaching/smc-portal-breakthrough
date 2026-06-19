"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import AchievementUnlockToast from "@/components/AchievementUnlockToast"
import {
  checkWorkoutAchievements,
  checkPBAchievements,
} from "@/lib/achievements"

type SetEntry = {
  weight: string
  bodyweight?: string
  height?: string
  speed?: string
  distance?: string
  reps: string
  time?: string
  calories?: string
  rounds?: string
  rpe: string
}

type ExerciseEntry = {
  sets: SetEntry[]
  notes: string
  videos: File[]
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

type PreviousPerformanceSet = {
  weight: number
  reps: number
  rpe: string
  estimated1RM: number
}

type AchievementUnlock = {
  title: string
  description?: string
  category?: string
}

const card =
  "relative scroll-mt-24 overflow-hidden rounded-[1.35rem] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014))] shadow-[0_12px_30px_rgba(0,0,0,0.55)]"

const inputStyle =
  "h-11 min-h-11 rounded-xl border border-white/[0.07] bg-black/35 px-2 text-center text-base font-black text-white outline-none placeholder:text-white/20 transition focus:border-smc-gold/70 focus:bg-black/50 focus:shadow-[0_0_14px_rgba(212,175,55,0.12)]"


type LogPrimaryField = "kg" | "bodyweight" | "height" | "speed" | "distance" | "none"
type LogSecondaryField = "reps" | "time" | "distance" | "calories" | "rounds" | "none"

type ExerciseLogType = {
  primary: LogPrimaryField
  secondary: LogSecondaryField
}

const defaultLogType: ExerciseLogType = {
  primary: "kg",
  secondary: "reps",
}

const primaryFieldConfig: Record<LogPrimaryField, { key: keyof SetEntry | ""; label: string; placeholder: string; inputMode: "decimal" | "numeric" | "text"; type: string }> = {
  kg: { key: "weight", label: "Kg", placeholder: "Kg", inputMode: "decimal", type: "number" },
  bodyweight: { key: "bodyweight", label: "BW", placeholder: "BW", inputMode: "text", type: "text" },
  height: { key: "height", label: "Height", placeholder: "Height", inputMode: "decimal", type: "number" },
  speed: { key: "speed", label: "Speed", placeholder: "Speed", inputMode: "decimal", type: "number" },
  distance: { key: "distance", label: "Distance", placeholder: "Distance", inputMode: "decimal", type: "number" },
  none: { key: "", label: "", placeholder: "", inputMode: "text", type: "text" },
}

const secondaryFieldConfig: Record<LogSecondaryField, { key: keyof SetEntry | ""; label: string; placeholder: string; inputMode: "decimal" | "numeric" | "text"; type: string }> = {
  reps: { key: "reps", label: "Reps", placeholder: "Reps", inputMode: "numeric", type: "number" },
  time: { key: "time", label: "Time", placeholder: "Time", inputMode: "text", type: "text" },
  distance: { key: "distance", label: "Distance", placeholder: "Distance", inputMode: "decimal", type: "number" },
  calories: { key: "calories", label: "Calories", placeholder: "Cals", inputMode: "numeric", type: "number" },
  rounds: { key: "rounds", label: "Rounds", placeholder: "Rounds", inputMode: "numeric", type: "number" },
  none: { key: "", label: "", placeholder: "", inputMode: "text", type: "text" },
}

function getExerciseLogType(exercise: any): ExerciseLogType {
  return {
    primary: exercise?.logType?.primary || defaultLogType.primary,
    secondary: exercise?.logType?.secondary || defaultLogType.secondary,
  }
}

function createBlankSet(exercise?: any, inferredReps = ""): SetEntry {
  const logType = getExerciseLogType(exercise)
  const primaryKey = primaryFieldConfig[logType.primary].key
  const secondaryKey = secondaryFieldConfig[logType.secondary].key

  return {
    weight: "",
    bodyweight: primaryKey === "bodyweight" ? "BW" : "",
    height: "",
    speed: "",
    distance: "",
    reps: secondaryKey === "reps" ? inferredReps : "",
    time: "",
    calories: "",
    rounds: "",
    rpe: "",
  }
}

function getSetFieldValue(set: SetEntry, field: keyof SetEntry | "") {
  if (!field) return ""
  return String(set[field] || "")
}

function getLoggedFieldKeys(set: SetEntry) {
  return [
    "weight",
    "bodyweight",
    "height",
    "speed",
    "distance",
    "reps",
    "time",
    "calories",
    "rounds",
    "rpe",
  ] as (keyof SetEntry)[]
}

function formatFlexibleSet(set: SetEntry, exercise?: any) {
  const logType = getExerciseLogType(exercise)
  const primary = primaryFieldConfig[logType.primary]
  const secondary = secondaryFieldConfig[logType.secondary]

  const parts: string[] = []

  if (primary.key) {
    const value = getSetFieldValue(set, primary.key)
    if (value) {
      parts.push(logType.primary === "bodyweight" ? "BW" : `${value}${primary.label === "Kg" ? "kg" : ` ${primary.label}`}`)
    }
  }

  if (secondary.key) {
    const value = getSetFieldValue(set, secondary.key)
    if (value) {
      parts.push(logType.secondary === "reps" ? `× ${value}` : `${value} ${secondary.label}`)
    }
  }

  if (set.rpe) parts.push(`@ RPE ${set.rpe}`)

  return parts.length > 0 ? parts.join(" ") : "No data"
}

function getAutosaveKey(userId: string, sessionId: string) {
  return `smc-workout-autosave-${userId}-${sessionId}`
}

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
  const prescription = String(exercise?.prescription || "")
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

function getExerciseSection(exercise: any) {
  const section = String(
    exercise?.section || exercise?.type || exercise?.category || "main"
  )
    .toLowerCase()
    .trim()

  if (
    section === "warmup" ||
    section === "warm-up" ||
    section === "warm up" ||
    section === "mobility" ||
    section === "activation"
  ) {
    return "warmup"
  }

  if (
    section === "stretch" ||
    section === "stretches" ||
    section === "post-session-stretch" ||
    section === "post session stretch" ||
    section === "post_session_stretch" ||
    section === "cooldown" ||
    section === "cool-down" ||
    section === "cool down"
  ) {
    return "stretch"
  }

  if (
  section === "circuit" ||
  section === "circuit block" ||
  section === "conditioning circuit"
) {
  return "circuit"
}

  return "main"
}

function isWarmupExercise(exercise: any) {
  return getExerciseSection(exercise) === "warmup"
}

function isStretchExercise(exercise: any) {
  return getExerciseSection(exercise) === "stretch"
}

function isCircuitExercise(exercise: any) {
  return getExerciseSection(exercise) === "circuit"
}

function isMainExercise(exercise: any) {
  return getExerciseSection(exercise) === "main"
}

function getExerciseDisplayLabel(exercise: any) {
  const prescription = exercise?.prescription
  const notes = exercise?.notes

  if (prescription && notes) return `${prescription} · ${notes}`
  if (prescription) return prescription
  if (notes) return notes

  return "Complete before starting the main workout"
}

function toNumber(value: string | number | null | undefined) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function estimateOneRM(weight: number, reps: number) {
  if (!weight || !reps) return 0
  return Math.round(weight * (1 + reps / 30))
}

function isMainLift(exerciseName: string) {
  const name = exerciseName.toLowerCase().trim()

  return (
    name === "squat" ||
    name === "competition squat" ||
    name === "comp squat" ||
    name === "bench" ||
    name === "bench press" ||
    name === "competition bench press" ||
    name === "comp bench" ||
    name === "deadlift" ||
    name === "competition deadlift" ||
    name === "comp deadlift"
  )
}

function formatLogDate(dateString?: string | null) {
  if (!dateString) return "No date"

  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}

function getPreviousPerformance(previousLog: any) {
  const sets = Array.isArray(previousLog?.sets_completed)
    ? previousLog.sets_completed
    : []

  const parsedSets: PreviousPerformanceSet[] = sets
    .map((set: SetEntry) => {
      const weight = toNumber(set.weight)
      const reps = toNumber(set.reps)

      return {
        weight,
        reps,
        rpe: set.rpe || "",
        estimated1RM: estimateOneRM(weight, reps),
      }
    })
    .filter((set: PreviousPerformanceSet) => set.weight > 0 && set.reps > 0)

  if (parsedSets.length === 0) return null

  const bestSet = parsedSets.reduce((best, set) =>
    set.estimated1RM > best.estimated1RM ? set : best
  )

  return {
    date: formatLogDate(previousLog?.created_at),
    setCount: parsedSets.length,
    bestSet,
  }
}

function hasSetData(set: SetEntry) {
  return getLoggedFieldKeys(set).some((key) => Boolean(String(set[key] || "").trim()))
}

function isCompletedSet(set: SetEntry) {
  const hasPrimary = Boolean(set.weight || set.bodyweight || set.height || set.speed || set.distance)
  const hasSecondary = Boolean(set.reps || set.time || set.calories || set.rounds || set.distance)

  return hasPrimary && hasSecondary
}

function groupPBResults(results: PBResult[]) {
  const priority: Record<PBType, number> = {
    heaviest: 1,
    estimated_1rm: 2,
    rep: 3,
  }

  return results.sort((a, b) => priority[a.type] - priority[b.type]).slice(0, 2)
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-")
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

  if (
  isMainLift(exerciseName) &&
  bestCurrentEstimated.estimated1RM > previousBestEstimated
) {
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
  sessionId,
  programmeId,
  userId,
  previousLogs = [],
  exerciseDemos = [],
   existingLogs = [],
  isEditMode = false,
}: any) {
  const router = useRouter()
  const inputRefs = useRef<any[]>([])
  const exercises = useMemo(
    () => (Array.isArray(session?.exercises) ? session.exercises : []),
    [session?.exercises]
  )

  const initialFormData = useMemo(
  () =>
    exercises.map((exercise: any) => {
      const existingLog = existingLogs.find(
        (log: any) =>
          String(log.exercise_name || "").toLowerCase().trim() ===
          String(exercise.name || "").toLowerCase().trim()
      )

      if (existingLog) {
        return {
          sets:
            Array.isArray(existingLog.sets_completed) &&
            existingLog.sets_completed.length > 0
              ? existingLog.sets_completed.map((set: any) => ({
                  weight: set.weight?.toString() || "",
                  bodyweight: set.bodyweight?.toString() || "",
                  height: set.height?.toString() || "",
                  speed: set.speed?.toString() || "",
                  distance: set.distance?.toString() || "",
                  reps: set.reps?.toString() || "",
                  time: set.time?.toString() || "",
                  calories: set.calories?.toString() || "",
                  rounds: set.rounds?.toString() || "",
                  rpe: set.rpe?.toString() || "",
                }))
              : [
                  createBlankSet(exercise),
                ],
          notes: existingLog.notes || "",
          videos: [],
        }
      }

      const setCount = getPrescribedSetCount(exercise)

      return {
        sets: Array.from({ length: Math.max(1, setCount) }, () =>
          createBlankSet(exercise)
        ),
        notes: "",
        videos: [],
      }
    }),
  [exercises, existingLogs]
)

  const [activeDemo, setActiveDemo] = useState<any | null>(null)
  const [prefillMode, setPrefillMode] = useState<"unset" | "previous" | "blank">(
    "unset"
  )
  const [confirmedSets, setConfirmedSets] = useState<Record<string, boolean>>({})
  const [warmupComplete, setWarmupComplete] = useState<Record<string, boolean>>({})
  const [warmupSectionComplete, setWarmupSectionComplete] = useState(false)
  const [stretchComplete, setStretchComplete] = useState<Record<string, boolean>>({})
  const [stretchSectionComplete, setStretchSectionComplete] = useState(false)
  const [circuitComplete, setCircuitComplete] = useState<Record<string, boolean>>({})
  const [circuitExerciseComplete, setCircuitExerciseComplete] = useState<Record<string, boolean>>({})
  const autosaveKey = getAutosaveKey(userId, session.id)

const [formData, setFormData] = useState<ExerciseEntry[]>(initialFormData)
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
  const [saveError, setSaveError] = useState("")
  const [uploadingExercise, setUploadingExercise] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [complete, setComplete] = useState(false)
  const [pbResults, setPbResults] = useState<PBResult[]>([])
  const [showPBModal, setShowPBModal] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [sessionRating, setSessionRating] = useState("")
  const [sessionNotes, setSessionNotes] = useState("")
  const [achievementUnlock, setAchievementUnlock] =
    useState<AchievementUnlock | null>(null)

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

  const warmupExercises = useMemo(
    () =>
      exercises
        .map((exercise: any, index: number) => ({
          exercise,
          originalIndex: index,
        }))
        .filter((item: any) => isWarmupExercise(item.exercise)),
    [exercises]
  )

  const mainExercises = useMemo(
    () =>
      exercises
        .map((exercise: any, index: number) => ({
          exercise,
          originalIndex: index,
        }))
        .filter((item: any) => isMainExercise(item.exercise)),
    [exercises]
  )

  const stretchExercises = useMemo(
    () =>
      exercises
        .map((exercise: any, index: number) => ({
          exercise,
          originalIndex: index,
        }))
        .filter((item: any) => isStretchExercise(item.exercise)),
    [exercises]
  )

  const circuitExercises = useMemo(
  () =>
    exercises
      .map((exercise: any, index: number) => ({
        exercise,
        originalIndex: index,
      }))
      .filter((item: any) => isCircuitExercise(item.exercise)),
  [exercises]
)

  const warmupCompletedCount = warmupExercises.filter((item: any) => {
    const exerciseName =
      item.exercise?.name || `Warm-up ${item.originalIndex + 1}`

    return warmupComplete[`${item.originalIndex}-${exerciseName}`]
  }).length

  const warmupAllComplete =
    warmupExercises.length > 0 &&
    warmupCompletedCount >= warmupExercises.length &&
    warmupSectionComplete

  const stretchCompletedCount = stretchExercises.filter((item: any) => {
    const exerciseName =
      item.exercise?.name || `Stretch ${item.originalIndex + 1}`

    return stretchComplete[`${item.originalIndex}-${exerciseName}`]
  }).length

  const stretchAllComplete =
    stretchExercises.length > 0 &&
    stretchCompletedCount >= stretchExercises.length &&
    stretchSectionComplete

  const circuitCompletedCount = circuitExercises.filter((item: any) => {
    const circuit = item.exercise
    const exerciseIndex = item.originalIndex
    const circuitName = circuit?.name || `Circuit ${exerciseIndex + 1}`
    const circuitKey = getCircuitKey(exerciseIndex, circuitName)

    const nestedExercises = Array.isArray(circuit?.circuit?.exercises)
      ? circuit.circuit.exercises
      : []

    const nestedAllComplete =
      nestedExercises.length > 0 &&
      nestedExercises.every((circuitExercise: any, circuitExerciseIndex: number) => {
        const circuitExerciseName =
          circuitExercise.name || `Exercise ${circuitExerciseIndex + 1}`

        const circuitExerciseKey = getCircuitExerciseKey(
          exerciseIndex,
          circuitName,
          circuitExerciseIndex,
          circuitExerciseName
        )

        return Boolean(circuitExerciseComplete[circuitExerciseKey])
      })

    return Boolean(circuitComplete[circuitKey]) || nestedAllComplete
  }).length

  const circuitAnyCompletedCount = circuitExercises.reduce(
    (total: number, item: any) => {
      const circuit = item.exercise
      const exerciseIndex = item.originalIndex
      const circuitName = circuit?.name || `Circuit ${exerciseIndex + 1}`
      const circuitKey = getCircuitKey(exerciseIndex, circuitName)

      const outerComplete = circuitComplete[circuitKey] ? 1 : 0

      const nestedExercises = Array.isArray(circuit?.circuit?.exercises)
        ? circuit.circuit.exercises
        : []

      const nestedCompleteCount = nestedExercises.filter(
        (circuitExercise: any, circuitExerciseIndex: number) => {
          const circuitExerciseName =
            circuitExercise.name || `Exercise ${circuitExerciseIndex + 1}`

          const circuitExerciseKey = getCircuitExerciseKey(
            exerciseIndex,
            circuitName,
            circuitExerciseIndex,
            circuitExerciseName
          )

          return Boolean(circuitExerciseComplete[circuitExerciseKey])
        }
      ).length

      return total + outerComplete + nestedCompleteCount
    },
    0
  )

  const sessionStats = useMemo(() => {
    const mainEntries = mainExercises.map((item: any) => formData[item.originalIndex])

    const completedExercises = mainEntries.filter((entry: {
  sets: any[]
}) => {
      const completedSetCount = entry?.sets.filter((set: any) => isCompletedSet(set)).length || 0
      return completedSetCount >= Math.max(1, entry?.sets.length || 1)
    }).length

    const totalCompletedSets = mainEntries.reduce((total: number, entry: any) => {
  return total + (entry?.sets.filter((set: any) => isCompletedSet(set)).length || 0)
}, 0)

const totalLoggedSets = mainEntries.reduce((total: number, entry: any) => {
  return total + (entry?.sets.filter((set: any) => hasSetData(set)).length || 0)
}, 0)

const hasAnyLoggedWork =
  mainEntries.some((entry: any) => {
    return (
      entry?.sets.some((set: any) => hasSetData(set)) ||
      entry?.notes.trim().length > 0 ||
      Boolean(entry?.videos.length > 0)
    )
  }) || warmupCompletedCount > 0
  || circuitAnyCompletedCount > 0
  || stretchCompletedCount > 0

    const totalProgressItems = mainExercises.length + circuitExercises.length
    const completedProgressItems = completedExercises + circuitCompletedCount

    const progress =
      totalProgressItems > 0
        ? Math.round((completedProgressItems / totalProgressItems) * 100)
        : warmupAllComplete || stretchAllComplete
          ? 100
          : 0

    return {
      completedExercises,
      totalCompletedSets,
      totalLoggedSets,
      hasAnyLoggedWork,
      progress,
    }
  }, [
    formData,
    mainExercises,
    warmupAllComplete,
    warmupCompletedCount,
    stretchCompletedCount,
    stretchAllComplete,
    circuitExercises,
    circuitCompletedCount,
    circuitAnyCompletedCount,
  ])

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

  function getSetKey(exerciseIndex: number, setIndex: number) {
    return `${exerciseIndex}-${setIndex}`
  }

  function fillFromPreviousSession() {
    setPrefillMode("previous")
    setConfirmedSets({})
    setSaveError("")

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
              ...createBlankSet(exercise),
              weight: previousSet.weight?.toString() || "",
              bodyweight: previousSet.bodyweight?.toString() || "",
              height: previousSet.height?.toString() || "",
              speed: previousSet.speed?.toString() || "",
              distance: previousSet.distance?.toString() || "",
              reps: previousSet.reps?.toString() || "",
              time: previousSet.time?.toString() || "",
              calories: previousSet.calories?.toString() || "",
              rounds: previousSet.rounds?.toString() || "",
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
    setSaveError("")
  }

  function getWarmupKey(exerciseIndex: number, exerciseName: string) {
    return `${exerciseIndex}-${exerciseName}`
  }

  function toggleWarmupItem(exerciseIndex: number, exerciseName: string) {
    const key = getWarmupKey(exerciseIndex, exerciseName)

    setWarmupComplete((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  function getStretchKey(exerciseIndex: number, exerciseName: string) {
    return `${exerciseIndex}-${exerciseName}`
  }

  function getCircuitKey(exerciseIndex: number, circuitName: string) {
  return `${exerciseIndex}-${circuitName}`
}

function getCircuitExerciseKey(
  exerciseIndex: number,
  circuitName: string,
  circuitExerciseIndex: number,
  circuitExerciseName: string
) {
  return `${exerciseIndex}-${circuitName}-${circuitExerciseIndex}-${circuitExerciseName}`
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
    }, 80)
  }

  function updateSetField(
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetEntry,
    value: string
  ) {
    markSetActive(exerciseIndex, setIndex)
    setSaveError("")

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
          sets: [...exercise.sets, createBlankSet(exercises[exerciseIndex])],
        }
      })
    )

    const nextFocusField =
      primaryFieldConfig[getExerciseLogType(exercises[exerciseIndex]).primary].key ||
      "rpe"

    focusInput(exerciseIndex, nextSetIndex, nextFocusField as keyof SetEntry)
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
    setSaveError("")

    setFormData((current) =>
      current.map((exercise, i) =>
        i === exerciseIndex ? { ...exercise, notes: value } : exercise
      )
    )
  }

  function updateVideos(exerciseIndex: number, files: FileList | null) {
  setSaveError("")

  if (!files || files.length === 0) return

  const newFiles = Array.from(files)

  setFormData((current) =>
    current.map((exercise, i) =>
      i === exerciseIndex
        ? {
            ...exercise,
            videos: [...exercise.videos, ...newFiles],
          }
        : exercise
    )
  )
}

function removeVideo(exerciseIndex: number, videoIndex: number) {
  setFormData((current) =>
    current.map((exercise, i) =>
      i === exerciseIndex
        ? {
            ...exercise,
            videos: exercise.videos.filter((_, j) => j !== videoIndex),
          }
        : exercise
    )
  )
}

  async function fetchHistoricalLogsByExercise() {
    const exerciseNames = exercises
      .filter((exercise: any) => isMainExercise(exercise))
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
      if (!isMainExercise(exercise)) return

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
    setUploadProgress(0)

    try {
      const historicalLogsByExercise = await fetchHistoricalLogsByExercise()
      const failedUploads: string[] = []

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
        

for (let videoIndex = 0; videoIndex < data.videos.length; videoIndex++) {
  const video = data.videos[videoIndex]

  const percent = Math.round(
    ((videoIndex + 1) / data.videos.length) * 100
  )

  setUploadProgress(percent)

  setUploadingExercise(
    `Uploading ${exerciseName} (${percent}%)`
  )

  const filePath = `${userId}/${session.id}/${i}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${safeFileName(
    video.name
  )}`

  const { error: uploadError } = await supabase.storage
    .from("exercise-videos")
    .upload(filePath, video)

  if (uploadError) {
    failedUploads.push(`${exerciseName}: ${uploadError.message}`)
    continue
  }

  const { error: videoError } = await supabase
    .from("exercise_videos")
    .insert({
      user_id: userId,
      programme_id: programmeId,
      session_id: session.id,
      exercise_name: exerciseName,
      exercise_index: i,
      video_path: filePath,
      reviewed: false,
    })

  if (videoError) {
    failedUploads.push(`${exerciseName}: ${videoError.message}`)
    continue
  }
}

      }

      setMessage("Checking PBs...")

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
}

      if (failedUploads.length > 0) {
  setSaveError(
    "Workout saved, but one or more videos failed to upload. You can retry them later."
  )
}

const { error: completionError } = await supabase
  .from("session_completions")
  .upsert({
    user_id: userId,
    programme_id: programmeId,
    session_id: session.id,
    completed: true,
    session_rating: sessionRating
      ? Number(sessionRating)
      : null,
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
setUploadProgress(0)
setSaving(false)
    } catch (err: any) {
      setSaveError(
        err?.message
          ? `Couldn’t save this workout: ${err.message}`
          : "Couldn’t save this workout. Check your connection and try again."
      )
      setMessage("")
      setUploadingExercise("")
      setUploadProgress(0)
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
          <details
            open={!warmupAllComplete}
            className={`${card} p-3 transition-all duration-300 ${
              warmupAllComplete
                ? "border-emerald-400/25 shadow-[0_0_28px_rgba(52,211,153,0.10)]"
                : "border-smc-gold/20"
            }`}
          >
            <summary className="cursor-pointer list-none">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

              {warmupAllComplete && (
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.10),transparent_34%)]" />
              )}

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/70">
                    Warm-up / Mobility
                  </p>

                  <h3 className="mt-1 text-lg font-black text-white">
                    Prep Work
                  </h3>

                  <p className="mt-1 text-xs text-white/45">
                    {warmupCompletedCount}/{warmupExercises.length} complete ·
                    Tap to expand
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${
                    warmupAllComplete
                      ? "bg-emerald-400 text-black"
                      : "border border-smc-gold/25 bg-smc-gold/[0.08] text-smc-gold"
                  }`}
                >
                  {warmupAllComplete ? "Done" : "Start"}
                </span>
              </div>
            </summary>

            <div className="relative z-10 mt-3 flex flex-col gap-2">
              {warmupExercises.map((item: any) => {
                const warmup = item.exercise
                const exerciseIndex = item.originalIndex
                const exerciseName =
                  warmup?.name || `Warm-up ${exerciseIndex + 1}`
                const demo = getDemoForExercise(exerciseDemos, exerciseName)
                const warmupKey = getWarmupKey(exerciseIndex, exerciseName)
                const itemComplete = Boolean(warmupComplete[warmupKey])

                return (
                  <div
                    key={warmupKey}
                    className={`rounded-2xl border p-3 transition ${
                      itemComplete
                        ? "border-emerald-400/25 bg-emerald-400/[0.07]"
                        : "border-white/[0.06] bg-black/25"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-white">
                          {exerciseName}
                        </p>

                        <p className="mt-1 break-words text-xs leading-5 text-white/45">
                          {getExerciseDisplayLabel(warmup)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleWarmupItem(exerciseIndex, exerciseName)
                        }
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black transition active:scale-95 ${
                          itemComplete
                            ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-300"
                            : "border-white/10 bg-white/[0.035] text-white/35"
                        }`}
                        aria-label={`Mark ${exerciseName} complete`}
                      >
                        ✓
                      </button>
                    </div>

                    {demo && (
                      <button
                        type="button"
                        onClick={() => demo?.video_url && setActiveDemo(demo)}
                        disabled={!demo?.video_url}
                        className="group relative mt-2.5 h-[76px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-left disabled:cursor-default"
                      >
                        {demo?.thumbnail_url ? (
                          <img
                            src={demo.thumbnail_url}
                            alt={`${exerciseName} demo`}
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
                  </div>
                )
              })}

              <button
                type="button"
                onClick={() => setWarmupSectionComplete(true)}
                disabled={warmupCompletedCount < warmupExercises.length}
                className="mt-1 min-h-11 w-full rounded-2xl bg-smc-gold px-4 py-2 text-xs font-black text-black transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                {warmupCompletedCount >= warmupExercises.length
                  ? "Mark Warm-up Complete"
                  : "Tick all warm-up items first"}
              </button>
            </div>
          </details>
        )}

        {circuitExercises.length > 0 && (
          <section className={`${card} p-3`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

            <div className="relative z-10">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/70">
                Circuit Block
              </p>

              <h3 className="mt-1 text-lg font-black text-white">
                Conditioning Work
              </h3>

              <p className="mt-1 text-xs text-white/45">
                Complete each circuit as prescribed.
              </p>

              <div className="mt-3 space-y-2">
                {circuitExercises.map((item: any) => {
                  const circuit = item.exercise
                  const exerciseIndex = item.originalIndex
                  const circuitName =
                    circuit?.name || `Circuit ${exerciseIndex + 1}`

                  const circuitKey = getCircuitKey(exerciseIndex, circuitName)
                  const nestedExercises = Array.isArray(circuit?.circuit?.exercises)
                    ? circuit.circuit.exercises
                    : []

                  const nestedAllComplete =
                    nestedExercises.length > 0 &&
                    nestedExercises.every(
                      (circuitExercise: any, circuitExerciseIndex: number) => {
                        const circuitExerciseName =
                          circuitExercise.name ||
                          `Exercise ${circuitExerciseIndex + 1}`

                        const circuitExerciseKey = getCircuitExerciseKey(
                          exerciseIndex,
                          circuitName,
                          circuitExerciseIndex,
                          circuitExerciseName
                        )

                        return Boolean(circuitExerciseComplete[circuitExerciseKey])
                      }
                    )

                  const itemComplete =
                    Boolean(circuitComplete[circuitKey]) || nestedAllComplete

                  return (
                    <div
                      key={`${circuitName}-${exerciseIndex}`}
                      className={`rounded-2xl border p-3 transition ${
                        itemComplete
                          ? "border-smc-gold/35 bg-smc-gold/[0.07]"
                          : "border-white/[0.06] bg-black/25"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-black text-white">
                            {circuitName}
                          </p>

                          <p className="mt-1 break-words text-xs leading-5 text-white/45">
                            {circuit?.prescription || "Complete as prescribed."}
                          </p>

                          {circuit?.circuit && (
                            <div className="mt-3 space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-smc-gold/20 bg-smc-gold/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold">
                                  {circuit.circuit.rounds || 1} rounds
                                </span>

                                {circuit.circuit.workSeconds > 0 && (
                                  <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/50">
                                    {circuit.circuit.workSeconds}s work
                                  </span>
                                )}

                                {circuit.circuit.restSeconds > 0 && (
                                  <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/50">
                                    {circuit.circuit.restSeconds}s rest
                                  </span>
                                )}
                              </div>

                              {nestedExercises.length > 0 && (
                                <div className="space-y-2">
                                  {nestedExercises.map(
                                    (
                                      circuitExercise: any,
                                      circuitExerciseIndex: number
                                    ) => {
                                      const circuitExerciseName =
                                        circuitExercise.name ||
                                        `Exercise ${circuitExerciseIndex + 1}`

                                      const circuitExerciseKey =
                                        getCircuitExerciseKey(
                                          exerciseIndex,
                                          circuitName,
                                          circuitExerciseIndex,
                                          circuitExerciseName
                                        )

                                      const circuitExerciseDone = Boolean(
                                        circuitExerciseComplete[
                                          circuitExerciseKey
                                        ]
                                      )

                                      return (
                                        <div
                                          key={circuitExerciseKey}
                                          className={`rounded-xl border px-3 py-2 transition ${
                                            circuitExerciseDone
                                              ? "border-smc-gold/35 bg-smc-gold/[0.08]"
                                              : "border-white/[0.055] bg-black/30"
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="text-sm font-black text-white">
                                                {circuitExerciseName}
                                              </p>

                                              {circuitExercise.prescription && (
                                                <p className="mt-0.5 text-xs leading-5 text-white/45">
                                                  {
                                                    circuitExercise.prescription
                                                  }
                                                </p>
                                              )}
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                toggleCircuitExerciseItem(
                                                  exerciseIndex,
                                                  circuitName,
                                                  circuitExerciseIndex,
                                                  circuitExerciseName
                                                )
                                              }
                                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black transition active:scale-95 ${
                                                circuitExerciseDone
                                                  ? "border-smc-gold/60 bg-smc-gold/25 text-smc-gold"
                                                  : "border-white/10 bg-white/[0.035] text-white/35"
                                              }`}
                                              aria-label={`Mark ${circuitExerciseName} complete`}
                                            >
                                              ✓
                                            </button>
                                          </div>
                                        </div>
                                      )
                                    }
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            toggleCircuitItem(exerciseIndex, circuitName)
                          }
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black transition active:scale-95 ${
                            itemComplete
                              ? "border-smc-gold/50 bg-smc-gold/20 text-smc-gold"
                              : "border-white/10 bg-white/[0.035] text-white/35"
                          }`}
                          aria-label={`Mark ${circuitName} complete`}
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {exercises.map((ex: any, exerciseIndex: number) => {
          if (!isMainExercise(ex)) return null

          const exerciseName = ex?.name || `Exercise ${exerciseIndex + 1}`
          const previousLog = getPreviousLogForExercise(previousLogs, exerciseName)
          const previousPerformance = getPreviousPerformance(previousLog)
          const demo = getDemoForExercise(exerciseDemos, exerciseName)
          const entry = formData[exerciseIndex]
          const completedSetCount = entry?.sets.filter((set: any) => isCompletedSet(set)).length || 0
          const exerciseComplete =
            completedSetCount >= Math.max(1, entry?.sets.length || 1)

          return (
            <div
              key={`${exerciseName}-${exerciseIndex}`}
              className={`${card} p-3 transition-all duration-300 ${
                exerciseComplete
                  ? "border-smc-gold/25 shadow-[0_0_28px_rgba(212,175,55,0.10)]"
                  : ""
              }`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

              {exerciseComplete && (
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.13),transparent_34%)]" />
              )}

              <div className="relative z-10">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/70">
                      Exercise {exerciseIndex + 1}
                    </p>

                    {exerciseComplete && (
                      <span className="rounded-full border border-smc-gold/35 bg-smc-gold/[0.12] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-smc-gold">
                        ✓ Complete
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1 break-words text-xl font-black leading-tight text-white">
                    {exerciseName}
                  </h3>

                  <div className="mt-2 flex justify-center">
                    <span className="max-w-full break-words rounded-full border border-smc-gold/25 bg-smc-gold/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-smc-gold">
                      {ex?.prescription || "No prescription"}
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
                        alt={`${exerciseName} demo`}
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

                {ex?.notes && (
                  <p className="mt-2 break-words text-xs leading-5 text-white/45">
                    {ex.notes}
                  </p>
                )}

                {previousPerformance && (
                  <div className="mt-3 rounded-2xl border border-smc-gold/15 bg-smc-gold/[0.045] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-smc-gold/75">
                        Previous Performance
                      </p>

                      <p className="text-[10px] font-bold text-white/35">
                        Last completed {previousPerformance.date}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/[0.06] bg-black/25 p-2.5 text-center">
                        <p className="text-base font-black text-white">
                          {previousPerformance.bestSet.weight}kg ×{" "}
                          {previousPerformance.bestSet.reps}
                        </p>

                        <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white/35">
                          Best Previous Set
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-black/25 p-2.5 text-center">
                        <p className="text-base font-black text-white">
                          {previousPerformance.setCount}
                        </p>

                        <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white/35">
                          Sets Logged
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2">
                      <p className="text-[10px] font-medium text-white/38">
                        Last session: {previousPerformance.setCount}{" "}
                        {previousPerformance.setCount === 1 ? "set" : "sets"}
                        {previousPerformance.bestSet.rpe
                          ? ` · Best set RPE ${previousPerformance.bestSet.rpe}`
                          : ""}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  {formData[exerciseIndex]?.sets.map((set, setIndex) => {
                    const logType = getExerciseLogType(exercise)
                    const primaryField = primaryFieldConfig[logType.primary]
                    const secondaryField = secondaryFieldConfig[logType.secondary]
                    const primaryKey = primaryField.key
                    const secondaryKey = secondaryField.key
                    const setHasData = hasSetData(set)
                    const previousSet = previousLog?.sets_completed?.[setIndex]
                    const setKey = getSetKey(exerciseIndex, setIndex)
                    const isConfirmed = confirmedSets[setKey]
                    const setComplete = isCompletedSet(set)
                    const isPrefilledUnconfirmed =
                      prefillMode === "previous" && setHasData && !isConfirmed

                    return (
                      <div
                        key={setIndex}
                        className={`rounded-2xl border px-2.5 py-2.5 transition ${
                          setComplete
                            ? "border-smc-gold/45 bg-smc-gold/[0.075] shadow-[0_0_16px_rgba(212,175,55,0.09)]"
                            : isConfirmed
                              ? "border-smc-gold/30 bg-smc-gold/[0.05]"
                              : isPrefilledUnconfirmed
                                ? "border-white/5 bg-white/[0.02] opacity-80"
                                : setHasData
                                  ? "border-smc-gold/22 bg-smc-gold/[0.04]"
                                  : "border-white/[0.055] bg-black/20"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                                Set {setIndex + 1}
                              </p>

                              {previousSet && (
                                <p className="text-[10px] font-semibold text-white/45">
                                  Last: {formatFlexibleSet(previousSet, exercise)}
                                </p>
                              )}

                              {setComplete && (
                                <p className="text-[10px] font-black text-smc-gold">
                                  ✓ Logged
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => confirmSet(exerciseIndex, setIndex)}
                              className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-black transition active:scale-95 ${
                                isConfirmed || setComplete
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
                                className="min-h-8 rounded-full border border-red-500/15 bg-red-500/[0.07] px-2.5 py-1 text-[10px] font-bold text-red-300/80 transition active:scale-[0.98]"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          {primaryKey && (
                            <input
                              ref={(el) =>
                                setInputRef(exerciseIndex, setIndex, primaryKey, el)
                              }
                              type={primaryField.type}
                              inputMode={primaryField.inputMode}
                              placeholder={primaryField.placeholder}
                              value={getSetFieldValue(set, primaryKey)}
                              onFocus={handleInputFocus}
                              onBlur={handleInputBlur}
                              onChange={(e) =>
                                updateSetField(
                                  exerciseIndex,
                                  setIndex,
                                  primaryKey,
                                  e.target.value
                                )
                              }
                              className={`${inputStyle} ${
                                isPrefilledUnconfirmed
                                  ? "text-white/45"
                                  : "text-white"
                              }`}
                            />
                          )}

                          {secondaryKey && (
                            <input
                              ref={(el) =>
                                setInputRef(exerciseIndex, setIndex, secondaryKey, el)
                              }
                              type={secondaryField.type}
                              inputMode={secondaryField.inputMode}
                              placeholder={secondaryField.placeholder}
                              value={getSetFieldValue(set, secondaryKey)}
                              onFocus={handleInputFocus}
                              onBlur={handleInputBlur}
                              onChange={(e) =>
                                updateSetField(
                                  exerciseIndex,
                                  setIndex,
                                  secondaryKey,
                                  e.target.value
                                )
                              }
                              className={`${inputStyle} ${
                                isPrefilledUnconfirmed
                                  ? "text-white/45"
                                  : "text-white"
                              }`}
                            />
                          )}

                          <input
                            ref={(el) =>
                              setInputRef(exerciseIndex, setIndex, "rpe", el)
                            }
                            type="number"
                            inputMode="decimal"
                            placeholder="RPE"
                            value={set.rpe}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
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
                    className="min-h-11 w-full rounded-2xl border border-smc-gold/25 bg-smc-gold/[0.06] px-4 py-2 text-xs font-black text-smc-gold transition active:scale-[0.98]"
                  >
                    + Add Extra Set
                  </button>
                </div>

                <textarea
                  placeholder="Exercise notes..."
                  value={formData[exerciseIndex]?.notes || ""}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onChange={(e) => updateNotes(exerciseIndex, e.target.value)}
                  className="mt-2.5 w-full rounded-2xl border border-white/5 bg-black/25 p-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/60"
                  rows={2}
                />

                <div className="mt-2.5 rounded-2xl border border-white/[0.055] bg-black/20 p-2.5">
                  <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                    Upload video
                  </p>

                  <input
  type="file"
  accept="video/*"
  multiple
  onChange={(e) => updateVideos(exerciseIndex, e.target.files)}
  className="w-full text-[11px] text-white/55 file:mr-2 file:rounded-xl file:border-0 file:bg-white/[0.07] file:px-2.5 file:py-2 file:text-[11px] file:font-bold file:text-white/75"
/>

{formData[exerciseIndex]?.videos.length > 0 && (
  <div className="mt-2 space-y-1.5">
    {formData[exerciseIndex].videos.map((video, videoIndex) => (
      <div
        key={`${video.name}-${videoIndex}`}
        className="flex items-center justify-between gap-2 rounded-xl border border-smc-gold/20 bg-smc-gold/[0.06] px-3 py-2"
      >
        <p className="min-w-0 truncate text-[10px] font-bold text-smc-gold/80">
          Video ready: {video.name}
        </p>

        <button
          type="button"
          onClick={() => removeVideo(exerciseIndex, videoIndex)}
          className="shrink-0 text-[10px] font-black text-red-300"
        >
          Remove
        </button>
      </div>
    ))}
  </div>
)}
                </div>
              </div>
            </div>
          )
        })}

      {stretchExercises.length > 0 && (
          <details
            open={!stretchAllComplete}
            className={`${card} p-3 transition-all duration-300 ${
              stretchAllComplete
                ? "border-blue-400/25 shadow-[0_0_28px_rgba(96,165,250,0.10)]"
                : "border-blue-400/20"
            }`}
          >
            <summary className="cursor-pointer list-none">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/35 to-transparent" />

              {stretchAllComplete && (
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_34%)]" />
              )}

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-blue-300/80">
                    Post Session Stretch
                  </p>

                  <h3 className="mt-1 text-lg font-black text-white">
                    Cool Down
                  </h3>

                  <p className="mt-1 text-xs text-white/45">
                    {stretchCompletedCount}/{stretchExercises.length} complete ·
                    Tap to expand
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${
                    stretchAllComplete
                      ? "bg-blue-400 text-black"
                      : "border border-blue-400/25 bg-blue-400/[0.08] text-blue-300"
                  }`}
                >
                  {stretchAllComplete ? "Done" : "Finish"}
                </span>
              </div>
            </summary>

            <div className="relative z-10 mt-3 flex flex-col gap-2">
              {stretchExercises.map((item: any) => {
                const stretch = item.exercise
                const exerciseIndex = item.originalIndex
                const exerciseName =
                  stretch?.name || `Stretch ${exerciseIndex + 1}`
                const demo = getDemoForExercise(exerciseDemos, exerciseName)
                const stretchKey = getStretchKey(exerciseIndex, exerciseName)
                const itemComplete = Boolean(stretchComplete[stretchKey])

                return (
                  <div
                    key={stretchKey}
                    className={`rounded-2xl border p-3 transition ${
                      itemComplete
                        ? "border-blue-400/25 bg-blue-400/[0.07]"
                        : "border-white/[0.06] bg-black/25"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-white">
                          {exerciseName}
                        </p>

                        <p className="mt-1 break-words text-xs leading-5 text-white/45">
                          {getExerciseDisplayLabel(stretch)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleStretchItem(exerciseIndex, exerciseName)
                        }
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black transition active:scale-95 ${
                          itemComplete
                            ? "border-blue-400/50 bg-blue-400/20 text-blue-300"
                            : "border-white/10 bg-white/[0.035] text-white/35"
                        }`}
                        aria-label={`Mark ${exerciseName} complete`}
                      >
                        ✓
                      </button>
                    </div>

                    {demo && (
                      <button
                        type="button"
                        onClick={() => demo?.video_url && setActiveDemo(demo)}
                        disabled={!demo?.video_url}
                        className="group relative mt-2.5 h-[76px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-left disabled:cursor-default"
                      >
                        {demo?.thumbnail_url ? (
                          <img
                            src={demo.thumbnail_url}
                            alt={`${exerciseName} demo`}
                            className="h-full w-full object-cover opacity-80 transition group-hover:scale-[1.03] group-hover:opacity-100"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.10),transparent_55%),#070707] px-4 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300/65">
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
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-400/60 bg-black/55 text-blue-300 shadow-[0_0_14px_rgba(96,165,250,0.20)] backdrop-blur">
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
                  </div>
                )
              })}

              <button
                type="button"
                onClick={() => setStretchSectionComplete(true)}
                disabled={stretchCompletedCount < stretchExercises.length}
                className="mt-1 min-h-11 w-full rounded-2xl bg-blue-400 px-4 py-2 text-xs font-black text-black transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                {stretchCompletedCount >= stretchExercises.length
                  ? "Mark Stretch Complete"
                  : "Tick all stretch items first"}
              </button>
            </div>
          </details>
        )}
              </div>

      {!keyboardActive && (
        <div className="fixed inset-x-0 bottom-[92px] z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto w-full max-w-5xl rounded-[1.35rem] border border-white/[0.07] bg-black/90 p-2 shadow-[0_-10px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
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
              disabled={
  saving ||
  (uploadProgress > 0 && uploadProgress < 100) ||
  !sessionStats.hasAnyLoggedWork
}
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
                {saveError ||
  (uploadingExercise
    ? `${uploadingExercise}`
    : message)}
              </p>
            )}
          </div>
        </div>
      )}

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
      if (pb.type === "estimated_1rm") {
        return "Estimated 1RM PB"
      }

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