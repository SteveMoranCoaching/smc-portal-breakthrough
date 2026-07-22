export function isMainLift(exerciseName: string): boolean {
  const name = exerciseName.toLowerCase().trim()

  const isSquat =
    name.includes("squat") &&
    !name.includes("split squat") &&
    !name.includes("hack squat") &&
    !name.includes("belt squat") &&
    !name.includes("goblet squat")

  const isBench =
    name.includes("bench") &&
    name.includes("barbell") &&
    !name.includes("incline") &&
    !name.includes("decline")

  const isDeadlift = name.includes("deadlift")

  return isSquat || isBench || isDeadlift
}

export type PBType = "heaviest" | "rep"

export type PBResult = {
  exerciseName: string
  type: PBType
  weight: number
  reps: number
  estimated1RM: number
  previousBest?: number
  label: string
  summary: string
}

export type SetEntry = {
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

type ParsedSet = {
  weight: number
  reps: number
  estimated1RM: number
}

export type PreviousPerformanceSet = {
  weight: number
  reps: number
  rpe: string
  estimated1RM: number
}

export function toNumber(value: string | number | null | undefined) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export function estimateOneRM(weight: number, reps: number) {
  if (!weight || !reps) return 0
  return Math.round(weight * (1 + reps / 30))
}

function groupPBResults(results: PBResult[]) {
  const priority: Record<PBType, number> = {
    heaviest: 1,
    rep: 2,
  }

  return results
    .sort((a, b) => priority[a.type] - priority[b.type])
    .slice(0, 2)
}

export function detectPBs({
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

export function formatLogDate(dateString?: string | null) {
  if (!dateString) return "No date"

  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}

export function getPreviousPerformance(previousLog: any) {
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