import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import MarkFeedbackReadButton from "@/components/MarkFeedbackReadButton"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.45rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.66)]"

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function cleanFeedback(value: any) {
  if (!value) return ""

  if (Array.isArray(value)) {
    return value.join("\n")
  }

  const asString = String(value)

  try {
    const parsed = JSON.parse(asString)

    if (Array.isArray(parsed)) {
      return parsed.join("\n")
    }

    return String(parsed)
  } catch {
    return asString
  }
}

export default async function FeedbackHistoryPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [{ data: workoutLogs }, { data: videos }] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("id, exercise_name, sets_completed, coach_feedback, feedback_read, created_at")
      .eq("user_id", user.id)
      .eq("reviewed", true)
      .not("coach_feedback", "is", null)
      .neq("coach_feedback", "")
      .order("created_at", { ascending: false }),

    supabase
      .from("exercise_videos")
      .select("id, exercise_name, feedback, feedback_read, created_at")
      .eq("user_id", user.id)
      .eq("reviewed", true)
      .not("feedback", "is", null)
      .neq("feedback", "")
      .order("created_at", { ascending: false }),
  ])

  const feedbackItems = [
    ...(workoutLogs || []).map((log: any) => {
      const firstSet = Array.isArray(log.sets_completed)
        ? log.sets_completed[0]
        : null

      const setSummary =
        firstSet?.weight && firstSet?.reps
          ? `${log.sets_completed.length} set${
              log.sets_completed.length === 1 ? "" : "s"
            } · ${firstSet.weight}kg × ${firstSet.reps}`
          : "Workout log feedback"

      return {
        id: log.id,
        source: "log",
        read: Boolean(log.feedback_read),
        type: "Workout Log",
        exerciseName: log.exercise_name,
        context: setSummary,
        feedback: cleanFeedback(log.coach_feedback),
        createdAt: log.created_at,
      }
    }),

    ...(videos || []).map((video: any) => ({
      id: video.id,
      source: "video",
      read: Boolean(video.feedback_read), 
      type: "Video Review",
      exerciseName: video.exercise_name,
      context: "Video feedback",
      feedback: cleanFeedback(video.feedback),
      createdAt: video.created_at,
    })),
  ]
    .filter((item) => item.feedback.trim().length > 0)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-6 text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <Link
          href="/dashboard/history"
          className="inline-flex w-fit text-xs font-bold uppercase tracking-[0.22em] text-white/45 transition hover:text-smc-gold active:scale-[0.98]"
        >
          ← Back to history
        </Link>

        <section className="relative overflow-hidden rounded-[1.8rem] border border-smc-gold/20 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.75)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-smc-gold">
            History
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">
            Coach Feedback
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">
            All workout and video feedback from Steve, shown with the exercise
            and training context where available.
          </p>
        </section>

        {feedbackItems.length === 0 ? (
          <section className={shellCard}>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold">
              No feedback yet
            </p>

            <h2 className="mt-2 text-xl font-black text-white">
              Coach feedback will appear here.
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Once Steve reviews your workouts or videos, the notes will be
              grouped here for easy reference.
            </p>
          </section>
        ) : (
          <section className="flex flex-col gap-2.5">
  {feedbackItems.map((item) => (
    <article
      key={`${item.source}-${item.id}`}
      className={`relative overflow-hidden rounded-[1.15rem] border px-3.5 py-3 transition ${
        item.read
          ? "border-white/[0.06] bg-white/[0.025]"
          : "border-smc-gold/25 bg-smc-gold/[0.07] shadow-[0_0_18px_rgba(212,175,55,0.08)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {item.source === "video" ? "🎥" : "🏋️"}
            </span>

            <p className="truncate text-[9px] font-black uppercase tracking-[0.22em] text-smc-gold">
              {item.type}
            </p>
          </div>

          <h2 className="mt-1 text-[0.95rem] font-black leading-tight text-white">
            {item.exerciseName}
          </h2>

          <p className="mt-1 text-[11px] text-white/38">
            {formatDate(item.createdAt)} · {item.context}
          </p>
        </div>

        <div className="shrink-0">
  <MarkFeedbackReadButton
    id={item.id}
    source={item.source as "log" | "video"}
    initialRead={item.read}
  />
</div>
      </div>

      <p className="mt-3 whitespace-pre-line text-[13px] leading-6 text-white/72">
        {item.feedback}
      </p>
    </article>
  ))}
</section>
        )}
      </section>
    </main>
  )
}
