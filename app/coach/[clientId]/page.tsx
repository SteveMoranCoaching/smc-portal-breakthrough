import Link from "next/link"
import { supabase } from "@/lib/supabase"
import VideoGroup from "./VideoGroup"
import WorkoutLogReviewButton from "./WorkoutLogReviewButton"
import WorkoutLogFeedbackBox from "./WorkoutLogFeedbackBox"

export const dynamic = "force-dynamic"

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ exercise?: string }>
}) {
  const { clientId } = await params
  const { exercise: selectedExercise } = await searchParams

  const { data: client } = await supabase
    .from("clients")
    .select("id, user_id, name, email")
    .eq("id", clientId)
    .single()

  if (!client) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        Client not found.
      </main>
    )
  }

  const { data: programmes } = await supabase
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
    .eq("user_id", client.user_id)
    .order("created_at", { ascending: false })

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select("*")
    .eq("user_id", client.user_id)
    .order("created_at", { ascending: false })

  const { data: workoutLogs, error: workoutLogsError } = await supabase
    .from("workout_logs")
    .select(`
      id,
      user_id,
      exercise_name,
      sets_completed,
      notes,
      created_at,
      reviewed,
      coach_feedback
    `)
    .eq("user_id", client.user_id)
    .order("created_at", { ascending: false })

  const videosWithUrls = await Promise.all(
    (videos ?? []).map(async (video) => {
      const { data } = await supabase.storage
        .from("exercise-videos")
        .createSignedUrl(video.video_path, 60 * 60)

      return {
        ...video,
        signedUrl: data?.signedUrl,
      }
    })
  )

  const groupedVideos = Object.entries(
    (videosWithUrls ?? []).reduce((acc: any, video) => {
      if (!acc[video.exercise_name]) {
        acc[video.exercise_name] = []
      }

      acc[video.exercise_name].unshift(video)
      return acc
    }, {})
  )

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link href="/coach" className="text-sm text-zinc-400 hover:text-white">
          ← Back to clients
        </Link>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-400">Client Profile</p>
          <h1 className="mt-1 text-3xl font-bold">{client.name}</h1>
          <p className="mt-1 text-zinc-400">{client.email}</p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold">Programmes</h2>

          <div className="space-y-4">
            {programmes?.map((programme) => (
              <div
                key={programme.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="mb-4">
                  <h3 className="text-xl font-semibold">{programme.title}</h3>
                  <p className="text-sm text-zinc-400">
                    Week {programme.week_number}
                  </p>

                  {programme.notes && (
                    <p className="mt-2 text-sm text-zinc-300">
                      {programme.notes}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {programme.programme_sessions?.map((session: any) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-zinc-800 bg-black p-4"
                    >
                      <h4 className="mb-3 font-semibold">
                        {session.day} - {session.title}
                      </h4>

                      <div className="space-y-2">
                        {session.exercises?.map(
                          (exercise: any, index: number) => (
                            <div
                              key={index}
                              className="rounded-lg bg-zinc-900 p-3"
                            >
                              <p className="font-medium">{exercise.name}</p>
                              <p className="text-sm text-zinc-400">
                                {exercise.prescription || "No prescription"}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold">Workout Logs</h2>

          {workoutLogsError && (
            <div className="mb-4 rounded-lg border border-red-500 bg-red-950 p-4 text-sm text-red-200">
              {workoutLogsError.message}
            </div>
          )}

          {!workoutLogs || workoutLogs.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-400">
              No workout logs submitted yet.
            </div>
          ) : (
            <div className="space-y-4">
              {workoutLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {log.exercise_name}
                      </h3>

                      <p className="text-xs text-zinc-500">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString("en-GB")
                          : "No date"}
                      </p>
                    </div>

                    <WorkoutLogReviewButton
                      logId={log.id}
                      initialReviewed={log.reviewed}
                    />
                  </div>

                  <div className="space-y-2">
                    {log.sets_completed?.map((set: any, index: number) => (
                      <div
                        key={index}
                        className="grid grid-cols-3 gap-2 rounded-lg bg-black p-3 text-sm"
                      >
                        <p>
                          <span className="text-zinc-500">Weight:</span>{" "}
                          {set.weight || "-"}kg
                        </p>

                        <p>
                          <span className="text-zinc-500">Reps:</span>{" "}
                          {set.reps || "-"}
                        </p>

                        <p>
                          <span className="text-zinc-500">RPE:</span>{" "}
                          {set.rpe || "-"}
                        </p>
                      </div>
                    ))}
                  </div>

                  {log.notes && (
                    <div className="mt-4 rounded-lg bg-black p-3">
                      <p className="mb-1 text-xs font-semibold text-zinc-500">
                        Client notes
                      </p>
                      <p className="text-sm text-zinc-300">{log.notes}</p>
                    </div>
                  )}

                  <WorkoutLogFeedbackBox
                    logId={log.id}
                    initialFeedback={log.coach_feedback}
                    initialReviewed={log.reviewed}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold">
            Uploaded Videos & Feedback
          </h2>

          {groupedVideos.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-400">
              No videos uploaded yet.
            </div>
          ) : (
            <div className="space-y-6">
              {groupedVideos.map(([exerciseName, videos]: any) => (
                <VideoGroup
                  key={exerciseName}
                  exerciseName={exerciseName}
                  videos={videos}
                  defaultOpen={exerciseName === selectedExercise}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}