export type SetEntry = {
  weight?: string | number | null
  reps?: string | number | null
  rpe?: string | number | null
}

export type WorkoutLog = {
  id: string
  user_id: string
  exercise_name?: string | null
  sets_completed?: SetEntry[] | null
  notes?: string | null
  created_at: string
}

export type ExercisePB = {
  id: string
  user_id: string
  exercise_name: string
  type?: string | null
  weight?: number | null
  reps?: number | null
  estimated_1rm?: number | null
  created_at: string
}

export function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function estimate1RM(weight: number, reps: number) {
  if (!weight || !reps) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export function formatDate(date?: string | null) {
  if (!date) return "—"

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

export function daysAgo(date?: string | null) {
  if (!date) return "No recent data"

  const diff = Date.now() - new Date(date).getTime()
  const days = Math.max(0, Math.floor(diff / 86_400_000))

  if (days === 0) return "Performed today"
  if (days === 1) return "Last completed yesterday"

  return `Last completed ${days} days ago`
}

export function getAllSets(logs: WorkoutLog[]) {
  return logs.flatMap((log) =>
    (log.sets_completed || [])
      .map((set) => {
        const weight = toNumber(set.weight)
        const reps = toNumber(set.reps)
        const rpe = toNumber(set.rpe)

        return {
          weight,
          reps,
          rpe,
          estimated: estimate1RM(weight, reps),
          volume: weight * reps,
          date: log.created_at,
          logId: log.id,
        }
      })
      .filter((set) => set.weight > 0 && set.reps > 0)
  )
}

export function getBestSet(logs: WorkoutLog[]) {
  return [...getAllSets(logs)].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight
    return b.reps - a.reps
  })[0]
}

export function getBestEstimated1RM(logs: WorkoutLog[], pbs: ExercisePB[] = []) {
  const bestFromLogs =
    [...getAllSets(logs)].sort((a, b) => b.estimated - a.estimated)[0]
      ?.estimated || 0

  const bestFromPBs =
    [...pbs]
      .map((pb) => {
        return (
          pb.estimated_1rm ||
          estimate1RM(toNumber(pb.weight), toNumber(pb.reps))
        )
      })
      .sort((a, b) => b - a)[0] || 0

  return Math.max(bestFromLogs, bestFromPBs)
}

export function getSessionTopSet(log: WorkoutLog) {
  return getBestSet([log])
}

export function getSessionVolume(log: WorkoutLog) {
  return getAllSets([log]).reduce((total, set) => total + set.volume, 0)
}

export function getTrend(logs: WorkoutLog[]) {
  const recent = getAllSets(logs)
    .filter((set) => set.estimated > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (recent.length < 6) return "Building data"

  const latestThree =
    recent.slice(0, 3).reduce((sum, set) => sum + set.estimated, 0) / 3

  const previousThree =
    recent.slice(3, 6).reduce((sum, set) => sum + set.estimated, 0) / 3

  if (latestThree > previousThree * 1.015) return "Trending up"
  if (latestThree < previousThree * 0.985) return "Needs attention"

  return "Holding steady"
}

export function groupLogsByExercise(logs: WorkoutLog[], pbs: ExercisePB[] = []) {
  const grouped = new Map<
    string,
    {
      name: string
      logs: WorkoutLog[]
      pbs: ExercisePB[]
    }
  >()

  for (const log of logs) {
    const name = log.exercise_name?.trim()
    if (!name) continue

    if (!grouped.has(name)) {
      grouped.set(name, { name, logs: [], pbs: [] })
    }

    grouped.get(name)?.logs.push(log)
  }

  for (const pb of pbs) {
    const name = pb.exercise_name?.trim()
    if (!name) continue

    if (!grouped.has(name)) {
      grouped.set(name, { name, logs: [], pbs: [] })
    }

    grouped.get(name)?.pbs.push(pb)
  }

  return Array.from(grouped.values())
}