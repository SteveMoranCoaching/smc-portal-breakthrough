import type { SetEntry } from "@/lib/pbs"

export type LogPrimaryField =
  | "kg"
  | "bodyweight"
  | "height"
  | "speed"
  | "distance"
  | "none"

export type LogSecondaryField =
  | "reps"
  | "time"
  | "distance"
  | "calories"
  | "rounds"
  | "none"

export type ExerciseLogType = {
  primary: LogPrimaryField
  secondary: LogSecondaryField
}

export const defaultLogType: ExerciseLogType = {
  primary: "kg",
  secondary: "reps",
}

export const primaryFieldConfig: Record<
  LogPrimaryField,
  {
    key: keyof SetEntry | ""
    label: string
    placeholder: string
    inputMode: "decimal" | "numeric" | "text"
    type: string
  }
> = {
  kg: {
    key: "weight",
    label: "Kg",
    placeholder: "Kg",
    inputMode: "decimal",
    type: "number",
  },
  bodyweight: {
    key: "bodyweight",
    label: "BW",
    placeholder: "BW",
    inputMode: "text",
    type: "text",
  },
  height: {
    key: "height",
    label: "Height",
    placeholder: "Height",
    inputMode: "decimal",
    type: "number",
  },
  speed: {
    key: "speed",
    label: "Speed",
    placeholder: "Speed",
    inputMode: "decimal",
    type: "number",
  },
  distance: {
    key: "distance",
    label: "Distance",
    placeholder: "Distance",
    inputMode: "decimal",
    type: "number",
  },
  none: {
    key: "",
    label: "",
    placeholder: "",
    inputMode: "text",
    type: "text",
  },
}

export const secondaryFieldConfig: Record<
  LogSecondaryField,
  {
    key: keyof SetEntry | ""
    label: string
    placeholder: string
    inputMode: "decimal" | "numeric" | "text"
    type: string
  }
> = {
  reps: {
    key: "reps",
    label: "Reps",
    placeholder: "Reps",
    inputMode: "numeric",
    type: "number",
  },
  time: {
    key: "time",
    label: "Time",
    placeholder: "Time",
    inputMode: "text",
    type: "text",
  },
  distance: {
    key: "distance",
    label: "Distance",
    placeholder: "Distance",
    inputMode: "decimal",
    type: "number",
  },
  calories: {
    key: "calories",
    label: "Calories",
    placeholder: "Cals",
    inputMode: "numeric",
    type: "number",
  },
  rounds: {
    key: "rounds",
    label: "Rounds",
    placeholder: "Rounds",
    inputMode: "numeric",
    type: "number",
  },
  none: {
    key: "",
    label: "",
    placeholder: "",
    inputMode: "text",
    type: "text",
  },
}

export function getExerciseLogType(exercise: any): ExerciseLogType {
  return {
    primary: exercise?.logType?.primary || defaultLogType.primary,
    secondary: exercise?.logType?.secondary || defaultLogType.secondary,
  }
}

export function getSetFieldValue(set: SetEntry, field: keyof SetEntry | "") {
  if (!field) return ""
  return String(set[field] || "")
}

export function getLoggedFieldKeys(set: SetEntry) {
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

export function createBlankSet(
  exercise?: any,
  inferredReps = ""
): SetEntry {
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

export function formatFlexibleSet(
  set: SetEntry,
  exercise?: any
) {
  const logType = getExerciseLogType(exercise)
  const primary = primaryFieldConfig[logType.primary]
  const secondary = secondaryFieldConfig[logType.secondary]

  const parts: string[] = []

  if (primary.key) {
    const value = getSetFieldValue(set, primary.key)

    if (value) {
      parts.push(
        logType.primary === "bodyweight"
          ? "BW"
          : `${value}${primary.label === "Kg" ? "kg" : ` ${primary.label}`}`
      )
    }
  }

  if (secondary.key) {
    const value = getSetFieldValue(set, secondary.key)

    if (value) {
      parts.push(
        logType.secondary === "reps"
          ? `× ${value}`
          : `${value} ${secondary.label}`
      )
    }
  }

  if (set.rpe) {
    parts.push(`@ RPE ${set.rpe}`)
  }

  return parts.length > 0 ? parts.join(" ") : "No data"
}