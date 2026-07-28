export function getPrescribedSetCount(exercise: any) {
  const prescriptionBlocks = Array.isArray(exercise?.prescriptions)
    ? exercise.prescriptions
    : []

  const blockSetCount = prescriptionBlocks.reduce(
    (total: number, block: any) => {
      const sets = Number(block?.sets)

      return Number.isFinite(sets) && sets > 0
        ? total + sets
        : total
    },
    0
  )

  if (blockSetCount > 0) {
    return blockSetCount
  }

  const directSets = Number(exercise?.sets)

  if (Number.isFinite(directSets) && directSets > 0) {
    return directSets
  }

  const prescription = String(exercise?.prescription || "")
  const match = prescription.match(/(\d+)\s*x\s*\d+/i)

  return match?.[1] ? Number(match[1]) : 1
}

export function getPreviousLogForExercise(
  previousLogs: any[],
  exerciseName: string
) {
  const matchingLogs = previousLogs.filter(
    (log) =>
      String(log.exercise_name || "").trim().toLowerCase() ===
      String(exerciseName || "").trim().toLowerCase()
  )

  const withFeedback = matchingLogs.find(
    (log) =>
      log.coach_feedback &&
      String(log.coach_feedback).trim() !== ""
  )

  return withFeedback || matchingLogs[0] || null
}

export function getDemoForExercise(
  exerciseDemos: any[],
  exerciseName: string
) {
  return exerciseDemos.find(
    (demo) =>
      String(demo.exercise_name || "").toLowerCase().trim() ===
      String(exerciseName || "").toLowerCase().trim()
  )
}

export function getExerciseDisplayLabel(exercise: any) {
  const prescription = exercise?.prescription
  const notes = exercise?.notes

  if (prescription && notes) return `${prescription} · ${notes}`
  if (prescription) return prescription
  if (notes) return notes

  return "Complete before starting the main workout"
}

export function getPreviousCoachFeedback(previousLog: any) {
  return String(previousLog?.coach_feedback || "").trim()
}