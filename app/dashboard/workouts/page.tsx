import { createSupabaseServerClient } from "@/lib/supabaseServer"
import FeedbackReadMarker from "@/components/FeedbackReadMarker"
import StartWorkoutButton from "@/components/StartWorkoutButton"
import PrefetchSession from "@/components/PrefetchSession"

export const dynamic = "force-dynamic"

const softBorder = "border-[rgba(255,255,255,0.06)]"

const premiumCard =
  "relative overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[#111111] to-[#050505] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.75)] before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

const innerPanel =
  "rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#080808] shadow-inner"

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
      programme_sessions (
        id,
        day,
        title,
        exercises
      )
    `)
    .eq("user_id", user.id)
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

  const currentProgramme: any = programmes?.[0]
  const sessions = currentProgramme?.programme_sessions || []

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
    <div className="flex flex-col gap-4">
      <FeedbackReadMarker
        unreadLogIds={unreadLogFeedbackIds}
        unreadVideoIds={unreadVideoFeedbackIds}
      />

      <section className={premiumCard}>
        <div className="relative z-10">
          <div className="mb-4 h-1 w-16 rounded-full bg-smc-gold shadow-[0_0_18px_rgba(212,175,55,0.35)]" />

          <p className="text-xs uppercase tracking-[0.25em] text-smc-gold">
            Steve Moran Coaching
          </p>

          <h1 className="mt-4 text-2xl font-bold text-smc-text">
            Welcome back, {client?.name || "Athlete"} 👋
          </h1>

          <p className="mt-2 text-sm leading-6 text-smc-muted">
            Here’s what needs doing next.
          </p>

          <div className={`mt-5 ${innerPanel} p-4`}>
            <p className="text-xs uppercase tracking-widest text-smc-gold">
              Next workout
            </p>

            <h2 className="mt-2 text-xl font-bold text-smc-text">
              {nextWorkout?.title || "No workout found"}
            </h2>

            {nextWorkout && (
              <p className="mt-1 text-sm text-smc-muted">
                {nextWorkout.day} · {nextWorkout.exercises?.length || 0}{" "}
                exercises
              </p>
            )}

            {nextWorkout && currentProgramme && (
              <>
                <PrefetchSession
                  href={`/dashboard/session/${nextWorkout.id}?programmeId=${currentProgramme.id}`}
                />

                <div className="mt-4">
                  <StartWorkoutButton
                    href={`/dashboard/session/${nextWorkout.id}?programmeId=${currentProgramme.id}`}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className={premiumCard}>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-smc-text">This Week</h2>

            <p className="text-sm text-smc-muted">
              {completedCount} / {totalCount} completed
            </p>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#080808] ring-1 ring-[rgba(255,255,255,0.06)]">
            <div
              className="h-full rounded-full bg-smc-gold/90 shadow-[0_0_14px_rgba(212,175,55,0.35)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="mt-3 text-sm text-smc-muted">
            {progressPercent === 100
              ? "Week complete. Strong work."
              : "Keep ticking off the work."}
          </p>
        </div>
      </section>

      {unreadFeedbackCount > 0 && (
        <section className="relative overflow-hidden rounded-3xl border border-smc-gold/25 bg-smc-gold/10 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.75)]">
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-smc-text">
                  New Coach Feedback
                </h2>
                <p className="mt-1 text-sm text-zinc-300">
                  You have feedback waiting from Steve.
                </p>
              </div>

              <span className="rounded-full bg-smc-gold/90 px-3 py-1 text-xs font-bold text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]">
                {unreadFeedbackCount} NEW
              </span>
            </div>

            {latestFeedbackItems.length > 0 && (
              <div className="mt-4 space-y-3">
                {latestFeedbackItems.map((item, index) => (
                  <div
                    key={`${item.type}-${index}`}
                    className={`rounded-2xl border ${softBorder} bg-[#080808] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)]`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-smc-gold/90 px-2 py-1 text-[10px] font-bold uppercase text-black">
                        {item.type}
                      </span>

                      <span className="text-xs text-smc-muted-soft">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-smc-text">
                      {item.exerciseName}
                    </p>

                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-300">
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
          <p className="text-xs uppercase tracking-widest text-smc-gold">
            Current programme
          </p>

          <h2 className="mt-2 text-xl font-bold text-smc-text">
            {currentProgramme?.title || "No active programme"}
          </h2>

          {currentProgramme?.week_number && (
            <p className="mt-1 text-sm text-smc-muted">
              Week {currentProgramme.week_number}
            </p>
          )}

          {currentProgramme?.notes && (
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {currentProgramme.notes}
            </p>
          )}
        </div>
      </section>

      <section className={premiumCard}>
        <div className="relative z-10">
          <h2 className="font-semibold text-smc-text">This Week’s Workouts</h2>

          <div className="mt-4 flex flex-col gap-3">
            {sessions.map((session: any) => {
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

              return (
                <div
                  key={session.id}
                  className={`rounded-2xl border ${softBorder} bg-[#080808] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)]`}
                >
                  {currentProgramme && (
                    <PrefetchSession
                      href={`/dashboard/session/${session.id}?programmeId=${currentProgramme.id}`}
                    />
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-smc-muted-soft">
                        {session.day}
                      </p>

                      <h3 className="mt-1 text-lg font-semibold text-smc-text">
                        {session.title}
                      </h3>

                      <p className="mt-1 text-sm text-smc-muted-soft">
                        {session.exercises?.length || 0} exercises
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          completed
                            ? "bg-green-500 text-black"
                            : "bg-smc-card-soft text-smc-muted"
                        }`}
                      >
                        {completed ? "Done" : "To do"}
                      </span>

                      {hasUnreadFeedback && (
                        <span className="rounded-full bg-smc-gold/90 px-2 py-1 text-[10px] font-bold uppercase text-black">
                          Feedback
                        </span>
                      )}
                    </div>
                  </div>

                  {currentProgramme && (
                    <div className="mt-4">
                      <StartWorkoutButton
                        href={`/dashboard/session/${session.id}?programmeId=${currentProgramme.id}`}
                        label={completed ? "View Workout" : "Start Workout"}
                        variant={completed ? "secondary" : "primary"}
                      />
                    </div>
                  )}

                  {(sessionLogs.length > 0 || sessionVideos.length > 0) && (
                    <p className="mt-3 text-center text-xs text-smc-muted-soft">
                      Previous activity: {sessionLogs.length} logs ·{" "}
                      {sessionVideos.length} videos
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {(!programmes || programmes.length === 0) && (
        <div
          className={`rounded-3xl border ${softBorder} bg-smc-card p-6 text-center text-sm text-smc-muted`}
        >
          No programme assigned yet.
        </div>
      )}
    </div>
  )
}