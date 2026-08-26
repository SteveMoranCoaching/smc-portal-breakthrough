import {
  generateSteveMoranWarmup,
  type WarmupResult,
} from "@/lib/warmupEngine"

import {
  SMC_COACHING_LIBRARY,
} from "@/lib/coachingLibrary"

export type WarmupProfile =
  | "competition"
  | "accessory"
  | "dumbbell"
  | "machine"
  | "bodyweight"
  | "conditioning"

export type WarmupRequest = {
  targetWeight: number
  profile?: WarmupProfile
  roundingIncrement?: number
  barWeight?: number
  context?: CoachingContext
}

export type SMCBrainWarmupResponse = WarmupResult & {
  profile: WarmupProfile
  barWeight: number
  context?: CoachingContext
}

export type SessionObjective =
  | "technique"
  | "strength"
  | "peak_strength"
  | "volume"
  | "hypertrophy"
  | "recovery"

export type AthleteExperience =
  | "beginner"
  | "developing"
  | "experienced"

export type TechnicalPriority =
  | "normal"
  | "high"

export type CoachingContext = {
  primaryObjective: SessionObjective
  secondaryObjective?: SessionObjective
  experience?: AthleteExperience
  technicalPriority?: TechnicalPriority
}

export type CoachingExercise = {
  name?: string
  movement?: string
}

export type ResolvedCoachingObjective = {
  objective: SessionObjective
  reason:
    | "beginner_technique_priority"
    | "developing_technique_priority"
    | "prescribed_objective"
}

export type CoachingFocus = {
  title: string
  cues: string[]
  objective?: SessionObjective
  reason?: ResolvedCoachingObjective["reason"]
}

export function generateWarmup(
  request: WarmupRequest
): SMCBrainWarmupResponse {
  const {
  targetWeight,
  profile = "competition",
  roundingIncrement = 2.5,
  barWeight = 20,
  context,
} = request

  const result = generateSteveMoranWarmup(
    targetWeight,
    roundingIncrement
  )

  return {
  ...result,
  profile,
  barWeight,
  context,
}
}

export function resolveCoachingObjective(
  context?: CoachingContext
): ResolvedCoachingObjective {
  if (!context) {
    return {
      objective: "technique",
      reason: "prescribed_objective",
    }
  }

  if (
    context.experience === "beginner" &&
    context.primaryObjective !== "recovery"
  ) {
    return {
      objective: "technique",
      reason: "beginner_technique_priority",
    }
  }

  if (
  context.experience === "developing" &&
  context.technicalPriority === "high"
) {
  return {
    objective: "technique",
    reason: "developing_technique_priority",
  }
}

  return {
    objective: context.primaryObjective,
    reason: "prescribed_objective",
  }
}

export function getCoachingFocus(
  context?: CoachingContext,
  exercise?: CoachingExercise
): CoachingFocus {
  if (!context) {
    return {
      title: "Session Focus",
      cues: [],
    }
  }

  const movement =
  String(exercise?.movement || "")
    .toLowerCase()
    .trim()

const exerciseName =
  String(exercise?.name || "")
    .toLowerCase()
    .trim()

const isSquat =
  movement === "squat" ||
  exerciseName.includes("squat")

const isBench =
  movement === "bench" ||
  exerciseName.includes("bench")

const isDeadlift =
  movement === "deadlift" ||
  exerciseName.includes("deadlift")

const resolvedObjective =
  resolveCoachingObjective(context)  

const decisionMeta = {
  objective: resolvedObjective.objective,
  reason: resolvedObjective.reason,
}  

  if (resolvedObjective.objective === "technique") {
  if (isSquat) {
  return {
    title: "Squat Technique",
    cues:
      SMC_COACHING_LIBRARY.technique.squat || [],
    ...decisionMeta,
  }
}

  if (isBench) {
  return {
    title: "Bench Technique",
    cues:
      SMC_COACHING_LIBRARY.technique.bench || [],
    ...decisionMeta,
  }
}

  if (isDeadlift) {
  return {
    title: "Deadlift Technique",
    cues:
      SMC_COACHING_LIBRARY.technique.deadlift || [],
    ...decisionMeta,
  }
}

  return {
  title: "Technique Focus",
  cues: [
    "Use the same setup every rep.",
    "Prioritise position and control over load.",
    "Keep the final reps technically consistent as fatigue builds.",
  ],
  ...decisionMeta,
}
}

  if (resolvedObjective.objective === "peak_strength") {
  return {
    title: "Performance Focus",
    cues:
      SMC_COACHING_LIBRARY.peakStrength.general || [],
      ...decisionMeta,
  }
}

  if (resolvedObjective.objective === "volume") {
  return {
    title: "Volume Focus",
    cues:
      SMC_COACHING_LIBRARY.volume.general || [],
      ...decisionMeta,
  }
}

  if (resolvedObjective.objective === "strength") {
  return {
    title: "Strength Focus",
    cues:
      SMC_COACHING_LIBRARY.strength.general || [],
      ...decisionMeta,
  }
}

  if (resolvedObjective.objective === "hypertrophy") {
  return {
    title: "Training Focus",
    cues:
      SMC_COACHING_LIBRARY.hypertrophy.general || [],
      ...decisionMeta,
  }
}

  if (resolvedObjective.objective === "recovery") {
  return {
    title: "Recovery Focus",
    cues:
      SMC_COACHING_LIBRARY.recovery.general || [],
      ...decisionMeta,
  }
}

  return {
  title: "Session Focus",
  cues: [],
  ...decisionMeta,
}
}