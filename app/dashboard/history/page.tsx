import Link from "next/link"
import { redirect } from "next/navigation"
import EmptyStateCard from "@/components/ui/EmptyStateCard"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import {
  daysAgo,
  formatDate,
  getBestEstimated1RM,
  getBestSet,
  getTrend,
  groupLogsByExercise,
  type ExercisePB,
  type WorkoutLog,
} from "@/lib/history"

export const dynamic = "force-dynamic"

const shellCard =
  "group relative overflow-hidden rounded-[1.6rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.02))] shadow-[0_18px_48px_rgba(0,0,0,0.78)] transition-all duration-300 hover:border-smc-gold/20 hover:bg-white/[0.045] active:scale-[0.985]"

const statBox =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] p-3"

export default async function ExerciseHistoryPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [{ data: logs, error: logsError }, { data: pbs, error: pbsError }] =
    await Promise.all([
      supabase
        .from("workout_logs")
        .select("id,user_id,exercise_name,sets_completed,notes,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("exercise_pbs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ])

  if (logsError || pbsError) {
    throw new Error("Exercise history failed to load")
  }

  const exercises = groupLogsByExercise(
    (logs || []) as WorkoutLog[],
    (pbs || []) as ExercisePB[]
  )
    .map((exercise) => {
      const bestSet = getBestSet(exercise.logs)
      const bestEstimated = getBestEstimated1RM(exercise.logs, exercise.pbs)

      return {
        ...exercise,
        bestSet,
        bestEstimated,
        totalSessions: exercise.logs.length,
        lastPerformed: exercise.logs[0]?.created_at,
        trend: getTrend(exercise.logs),
      }
    })
    .sort(
      (a, b) =>
        new Date(b.lastPerformed || 0).getTime() -
        new Date(a.lastPerformed || 0).getTime()
    )

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-6 text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="relative overflow-hidden rounded-[1.8rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.2),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.75)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-smc-gold">
            SMC Performance
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Exercise History
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/62">
            Your deeper progression hub — PBs, estimated 1RMs, recent trends
            and long-term exercise data without cluttering the workout logger.
          </p>
        </div>

        <section className="grid gap-3 sm:grid-cols-2">
  <Link
    href="/dashboard/history/feedback"
    className={`${shellCard} block p-4`}
  >
    <div className="relative z-10">
      <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-smc-gold">
        Coach Feedback
      </p>

      <h2 className="mt-2 text-xl font-black text-white">
        Feedback Hub
      </h2>

      <p className="mt-2 text-sm leading-6 text-white/55">
        View all workout and video feedback from Steve in one place.
      </p>

      <p className="mt-3 text-[11px] font-semibold text-white/40">
        Open feedback →
      </p>
    </div>
  </Link>

  <Link
    href="/dashboard/achievements"
    className={`${shellCard} block p-4`}
  >
    <div className="relative z-10">
      <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-smc-gold">
        Achievements
      </p>

      <h2 className="mt-2 text-xl font-black text-white">
        Achievement Board
      </h2>

      <p className="mt-2 text-sm leading-6 text-white/55">
        Track unlocked milestones, consistency wins and PB achievements.
      </p>

      <p className="mt-3 text-[11px] font-semibold text-white/40">
        Open achievements →
      </p>
    </div>
  </Link>
</section>

        {exercises.length === 0 ? (
          <EmptyStateCard
            eyebrow="Exercise history"
            title="No exercise history yet"
            body="Once sessions are logged, this becomes your progression hub — best sets, estimated 1RMs, trends and long-term training data all in one place."
            href="/dashboard"
            actionLabel="Back to dashboard"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {exercises.map((exercise, index) => (
              <Link
                key={exercise.name}
                href={`/dashboard/history/${encodeURIComponent(exercise.name)}`}
                className={`${shellCard} block p-4`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.16),transparent_34%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-smc-gold">
                        Exercise #{index + 1}
                      </p>

                      <h2 className="mt-1 break-words text-[1.55rem] font-black leading-[1.08] tracking-[-0.045em]">
                        {exercise.name}
                      </h2>

                      <p className="mt-2 text-xs font-semibold text-white/38">
                        {daysAgo(exercise.lastPerformed)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/55 backdrop-blur-sm">
                      {exercise.trend}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className={statBox}>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                        Best set
                      </p>
                      <p className="mt-1 break-words text-lg font-black">
                        {exercise.bestSet
                          ? `${exercise.bestSet.weight}kg × ${exercise.bestSet.reps}`
                          : "—"}
                      </p>
                    </div>

                    <div className={statBox}>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                        Est. 1RM
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {exercise.bestEstimated
                          ? `${Math.round(exercise.bestEstimated)}kg`
                          : "—"}
                      </p>
                    </div>

                    <div className={statBox}>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                        Sessions
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {exercise.totalSessions}
                      </p>
                    </div>

                    <div className={statBox}>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                        Last logged
                      </p>
                      <p className="mt-1 break-words text-sm font-black">
                        {formatDate(exercise.lastPerformed)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex h-8 items-end gap-1">
                    {[42, 58, 51, 73, 66, 82].map((height, i) => (
                      <div
                        key={i}
                        className="w-full rounded-full bg-gradient-to-t from-smc-gold/18 to-smc-gold/45"
                        style={{
                          height: `${height / 3}px`,
                        }}
                      />
                    ))}
                  </div>

                  <p className="mt-3 text-[11px] font-semibold text-white/40">
                    Tap for full exercise breakdown →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}