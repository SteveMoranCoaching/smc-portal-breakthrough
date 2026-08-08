import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import EmptyStateCard from "@/components/ui/EmptyStateCard"
import StartWorkoutButton from "@/components/StartWorkoutButton"
import PrefetchSession from "@/components/PrefetchSession"
import WeeklyWorkoutPlanner from "@/components/WeeklyWorkoutPlanner"
import { isProgrammeExpired } from "@/lib/programmes/dates"
import {
  groupProgrammeSessionsByWeek,
  getSessionsForWeek,
  sortProgrammeSessions,
} from "@/lib/programmes/sessions"
import {
  getCurrentProgramme,
  getEffectiveProgrammeWeek,
  getProgrammeProgress,
  getNextProgrammeSession,
} from "@/lib/programmes/progression"

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

function getSessionImage(sessionTitle?: string | null) {
  const title = String(sessionTitle || "").toLowerCase()

  if (title.includes("squat")) return "/images/dashboard-plates.jpeg"
  if (title.includes("bench")) return "/images/dashboard-plates.jpeg"
  if (title.includes("deadlift")) return "/images/dashboard-plates.jpeg"
  if (title.includes("accessory")) return "/images/dashboard-plates.jpeg"

  return "/images/dashboard-plates.jpeg"
}

function getEffectiveProgrammeEndDate({
  startDate,
  endDate,
  coachCurrentWeek,
}: {
  startDate?: string | null
  endDate?: string | null
  coachCurrentWeek?: number | null
}) {
  if (!endDate) return null

  if (!startDate || !coachCurrentWeek) {
    return endDate
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  const today = new Date()

  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  today.setHours(0, 0, 0, 0)

  const millisecondsPerWeek =
    7 * 24 * 60 * 60 * 1000

  const calendarWeek =
    Math.floor(
      (today.getTime() - start.getTime()) /
        millisecondsPerWeek
    ) + 1

  const weeksHeldBack = Math.max(
    0,
    calendarWeek - Number(coachCurrentWeek)
  )

  const effectiveEnd = new Date(end)

  effectiveEnd.setDate(
    effectiveEnd.getDate() + weeksHeldBack * 7
  )

  return effectiveEnd.toISOString()
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
  start_date,
  end_date,
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

  const currentProgramme = getCurrentProgramme(programmes)

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

const plannerWeekNumber = getEffectiveProgrammeWeek({
  programmeStartDate:
    currentProgramme?.start_date || currentProgramme?.created_at,
  coachCurrentWeek: currentProgramme?.coach_current_week,
  sessions,
  completedSessionIds,
})

const effectiveProgrammeEndDate =
  getEffectiveProgrammeEndDate({
    startDate:
      currentProgramme?.start_date ||
      currentProgramme?.created_at,
    endDate: currentProgramme?.end_date,
    coachCurrentWeek:
      currentProgramme?.coach_current_week,
  })

const programmeExpired = isProgrammeExpired({
  endDate: effectiveProgrammeEndDate,
})

const weeklySchedule = (existingWeeklySchedule || []).filter(
  (item: any) => Number(item.week_number || 1) === Number(plannerWeekNumber)
)

  const sessionsByWeek = groupProgrammeSessionsByWeek(sessions)

  const weekEntries = Object.entries(sessionsByWeek).sort(
    ([weekA], [weekB]) => Number(weekA) - Number(weekB)
  )

  const programmeProgress = getProgrammeProgress({
  sessions,
  completedSessionIds,
})

const {
  completedCount,
  totalCount,
  percentage: progressPercent,
} = programmeProgress

  const scheduledSessionIds = (weeklySchedule || []).map(
  (item: any) => item.session_id
)

const nextWorkout = getNextProgrammeSession({
  sessions,
  currentWeek: plannerWeekNumber,
  completedSessionIds,
  scheduledSessionIds,
})

const thisWeekPlannerSessions = getSessionsForWeek(
  sessions,
  plannerWeekNumber
)

  const unreadLogFeedbackIds =
    workoutLogs
      ?.filter((log: any) => log.coach_feedback && !log.feedback_read)
      .map((log: any) => log.id) || []

  const unreadVideoFeedbackIds =
    videos
      ?.filter((video: any) => video.feedback && !video.feedback_read)
      .map((video: any) => video.id) || []

  return (
    <div className="flex flex-col gap-3 pb-4">

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

      {!currentProgramme || programmeExpired ? (
  <EmptyStateCard
    eyebrow="Training block"
    title="Programme Pending"
    body="Contact Steve for details."
    href="/dashboard/messages"
    actionLabel="Message Steve"
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
                {weekEntries.map(([weekNumber, weekSessions]: any) => {
  const numericWeekNumber = Number(weekNumber)
  const isActiveWeek = numericWeekNumber === Number(plannerWeekNumber)

  const completedInWeek = weekSessions.filter((session: any) =>
    completedSessionIds.has(session.id)
  ).length

  const weekComplete =
    weekSessions.length > 0 && completedInWeek >= weekSessions.length

  const weekStatus = isActiveWeek
    ? "Active"
    : weekComplete
      ? "Complete"
      : numericWeekNumber > Number(plannerWeekNumber)
        ? "Upcoming"
        : "Previous"

  return (
    <details
      key={weekNumber}
      open={isActiveWeek}
      className={`rounded-[1.15rem] border ${
        isActiveWeek
          ? "border-smc-gold/30 bg-smc-gold/[0.055]"
          : softBorder
      } bg-black/30 p-3`}
    >
      <summary className="cursor-pointer list-none">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-smc-gold">
                Week {weekNumber}
              </p>

              <span
                className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${
                  isActiveWeek
                    ? "bg-smc-gold text-black"
                    : weekComplete
                      ? "bg-green-500 text-black"
                      : numericWeekNumber > Number(plannerWeekNumber)
                        ? "bg-white/[0.08] text-white/45"
                        : "bg-white/[0.05] text-white/35"
                }`}
              >
                {weekStatus}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-smc-muted-soft">
              {weekSessions.length} session
              {weekSessions.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-bold text-smc-muted-soft">
              {completedInWeek}/{weekSessions.length}
            </p>
            <p className="mt-0.5 text-[9px] text-white/25">
              Tap to expand
            </p>
          </div>
        </div>
      </summary>

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
                  </details>
                )
              })}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}