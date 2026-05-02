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
      <main className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-bold">Session not found</h1>

          <p className="text-sm text-zinc-400">
            This session could not be loaded. Go back to your dashboard and try again.
          </p>

          <p className="text-xs text-zinc-600">
            Debug session ID: {sessionId || "No session ID found"}
          </p>

          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/dashboard" className="text-sm text-yellow-400">
          ← Back to dashboard
        </Link>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            Week {matchedProgramme.week_number} · {matchedSession.day}
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            {matchedSession.title}
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Log your full workout below, then save everything at the end.
          </p>
        </section>

        <WorkoutSessionForm
          session={matchedSession}
          programmeId={matchedProgramme.id}
          userId={user.id}
        />
      </div>
    </main>
  )
}