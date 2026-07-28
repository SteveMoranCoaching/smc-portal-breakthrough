import { useMemo } from "react"
import {
  isCircuitExercise,
  isMainExercise,
  isStretchExercise,
  isSupersetExercise,
  isWarmupExercise,
} from "@/lib/exerciseSections"
import {
  getCircuitExerciseKey,
  getCircuitKey,
} from "@/lib/workoutKeys"
import {
  hasSetData,
  isCompletedExercise,
  isCompletedSet,
} from "@/lib/setStatus"

type UseWorkoutProgressArgs = {
  exercises: any[]
  formData: any[]
  warmupComplete: Record<string, boolean>
  warmupSectionComplete: boolean
  stretchComplete: Record<string, boolean>
  stretchSectionComplete: boolean
  circuitComplete: Record<string, boolean>
  circuitExerciseComplete: Record<string, boolean>
}

export default function useWorkoutProgress({
  exercises,
  formData,
  warmupComplete,
  warmupSectionComplete,
  stretchComplete,
  stretchSectionComplete,
  circuitComplete,
  circuitExerciseComplete,
}: UseWorkoutProgressArgs) {
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

  const supersetExercises = useMemo(
    () =>
      exercises
        .map((exercise: any, index: number) => ({
          exercise,
          originalIndex: index,
        }))
        .filter((item: any) => isSupersetExercise(item.exercise)),
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
      nestedExercises.every(
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
      )

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
    const mainEntries = mainExercises.map(
      (item: any) => formData[item.originalIndex]
    )

    const completedExercises = mainEntries.filter((entry: any) =>
      isCompletedExercise(entry?.sets ?? [])
    ).length

    const totalCompletedSets = mainEntries.reduce(
      (total: number, entry: any) =>
        total +
        (entry?.sets?.filter((set: any) => isCompletedSet(set)).length || 0),
      0
    )

    const totalLoggedSets = mainEntries.reduce(
      (total: number, entry: any) =>
        total +
        (entry?.sets?.filter((set: any) => hasSetData(set)).length || 0),
      0
    )

    const hasAnyLoggedWork =
      mainEntries.some((entry: any) => {
        return (
          entry?.sets?.some((set: any) => hasSetData(set)) ||
          entry?.notes?.trim().length > 0 ||
          Boolean(entry?.videos?.length > 0)
        )
      }) ||
      warmupCompletedCount > 0 ||
      circuitAnyCompletedCount > 0 ||
      stretchCompletedCount > 0

    const totalProgressItems =
      mainExercises.length + circuitExercises.length

    const completedProgressItems =
      completedExercises + circuitCompletedCount

    const progress =
      totalProgressItems > 0
        ? Math.round(
            (completedProgressItems / totalProgressItems) * 100
          )
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

  return {
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
  }
}