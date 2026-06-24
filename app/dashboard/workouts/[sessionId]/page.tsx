import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import EmptyStateCard from "@/components/ui/EmptyStateCard"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import WorkoutSessionForm from "@/components/WorkoutSessionForm"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

function getSafeExercises(exercises: unknown) {
  return Array.isArray(exercises) ? exercises : []
}

function getExerciseName(exercise: any) {
  return typeof exercise?.name === "string" && exercise.name.trim()
    ? exercise.name.trim()
    : null
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params

  if (!sessionId) notFound()

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error("User authentication failed")
  }

  if (!user) redirect("/login")

  const { data: matchedSession, error: sessionError } = await supabase
    .from("programme_sessions")
    .select("id, programme_id, week_number, day, title, exercises")
    .eq("id", sessionId)
    .maybeSingle()

  if (sessionError) {
    throw new Error("Workout session failed to load")
  }

  if (!matchedSession) notFound()

  const { data: matchedProgramme, error: programmeError } = await supabase
    .from("programmes")
    .select("id, title, week_number, notes, user_id")
    .eq("id", matchedSession.programme_id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (programmeError) {
    throw new Error("Workout programme failed to load")
  }

  if (!matchedProgramme) notFound()

  const exercises = getSafeExercises(matchedSession.exercises)

  const exerciseNames = Array.from(
    new Set(exercises.map(getExerciseName).filter(Boolean))
  ) as string[]

  const { data: previousLogs, error: previousLogsError } =
    exerciseNames.length > 0
      ? await supabase
          .from("workout_logs")
          .select("id, exercise_name, sets_completed, created_at, coach_feedback")
          .eq("user_id", user.id)
          .in("exercise_name", exerciseNames)
          .order("created_at", { ascending: false })
      : { data: [], error: null }

  if (previousLogsError) {
    throw new Error("Previous workout history failed to load")
  }

  const { data: demoRows, error: demoRowsError } =
    exerciseNames.length > 0
      ? await supabase
          .from("exercise_demo_videos")
          .select("id, exercise_name, video_path, thumbnail_path, coach_notes")
          .in("exercise_name", exerciseNames)
      : { data: [], error: null }

  if (demoRowsError) {
    throw new Error("Exercise demo videos failed to load")
  }

  const exerciseDemos = await Promise.all(
    (demoRows || []).map(async (demo: any) => {
      const videoUrl = demo.video_path
        ? await supabase.storage
            .from("exercise-demo-videos")
            .createSignedUrl(demo.video_path, 60 * 60)
        : null

      const thumbnailUrl = demo.thumbnail_path
        ? await supabase.storage
            .from("exercise-demo-videos")
            .createSignedUrl(demo.thumbnail_path, 60 * 60)
        : null

      return {
        id: demo.id,
        exercise_name: demo.exercise_name,
        coach_notes: demo.coach_notes,
        video_url: videoUrl?.data?.signedUrl || null,
        thumbnail_url: thumbnailUrl?.data?.signedUrl || null,
      }
    })
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-3 py-4 pb-[calc(10rem+env(safe-area-inset-bottom))] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/dashboard/workouts/${matchedSession.id}/preview`}
            className="inline-flex min-h-[40px] w-fit items-center gap-2 rounded-full border border-smc-gold/15 bg-smc-gold/[0.06] px-3 py-2 text-xs font-black text-smc-gold transition hover:border-smc-gold/30 hover:bg-smc-gold/10 active:scale-[0.98]"
          >
            ← Preview
          </Link>

          <Link
            href="/dashboard/workouts"
            className="inline-flex min-h-[40px] items-center text-xs font-bold text-white/35 transition hover:text-white/60"
          >
            Workouts
          </Link>
        </div>

        <section className={shellCard}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent" />

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                  Active Session
                </p>

                <h1 className="mt-1.5 break-words text-xl font-black leading-tight tracking-tight text-white">
                  {matchedSession.title || "Untitled session"}
                </h1>

                <p className="mt-1 break-words text-xs leading-5 text-white/45">
                  Week{" "}
                  {matchedSession.week_number ||
                    matchedProgramme.week_number ||
                    "—"}{" "}
                  · {matchedSession.day || "Session"} · {exercises.length}{" "}
                  exercises
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-green-400">
                Logging
              </span>
            </div>

            <p className="mt-3 rounded-[1rem] border border-white/[0.05] bg-black/25 px-3 py-2 text-xs leading-5 text-white/45">
              Log your sets, notes and videos below. Keep it calm, focused and
              save once the session is complete.
            </p>
          </div>
        </section>

        {exercises.length === 0 ? (
          <EmptyStateCard
            eyebrow="Workout logger"
            title="No exercises found"
            body="This session exists, but it doesn’t currently have any exercises attached. Head back to your workouts and choose another session, or ask your coach to update the programme."
            href="/dashboard/workouts"
            actionLabel="Back to workouts"
          />
        ) : (
          <WorkoutSessionForm
            session={{
              ...matchedSession,
              exercises,
            }}
            programmeId={matchedProgramme.id}
            userId={user.id}
            previousLogs={previousLogs || []}
            exerciseDemos={exerciseDemos}
          />
        )}
      </div>
    </main>
  )
}