import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import EmptyStateCard from "@/components/ui/EmptyStateCard"
import FeedbackReadMarker from "@/components/FeedbackReadMarker"
import StartWorkoutButton from "@/components/StartWorkoutButton"
import PrefetchSession from "@/components/PrefetchSession"
import WeeklyWorkoutPlanner from "@/components/WeeklyWorkoutPlanner"

export const dynamic = "force-dynamic"

const softBorder = "border-[rgba(255,255,255,0.06)]"

const premiumCard =
  "relative overflow-hidden rounded-[1.35rem] border border-[rgba(255,255,255,0.07)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

const compactButtonWrap =
  "[&_a]:min-h-[42px] [&_a]:rounded-[1rem] [&_a]:py-2.5 [&_a]:text-xs"

function getStartOfWeek() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = date.toLocaleString("en-GB", { month: "short" })
  return `${day} ${month}`
}

function getLastCompletedText(logs: any[]) {
  if (!logs || logs.length === 0) return "Never completed"

  const latestLog = [...logs].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]

  if (!latestLog?.created_at) return "Never completed"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const completedDate = new Date(latestLog.created_at)
  completedDate.setHours(0, 0, 0, 0)

  const diffMs = today.getTime() - completedDate.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return "Last completed today"
  if (diffDays === 1) return "Last completed yesterday"

  return `Last completed ${diffDays} days ago`
}

function getExerciseCount(session: any) {
  return Array.isArray(session?.exercises) ? session.exercises.length : 0
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

function getEffectiveWeekNumber({
  programmeWeekNumber,
  sessions,
  completedSessionIds,
}: {
  programmeWeekNumber: number
  programmeCreatedAt?: string | null
  sessions: any[]
  completedSessionIds: Set<string>
}) {
  const weeks = Array.from(
    new Set(sessions.map((session: any) => Number(session.week_number || 1)))
  ).sort((a, b) => a - b)

  if (!weeks.length) return programmeWeekNumber || 1

  const maxWeek = weeks[weeks.length - 1]
  let effectiveWeek = programmeWeekNumber || weeks[0]

  const currentWeekSessions = sessions.filter(
    (session: any) => Number(session.week_number || 1) === effectiveWeek
  )

  const currentWeekComplete =
    currentWeekSessions.length > 0 &&
    currentWeekSessions.every((session: any) =>
      completedSessionIds.has(session.id)
    )

  if (currentWeekComplete && effectiveWeek < maxWeek) {
    effectiveWeek += 1
  }

  return Math.min(effectiveWeek, maxWeek)
}

function groupSessionsByWeek(sessions: any[]) {
  return sessions.reduce((acc: Record<number, any[]>, session: any) => {
    const weekNumber = Number(session.week_number || 1)
    if (!acc[weekNumber]) acc[weekNumber] = []
    acc[weekNumber].push(session)
    return acc
  }, {})
}

function getSessionImage(sessionTitle?: string | null) {
  const title = String(sessionTitle || "").toLowerCase()

  if (title.includes("squat")) return "/images/dashboard-plates.jpeg"
  if (title.includes("bench")) return "/images/dashboard-plates.jpeg"
  if (title.includes("deadlift")) return "/images/dashboard-plates.jpeg"
  if (title.includes("accessory")) return "/images/dashboard-plates.jpeg"

  return "/images/dashboard-plates.jpeg"
}

export default async function WorkoutsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [
    { data: client },
    { data: programmes, error: programmesError },
    { data: videos, error: videosError },
    { data: workoutLogs, error: workoutLogsError },
    { data: sessionCompletions, error: sessionCompletionsError },
  ] = await Promise.all([
    supabase.from("clients").select("name").eq("user_id", user.id).single(),

    supabase
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
      .order("created_at", { ascending: false }),

    supabase
      .from("exercise_videos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("workout_logs")
      .select(`
        id,
        session_id,
        exercise_name,
        coach_feedback,
        feedback_read,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("session_completions")
      .select("id, session_id, completed, created_at")
      .eq("user_id", user.id)
      .eq("completed", true)
      .order("created_at", { ascending: false }),
  ])

  if (
    programmesError ||
    videosError ||
    workoutLogsError ||
    sessionCompletionsError
  ) {
    throw new Error("Workouts failed to load")
  }

  const currentProgramme: any =
    programmes?.find((programme: any) => programme.is_active) || programmes?.[0]

  const sessions = sortProgrammeSessions(
    currentProgramme?.programme_sessions || []
  )

  const startOfWeek = getStartOfWeek()
const endOfWeekDate = new Date(startOfWeek)
endOfWeekDate.setDate(endOfWeekDate.getDate() + 7)
const endOfWeek = endOfWeekDate.toISOString()

const completedSessionIds = new Set(
  (sessionCompletions || []).map(
    (completion: any) => completion.session_id
  )
)

const { data: existingWeeklySchedule } = await supabase
  .from("client_weekly_session_schedule")
  .select("id, session_id, planned_date, planned_order, week_number")
  .eq("user_id", user.id)
  .eq("programme_id", currentProgramme?.id || "")
  .gte("planned_date", startOfWeek)
  .lt("planned_date", endOfWeek)
  .order("planned_order", { ascending: true })

const scheduledWeekNumber =
  existingWeeklySchedule?.[0]?.week_number
    ? Number(existingWeeklySchedule[0].week_number)
    : null

const plannerWeekNumber = getEffectiveWeekNumber({
  programmeWeekNumber: Number(
    scheduledWeekNumber ||
      currentProgramme?.week_number ||
      sessions[0]?.week_number ||
      1
  ),
  programmeCreatedAt: currentProgramme?.created_at,
  sessions,
  completedSessionIds,
})

const weeklySchedule = (existingWeeklySchedule || []).filter(
  (item: any) => Number(item.week_number || 1) === Number(plannerWeekNumber)
)

  const sessionsByWeek = groupSessionsByWeek(sessions)

  const weekEntries = Object.entries(sessionsByWeek).sort(
    ([weekA], [weekB]) => Number(weekA) - Number(weekB)
  )

  const completedCount = sessions.filter((session: any) =>
    completedSessionIds.has(session.id)
  ).length

  const totalCount = sessions.length
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

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
      Number(session.week_number || 1) === Number(plannerWeekNumber) &&
      !completedSessionIds.has(session.id)
  ) ||
  sessions.find((session: any) => !completedSessionIds.has(session.id)) ||
  sessions[0]

const thisWeekPlannerSessions = sessions.filter(
  (session: any) =>
    Number(session.week_number || 1) === Number(plannerWeekNumber)
)

  const unreadLogFeedbackIds =
    workoutLogs
      ?.filter((log: any) => log.coach_feedback && !log.feedback_read)
      .map((log: any) => log.id) || []

  const unreadVideoFeedbackIds =
    videos
      ?.filter((video: any) => video.feedback && !video.feedback_read)
      .map((video: any) => video.id) || []

  const unreadFeedbackCount =
    unreadLogFeedbackIds.length + unreadVideoFeedbackIds.length

  const latestLogFeedback =
    workoutLogs?.filter((log: any) => log.coach_feedback)?.[0] || null

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
    .slice(0, 2)

  return (
    <div className="flex flex-col gap-3 pb-4">
      <FeedbackReadMarker
        unreadLogIds={unreadLogFeedbackIds}
        unreadVideoIds={unreadVideoFeedbackIds}
      />

      <section className={premiumCard}>
        <div className="relative z-10">
          <div className="mb-3 h-0.5 w-12 rounded-full bg-smc-gold shadow-[0_0_14px_rgba(212,175,55,0.35)]" />

          <p className="text-[9px] uppercase tracking-[0.26em] text-smc-gold">
            Steve Moran Coaching
          </p>

          <h1 className="mt-2 text-[1.35rem] font-black leading-tight text-smc-text">
            Workouts
          </h1>

          <p className="mt-1.5 text-xs leading-5 text-smc-muted">
            {client?.name ? `${client.name}, ` : ""}
            here’s your current training block.
          </p>

          {currentProgramme ? (
            <div className="relative mt-3 overflow-hidden rounded-[1.15rem] border border-[rgba(255,255,255,0.07)] shadow-inner">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{
                  backgroundImage: "url('/images/dashboard-plates.jpeg')",
                }}
              />

              <div className="absolute inset-0 bg-black/76 backdrop-blur-[1px]" />

              <div className="relative z-10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-smc-gold">
                      Current programme
                    </p>

                    <h2 className="mt-1.5 line-clamp-2 text-base font-black leading-tight text-smc-text">
                      {currentProgramme.title}
                    </h2>

                    <p className="mt-1 text-xs text-smc-muted">
                      {weekEntries.length || 1} week
                      {weekEntries.length === 1 ? "" : "s"} · {totalCount}{" "}
                      workout{totalCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-2.5 py-1 text-[10px] font-black text-smc-gold">
                    {progressPercent}%
                  </div>
                </div>

                {currentProgramme.notes ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-300">
                    {currentProgramme.notes}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!currentProgramme ? (
        <EmptyStateCard
          eyebrow="Training block"
          title="No programme assigned yet"
          body="Once your coach assigns your first programme, your sessions, workout previews and weekly progress will appear here."
          href="/dashboard"
          actionLabel="Back to dashboard"
        />
      ) : sessions.length === 0 ? (
        <EmptyStateCard
          eyebrow="Programme sessions"
          title="Programme assigned, sessions pending"
          body="Your programme exists, but there are no sessions attached to it yet. Once sessions are added, they’ll show here ready to preview and log."
          href="/dashboard"
          actionLabel="Back to dashboard"
        />
      ) : (
        <>
          {nextWorkout ? (
            <section className={premiumCard}>
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-smc-gold">
                      Up next
                    </p>

                    <h2 className="mt-1.5 line-clamp-2 text-lg font-black leading-tight text-smc-text">
                      {nextWorkout.title}
                    </h2>

                    <p className="mt-1 text-xs text-smc-muted">
                      Week {nextWorkout.week_number || 1} · {nextWorkout.day} ·{" "}
                      {getExerciseCount(nextWorkout)} exercises
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${
                      completedSessionIds.has(nextWorkout.id)
                        ? "bg-green-500 text-black"
                        : "bg-smc-gold/15 text-smc-gold"
                    }`}
                  >
                    {completedSessionIds.has(nextWorkout.id) ? "Done" : "Next"}
                  </span>
                </div>

                <PrefetchSession
                  href={`/dashboard/workouts/${nextWorkout.id}/preview?programmeId=${currentProgramme.id}`}
                />

                <div className={`mt-3 ${compactButtonWrap}`}>
                  <StartWorkoutButton
                    href={`/dashboard/workouts/${nextWorkout.id}/preview?programmeId=${currentProgramme.id}`}
                    label="Preview Workout"
                  />
                </div>
              </div>
            </section>
          ) : null}

          <section className={premiumCard}>
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-smc-text">
                    Programme Progress
                  </h2>
                  <p className="mt-0.5 text-xs text-smc-muted">
                    {progressPercent === 100
                      ? "Programme complete. Strong work."
                      : "Keep ticking off the work."}
                  </p>
                </div>

                <p className="shrink-0 text-xs font-bold text-smc-muted">
                  {completedCount}/{totalCount}
                </p>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#080808] ring-1 ring-[rgba(255,255,255,0.06)]">
                <div
                  className="h-full rounded-full bg-smc-gold/90 shadow-[0_0_14px_rgba(212,175,55,0.35)] transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </section>

          {unreadFeedbackCount > 0 ? (
            <section className="relative overflow-hidden rounded-[1.35rem] border border-smc-gold/25 bg-smc-gold/10 p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)]">
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-smc-text">
                      New Coach Feedback
                    </h2>
                    <p className="mt-1 text-xs text-zinc-300">
                      You have feedback waiting from Steve.
                    </p>
                  </div>

                  <span className="rounded-full bg-smc-gold/90 px-2.5 py-1 text-[9px] font-black text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]">
                    {unreadFeedbackCount} NEW
                  </span>
                </div>

                {latestFeedbackItems.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {latestFeedbackItems.map((item, index) => (
  <details
    key={`${item.type}-${index}`}
    className={`rounded-[1rem] border ${softBorder} bg-[#070707] p-3`}
  >
    <summary className="cursor-pointer list-none">

      <div className="mb-1.5 flex items-center gap-2">
        <span className="rounded-full bg-smc-gold/90 px-2 py-0.5 text-[8px] font-black uppercase text-black">
          {item.type}
        </span>

        <span className="text-[11px] text-smc-muted-soft">
          {formatDate(item.createdAt)}
        </span>
      </div>

      <p className="break-words text-xs font-bold text-smc-text">
        {item.exerciseName}
      </p>

      <p className="mt-1 text-[11px] font-bold text-smc-gold">
        Tap to read feedback ↓
      </p>

    </summary>

    <div className="mt-2 border-t border-white/5 pt-2">
      <p className="whitespace-pre-wrap break-words text-xs leading-5 text-zinc-300">
        {item.feedback}
      </p>
    </div>

  </details>
))}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <WeeklyWorkoutPlanner
  programmeId={currentProgramme.id}
  weekNumber={plannerWeekNumber}
  sessions={thisWeekPlannerSessions.map((session: any) => ({
    id: session.id,
    title: `${session.day || "Session"} · ${session.title}`,
  }))}
  existingSchedule={weeklySchedule || []}
  completedSessionIds={Array.from(completedSessionIds) as string[]}
/>

          <section className={premiumCard}>
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-smc-text">
                  Programme Sessions
                </h2>

                <p className="text-[11px] text-smc-muted-soft">
                  {totalCount} total
                </p>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {weekEntries.map(([weekNumber, weekSessions]: any) => (
                  <div
                    key={weekNumber}
                    className={`rounded-[1.15rem] border ${softBorder} bg-black/30 p-3`}
                  >
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-smc-gold">
                          Week {weekNumber}
                        </p>

                        <p className="mt-0.5 text-xs text-smc-muted-soft">
                          {weekSessions.length} session
                          {weekSessions.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      <p className="text-[10px] font-bold text-smc-muted-soft">
                        {
                          weekSessions.filter((session: any) =>
                            completedSessionIds.has(session.id)
                          ).length
                        }
                        /{weekSessions.length}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {weekSessions.map((session: any, index: number) => {
                        const sessionLogs =
                          workoutLogs?.filter(
                            (log: any) => log.session_id === session.id
                          ) || []

                        const sessionVideos =
                          videos?.filter(
                            (video: any) => video.session_id === session.id
                          ) || []

                        const completed = completedSessionIds.has(session.id)

                        const hasUnreadFeedback =
                          sessionLogs.some(
                            (log: any) =>
                              log.coach_feedback && !log.feedback_read
                          ) ||
                          sessionVideos.some(
                            (video: any) =>
                              video.feedback && !video.feedback_read
                          )

                        const sessionHref = completed
  ? `/dashboard/workouts/${session.id}/completed?programmeId=${currentProgramme.id}`
  : `/dashboard/workouts/${session.id}/preview?programmeId=${currentProgramme.id}`
                        const lastCompletedText =
                          getLastCompletedText(sessionLogs)

                        return (
                          <div
                            key={session.id}
                            className={`relative overflow-hidden rounded-[1.2rem] border ${
                              completed
                                ? "border-green-500/20"
                                : "border-smc-gold/14"
                            } bg-[#070707] p-3 shadow-[0_10px_26px_rgba(0,0,0,0.42)] transition duration-300 active:scale-[0.985]`}
                          >
                            <div
                              className="absolute inset-0 bg-cover bg-center opacity-20"
                              style={{
                                backgroundImage: `url('${getSessionImage(
                                  session.title
                                )}')`,
                              }}
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.92),rgba(0,0,0,0.72),rgba(0,0,0,0.92))]" />
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/30 to-transparent" />

                            <div className="relative z-10">
                              <PrefetchSession href={sessionHref} />

                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-smc-gold">
                                    {session.day || `Day ${index + 1}`}
                                  </p>

                                  <h3 className="mt-1.5 line-clamp-2 break-words text-[0.95rem] font-black leading-tight text-smc-text">
                                    {session.title}
                                  </h3>

                                  <p className="mt-1 break-words text-xs text-smc-muted-soft">
                                    {getExerciseCount(session)} exercises
                                    {(sessionLogs.length > 0 ||
                                      sessionVideos.length > 0) &&
                                      ` · ${sessionLogs.length} logs · ${sessionVideos.length} videos`}
                                  </p>

                                  <p
                                    className={`mt-1.5 text-[11px] font-bold ${
                                      sessionLogs.length > 0
                                        ? "text-smc-gold/75"
                                        : "text-white/30"
                                    }`}
                                  >
                                    {lastCompletedText}
                                  </p>
                                </div>

                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${
                                      completed
                                        ? "bg-green-500 text-black"
                                        : "bg-[rgba(255,255,255,0.06)] text-smc-muted"
                                    }`}
                                  >
                                    {completed ? "Done" : "To do"}
                                  </span>

                                  {hasUnreadFeedback ? (
                                    <span className="rounded-full bg-smc-gold/90 px-2 py-0.5 text-[8px] font-black uppercase text-black">
                                      Feedback
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <div className={`mt-3 ${compactButtonWrap}`}>
                                <StartWorkoutButton
                                  href={sessionHref}
                                  label={
                                    completed
                                      ? "View Session"
                                      : "Preview Workout"
                                  }
                                  variant={completed ? "secondary" : "primary"}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}