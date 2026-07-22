export function getPrescribedSetCount(exercise: any) {
  const blocks = Array.isArray(exercise?.prescriptions)
    ? exercise.prescriptions
    : []

  const blockSetTotal = blocks.reduce((total: number, block: any) => {
    const sets = Number(block?.sets || 0)
    return total + (Number.isFinite(sets) ? sets : 0)
  }, 0)

  if (blockSetTotal > 0) return blockSetTotal

  const prescription = String(exercise?.prescription || "")

  const match = prescription.match(/^(\d+)\s*x/i)
  if (match) return Number(match[1])

  const setsMatch = prescription.match(/(\d+)\s*sets?/i)
  if (setsMatch) return Number(setsMatch[1])

  return 1
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