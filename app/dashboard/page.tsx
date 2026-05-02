import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import FeedbackReadMarker from "@/components/FeedbackReadMarker"

export default async function Dashboard() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        You must be logged in.
      </main>
    )
  }

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
      <main className="min-h-screen bg-black p-6 text-white">
        <h1>Error loading programme</h1>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </main>
    )
  }

  const currentProgramme = programmes?.[0]
  const uploadedVideoCount = videos?.length || 0
  const loggedWorkoutCount = workoutLogs?.length || 0

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
            feedbackRead: latestLogFeedback.feedback_read,
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
            feedbackRead: latestVideoFeedback.feedback_read,
            createdAt: latestVideoFeedback.created_at,
          },
        ]
      : []),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3)

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const month = date.toLocaleString("en-GB", { month: "short" })

    return `${day} ${month}`
  }

  return (
    <main className="min-h-screen bg-black px-3 py-4 text-white sm:px-4 sm:py-6">
      <FeedbackReadMarker
        unreadLogIds={unreadLogFeedbackIds}
        unreadVideoIds={unreadVideoFeedbackIds}
      />

      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-8">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl sm:p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-400 sm:text-sm">
            Steve Moran Coaching
          </p>

          <div className="mt-3 space-y-4 md:flex md:items-end md:justify-between md:gap-6 md:space-y-0">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Your Programme
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Pick your session, check what’s planned, then start the workout when you’re ready.
              </p>
            </div>

            {currentProgramme && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 sm:px-4 sm:py-3">
                <p className="text-[10px] uppercase tracking-widest text-yellow-400 sm:text-xs">
                  Current block
                </p>
                <p className="mt-1 text-sm font-semibold text-white sm:text-base">
                  Week {currentProgramme.week_number} · {currentProgramme.title}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-zinc-400 sm:text-sm">Workout logs</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">
              {loggedWorkoutCount}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-zinc-400 sm:text-sm">Videos</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">
              {uploadedVideoCount}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-zinc-400 sm:text-sm">Feedback</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">
              {unreadFeedbackCount}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-zinc-400 sm:text-sm">Week</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {currentProgramme ? currentProgramme.week_number : "-"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                Latest Coach Feedback
              </h2>
              <p className="mt-1 text-sm text-zinc-300">
                Your newest feedback from Steve will show here first.
              </p>
            </div>

            {unreadFeedbackCount > 0 && (
              <span className="shrink-0 rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold text-black">
                {unreadFeedbackCount} NEW
              </span>
            )}
          </div>

          {latestFeedbackItems.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No coach feedback yet. Once Steve reviews your logs or videos, it’ll appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {latestFeedbackItems.map((item, index) => (
                <div
                  key={`${item.type}-${index}`}
                  className="rounded-xl border border-yellow-500/20 bg-black p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-yellow-500 px-2 py-1 text-[10px] font-bold uppercase text-black">
                      {item.type}
                    </span>

                    {!item.feedbackRead && (
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase text-black">
                        New
                      </span>
                    )}

                    <span className="text-xs text-zinc-500">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-white">
                    {item.exerciseName}
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                    {item.feedback}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {programmes?.map((programme) => (
          <section
            key={programme.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl sm:p-5"
          >
            <div className="mb-5 border-b border-zinc-800 pb-4">
              <p className="text-sm text-yellow-400">
                Week {programme.week_number}
              </p>

              <h2 className="text-xl font-bold sm:text-2xl">
                {programme.title}
              </h2>

              {programme.notes && (
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {programme.notes}
                </p>
              )}
            </div>

            <div className="space-y-4">
              {programme.programme_sessions?.map((session: any) => {
                const sessionLogs =
                  workoutLogs?.filter(
                    (log: any) => log.session_id === session.id
                  ) || []

                const sessionVideos =
                  videos?.filter((video: any) => video.session_id === session.id) ||
                  []

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
                    className="rounded-2xl border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-zinc-500">
                          {session.day}
                        </p>

                        <h3 className="mt-1 text-lg font-semibold text-white">
                          {session.title}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500">
                          {session.exercises?.length || 0} exercises
                        </p>
                      </div>

                      {hasUnreadFeedback && (
                        <span className="shrink-0 rounded-full bg-yellow-500 px-2 py-1 text-[10px] font-bold uppercase text-black">
                          New feedback
                        </span>
                      )}
                    </div>

                    {session.exercises?.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {session.exercises.map((ex: any, i: number) => (
                          <div
                            key={i}
                            className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                          >
                            <p className="text-sm font-semibold text-white">
                              {ex.name}
                            </p>

                            <p className="mt-1 text-sm text-yellow-400">
                              {ex.prescription || "No prescription"}
                            </p>

                            {ex.notes && (
                              <p className="mt-1 text-xs leading-5 text-zinc-500">
                                {ex.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <Link
                      href={`/dashboard/session/${session.id}?programmeId=${programme.id}`}
                      className="mt-4 block rounded-xl bg-yellow-500 px-4 py-3 text-center text-sm font-bold text-black transition hover:bg-yellow-400"
                    >
                      Start Workout
                    </Link>

                    {(sessionLogs.length > 0 || sessionVideos.length > 0) && (
                      <p className="mt-3 text-center text-xs text-zinc-500">
                        Previous activity: {sessionLogs.length} logs ·{" "}
                        {sessionVideos.length} videos
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {(!programmes || programmes.length === 0) && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center text-zinc-400">
            No programme assigned yet.
          </div>
        )}
      </div>
    </main>
  )
}