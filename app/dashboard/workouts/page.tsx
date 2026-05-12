import { createSupabaseServerClient } from "@/lib/supabaseServer"
import FeedbackReadMarker from "@/components/FeedbackReadMarker"
import StartWorkoutButton from "@/components/StartWorkoutButton"
import PrefetchSession from "@/components/PrefetchSession"

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

function groupSessionsByWeek(sessions: any[]) {
  return sessions.reduce((acc: Record<number, any[]>, session: any) => {
    const weekNumber = Number(session.week_number || 1)

    if (!acc[weekNumber]) {
      acc[weekNumber] = []
    }

    acc[weekNumber].push(session)

    return acc
  }, {})
}

export default async function WorkoutsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className={`${premiumCard} text-sm text-smc-muted`}>
        You must be logged in.
      </div>
    )
  }

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("user_id", user.id)
    .single()

  const { data: programmes, error } = await supabase
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

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: workoutLogs } = await supabase
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
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
        <h1 className="mb-3 font-bold">Error loading programme</h1>
        <pre className="whitespace-pre-wrap text-xs">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    )
  }

  const currentProgramme: any =
    programmes?.find((programme: any) => programme.is_active) || programmes?.[0]

  const sessions = sortProgrammeSessions(
    currentProgramme?.programme_sessions || []
  )

  const sessionsByWeek = groupSessionsByWeek(sessions)

  const weekEntries = Object.entries(sessionsByWeek).sort(
    ([weekA], [weekB]) => Number(weekA) - Number(weekB)
  )

  const startOfWeek = getStartOfWeek()

  const thisWeekLogs =
    workoutLogs?.filter(
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

          {currentProgramme && (
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

                {currentProgramme.notes && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-300">
                    {currentProgramme.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {nextWorkout && currentProgramme && (
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
              href={`/dashboard/workouts/${nextWorkout.id}?programmeId=${currentProgramme.id}`}
            />

            <div className={`mt-3 ${compactButtonWrap}`}>
              <StartWorkoutButton
                href={`/dashboard/workouts/${nextWorkout.id}?programmeId=${currentProgramme.id}`}
                label="View Workout"
              />
            </div>
          </div>
        </section>
      )}

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
              className="h-full rounded-full bg-smc-gold/90 shadow-[0_0_14px_rgba(212,175,55,0.35)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </section>

      {unreadFeedbackCount > 0 && (
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

            {latestFeedbackItems.length > 0 && (
              <div className="mt-3 space-y-2">
                {latestFeedbackItems.map((item, index) => (
                  <div
                    key={`${item.type}-${index}`}
                    className={`rounded-[1rem] border ${softBorder} bg-[#070707] p-3`}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="rounded-full bg-smc-gold/90 px-2 py-0.5 text-[8px] font-black uppercase text-black">
                        {item.type}
                      </span>

                      <span className="text-[11px] text-smc-muted-soft">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-smc-text">
                      {item.exerciseName}
                    </p>

                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-zinc-300">
                      {item.feedback}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

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
                    const completed = completedSessionIds.has(session.id)

                    const sessionLogs =
                      workoutLogs?.filter(
                        (log: any) => log.session_id === session.id
                      ) || []

                    const sessionVideos =
                      videos?.filter(
                        (video: any) => video.session_id === session.id
                      ) || []

                    const hasUnreadFeedback =
                      sessionLogs.some(
                        (log: any) => log.coach_feedback && !log.feedback_read
                      ) ||
                      sessionVideos.some(
                        (video: any) => video.feedback && !video.feedback_read
                      )

                    const previewHref = `/dashboard/workouts/${session.id}?programmeId=${currentProgramme.id}`

                    return (
                      <div
                        key={session.id}
                        className={`rounded-[1.1rem] border ${softBorder} bg-[#070707] p-3 shadow-[0_8px_22px_rgba(0,0,0,0.32)]`}
                      >
                        <PrefetchSession href={previewHref} />

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-smc-gold">
                              {session.day || `Day ${index + 1}`}
                            </p>

                            <h3 className="mt-1.5 line-clamp-2 text-[0.95rem] font-black leading-tight text-smc-text">
                              {session.title}
                            </h3>

                            <p className="mt-1 text-xs text-smc-muted-soft">
                              {getExerciseCount(session)} exercises
                              {(sessionLogs.length > 0 ||
                                sessionVideos.length > 0) &&
                                ` · ${sessionLogs.length} logs · ${sessionVideos.length} videos`}
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

                            {hasUnreadFeedback && (
                              <span className="rounded-full bg-smc-gold/90 px-2 py-0.5 text-[8px] font-black uppercase text-black">
                                Feedback
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`mt-3 ${compactButtonWrap}`}>
                          <StartWorkoutButton
                            href={previewHref}
                            label={completed ? "View Workout" : "Preview Workout"}
                            variant={completed ? "secondary" : "primary"}
                          />
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

      {(!programmes || programmes.length === 0) && (
        <div
          className={`rounded-3xl border ${softBorder} bg-smc-card p-5 text-center text-sm text-smc-muted`}
        >
          No programme assigned yet.
        </div>
      )}
    </div>
  )
}