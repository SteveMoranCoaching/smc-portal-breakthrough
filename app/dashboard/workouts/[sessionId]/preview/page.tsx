import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import EmptyStateCard from "@/components/ui/EmptyStateCard"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

function getExerciseCount(session: any) {
  return Array.isArray(session?.exercises) ? session.exercises.length : 0
}

export default async function PreviewSessionPage({
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
    .select("id, programme_id, week_number, day, title, exercises")
    .eq("id", sessionId)
    .maybeSingle()

  if (sessionError || !session) notFound()

  const { data: programme } = await supabase
    .from("programmes")
    .select("id, title, week_number, user_id")
    .eq("id", session.programme_id)
    .maybeSingle()

  const exercises = Array.isArray(session.exercises) ? session.exercises : []

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-3 py-4 pb-32 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard/workouts"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-smc-gold/15 bg-smc-gold/[0.06] px-3 py-2 text-xs font-black text-smc-gold transition hover:border-smc-gold/30 hover:bg-smc-gold/10 active:scale-[0.98]"
          >
            ← Workouts
          </Link>

          <p className="shrink-0 text-xs font-bold text-white/35">Preview</p>
        </div>

        <section className={shellCard}>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: "url('/images/dashboard-plates.jpeg')",
            }}
          />
          <div className="absolute inset-0 bg-black/78" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent" />

          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
              Workout Preview
            </p>

            <h1 className="mt-1.5 break-words text-2xl font-black leading-tight tracking-tight text-white">
              {session.title}
            </h1>

            <p className="mt-1 break-words text-xs leading-5 text-white/50">
              Week {session.week_number || programme?.week_number || "—"} ·{" "}
              {session.day || "Session"} · {getExerciseCount(session)} exercises
            </p>

            <p className="mt-3 rounded-[1rem] border border-white/[0.06] bg-black/35 px-3 py-2 text-xs leading-5 text-white/45">
              Here’s what’s coming up. Check the exercises and prescriptions,
              then start logging when you’re ready.
            </p>
          </div>
        </section>

        <section className={shellCard}>
          <div className="relative z-10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-white">Session Plan</h2>
              <p className="shrink-0 text-[11px] font-bold text-white/35">
                {exercises.length} total
              </p>
            </div>

            {exercises.length === 0 ? (
              <EmptyStateCard
                eyebrow="Session plan"
                title="No exercises added yet"
                body="This session exists, but there are no exercises attached to it yet. Once your coach adds the work, it’ll appear here ready to preview and log."
                href="/dashboard/workouts"
                actionLabel="Back to workouts"
                className="shadow-none"
              />
            ) : (
              <div className="space-y-2">
                {exercises.map((exercise: any, index: number) => (
                  <div
                    key={`${exercise.name || "exercise"}-${index}`}
                    className="rounded-[1.1rem] border border-white/[0.06] bg-black/30 p-3"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-smc-gold">
                      Exercise {index + 1}
                    </p>

                    <h3 className="mt-1 break-words text-base font-black text-white">
                      {exercise.name || "Unnamed exercise"}
                    </h3>

                    <p className="mt-1 break-words text-xs font-bold text-white/45">
                      {exercise.prescription || "No prescription added"}
                    </p>

                    {exercise.notes ? (
                      <p className="mt-2 break-words text-xs leading-5 text-white/38">
                        {exercise.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {exercises.length > 0 ? (
          <div className="sticky bottom-3 z-20 rounded-[1.35rem] border border-white/[0.07] bg-black/80 p-2 shadow-[0_-10px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            <Link
              href={`/dashboard/workouts/${session.id}`}
              className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-smc-gold px-5 py-3 text-sm font-black text-black shadow-[0_0_24px_rgba(212,175,55,0.22)] transition hover:bg-smc-gold-soft active:scale-[0.98]"
            >
              Start Workout
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  )
}