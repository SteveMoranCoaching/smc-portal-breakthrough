import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import FeedbackReadMarker from "@/components/FeedbackReadMarker"
import PrefetchSession from "@/components/PrefetchSession"

export const dynamic = "force-dynamic"

const softBorder = "border-[rgba(255,255,255,0.08)]"

const glassCard =
  "relative overflow-hidden rounded-[1.75rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] shadow-[0_16px_42px_rgba(0,0,0,0.68)]"

const labelStyle =
  "text-[9px] font-semibold uppercase tracking-[0.24em] text-smc-gold"

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
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
        subtle
          ? "border-[rgba(255,255,255,0.07)] bg-white/[0.03] text-smc-gold"
          : "border-smc-gold/25 bg-smc-gold/10 text-smc-gold"
      }`}
    >
      <Icon type={type} className="h-4 w-4" />
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

function formatPBType(type: string) {
  if (type === "estimated_1rm") return "Estimated 1RM"
  if (type === "heaviest") return "Heaviest"
  if (type === "rep") return "Rep PB"
  return "PB"
}

function calculateTrainingDayStreak(workoutLogs: any[]) {
  const uniqueDays = Array.from(
    new Set(
      workoutLogs.map((log) => {
        const date = new Date(log.created_at)
        date.setHours(0, 0, 0, 0)
        return date.toISOString()
      })
    )
  )
    .map((date) => new Date(date))
    .sort((a, b) => b.getTime() - a.getTime())

  if (uniqueDays.length === 0) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const latestTrainingDay = uniqueDays[0]
  const daysSinceLatest = Math.floor(
    (today.getTime() - latestTrainingDay.getTime()) / 86400000
  )

  if (daysSinceLatest > 1) return 0

  let cursor = new Date(latestTrainingDay)

  for (const day of uniqueDays) {
    const matchesCursor = day.getTime() === cursor.getTime()

    if (!matchesCursor) break

    streak += 1
    cursor.setDate(cursor.getDate() - 1)
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
    .limit(1)

  const { data: thisWeeksCheckIns } = await supabase
    .from("check_ins")
    .select("id, created_at, reviewed")
    .eq("user_id", user.id)
    .gte("created_at", startOfWeek)
    .lt("created_at", endOfWeek)
    .order("created_at", { ascending: false })
    .limit(1)

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
    .limit(4)

  const currentProgramme: any =
    programmes?.find((programme: any) => programme.is_active) || programmes?.[0]

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
    thisWeekLogs.map((log: any) => log.session_id)
  )

  const completedCount = sessions.filter((session: any) =>
    completedSessionIds.has(session.id)
  ).length

  const totalCount = sessions.length
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const nextWorkout =
    sessions.find((session: any) => !completedSessionIds.has(session.id)) ||
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

  const latestLogFeedback =
    allWorkoutLogs?.filter((log: any) => log.coach_feedback)?.[0] || null

  const latestVideoFeedback =
    videos?.filter((video: any) => video.feedback)?.[0] || null

  const latestFeedbackItems = [
    ...(latestLogFeedback
      ? [
          {
            type: "Workout log",
            exerciseName: latestLogFeedback.exercise_name,
            feedback: latestLogFeedback.coach_feedback,
            createdAt: latestLogFeedback.created_at,
          },
        ]
      : []),
    ...(latestVideoFeedback
      ? [
          {
            type: "Video review",
            exerciseName: latestVideoFeedback.exercise_name,
            feedback: latestVideoFeedback.feedback,
            createdAt: latestVideoFeedback.created_at,
          },
        ]
      : []),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 1)

  const hasCheckedInThisWeek = Boolean(thisWeeksCheckIns?.[0])
  const checkInDue = !hasCheckedInThisWeek
  const latestPB: any = latestPBs?.[0] || null

  const unlockedAchievements = achievements || []
  const latestAchievement: any = unlockedAchievements[0] || null

  const trainingDayStreak = calculateTrainingDayStreak(allWorkoutLogs)

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
      value: `${trainingDayStreak}`,
      sub:
        trainingDayStreak === 1
          ? "training day active"
          : "training days active",
      icon: "flame" as const,
      href: "/dashboard/workouts",
      priority: trainingDayStreak > 0 ? 3 : 9,
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
    <div className="flex flex-col gap-3">
      <FeedbackReadMarker
        unreadLogIds={unreadLogFeedbackIds}
        unreadVideoIds={unreadVideoFeedbackIds}
      />

      <section className="relative px-1 pt-1">
        <div className="relative min-h-[128px]">
          <div className="absolute -left-5 top-2 h-[104px] w-[104px] overflow-hidden rounded-full border border-smc-gold/40 bg-zinc-950 shadow-[0_0_26px_rgba(212,175,55,0.12)]">
            <Image
              src="/images/steve-avatar.jpeg"
              alt="Steve Moran"
              fill
              sizes="104px"
              className="object-cover grayscale"
              priority
            />
          </div>

          <div className="grid grid-cols-[48px_1fr_48px] items-start gap-3">
            <div />

            <div className="mt-10 flex items-center justify-center gap-2.5">
              <p className="text-2xl font-black tracking-[-0.08em] text-smc-gold">
                SMC
              </p>

              <div className="h-7 w-px bg-smc-gold/35" />

              <p className="text-[8px] font-bold uppercase leading-[0.95rem] tracking-[0.3em] text-smc-text">
                Steve Moran
                <br />
                Coaching
              </p>
            </div>

            <div className="relative z-20 mt-3 flex flex-col items-center gap-2">
              <Link
                href="/dashboard/messages"
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-smc-gold/35 bg-smc-gold/5 text-smc-gold shadow-[0_0_22px_rgba(212,175,55,0.12)]"
                aria-label="Open messages"
              >
                <Icon type="message" className="h-5 w-5" />

                {unreadFeedbackCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-smc-gold shadow-[0_0_10px_rgba(212,175,55,0.9)]" />
                )}
              </Link>

              <Link
                href="/dashboard/pbs"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-smc-gold/25 bg-black/35 text-smc-gold shadow-[0_0_18px_rgba(212,175,55,0.08)] transition active:scale-[0.96]"
                aria-label="Open PBs"
              >
                <Icon type="trophy" className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-2 text-center">
            <h1 className="text-[1.55rem] font-black leading-[0.98] tracking-[-0.055em] text-smc-text">
              Welcome back,
              <br />
              <span className="text-smc-gold">
                {client?.name || "Athlete"}
              </span>
            </h1>

            <p className="mt-2 text-sm leading-5 text-smc-muted">
              {unreadFeedbackCount > 0
                ? "Steve has fresh feedback waiting for you."
                : checkInDue
                  ? "Your weekly check-in is ready when you are."
                  : progressPercent === 100 && totalCount > 0
                    ? "Programme complete. Strong work."
                    : "Here’s what needs doing next."}
            </p>
          </div>
        </div>
      </section>

      <section className={`${glassCard} mt-1 p-3.5`}>
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

              <h2 className="mt-3 text-[1.5rem] font-black tracking-[-0.04em] text-smc-text">
                New Coach Feedback
              </h2>

              <p className="mt-1 text-sm text-smc-muted">
                {unreadFeedbackCount} new feedback item
                {unreadFeedbackCount === 1 ? "" : "s"} waiting.
              </p>

              <Link
                href="/dashboard/workouts"
                className="mt-3.5 flex min-h-[42px] items-center justify-center rounded-[1.25rem] bg-smc-gold px-5 text-center text-sm font-black text-black shadow-[0_0_24px_rgba(212,175,55,0.2)] transition active:scale-[0.99]"
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

              <h2 className="mt-3 text-[1.5rem] font-black tracking-[-0.04em] text-smc-text">
                Weekly Check-In Due
              </h2>

              <p className="mt-1 text-sm text-smc-muted">
                Submit your weekly update so Steve can review your progress.
              </p>

              <Link
                href="/dashboard/check-ins"
                className="mt-3.5 flex min-h-[42px] items-center justify-center rounded-[1.25rem] bg-smc-gold px-5 text-center text-sm font-black text-black shadow-[0_0_24px_rgba(212,175,55,0.2)] transition active:scale-[0.99]"
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

              <h2 className="mt-3 text-[1.5rem] font-black tracking-[-0.04em] text-smc-text">
                {nextWorkout.title}
              </h2>

              <div className="mt-2.5 flex flex-wrap gap-2">
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
                className="mt-3.5 flex min-h-[42px] items-center justify-center rounded-[1.25rem] bg-smc-gold px-5 text-center text-sm font-black text-black shadow-[0_0_24px_rgba(212,175,55,0.2)] transition active:scale-[0.99]"
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

              <h2 className="mt-3 text-[1.5rem] font-black tracking-[-0.04em] text-smc-text">
                Programme Pending
              </h2>

              <p className="mt-1 text-sm text-smc-muted">
                Your programme will appear here once it has been assigned.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        {dashboardStats.map((stat) => (
          <Link key={stat.label} href={stat.href} className={`${glassCard} p-3`}>
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-smc-muted-soft">
                  {stat.label}
                </p>

                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-smc-gold/20 bg-smc-gold/10 text-smc-gold">
                  <Icon type={stat.icon} className="h-3.5 w-3.5" />
                </span>
              </div>

              <p className="text-2xl font-black tracking-[-0.055em] text-smc-text">
                {stat.value}
              </p>

              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-smc-muted">
                {stat.sub}
              </p>
            </div>
          </Link>
        ))}
      </section>

      <section className={`${glassCard} px-3.5 py-3`}>
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

          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-black/70 ring-1 ring-[rgba(255,255,255,0.06)]">
            <div
              className="h-full rounded-full bg-smc-gold shadow-[0_0_16px_rgba(212,175,55,0.5)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="mt-2 text-[13px] text-smc-muted">
            {totalCount === 0
              ? "Your programme progress will appear here."
              : progressPercent === 100
                ? "Programme complete. Strong work."
                : "Keep ticking off the work."}
          </p>
        </div>
      </section>

      {latestPB && (
        <section className={`${glassCard} border-smc-gold/25 p-3.5`}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-smc-gold/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <IconBubble type="trophy" subtle />
              <p className={labelStyle}>Latest PB</p>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em] text-smc-text">
                  {latestPB.exercise_name}
                </h2>

                <p className="mt-1 text-sm text-smc-muted">
                  {formatPBType(latestPB.pb_type)} ·{" "}
                  {formatTimestamp(latestPB.created_at)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black tracking-[-0.06em] text-smc-gold">
                  {latestPB.weight}kg
                </p>

                <p className="text-xs text-smc-muted-soft">
                  {latestPB.reps} rep{latestPB.reps === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/pbs"
              className="mt-3 flex items-center justify-center gap-3 text-sm font-black text-smc-gold"
            >
              View PB board <span className="text-lg">→</span>
            </Link>
          </div>
        </section>
      )}

      <section className={`${glassCard} p-3.5`}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-smc-gold/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <IconBubble type="trophy" subtle />
              <div>
                <p className={labelStyle}>Achievements</p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.035em] text-smc-text">
                  Momentum Board
                </h2>
              </div>
            </div>

            <Link
              href="/dashboard/pbs"
              className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold"
            >
              PBs
            </Link>
          </div>

          {latestAchievement ? (
            <>
              <div className="mt-4 rounded-[1.35rem] border border-smc-gold/25 bg-smc-gold/[0.07] p-4 shadow-[0_0_22px_rgba(212,175,55,0.08)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-smc-gold/30 bg-black/35 text-smc-gold">
                    <Icon type="spark" className="h-5 w-5" />
                  </span>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-smc-gold">
                      Latest Unlock
                    </p>

                    <h3 className="mt-1 text-base font-black text-smc-text">
                      {latestAchievement.achievement_definitions?.title ||
                        "Achievement Unlocked"}
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-smc-muted">
                      {latestAchievement.achievement_definitions?.description ||
                        "Another marker of progress ticked off."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {unlockedAchievements.slice(1, 4).map((achievement: any) => (
                  <div
                    key={achievement.id}
                    className={`rounded-[1.15rem] border ${softBorder} bg-black/35 p-3`}
                  >
                    <p className="text-xs font-black text-smc-text">
                      {achievement.achievement_definitions?.title ||
                        "Achievement"}
                    </p>

                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-smc-muted-soft">
                      {achievement.achievement_definitions?.description ||
                        "Unlocked through training consistency."}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-[1.35rem] border border-[rgba(255,255,255,0.07)] bg-black/35 p-4">
              <p className="text-sm font-black text-smc-text">
                No achievements unlocked yet.
              </p>

              <p className="mt-1 text-sm leading-5 text-smc-muted">
                Log your first workout, hit a PB, or submit your first check-in
                to start building your achievement board.
              </p>
            </div>
          )}
        </div>
      </section>

      {latestFeedbackItems.length > 0 && (
        <section className={`${glassCard} border-smc-gold/25 p-3.5`}>
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <IconBubble type="chat" subtle />
                  <p className={labelStyle}>Latest Coach Feedback</p>
                </div>

                <p className="mt-2.5 text-sm text-zinc-300">
                  Recent notes from Steve.
                </p>
              </div>

              {unreadFeedbackCount > 0 && (
                <span className="rounded-full bg-smc-gold px-3 py-1.5 text-xs font-black text-black shadow-[0_0_18px_rgba(212,175,55,0.25)]">
                  {unreadFeedbackCount} NEW
                </span>
              )}
            </div>

            {latestFeedbackItems.map((item, index) => (
              <div
                key={`${item.type}-${index}`}
                className={`mt-3 rounded-[1.35rem] border ${softBorder} bg-black/45 p-3`}
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className="rounded-full bg-smc-gold px-3 py-1 text-[9px] font-black uppercase text-black">
                    {item.type}
                  </span>

                  <span className="text-xs text-smc-muted-soft">
                    {formatTimestamp(item.createdAt)}
                  </span>
                </div>

                <p className="text-sm font-black text-smc-text">
                  {item.exerciseName}
                </p>

                <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-300">
                  {item.feedback}
                </p>
              </div>
            ))}

            <Link
              href="/dashboard/workouts"
              className="mt-3 flex items-center justify-center gap-3 text-sm font-black text-smc-gold"
            >
              View workout feedback <span className="text-lg">→</span>
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}