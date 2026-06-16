import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import PrefetchSession from "@/components/PrefetchSession"
import MomentumCard from "@/components/MomentumCard"
import WeeklySummaryCard from "@/components/WeeklySummaryCard"
import ClosestAchievementsCard from "@/components/ClosestAchievementsCard"
import { calculateAchievementProgress } from "@/lib/achievementProgress"
import NotificationPermissionButton from "@/components/NotificationPermissionButton"
import DashboardCalendarPreview from "@/components/DashboardCalendarPreview"

export const dynamic = "force-dynamic"

const softBorder = "border-[rgba(255,255,255,0.08)]"

const glassCard =
  "relative overflow-hidden rounded-[1.55rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] shadow-[0_14px_34px_rgba(0,0,0,0.66)]"

const labelStyle =
  "text-[8px] font-semibold uppercase tracking-[0.24em] text-smc-gold"

function Icon({
  type,
  className = "h-5 w-5",
}: {
  type:
    | "message"
    | "plus"
    | "check"
    | "clipboard"
    | "trend"
    | "chat"
    | "calendar"
    | "list"
    | "grid"
    | "trophy"
    | "spark"
    | "bolt"
    | "target"
    | "flame"
  className?: string
}) {
  const base =
    "fill-none stroke-current stroke-[2] stroke-linecap-round stroke-linejoin-round"

  if (type === "message") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path className={base} d="M4 6h16v12H4z" />
        <path className={base} d="m4 7 8 6 8-6" />
      </svg>
    )
  }

  if (type === "trophy") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path className={base} d="M8 4h8v4a4 4 0 0 1-8 0z" />
        <path className={base} d="M8 6H5a3 3 0 0 0 3 3" />
        <path className={base} d="M16 6h3a3 3 0 0 1-3 3" />
        <path className={base} d="M12 12v4" />
        <path className={base} d="M9 20h6" />
        <path className={base} d="M10 16h4v4h-4z" />
      </svg>
    )
  }

  if (type === "spark") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          className={base}
          d="M12 3l1.5 5.5L19 11l-5.5 2.5L12 19l-1.5-5.5L5 11l5.5-2.5z"
        />
      </svg>
    )
  }

  if (type === "bolt") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path className={base} d="M13 2 5 14h6l-1 8 8-12h-6z" />
      </svg>
    )
  }

  if (type === "target") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path className={base} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
        <path className={base} d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
        <path className={base} d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      </svg>
    )
  }

  if (type === "flame") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          className={base}
          d="M12 22c4 0 7-2.8 7-6.8 0-2.9-1.7-5.2-4.5-7.8.1 2.1-.8 3.4-2.1 4.2.2-3.1-1.3-5.5-4-8.1.2 4.1-3.4 6.2-3.4 11.3C5 19.1 8 22 12 22z"
        />
      </svg>
    )
  }

  if (type === "plus") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path className={base} d="M12 5v14M5 12h14" />
      </svg>
    )
  }

  if (type === "check") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path className={base} d="m5 12 4 4L19 6" />
      </svg>
    )
  }

  if (type === "clipboard") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path className={base} d="M8 5h8M9 3h6v4H9z" />
        <path className={base} d="M6 6h12v15H6z" />
      </svg>
    )
  }

  if (type === "trend") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path className={base} d="M4 16 9 11l4 4 7-8" />
        <path className={base} d="M15 7h5v5" />
      </svg>
    )
  }

  if (type === "chat") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path className={base} d="M5 6h14v9H8l-3 3z" />
        <path className={base} d="M9 10h.01M12 10h.01M15 10h.01" />
      </svg>
    )
  }

  if (type === "calendar") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path className={base} d="M5 5h14v15H5z" />
        <path className={base} d="M8 3v4M16 3v4M5 9h14" />
      </svg>
    )
  }

  if (type === "list") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path className={base} d="M9 7h11M9 12h11M9 17h11" />
        <path className={base} d="M4 7h.01M4 12h.01M4 17h.01" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        className={base}
        d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
      />
    </svg>
  )
}

function IconBubble({
  type,
  subtle = false,
}: {
  type: Parameters<typeof Icon>[0]["type"]
  subtle?: boolean
}) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
        subtle
          ? "border-[rgba(255,255,255,0.07)] bg-white/[0.03] text-smc-gold"
          : "border-smc-gold/25 bg-smc-gold/10 text-smc-gold"
      }`}
    >
      <Icon type={type} className="h-3.5 w-3.5" />
    </span>
  )
}

function getStartOfWeek() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)

  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)

  return monday.toISOString()
}

function getStartOfWeekDate(dateInput?: string | Date) {
  const date = dateInput ? new Date(dateInput) : new Date()
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)

  const monday = new Date(date)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)

  return monday
}

function getEndOfWeek() {
  const start = new Date(getStartOfWeek())
  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  return end.toISOString()
}

function formatTimestamp(dateString: string) {
  const date = new Date(dateString)

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}

function isCheckInWindowOpen() {
  const day = new Date().getDay()

  return day === 5 || day === 6 || day === 0
}

function formatPBType(type: string) {
  if (type === "estimated_1rm") return "Estimated 1RM"
  if (type === "heaviest") return "Heaviest"
  if (type === "rep") return "Rep PB"
  return "PB"
}

function getWeekRange(weeksAgo = 0) {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)

  const start = new Date(now)
  start.setDate(diff - weeksAgo * 7)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  return {
    start,
    end,
  }
}

function calculateAdherenceStreak({
  workoutLogs,
  checkIns,
  sessions,
}: {
  workoutLogs: any[]
  checkIns: any[]
  sessions: any[]
}) {
  if (!sessions.length) return 0

  let streak = 0

  for (let weeksAgo = 0; weeksAgo < 52; weeksAgo++) {
    const { start, end } = getWeekRange(weeksAgo)

    const weekLogs = workoutLogs.filter((log) => {
      const createdAt = new Date(log.created_at)
      return createdAt >= start && createdAt < end
    })

    const weekCheckIns = checkIns.filter((checkIn) => {
      const createdAt = new Date(checkIn.created_at)
      return createdAt >= start && createdAt < end
    })

    const completedSessionIds = new Set(
      weekLogs.map((log: any) => log.session_id)
    )

    const completedAllSessions = sessions.every((session: any) =>
      completedSessionIds.has(session.id)
    )

    const completedCheckIn = weekCheckIns.length > 0

    if (completedAllSessions && completedCheckIn) {
      streak += 1
      continue
    }

    break
  }

  return streak
}

function getDayOrder(day?: string | null) {
  const match = String(day || "").match(/\d+/)
  return match ? Number(match[0]) : 999
}

function sortProgrammeSessions(sessions: any[]) {
  return [...sessions].sort((a, b) => {
    const weekA = Number(a.week_number || 1)
    const weekB = Number(b.week_number || 1)

    if (weekA !== weekB) return weekA - weekB

    return getDayOrder(a.day) - getDayOrder(b.day)
  })
}

function getProgressMessage({
  totalCount,
  completedCount,
  progressPercent,
}: {
  totalCount: number
  completedCount: number
  progressPercent: number
}) {
  if (totalCount === 0) return "Your programme progress will appear here."

  const sessionsLeft = Math.max(totalCount - completedCount, 0)

  if (progressPercent === 100) return "Programme complete. Strong work."
  if (sessionsLeft === 1) return "1 session left this week."
  if (sessionsLeft > 1) return `${sessionsLeft} sessions left this block.`
  if (completedCount > 0) return "Momentum is building."

  return "Ready to get the first session ticked off."
}

function getEffectiveWeekNumber({
  programmeWeekNumber,
  programmeStartDate,
  coachCurrentWeek,
  sessions,
  completedSessionIds,
}: {
  programmeWeekNumber: number
  programmeStartDate?: string | null
  coachCurrentWeek?: number | null
  sessions: any[]
  completedSessionIds: Set<string>
}) {
  const weeks = Array.from(
    new Set(sessions.map((session: any) => Number(session.week_number || 1)))
  ).sort((a, b) => a - b)

  if (!weeks.length) return programmeWeekNumber || 1

  const minWeek = weeks[0]
  const maxWeek = weeks[weeks.length - 1]

  if (coachCurrentWeek && Number.isFinite(Number(coachCurrentWeek))) {
    return Math.min(Math.max(Number(coachCurrentWeek), minWeek), maxWeek)
  }

  const startDate = programmeStartDate
    ? new Date(`${programmeStartDate}T00:00:00`)
    : new Date()

  startDate.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysElapsed = Math.max(
    0,
    Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  )

  const dateBasedWeek = Math.min(
    minWeek + Math.floor(daysElapsed / 7),
    maxWeek
  )

  let completionBasedWeek = minWeek

  for (const week of weeks) {
    const weekSessions = sessions.filter(
      (session: any) => Number(session.week_number || 1) === week
    )

    const weekComplete =
      weekSessions.length > 0 &&
      weekSessions.every((session: any) => completedSessionIds.has(session.id))

    if (weekComplete && week < maxWeek) {
      completionBasedWeek = week + 1
      continue
    }

    if (weekComplete && week === maxWeek) {
      completionBasedWeek = maxWeek
    }

    break
  }

  return Math.min(Math.max(dateBasedWeek, completionBasedWeek), maxWeek)
}

export default async function Dashboard() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const startOfWeek = getStartOfWeek()
  const endOfWeek = getEndOfWeek()

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("user_id", user.id)
    .single()

  const { data: programmes } = await supabase
    .from("programmes")
    .select(`
      id,
      title,
      week_number,
      notes,
      start_date,
      coach_current_week,
      created_at,
      is_active,
      programme_sessions (
        id,
        week_number,
        day,
        title,
        exercises
      )
    `)
    .eq("user_id", user.id)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })

  const { data: workoutLogs } = await supabase
    .from("workout_logs")
    .select(
      "id, session_id, exercise_name, coach_feedback, feedback_read, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: sessionCompletions } = await supabase
  .from("session_completions")
  .select("id, session_id, completed, created_at")
  .eq("user_id", user.id)
  .eq("completed", true)  

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: latestPBs } = await supabase
    .from("exercise_pbs")
    .select(
      "id, exercise_name, pb_type, weight, reps, estimated_1rm, previous_best, created_at, approved_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  const { data: thisWeeksCheckIns } = await supabase
    .from("check_ins")
    .select("id, created_at, reviewed")
    .eq("user_id", user.id)
    .gte("created_at", startOfWeek)
    .lt("created_at", endOfWeek)
    .order("created_at", { ascending: false })
    .limit(1)

    const { data: allCheckIns } = await supabase
  .from("check_ins")
  .select("id, created_at")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })

  const { data: achievementDefinitions } = await supabase
  .from("achievement_definitions")
  .select("*")

  const { data: achievements } = await supabase
    .from("user_achievements")
    .select(`
      id,
      achievement_code,
      unlocked_at,
      achievement_definitions (
        title,
        description,
        category,
        icon
      )
    `)
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false })

  const currentProgramme: any =
    programmes?.find((programme: any) => programme.is_active) || programmes?.[0]

  const { data: weeklySchedule } = await supabase
  .from("client_weekly_session_schedule")
  .select("id, session_id, planned_date, planned_order")
  .eq("user_id", user.id)
  .eq("programme_id", currentProgramme?.id || "")
  .gte("planned_date", startOfWeek)
  .lt("planned_date", endOfWeek)
  .order("planned_date", { ascending: true })
  .order("planned_order", { ascending: true })
  
    const sessions = sortProgrammeSessions(
    currentProgramme?.programme_sessions || []
  )

  const allWorkoutLogs = workoutLogs || []

  const thisWeekLogs =
    allWorkoutLogs.filter(
      (log: any) =>
        new Date(log.created_at).getTime() >= new Date(startOfWeek).getTime()
    ) || []

  const completedSessionIds = new Set(
  (sessionCompletions || []).map((completion: any) => completion.session_id)
)

  const thisWeekCompletedSessionIds = new Set(
  (sessionCompletions || [])
    .filter(
      (completion: any) =>
        new Date(completion.created_at).getTime() >=
        new Date(startOfWeek).getTime()
    )
    .map((completion: any) => completion.session_id)
)

  const completedCount = sessions.filter((session: any) =>
    completedSessionIds.has(session.id)
  ).length

  const totalCount = sessions.length
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const sessionsLeft = Math.max(totalCount - completedCount, 0)
  const progressMessage = getProgressMessage({
    totalCount,
    completedCount,
    progressPercent,
  })

  const currentWeekNumber = getEffectiveWeekNumber({
  programmeWeekNumber: Number(
    currentProgramme?.week_number || sessions[0]?.week_number || 1
  ),
  programmeStartDate: currentProgramme?.start_date || currentProgramme?.created_at,
  coachCurrentWeek: currentProgramme?.coach_current_week,
  sessions,
  completedSessionIds,
})

  const scheduledSessionIds = (weeklySchedule || []).map(
  (item: any) => item.session_id
)

const scheduledSessions = scheduledSessionIds
  .map((sessionId: string) =>
    sessions.find((session: any) => session.id === sessionId)
  )
  .filter(Boolean)

const nextWorkout =
  scheduledSessions.find(
    (session: any) => !completedSessionIds.has(session.id)
  ) ||
  sessions.find(
    (session: any) =>
      Number(session.week_number || 1) === Number(currentWeekNumber) &&
      !completedSessionIds.has(session.id)
  ) ||
  sessions[0]

  const unreadLogFeedbackIds =
    allWorkoutLogs
      ?.filter((log: any) => log.coach_feedback && !log.feedback_read)
      .map((log: any) => log.id) || []

  const unreadVideoFeedbackIds =
    videos
      ?.filter((video: any) => video.feedback && !video.feedback_read)
      .map((video: any) => video.id) || []

  const unreadFeedbackCount =
    unreadLogFeedbackIds.length + unreadVideoFeedbackIds.length

  const hasCheckedInThisWeek = Boolean(thisWeeksCheckIns?.[0])
const checkInWindowOpen = isCheckInWindowOpen()
const checkInDue = checkInWindowOpen && !hasCheckedInThisWeek
  const latestPB: any = latestPBs?.[0] || null

  const unlockedCodes =
  achievements?.map((achievement: any) => achievement.achievement_code) || []

  const workoutCount = completedSessionIds.size
const pbCount = latestPBs?.length || 0
const checkInCount = allCheckIns?.length || 0

  const adherenceStreak = calculateAdherenceStreak({
  workoutLogs: allWorkoutLogs,
  checkIns: allCheckIns || [],
  sessions,
})

const thisWeekSessions = sessions.filter(
  (session: any) =>
    Number(session.week_number || 1) === Number(currentWeekNumber)
)

const thisWeekAssigned = thisWeekSessions.length

const thisWeekCompleted = thisWeekSessions.filter((session: any) =>
  completedSessionIds.has(session.id)
).length

const thisWeekPBs =
  latestPBs?.filter(
    (pb: any) =>
      new Date(pb.created_at).getTime() >=
      new Date(startOfWeek).getTime()
  ) || []

const thisWeekRemaining = Math.max(
  thisWeekAssigned - thisWeekCompleted,
  0
)

const momentumItems = [
  {
    label: "Logged activity this week",
    complete: thisWeekLogs.length > 0,
  },
  {
    label: "Submitted check-in",
    complete: hasCheckedInThisWeek,
  },
  {
    label: "Coach feedback reviewed",
    complete: unreadFeedbackCount === 0,
  },
  {
    label: "Completed all workouts",
    complete:
      thisWeekAssigned > 0 &&
      thisWeekCompleted >= thisWeekAssigned,
  },
  {
    label: "Maintained streak",
    complete: adherenceStreak > 0,
  },
  {
    label: "Hit a PB",
    complete:
      latestPB &&
      new Date(latestPB.created_at).getTime() >=
        new Date(startOfWeek).getTime(),
  },
]

const momentumScore =
  momentumItems.filter((item) => item.complete).length

  const achievementProgress = calculateAchievementProgress({
  definitions: achievementDefinitions || [],
  unlockedCodes,
  workoutCount,
  pbCount,
  checkInCount,
})

const closestAchievements = achievementProgress
  .filter(
    (achievement) =>
      !achievement.unlocked && achievement.progress < 100
  )
  .sort((a, b) => b.progress - a.progress)
  .slice(0, 3)

  const primaryAction = unreadFeedbackCount
    ? "feedback"
    : checkInDue
      ? "check-in"
      : nextWorkout
        ? "workout"
        : "programme"

  const dashboardStats = [
    {
      label: "Workouts",
      value: `${completedCount}/${totalCount || 0}`,
      sub:
        totalCount > 0
          ? `${progressPercent}% programme progress`
          : "Waiting for programme",
      icon: "check" as const,
      href: "/dashboard/workouts",
      priority: totalCount > 0 ? 2 : 8,
    },
    {
      label: "Latest PB",
      value: latestPB ? `${latestPB.weight}kg` : "—",
      sub: latestPB
        ? `${latestPB.exercise_name} · ${formatPBType(latestPB.pb_type)}`
        : "No PB logged yet",
      icon: "trophy" as const,
      href: "/dashboard/pbs",
      priority: latestPB ? 1 : 7,
    },
    {
  label: "Streak",
  value: adherenceStreak > 0 ? `${adherenceStreak}` : "-",
  sub: adherenceStreak > 0 ? "Current streak" : "New streak building",
  icon: "flame" as const,
  href: "#streak",
  priority: adherenceStreak > 0 ? 3 : 9,
},
    {
      label: "Check-In",
      value: checkInDue ? "Due" : "Done",
      sub: checkInDue ? "Submit this week" : "This week submitted",
      icon: "clipboard" as const,
      href: "/dashboard/check-ins",
      priority: checkInDue ? 0 : 6,
    },
  ].sort((a, b) => a.priority - b.priority)

  return (
    <div className="flex flex-col gap-2.5">

      <section className="relative px-1 pt-0">
        <div className="relative min-h-[118px]">
          <div className="absolute -left-4 top-2 h-[94px] w-[94px] overflow-hidden rounded-full border border-smc-gold/35 bg-zinc-950 shadow-[0_0_24px_rgba(212,175,55,0.12)]">
            <Image
              src="/images/steve-avatar.jpeg"
              alt="Steve Moran"
              fill
              sizes="94px"
              className="object-cover grayscale"
              priority
            />
          </div>

          <div className="grid grid-cols-[42px_1fr_42px] items-start gap-3">
            <div />

            <div className="mt-8 flex items-center justify-center gap-2.5">
              <p className="text-[1.65rem] font-black tracking-[-0.08em] text-smc-gold">
                SMC
              </p>

              <div className="h-6 w-px bg-smc-gold/35" />

              <p className="text-[7.5px] font-bold uppercase leading-[0.88rem] tracking-[0.28em] text-smc-text">
                Steve Moran
                <br />
                Coaching
              </p>
            </div>

            <div className="relative z-20 mt-3 flex flex-col items-center gap-2">
              <Link
  href="#streak"
  className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-[0_0_20px_rgba(212,175,55,0.12)] transition active:scale-[0.96] ${
    adherenceStreak > 0
      ? "border-smc-gold/35 bg-smc-gold/10 text-smc-gold"
      : "border-white/[0.08] bg-black/35 text-smc-muted-soft"
  }`}
  aria-label="View adherence streak"
>
  <Icon type="flame" className="h-4.5 w-4.5" />

  {adherenceStreak > 0 && (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-smc-gold px-1.5 text-[10px] font-black text-black shadow-[0_0_10px_rgba(212,175,55,0.75)]">
      {adherenceStreak}
    </span>
  )}
</Link>

              <Link
                href="/dashboard/pbs"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-smc-gold/25 bg-black/35 text-smc-gold shadow-[0_0_18px_rgba(212,175,55,0.08)] transition active:scale-[0.96]"
                aria-label="Open PBs"
              >
                <Icon type="trophy" className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-1 text-center">
            <h1 className="text-[1.45rem] font-black leading-[0.98] tracking-[-0.055em] text-smc-text">
              Welcome back,
              <br />
              <span className="text-smc-gold">
                {client?.name || "Athlete"}
              </span>
            </h1>

            <form
  action="/auth/sign-out"
  method="post"
  className="mt-3 flex justify-center"
>
  <button
  type="submit"
  className="inline-flex items-center rounded-full border border-white/[0.08] bg-black/25 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-smc-muted-soft transition hover:border-smc-gold/25 hover:text-smc-gold active:scale-[0.98]"
>
  Log Out
</button>
</form>

<NotificationPermissionButton />

            <p className="mt-1.5 text-[12px] leading-5 text-smc-muted">
              {unreadFeedbackCount > 0
                ? "Steve has fresh feedback waiting for you."
                : checkInDue
                  ? "Your weekly check-in is ready when you are."
                  : progressPercent === 100 && totalCount > 0
                    ? "Programme complete. Strong work."
                    : sessionsLeft > 0
                      ? progressMessage
                      : "Here’s what needs doing next."}
            </p>
          </div>
        </div>
      </section>

      <section className={`${glassCard} mt-0.5 p-3`}>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[64%] bg-cover bg-center opacity-55"
          style={{
            backgroundImage: "url('/images/dashboard-plates.jpeg')",
          }}
        />


        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#070707] via-[#070707]/70 to-[#070707]/15" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />

        <div className="relative z-10">
          {primaryAction === "feedback" && (
            <>
              <div className="flex items-center gap-2.5">
                <IconBubble type="chat" />
                <p className={labelStyle}>Priority</p>
              </div>

              <h2 className="mt-2 text-[1.18rem] font-black tracking-[-0.04em] text-smc-text">
                New Coach Feedback
              </h2>

              <p className="mt-1 text-[12px] leading-5 text-smc-muted">
                {unreadFeedbackCount} new feedback item
                {unreadFeedbackCount === 1 ? "" : "s"} waiting.
              </p>

              <Link
                href="/dashboard/workouts?focus=feedback"
                className="mt-2.5 flex min-h-[34px] items-center justify-center rounded-[1.15rem] bg-smc-gold px-5 text-center text-sm font-black text-black shadow-[0_0_24px_rgba(212,175,55,0.2)] transition active:scale-[0.99]"
              >
                View Feedback <span className="ml-3 text-lg">→</span>
              </Link>
            </>
          )}

          {primaryAction === "check-in" && (
            <>
              <div className="flex items-center gap-2.5">
                <IconBubble type="check" />
                <p className={labelStyle}>Priority</p>
              </div>

              <h2 className="mt-2 text-[1.18rem] font-black tracking-[-0.04em] text-smc-text">
                Weekly Check-In Due
              </h2>

              <p className="mt-1 text-[12px] leading-5 text-smc-muted">
                Submit your weekly update so Steve can review your progress.
              </p>

              <Link
                href="/dashboard/check-ins"
                className="mt-2.5 flex min-h-[34px] items-center justify-center rounded-[1.15rem] bg-smc-gold px-5 text-center text-sm font-black text-black shadow-[0_0_24px_rgba(212,175,55,0.2)] transition active:scale-[0.99]"
              >
                Start Check-In <span className="ml-3 text-lg">→</span>
              </Link>
            </>
          )}

          {primaryAction === "workout" && nextWorkout && currentProgramme && (
            <>
              <div className="flex items-center gap-2.5">
                <IconBubble type="plus" />
                <p className={labelStyle}>Next Workout</p>
              </div>

              <h2 className="mt-2 text-[1.18rem] font-black tracking-[-0.04em] text-smc-text">
                {nextWorkout.title}
              </h2>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-black/40 px-3 py-1 text-xs text-smc-muted">
                  <Icon type="calendar" className="h-3.5 w-3.5 text-smc-gold" />
                  Week {nextWorkout.week_number || 1} · {nextWorkout.day}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-black/40 px-3 py-1 text-xs text-smc-muted">
                  <Icon type="list" className="h-3.5 w-3.5 text-smc-gold" />
                  {nextWorkout.exercises?.length || 0} exercises
                </span>
              </div>

              <PrefetchSession
                href={`/dashboard/session/${nextWorkout.id}?programmeId=${currentProgramme.id}`}
              />

              <Link
                href={`/dashboard/session/${nextWorkout.id}?programmeId=${currentProgramme.id}`}
                className="mt-2.5 flex min-h-[34px] items-center justify-center rounded-[1.15rem] bg-smc-gold px-5 text-center text-sm font-black text-black shadow-[0_0_24px_rgba(212,175,55,0.2)] transition active:scale-[0.99]"
              >
                Start Workout <span className="ml-3 text-lg">→</span>
              </Link>
            </>
          )}

          {primaryAction === "programme" && (
            <>
              <div className="flex items-center gap-2.5">
                <IconBubble type="clipboard" />
                <p className={labelStyle}>Current Status</p>
              </div>

              <h2 className="mt-2 text-[1.18rem] font-black tracking-[-0.04em] text-smc-text">
                Programme Pending
              </h2>

              <p className="mt-1 text-[12px] leading-4 text-smc-muted">
                Your programme will appear here once it has been assigned.
              </p>
            </>
          )}
        </div>
      </section>

<DashboardCalendarPreview />

<MomentumCard
  score={momentumScore}
  items={momentumItems}
/>  

      <section className="grid grid-cols-4 gap-2">
  {dashboardStats.map((stat) => (
    <Link
      key={stat.label}
      href={stat.href}
      className={`${glassCard} flex min-h-[94px] items-center justify-center p-2 text-center`}
    >
      <div className="relative z-10">
        <p className="text-[7px] font-black uppercase tracking-[0.18em] text-smc-muted-soft">
          {stat.label}
        </p>

        <p className="mt-2 text-[1.05rem] font-black leading-tight tracking-[-0.045em] text-smc-text">
          {stat.value}
        </p>

        <p className="mt-1 line-clamp-3 text-[9px] leading-4 text-smc-muted">
          {stat.sub}
        </p>
      </div>
    </Link>
  ))}
</section>

      <WeeklySummaryCard
        workoutsCompleted={thisWeekCompleted}
        pbCount={thisWeekPBs.length}
      />

      <section className={`${glassCard} px-3 py-2.5`}>
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(255,255,255,0.07)] bg-white/[0.03] text-smc-gold">
                <Icon type="trend" className="h-3.5 w-3.5" />
              </span>
              <p className={labelStyle}>Programme Progress</p>
            </div>

            <p className="text-sm text-smc-muted">
              {completedCount} / {totalCount} completed
            </p>
          </div>

          <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-black/70 ring-1 ring-[rgba(255,255,255,0.06)]">
            <div
              className="h-full rounded-full bg-smc-gold shadow-[0_0_16px_rgba(212,175,55,0.5)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="mt-2 text-[13px] text-smc-muted">
            {progressMessage}
          </p>
        </div>
      </section>

      <section id="streak" className={`${glassCard} border-smc-gold/20 p-3.5`}>
  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-smc-gold/10 blur-3xl" />

  <div className="relative z-10">
    <div className="flex items-center gap-2.5">
      <IconBubble type="flame" subtle />
      <p className={labelStyle}>Adherence Streak</p>
    </div>

    {adherenceStreak > 0 ? (
      <>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[1.35rem] font-black tracking-[-0.04em] text-smc-text">
              {adherenceStreak} Perfect Week
              {adherenceStreak === 1 ? "" : "s"}
            </h2>

            <p className="mt-1 text-[12px] leading-5 text-smc-muted">
              All assigned sessions completed plus weekly check-in submitted.
            </p>
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-smc-gold/30 bg-smc-gold/10 text-smc-gold shadow-[0_0_26px_rgba(212,175,55,0.16)]">
            <Icon type="flame" className="h-6 w-6" />
          </div>
        </div>
      </>
    ) : (
      <div className="mt-3 rounded-[1.2rem] border border-white/[0.07] bg-black/35 p-3.5">
        <p className="text-sm font-black text-smc-text">
          Streak ready to build.
        </p>

        <p className="mt-1 text-[12px] leading-5 text-smc-muted">
          Complete all assigned sessions and submit your weekly check-in to start a perfect week streak.
        </p>
      </div>
    )}
  </div>
</section>

      <ClosestAchievementsCard achievements={closestAchievements} />

    </div>
  )
}