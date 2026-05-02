import Link from "next/link"
import { supabase } from "@/lib/supabase"
import ReviewSession from "@/components/ReviewSession"

type SetEntry = {
  weight: string
  reps: string
  rpe: string
}

export default async function CoachReviewPage() {
  const { data: clients } = await supabase
    .from("clients")
    .select("id, user_id, name, email")

  const clientMap: Record<string, { id: string; name: string }> = {}

  clients?.forEach((client) => {
    clientMap[client.user_id] = {
      id: client.id,
      name: client.name,
    }
  })

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select("id, user_id, exercise_name, video_path, feedback, reviewed, created_at")
    .eq("reviewed", false)
    .order("created_at", { ascending: false })
    .limit(50)

  const { data: workoutLogs } = await supabase
    .from("workout_logs")
    .select("id, user_id, exercise_name, sets_completed, notes, coach_feedback, reviewed, created_at")
    .eq("reviewed", false)
    .order("created_at", { ascending: false })
    .limit(50)

  const videosWithUrls = await Promise.all(
    (videos || []).map(async (video) => {
      const { data } = await supabase.storage
        .from("exercise-videos")
        .createSignedUrl(video.video_path, 60 * 60)

      return {
        type: "video" as const,
        id: video.id,
        user_id: video.user_id,
        clientId: clientMap[video.user_id]?.id,
        clientName: clientMap[video.user_id]?.name || "Unknown client",
        exercise_name: video.exercise_name,
        created_at: video.created_at,
        feedback: video.feedback || "",
        signedUrl: data?.signedUrl || "",
      }
    })
  )

  const logItems = (workoutLogs || []).map((log) => ({
    type: "log" as const,
    id: log.id,
    user_id: log.user_id,
    clientId: clientMap[log.user_id]?.id,
    clientName: clientMap[log.user_id]?.name || "Unknown client",
    exercise_name: log.exercise_name,
    created_at: log.created_at,
    coach_feedback: log.coach_feedback || "",
    sets_completed: log.sets_completed as SetEntry[] | null,
    notes: log.notes,
  }))

  const reviewItems = [...videosWithUrls, ...logItems]
  .filter((item) => item.clientId)
  .sort((a, b) => {
    if (a.type === "log" && b.type === "video") return -1
    if (a.type === "video" && b.type === "log") return 1

    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  })

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-yellow-400">
              Coach Review Mode
            </p>
            <h1 className="mt-2 text-3xl font-bold">Review Session</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Clear new logs and videos without jumping between pages.
            </p>
          </div>

          <Link
            href="/coach"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-yellow-500 hover:text-white"
          >
            Back to dashboard
          </Link>
        </div>

        <ReviewSession items={reviewItems} />
      </div>
    </main>
  )
}