import { SupabaseClient } from "@supabase/supabase-js"

type AchievementCode =
  | "first_workout"
  | "ten_workouts"
  | "first_pb"
  | "five_pbs"
  | "first_check_in"
  | "three_check_ins"

async function unlockAchievement(
  supabase: SupabaseClient,
  userId: string,
  achievementCode: AchievementCode,
  metadata = {}
) {
  const { error } = await supabase.from("user_achievements").insert({
    user_id: userId,
    achievement_code: achievementCode,
    metadata,
  })

  if (error && error.code !== "23505") {
    console.error("Achievement unlock failed:", achievementCode, error)
  }
}

export async function checkWorkoutAchievements(
  supabase: SupabaseClient,
  userId: string
) {
  const { count, error } = await supabase
    .from("workout_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    console.error("Workout achievement check failed:", error)
    return
  }

  const total = count || 0

  if (total >= 1) {
    await unlockAchievement(supabase, userId, "first_workout", {
      total_workouts: total,
    })
  }

  if (total >= 10) {
    await unlockAchievement(supabase, userId, "ten_workouts", {
      total_workouts: total,
    })
  }
}

export async function checkPBAchievements(
  supabase: SupabaseClient,
  userId: string
) {
  const { count, error } = await supabase
    .from("exercise_pbs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    console.error("PB achievement check failed:", error)
    return
  }

  const total = count || 0

  if (total >= 1) {
    await unlockAchievement(supabase, userId, "first_pb", {
      total_pbs: total,
    })
  }

  if (total >= 5) {
    await unlockAchievement(supabase, userId, "five_pbs", {
      total_pbs: total,
    })
  }
}

export async function checkCheckInAchievements(
  supabase: SupabaseClient,
  userId: string
) {
  const { count, error } = await supabase
    .from("check_ins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    console.error("Check-in achievement check failed:", error)
    return
  }

  const total = count || 0

  if (total >= 1) {
    await unlockAchievement(supabase, userId, "first_check_in", {
      total_check_ins: total,
    })
  }

  if (total >= 3) {
    await unlockAchievement(supabase, userId, "three_check_ins", {
      total_check_ins: total,
    })
  }
}