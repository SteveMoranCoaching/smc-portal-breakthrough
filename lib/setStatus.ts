import type { SetEntry } from "@/lib/pbs"
import { getLoggedFieldKeys } from "@/lib/exerciseLogTypes"

export function hasSetData(set: SetEntry) {
  return getLoggedFieldKeys(set).some((key) =>
    Boolean(String(set[key] || "").trim())
  )
}

export function isCompletedSet(set: SetEntry) {
  const hasPrimary = Boolean(
    set.weight ||
      set.bodyweight ||
      set.height ||
      set.speed ||
      set.distance
  )

  const hasSecondary = Boolean(
    set.reps ||
      set.time ||
      set.calories ||
      set.rounds ||
      set.distance
  )

  return hasPrimary && hasSecondary
}

export function isCompletedExercise(sets: SetEntry[]) {
  const completedSetCount =
    sets.filter((set) => isCompletedSet(set)).length || 0

  return completedSetCount >= Math.max(1, sets.length)
}