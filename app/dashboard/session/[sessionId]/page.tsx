import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import WorkoutSessionForm from "@/components/WorkoutSessionForm"

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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-2 py-6 text-white sm:px-4">
        <div className="mx-auto w-full max-w-5xl rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-2xl">
          You must be logged in.
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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-2 py-6 text-white sm:px-4">
        <div className="mx-auto w-full max-w-5xl space-y-4 rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-2xl">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Session not found
          </h1>

          <p className="text-sm leading-6 text-white/55">
            This session could not be loaded. Go back to your dashboard and try again.
          </p>

          <p className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.24)] p-3 text-xs text-white/35">
            Debug session ID: {sessionId || "No session ID found"}
          </p>

          <Link
            href="/dashboard"
            className="inline-flex rounded-2xl bg-smc-gold px-4 py-3 text-sm font-extrabold text-black shadow-[0_0_24px_rgba(212,175,55,0.22)] transition hover:brightness-110 active:scale-[0.98]"
          >
            Back to dashboard
          </Link>
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-2 py-6 pb-40 text-white sm:px-4">
      <div className="mx-auto w-full max-w-5xl space-y-5 px-0 sm:px-4">
        <Link
          href="/dashboard"
          className="inline-flex text-sm font-semibold text-smc-gold/90 transition hover:text-smc-gold"
        >
          ← Back to dashboard
        </Link>

        <section className="relative overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 shadow-2xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/50 to-transparent" />

          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.22)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-smc-gold/80">
              Week {matchedProgramme.week_number} · {matchedSession.day}
            </p>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
              {matchedSession.title}
            </h1>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Log your full workout below, then save everything at the end.
            </p>
          </div>
        </section>

        <WorkoutSessionForm
          session={matchedSession}
          programmeId={matchedProgramme.id}
          userId={user.id}
          previousLogs={previousLogs || []}
        />
      </div>
    </main>
  )
}