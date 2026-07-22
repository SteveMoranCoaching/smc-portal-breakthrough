export function getExerciseSection(exercise: any) {
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

if (
  section === "superset" ||
  section === "super set" ||
  section === "super-set" ||
  section === "paired set"
) {
  return "superset"
}

  return "main"
}

export function isWarmupExercise(exercise: any) {
  return getExerciseSection(exercise) === "warmup"
}

export function isStretchExercise(exercise: any) {
  return getExerciseSection(exercise) === "stretch"
}

export function isCircuitExercise(exercise: any) {
  return getExerciseSection(exercise) === "circuit"
}

export function isSupersetExercise(exercise: any) {
  return getExerciseSection(exercise) === "superset"
}

export function isMainExercise(exercise: any) {
  return getExerciseSection(exercise) === "main"
}