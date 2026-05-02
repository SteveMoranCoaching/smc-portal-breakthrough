import { createSupabaseServerClient } from "@/lib/supabaseServer"
import WorkoutSessionForm from "@/components/WorkoutSessionForm"

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: { sessionId: string }
  searchParams: { programmeId: string }
}) {
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

  const { data: session } = await supabase
    .from("programme_sessions")
    .select("*")
    .eq("id", params.sessionId)
    .single()

  if (!session) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        Session not found.
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-xs uppercase text-zinc-500">{session.day}</p>
          <h1 className="text-2xl font-bold">{session.title}</h1>
        </div>

        <WorkoutSessionForm
          session={session}
          programmeId={searchParams.programmeId}
          userId={user.id}
        />
      </div>
    </main>
  )
}