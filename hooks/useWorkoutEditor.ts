"use client"

import { useMemo, useRef, useState } from "react"

import type { SetEntry } from "@/lib/pbs"
import {
  createBlankSet,
  getExerciseLogType,
  primaryFieldConfig,
} from "@/lib/exerciseLogTypes"
import {
  getPrescribedSetCount,
  getPreviousLogForExercise,
} from "@/lib/exerciseHelpers"
import { getSetKey } from "@/lib/workoutKeys"

export type UploadedVideo = {
  path: string
  name: string
  type: "image" | "video" | "file"
  size: number
}

export type ExerciseEntry = {
  sets: SetEntry[]
  notes: string
  videos: UploadedVideo[]
}

type UseWorkoutEditorArgs = {
  exercises: any[]
  previousLogs: any[]
  existingLogs: any[]
  onEdit: () => void
}

function normaliseSet(set: any): SetEntry {
  return {
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
  }
}

function createInitialFormData(
  exercises: any[],
  existingLogs: any[]
): ExerciseEntry[] {
  return exercises.map((exercise: any) => {
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
            ? existingLog.sets_completed.map(normaliseSet)
            : [createBlankSet(exercise)],
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
  })
}

export default function useWorkoutEditor({
  exercises,
  previousLogs,
  existingLogs,
  onEdit,
}: UseWorkoutEditorArgs) {
  const inputRefs = useRef<any[]>([])

  const initialFormData = useMemo(
    () => createInitialFormData(exercises, existingLogs),
    [exercises, existingLogs]
  )

  const [formData, setFormData] =
    useState<ExerciseEntry[]>(initialFormData)

  const [prefillMode, setPrefillMode] = useState<
    "unset" | "previous" | "blank"
  >("unset")

  const [confirmedSets, setConfirmedSets] = useState<
    Record<string, boolean>
  >({})

  function fillFromPreviousSession() {
    setPrefillMode("previous")
    setConfirmedSets({})
    onEdit()

    setFormData((current) =>
      current.map((exerciseEntry, exerciseIndex) => {
        const exercise = exercises[exerciseIndex]

        const previousLog = getPreviousLogForExercise(
          previousLogs,
          exercise?.name
        )

        if (!previousLog?.sets_completed) {
          return exerciseEntry
        }

        return {
          ...exerciseEntry,
          sets: exerciseEntry.sets.map((set, setIndex) => {
            const previousSet =
              previousLog.sets_completed?.[setIndex]

            if (!previousSet) return set

            return {
              ...createBlankSet(exercise),
              ...normaliseSet(previousSet),
            }
          }),
        }
      })
    )
  }

  function startBlankSession() {
    setPrefillMode("blank")
    setConfirmedSets({})
    onEdit()
  }

  function confirmSet(
    exerciseIndex: number,
    setIndex: number
  ) {
    setConfirmedSets((current) => ({
      ...current,
      [getSetKey(exerciseIndex, setIndex)]: true,
    }))
  }

  function markSetActive(
    exerciseIndex: number,
    setIndex: number
  ) {
    setConfirmedSets((current) => ({
      ...current,
      [getSetKey(exerciseIndex, setIndex)]: true,
    }))
  }

  function setInputRef(
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetEntry,
    element: HTMLInputElement | null
  ) {
    if (!inputRefs.current[exerciseIndex]) {
      inputRefs.current[exerciseIndex] = []
    }

    if (!inputRefs.current[exerciseIndex][setIndex]) {
      inputRefs.current[exerciseIndex][setIndex] = {}
    }

    inputRefs.current[exerciseIndex][setIndex][field] =
      element
  }

  function focusInput(
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetEntry
  ) {
    window.setTimeout(() => {
      inputRefs.current?.[exerciseIndex]?.[setIndex]?.[
        field
      ]?.focus()
    }, 80)
  }

  function updateSetField(
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetEntry,
    value: string
  ) {
    markSetActive(exerciseIndex, setIndex)
    onEdit()

    setFormData((current) =>
      current.map((exerciseEntry, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex) {
          return exerciseEntry
        }

        return {
          ...exerciseEntry,
          sets: exerciseEntry.sets.map(
            (set, currentSetIndex) =>
              currentSetIndex === setIndex
                ? { ...set, [field]: value }
                : set
          ),
        }
      })
    )
  }

  function addSet(exerciseIndex: number) {
    const nextSetIndex =
      formData[exerciseIndex]?.sets.length || 0

    setFormData((current) =>
      current.map((exerciseEntry, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex) {
          return exerciseEntry
        }

        return {
          ...exerciseEntry,
          sets: [
            ...exerciseEntry.sets,
            createBlankSet(exercises[exerciseIndex]),
          ],
        }
      })
    )

    onEdit()

    const logType = getExerciseLogType(
      exercises[exerciseIndex]
    )

    const nextFocusField =
      primaryFieldConfig[logType.primary].key || "rpe"

    focusInput(
      exerciseIndex,
      nextSetIndex,
      nextFocusField as keyof SetEntry
    )
  }

  function removeSet(
    exerciseIndex: number,
    setIndex: number
  ) {
    setFormData((current) =>
      current.map((exerciseEntry, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex) {
          return exerciseEntry
        }

        if (exerciseEntry.sets.length === 1) {
          return exerciseEntry
        }

        return {
          ...exerciseEntry,
          sets: exerciseEntry.sets.filter(
            (_, currentSetIndex) =>
              currentSetIndex !== setIndex
          ),
        }
      })
    )

    onEdit()
  }

  function updateNotes(
    exerciseIndex: number,
    value: string
  ) {
    onEdit()

    setFormData((current) =>
      current.map((exerciseEntry, currentExerciseIndex) =>
        currentExerciseIndex === exerciseIndex
          ? { ...exerciseEntry, notes: value }
          : exerciseEntry
      )
    )
  }

  function addUploadedVideo(
    exerciseIndex: number,
    video: UploadedVideo
  ) {
    onEdit()

    setFormData((current) =>
      current.map((exerciseEntry, currentExerciseIndex) =>
        currentExerciseIndex === exerciseIndex
          ? {
              ...exerciseEntry,
              videos: [...exerciseEntry.videos, video],
            }
          : exerciseEntry
      )
    )
  }

  function clearUploadedVideos(exerciseIndex: number) {
    setFormData((current) =>
      current.map((exerciseEntry, currentExerciseIndex) =>
        currentExerciseIndex === exerciseIndex
          ? { ...exerciseEntry, videos: [] }
          : exerciseEntry
      )
    )

    onEdit()
  }

  function removeUploadedVideo(
    exerciseIndex: number,
    videoIndex: number
  ) {
    setFormData((current) =>
      current.map((exerciseEntry, currentExerciseIndex) =>
        currentExerciseIndex === exerciseIndex
          ? {
              ...exerciseEntry,
              videos: exerciseEntry.videos.filter(
                (_, currentVideoIndex) =>
                  currentVideoIndex !== videoIndex
              ),
            }
          : exerciseEntry
      )
    )

    onEdit()
  }

  return {
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
  }
}