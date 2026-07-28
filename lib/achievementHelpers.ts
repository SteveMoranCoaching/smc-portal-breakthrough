export type AchievementUnlock = {
  title: string
  description?: string
  category?: string
}

export function normaliseAchievementUnlock(result: any): AchievementUnlock | null {
  const achievement = Array.isArray(result) ? result[0] : result
  if (!achievement) return null

  if (achievement.title) {
    return {
      title: achievement.title,
      description: achievement.description || undefined,
      category: achievement.category || undefined,
    }
  }

  if (achievement.achievement_definition?.title) {
    return {
      title: achievement.achievement_definition.title,
      description: achievement.achievement_definition.description || undefined,
      category: achievement.achievement_definition.category || undefined,
    }
  }

  return null
}