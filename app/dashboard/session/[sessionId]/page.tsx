import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import WorkoutSessionForm from "@/components/WorkoutSessionForm"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-3 py-4 text-white">
        <div className={`${shellCard} mx-auto w-full max-w-5xl`}>
          <div className="relative z-10 text-sm text-smc-muted">
            You must be logged in.
          </div>
        </div>
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

  let matchedProgramme: any = null
  let matchedSession: any = null

  programmes?.forEach((programme: any) => {
    const foundSession = programme.programme_sessions?.find(
      (session: any) => String(session.id) === String(sessionId)
    )

    if (foundSession) {
      matchedProgramme = programme
      matchedSession = foundSession
    }
  })

  if (error || !matchedProgramme || !matchedSession) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-3 py-4 text-white">
        <div className={`${shellCard} mx-auto w-full max-w-5xl`}>
          <div className="relative z-10">
            <h1 className="text-lg font-black tracking-tight">
              Session not found
            </h1>

            <p className="mt-2 text-sm leading-6 text-white/55">
              This session could not be loaded. Go back to your workouts and try
              again.
            </p>

            <p className="mt-3 rounded-[1rem] border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.24)] p-3 text-xs text-white/35">
              Debug session ID: {sessionId || "No session ID found"}
            </p>

            <Link
              href="/dashboard/workouts"
              className="mt-4 inline-flex min-h-[42px] items-center justify-center rounded-[1rem] bg-smc-gold px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_0_24px_rgba(212,175,55,0.22)] transition hover:brightness-110 active:scale-[0.98]"
            >
              Back to workouts
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const exerciseNames =
    matchedSession.exercises?.map((exercise: any) => exercise.name) || []

  const { data: previousLogs } = await supabase
    .from("workout_logs")
    .select("id, exercise_name, sets_completed, created_at")
    .eq("user_id", user.id)
    .in("exercise_name", exerciseNames)
    .order("created_at", { ascending: false })

  const { data: demoRows } =
    exerciseNames.length > 0
      ? await supabase
          .from("exercise_demo_videos")
          .select("id, exercise_name, video_path, thumbnail_path, coach_notes")
          .in("exercise_name", exerciseNames)
      : { data: [] }

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-3 py-4 pb-40 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/dashboard/workouts/${matchedSession.id}/preview?programmeId=${matchedProgramme.id}`}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-smc-gold/15 bg-smc-gold/[0.06] px-3 py-2 text-xs font-black text-smc-gold"
          >
            ← Back to Preview
          </Link>

          <Link
            href="/dashboard/workouts"
            className="text-xs font-bold text-white/35 transition hover:text-white/60"
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

                <h1 className="mt-1.5 text-xl font-black leading-tight tracking-tight text-white">
                  {matchedSession.title}
                </h1>

                <p className="mt-1 text-xs leading-5 text-white/45">
                  Week {matchedProgramme.week_number || "—"} ·{" "}
                  {matchedSession.day} · {exerciseNames.length} exercises
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-green-400">
                Logging
              </span>
            </div>

            <p className="mt-3 rounded-[1rem] border border-white/[0.05] bg-black/25 px-3 py-2 text-xs leading-5 text-white/45">
              Log your sets, notes and videos below. Save everything at the end
              when the session is complete.
            </p>
          </div>
        </section>

        <WorkoutSessionForm
          session={matchedSession}
          programmeId={matchedProgramme.id}
          userId={user.id}
          previousLogs={previousLogs || []}
          exerciseDemos={exerciseDemos}
        />
      </div>
    </main>
  )
}