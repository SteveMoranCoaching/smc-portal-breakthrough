export type AchievementProgress = {
  code: string
  title: string
  description: string | null
  category: string | null
  current: number
  target: number
  progress: number
  unlocked: boolean
}

export function calculateAchievementProgress({
  definitions,
  unlockedCodes,
  workoutCount,
  pbCount,
  checkInCount,
}: {
  definitions: any[]
  unlockedCodes: string[]
  workoutCount: number
  pbCount: number
  checkInCount: number
}): AchievementProgress[] {
  return definitions.map((achievement) => {
    let current = 0

    if (achievement.category === "workouts") {
      current = workoutCount
    }

    if (achievement.category === "pbs") {
      current = pbCount
    }

    if (achievement.category === "check_ins") {
      current = checkInCount
    }

    const target = Number(achievement.target_value || 1)
    const progress =
      target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0

    return {
      code: achievement.code,
      title: achievement.title,
      description: achievement.description,
      category: achievement.category,
      current,
      target,
      progress,
      unlocked: unlockedCodes.includes(achievement.code),
    }
  })
}