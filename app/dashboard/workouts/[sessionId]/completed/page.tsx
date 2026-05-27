import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)]"

export default async function CompletedSessionPage({
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

  const { data: session } = await supabase
    .from("programme_sessions")
    .select("*")
    .eq("id", sessionId)
    .single()

  if (!session) notFound()

  const { data: logs } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  const { data: completion } = await supabase
    .from("session_completions")
    .select("*")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select("*")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  return (
    <main className="min-h-screen bg-black px-3 py-4 pb-28 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">

        <Link
          href="/dashboard/workouts"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-smc-gold/15 bg-smc-gold/[0.06] px-3 py-2 text-xs font-black text-smc-gold"
        >
          ← Workouts
        </Link>

        <section className={shellCard}>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
            Completed Session
          </p>

          <h1 className="mt-2 text-2xl font-black text-white">
            {session.title}
          </h1>

          <p className="mt-2 text-xs text-white/45">
            Completed{" "}
            {completion?.created_at
              ? new Date(completion.created_at).toLocaleString("en-GB")
              : "previously"}
          </p>

          {completion?.notes ? (
            <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold">
                Session Notes
              </p>

              <p className="mt-2 text-sm text-white/75">
                {completion.notes}
              </p>
            </div>
          ) : null}
        </section>

        <section className={shellCard}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white">
              Logged Exercises
            </h2>

            <Link
              href={`/dashboard/workouts/${sessionId}/edit`}
              className="rounded-xl bg-smc-gold px-3 py-2 text-xs font-black text-black"
            >
              Edit Stats
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {logs?.map((log: any) => (
              <div
                key={log.id}
                className="rounded-2xl border border-white/[0.06] bg-black/30 p-3"
              >
                <h3 className="text-sm font-black text-white">
                  {log.exercise_name}
                </h3>

                <div className="mt-2 space-y-2">
                  {(log.sets_completed || []).map(
                    (set: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-xs"
                      >
                        <span>Set {index + 1}</span>

                        <span className="font-bold text-smc-gold">
                          {set.weight}kg × {set.reps}
                        </span>
                      </div>
                    )
                  )}
                </div>

                {log.notes ? (
                  <p className="mt-3 text-xs text-white/55">
                    {log.notes}
                  </p>
                ) : null}

                {log.coach_feedback ? (
                  <div className="mt-3 rounded-xl border border-smc-gold/20 bg-smc-gold/[0.06] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold">
                      Coach Feedback
                    </p>

                    <p className="mt-2 text-xs text-white/75">
                      {log.coach_feedback}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}