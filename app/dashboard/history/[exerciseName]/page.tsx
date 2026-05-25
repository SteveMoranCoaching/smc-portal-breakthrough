import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import EmptyStateCard from "@/components/ui/EmptyStateCard"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import {
  formatDate,
  getAllSets,
  getBestEstimated1RM,
  getBestSet,
  getSessionTopSet,
  getSessionVolume,
  getTrend,
  type ExercisePB,
  type WorkoutLog,
} from "@/lib/history"

export const dynamic = "force-dynamic"

const shellCard =
  "group relative overflow-hidden rounded-[1.6rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.02))] shadow-[0_18px_48px_rgba(0,0,0,0.78)] transition-all duration-300 hover:border-smc-gold/20 hover:bg-white/[0.045] active:scale-[0.985]"

const statBox =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] p-3"

const normaliseExerciseName = (name?: string | null) =>
  name?.trim().toLowerCase().replace(/\s+/g, " ") || ""

type PageProps = {
  params: Promise<{
    exerciseName: string
  }>
}

export default async function ExerciseDeepDivePage({ params }: PageProps) {
  const { exerciseName } = await params
  const decodedExerciseName = decodeURIComponent(exerciseName)
  const targetName = normaliseExerciseName(decodedExerciseName)

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
    throw new Error("Exercise breakdown failed to load")
  }

  const exerciseLogs = ((logs || []) as WorkoutLog[]).filter(
    (log) => normaliseExerciseName(log.exercise_name) === targetName
  )

  const exercisePBs = ((pbs || []) as ExercisePB[]).filter(
    (pb) => normaliseExerciseName(pb.exercise_name) === targetName
  )

  if (exerciseLogs.length === 0 && exercisePBs.length === 0) {
    notFound()
  }

  const displayName =
    exerciseLogs[0]?.exercise_name ||
    exercisePBs[0]?.exercise_name ||
    decodedExerciseName

  const bestSet = getBestSet(exerciseLogs)
  const bestEstimated = getBestEstimated1RM(exerciseLogs, exercisePBs)
  const allSets = getAllSets(exerciseLogs)
  const trend = getTrend(exerciseLogs)

  const totalVolume = exerciseLogs.reduce(
    (total, log) => total + getSessionVolume(log),
    0
  )

  const chartData = exerciseLogs
    .map((log) => {
      const topSet = getSessionTopSet(log)

      return {
        date: log.created_at,
        value: topSet?.estimated || 0,
      }
    })
    .filter((item) => item.value > 0)
    .reverse()
    .slice(-10)

  const maxChartValue = Math.max(...chartData.map((item) => item.value), 1)
  const recentSessions = exerciseLogs.slice(0, 8)

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-6 text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <Link
          href="/dashboard/history"
          className="inline-flex w-fit text-xs font-bold uppercase tracking-[0.22em] text-white/45 transition hover:text-smc-gold active:scale-[0.98]"
        >
          ← Back to history
        </Link>

        <div className="relative overflow-hidden rounded-[1.8rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.22),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.75)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-smc-gold">
            Exercise Deep Dive
          </p>

          <h1 className="mt-2 break-words text-3xl font-black tracking-[-0.04em]">
            {displayName}
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
            Long-term progression, PB tracking and estimated 1RM trends.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className={statBox}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                Best set
              </p>
              <p className="mt-1 break-words text-lg font-black">
                {bestSet ? `${bestSet.weight}kg × ${bestSet.reps}` : "—"}
              </p>
            </div>

            <div className={statBox}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                Best est. 1RM
              </p>
              <p className="mt-1 text-lg font-black">
                {bestEstimated ? `${Math.round(bestEstimated)}kg` : "—"}
              </p>
            </div>

            <div className={statBox}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                Sessions
              </p>
              <p className="mt-1 text-lg font-black">{exerciseLogs.length}</p>
            </div>

            <div className={statBox}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                Trend
              </p>
              <p className="mt-1 break-words text-sm font-black">{trend}</p>
            </div>
          </div>
        </div>

        <div className={`${shellCard} p-4`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_32%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="relative z-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-smc-gold">
                  Progression
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">
                  Estimated 1RM trend
                </h2>
              </div>

              <p className="text-xs font-semibold text-white/35">
                Last {chartData.length} sessions
              </p>
            </div>

            {chartData.length < 2 ? (
              <div className="mt-5">
                <EmptyStateCard
                  eyebrow="Progression graph"
                  title="More data needed"
                  body="Once this exercise has a few logged top sets, this graph will start showing estimated 1RM movement over time."
                  className="shadow-none"
                />
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-[1.7rem] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.35))] p-3 sm:p-4">
                <div className="flex h-48 min-w-0 items-end gap-1.5 sm:gap-2">
                  {chartData.map((item) => {
                    const height = Math.max(
                      8,
                      (item.value / maxChartValue) * 100
                    )

                    return (
                      <div
                        key={`${item.date}-${item.value}`}
                        className="flex min-w-0 flex-1 flex-col items-center gap-2"
                      >
                        <div className="flex h-32 w-full items-end">
                          <div
                            className="w-full rounded-t-[0.7rem] bg-gradient-to-t from-smc-gold/70 via-smc-gold to-[#ffe27a] shadow-[0_0_22px_rgba(212,175,55,0.22)] transition-all duration-700"
                            style={{ height: `${height}%` }}
                          />
                        </div>

                        <p className="text-[8px] font-semibold text-white/30 sm:text-[9px]">
                          {Math.round(item.value)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className={statBox}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
              Total volume
            </p>
            <p className="mt-1 break-words text-xl font-black">
              {Math.round(totalVolume).toLocaleString("en-GB")}kg
            </p>
          </div>

          <div className={statBox}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
              Total sets logged
            </p>
            <p className="mt-1 text-xl font-black">{allSets.length}</p>
          </div>

          <div className={statBox}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
              Last performed
            </p>
            <p className="mt-1 break-words text-xl font-black">
              {exerciseLogs[0]?.created_at
                ? formatDate(exerciseLogs[0].created_at)
                : "—"}
            </p>
          </div>
        </div>

        <div className={`${shellCard} p-4`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.10),transparent_34%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="relative z-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-smc-gold">
              Recent Work
            </p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">
              Session history
            </h2>

            {recentSessions.length === 0 ? (
              <div className="mt-4">
                <EmptyStateCard
                  eyebrow="Session history"
                  title="No logged sessions yet"
                  body="PB data exists for this exercise, but there are no full workout log entries to display yet."
                  href="/dashboard"
                  actionLabel="Back to dashboard"
                  className="shadow-none"
                />
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {recentSessions.map((log) => {
                  const topSet = getSessionTopSet(log)
                  const volume = getSessionVolume(log)

                  return (
                    <div
                      key={log.id}
                      className="relative overflow-hidden rounded-[1.4rem] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4"
                    >
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black">
                            {formatDate(log.created_at)}
                          </p>
                          <p className="mt-1 break-words text-xs text-white/42">
                            {topSet
                              ? `Top set: ${topSet.weight}kg × ${topSet.reps}`
                              : "No set data"}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black text-smc-gold">
                            {Math.round(volume).toLocaleString("en-GB")}kg
                          </p>
                          <p className="text-[9px] uppercase tracking-[0.24em] text-white/26">
                            volume
                          </p>
                        </div>
                      </div>

                      {log.notes ? (
                        <p className="relative z-10 mt-3 break-words rounded-xl border border-white/[0.05] bg-white/[0.03] p-3 text-xs leading-5 text-white/55">
                          {log.notes}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}