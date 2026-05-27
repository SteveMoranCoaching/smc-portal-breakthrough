    import { notFound, redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import WorkoutSessionForm from "@/components/WorkoutSessionForm"

export const dynamic = "force-dynamic"

export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: session, error: sessionError } = await supabase
    .from("programme_sessions")
    .select("*")
    .eq("id", sessionId)
    .single()

  if (sessionError || !session) notFound()

  const programmeId = session.programme_id

  const { data: previousLogs } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", user.id)
    .neq("session_id", sessionId)
    .order("created_at", { ascending: false })

  const { data: exerciseDemos } = await supabase
    .from("exercise_demos")
    .select("*")

  return (
    <main className="min-h-screen bg-black px-3 py-4 pb-28 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <WorkoutSessionForm
          session={session}
          programmeId={programmeId}
          userId={user.id}
          previousLogs={previousLogs || []}
          exerciseDemos={exerciseDemos || []}
        />
      </div>
    </main>
  )
}