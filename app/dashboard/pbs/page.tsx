import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

type PB = {
  id: string
  exercise_name: string
  pb_type: "heaviest" | "rep" | "estimated_1rm"
  weight: number
  reps: number
  estimated_1rm: number
  previous_best: number | null
  created_at: string
  team_feed_status: string
}

const glassCard =
  "relative overflow-hidden rounded-[1.75rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.022))] shadow-[0_18px_55px_rgba(0,0,0,0.72)]"

const innerCard =
  "rounded-[1.35rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.28)]"

const goldGlow =
  "pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-yellow-500/10 blur-3xl"

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = date.toLocaleString("en-GB", { month: "short" })
  const year = date.getFullYear()

  return `${day} ${month} ${year}`
}

function getPBLabel(type: PB["pb_type"]) {
  if (type === "heaviest") return "Heaviest"
  if (type === "estimated_1rm") return "Estimated 1RM"
  return "Rep PB"
}

function getPBValue(pb: PB) {
  if (pb.pb_type === "estimated_1rm") return `${pb.estimated_1rm}kg est. 1RM`
  return `${pb.weight}kg × ${pb.reps}`
}

function getPBImprovement(pb: PB) {
  if (!pb.previous_best) return "First recorded PB"

  const current =
    pb.pb_type === "estimated_1rm" ? pb.estimated_1rm : pb.weight

  const difference = current - pb.previous_best

  if (difference <= 0) return "New record logged"

  return `+${Number(difference.toFixed(1))}kg improvement`
}

function getStatusStyle(status: string) {
  if (status === "approved") {
    return "border-green-400/20 bg-green-400/10 text-green-300"
  }

  if (status === "pending") {
    return "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
  }

  return "border-white/10 bg-white/[0.04] text-white/45"
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M8 4h8v3.5c0 3-1.8 5.5-4 5.5S8 10.5 8 7.5V4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 13h5M12 13v4M9 20h6M6 5H4.5C4.2 8.3 5.6 10 8.3 10M18 5h1.5c.3 3.3-1.1 5-3.8 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M12 3l1.4 5.1L18 10l-4.6 1.9L12 17l-1.4-5.1L6 10l4.6-1.9L12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TimelineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M6 5v14M18 5v14M6 8h7M11 16h7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  )
}

export default async function ClientPBsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: pbs, error } = await supabase
    .from("exercise_pbs")
    .select(
      "id, exercise_name, pb_type, weight, reps, estimated_1rm, previous_best, created_at, team_feed_status"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-black p-5 text-white">
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5">
          <h1 className="text-xl font-black">Could not load PBs</h1>
          <p className="mt-2 text-sm text-red-200">{error.message}</p>
        </div>
      </main>
    )
  }

  const allPBs = (pbs || []) as PB[]

  const groupedPBs = allPBs.reduce<Record<string, PB[]>>((acc, pb) => {
    if (!acc[pb.exercise_name]) acc[pb.exercise_name] = []
    acc[pb.exercise_name].push(pb)
    return acc
  }, {})

  const exerciseNames = Object.keys(groupedPBs).sort()

  const totalPBs = allPBs.length
  const totalExercises = exerciseNames.length

  const approvedPBs = allPBs.filter(
    (pb) => pb.team_feed_status === "approved"
  ).length

  const pendingPBs = allPBs.filter(
    (pb) => pb.team_feed_status === "pending"
  ).length

  const latestPB = allPBs[0]

  const bestOverallEstimated = [...allPBs]
    .filter((pb) => pb.estimated_1rm)
    .sort((a, b) => b.estimated_1rm - a.estimated_1rm)[0]

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.12),transparent_34%),linear-gradient(180deg,#050505,#000000)] px-4 py-5 text-white">
      <div className="mx-auto max-w-5xl space-y-5 pb-24">
        <section className={`${glassCard} p-5 sm:p-6`}>
          <div className={goldGlow} />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">
                <TrophyIcon />
                PB Vault
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Your Personal Bests
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
                Every new training record is stored here automatically. Track
                your biggest lifts, recent wins, and momentum over time.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white/70 transition hover:border-yellow-500/40 hover:text-yellow-300"
            >
              Back
            </Link>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-4">
            <div className={innerCard + " p-4"}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                Total PBs
              </p>
              <p className="mt-2 text-3xl font-black text-yellow-300">
                {totalPBs}
              </p>
            </div>

            <div className={innerCard + " p-4"}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                Exercises
              </p>
              <p className="mt-2 text-3xl font-black">{totalExercises}</p>
            </div>

            <div className={innerCard + " p-4"}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                Team Feed
              </p>
              <p className="mt-2 text-3xl font-black text-green-300">
                {approvedPBs}
              </p>
            </div>

            <div className={innerCard + " p-4"}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                Review
              </p>
              <p className="mt-2 text-3xl font-black text-yellow-300">
                {pendingPBs}
              </p>
            </div>
          </div>
        </section>

        {allPBs.length === 0 ? (
          <section className={`${glassCard} p-6 text-center`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
              <TrophyIcon />
            </div>

            <h2 className="mt-4 text-2xl font-black">No PBs logged yet</h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
              Once you beat a previous best in your workout log, your first PB
              will appear here automatically.
            </p>

            <Link
              href="/dashboard"
              className="mt-5 inline-flex rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300"
            >
              Go to dashboard
            </Link>
          </section>
        ) : (
          <>
            <section className="grid gap-3 lg:grid-cols-2">
              <div className={`${glassCard} p-5`}>
                <div className={goldGlow} />

                <div className="relative flex items-center gap-2 text-yellow-300">
                  <SparkIcon />
                  <p className="text-[10px] font-black uppercase tracking-[0.24em]">
                    Latest win
                  </p>
                </div>

                <h2 className="relative mt-3 text-2xl font-black">
                  {latestPB.exercise_name}
                </h2>

                <p className="relative mt-2 text-4xl font-black tracking-tight text-yellow-300">
                  {getPBValue(latestPB)}
                </p>

                <p className="relative mt-2 text-sm text-white/45">
                  {getPBLabel(latestPB.pb_type)} ·{" "}
                  {formatDate(latestPB.created_at)}
                </p>
              </div>

              <div className={`${glassCard} p-5`}>
                <div className="flex items-center gap-2 text-yellow-300">
                  <TrophyIcon />
                  <p className="text-[10px] font-black uppercase tracking-[0.24em]">
                    Biggest estimated 1RM
                  </p>
                </div>

                <h2 className="mt-3 text-2xl font-black">
                  {bestOverallEstimated?.exercise_name || "No estimate yet"}
                </h2>

                <p className="mt-2 text-4xl font-black tracking-tight text-white">
                  {bestOverallEstimated
                    ? `${bestOverallEstimated.estimated_1rm}kg`
                    : "—"}
                </p>

                <p className="mt-2 text-sm text-white/45">
                  {bestOverallEstimated
                    ? `${bestOverallEstimated.weight}kg × ${bestOverallEstimated.reps}`
                    : "Log more sessions to build this out."}
                </p>
              </div>
            </section>

            <section className="space-y-4">
              {exerciseNames.map((exerciseName) => {
                const exercisePBs = groupedPBs[exerciseName]

                const bestHeaviest = exercisePBs
                  .filter((pb) => pb.pb_type === "heaviest")
                  .sort((a, b) => b.weight - a.weight)[0]

                const bestEstimated = exercisePBs
                  .filter((pb) => pb.pb_type === "estimated_1rm")
                  .sort((a, b) => b.estimated_1rm - a.estimated_1rm)[0]

                const bestRepPB = exercisePBs
                  .filter((pb) => pb.pb_type === "rep")
                  .sort((a, b) => b.weight * b.reps - a.weight * a.reps)[0]

                const latestPBs = exercisePBs.slice(0, 6)

                return (
                  <div key={exerciseName} className={glassCard}>
                    <div className={goldGlow} />

                    <div className="relative border-b border-white/10 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300/80">
                            Exercise record
                          </p>

                          <h2 className="mt-2 text-2xl font-black tracking-tight">
                            {exerciseName}
                          </h2>
                        </div>

                        <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
                          {exercisePBs.length} PB
                          {exercisePBs.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className={innerCard + " p-4"}>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                            Heaviest
                          </p>
                          <p className="mt-2 text-2xl font-black">
                            {bestHeaviest
                              ? `${bestHeaviest.weight}kg`
                              : "—"}
                          </p>
                          <p className="mt-1 text-xs text-white/35">
                            {bestHeaviest
                              ? `${bestHeaviest.reps} reps`
                              : "Not logged yet"}
                          </p>
                        </div>

                        <div className={innerCard + " p-4"}>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                            Est. 1RM
                          </p>
                          <p className="mt-2 text-2xl font-black text-yellow-300">
                            {bestEstimated
                              ? `${bestEstimated.estimated_1rm}kg`
                              : "—"}
                          </p>
                          <p className="mt-1 text-xs text-white/35">
                            Calculated from logs
                          </p>
                        </div>

                        <div className={innerCard + " p-4"}>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                            Best rep PB
                          </p>
                          <p className="mt-2 text-2xl font-black">
                            {bestRepPB
                              ? `${bestRepPB.weight}kg`
                              : "—"}
                          </p>
                          <p className="mt-1 text-xs text-white/35">
                            {bestRepPB
                              ? `${bestRepPB.reps} reps`
                              : "Not logged yet"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="relative space-y-3 p-4">
                      <div className="flex items-center gap-2 px-1 text-white/45">
                        <TimelineIcon />
                        <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                          Recent PB Timeline
                        </p>
                      </div>

                      {latestPBs.map((pb, index) => (
                        <div key={pb.id} className="relative pl-5">
                          <div className="absolute left-[5px] top-5 h-full w-px bg-white/10" />

                          <div className="absolute left-0 top-5 h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.55)]" />

                          <div
                            className={`${innerCard} p-4 ${
                              index === 0 ? "border-yellow-400/20" : ""
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-yellow-400 px-3 py-1 text-[10px] font-black uppercase text-black">
                                  {getPBLabel(pb.pb_type)}
                                </span>

                                {index === 0 && (
                                  <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase text-yellow-300">
                                    Latest
                                  </span>
                                )}
                              </div>

                              <span className="text-xs text-white/35">
                                {formatDate(pb.created_at)}
                              </span>
                            </div>

                            <p className="mt-3 text-2xl font-black text-white">
                              {pb.weight}kg × {pb.reps}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-white/50">
                                Est. 1RM {pb.estimated_1rm}kg
                              </span>

                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-white/50">
                                {getPBImprovement(pb)}
                              </span>

                              <span
                                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusStyle(
                                  pb.team_feed_status
                                )}`}
                              >
                                {pb.team_feed_status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </section>
          </>
        )}
      </div>
    </main>
  )
}