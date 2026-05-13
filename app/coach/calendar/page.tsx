import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

const innerCard =
  "rounded-[1.05rem] border border-white/[0.06] bg-[#070707] p-3 shadow-[0_8px_22px_rgba(0,0,0,0.32)]"

const goldPill =
  "rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold"

type Client = {
  id: string
  user_id: string
  name: string
  email: string
  goal: string | null
  status: string | null
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "None"

  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = date.toLocaleString("en-GB", { month: "short" })

  return `${day} ${month}`
}

function daysSince(dateString?: string | null) {
  if (!dateString) return null

  const diff =
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)

  return Math.floor(diff)
}

function isThisWeek(dateString?: string | null) {
  if (!dateString) return false

  const now = new Date()
  const date = new Date(dateString)

  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  return date >= startOfWeek && date < endOfWeek
}

function ClientTaskCard({
  client,
  label,
  detail,
  tone = "gold",
}: {
  client: Client
  label: string
  detail: string
  tone?: "gold" | "red" | "green"
}) {
  const toneClass =
    tone === "red"
      ? "border-red-500/25 bg-red-500/10 text-red-300"
      : tone === "green"
        ? "border-green-500/25 bg-green-500/10 text-green-300"
        : "border-smc-gold/20 bg-smc-gold/10 text-smc-gold"

  return (
    <Link
      href={`/coach/${client.id}`}
      className={`${innerCard} block transition hover:border-smc-gold/35`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-black ${toneClass}`}
        >
          {getInitials(client.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-white">
                {client.name}
              </h3>
              <p className="mt-1 truncate text-xs text-white/35">
                {client.email}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] ${toneClass}`}
            >
              {label}
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-white/50">{detail}</p>

          {(client.goal || client.status) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {client.goal && <span className={goldPill}>{client.goal}</span>}
              {client.status && (
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
                  {client.status}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

async function CoachCalendarPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div className="p-6 text-white">You must be logged in.</div>
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") {
    return (
      <div className="p-6 text-white">
        You do not have permission to view this page.
      </div>
    )
  }

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, user_id, name, email, goal, status")
    .order("name", { ascending: true })

  if (clientsError) {
    return <div className="p-6 text-white">Error loading calendar.</div>
  }

  const { data: sessions } = await supabase
    .from("session_completions")
    .select("id, user_id, completed, session_rating, notes, created_at")
    .order("created_at", { ascending: false })

  const { data: workoutLogs } = await supabase
    .from("workout_logs")
    .select("id, user_id, exercise_name, created_at, reviewed")
    .order("created_at", { ascending: false })
    .limit(100)

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select("id, user_id, exercise_name, created_at, reviewed")
    .order("created_at", { ascending: false })
    .limit(100)

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select(
      "id, user_id, created_at, bodyweight, training_rating, recovery_rating, nutrition_rating, cardio_steps, notes, reviewed"
    )
    .order("created_at", { ascending: false })
    .limit(100)

  const clientMap: Record<string, Client> = {}
  const lastActivityMap: Record<string, string> = {}
  const sessionCountMap: Record<string, number> = {}

  clients?.forEach((client) => {
    clientMap[client.user_id] = client
    sessionCountMap[client.user_id] = 0
  })

  function updateLastActivity(userId: string, createdAt: string) {
    if (
      !lastActivityMap[userId] ||
      new Date(createdAt) > new Date(lastActivityMap[userId])
    ) {
      lastActivityMap[userId] = createdAt
    }
  }

  sessions
    ?.filter((session) => session.completed === true)
    .forEach((session) => {
      sessionCountMap[session.user_id] =
        (sessionCountMap[session.user_id] || 0) + 1

      updateLastActivity(session.user_id, session.created_at)
    })

  workoutLogs?.forEach((log) => updateLastActivity(log.user_id, log.created_at))
  videos?.forEach((video) => updateLastActivity(video.user_id, video.created_at))
  checkIns?.forEach((checkIn) =>
    updateLastActivity(checkIn.user_id, checkIn.created_at)
  )

  const unreviewedLogs =
    workoutLogs?.filter((log) => !log.reviewed && clientMap[log.user_id]) || []

  const unreviewedVideos =
    videos?.filter((video) => !video.reviewed && clientMap[video.user_id]) || []

  const unreviewedCheckIns =
    checkIns?.filter(
      (checkIn) => !checkIn.reviewed && clientMap[checkIn.user_id]
    ) || []

  const noSessionClients =
    clients?.filter((client) => (sessionCountMap[client.user_id] || 0) === 0) ||
    []

  const inactiveClients =
    clients
      ?.map((client) => ({
        ...client,
        lastActivity: lastActivityMap[client.user_id],
        days: daysSince(lastActivityMap[client.user_id]),
      }))
      .filter((client) => client.days === null || client.days >= 5)
      .sort((a, b) => (b.days || 999) - (a.days || 999)) || []

  const thisWeekSessions =
    sessions?.filter(
      (session) => session.completed && isThisWeek(session.created_at)
    ).length || 0

  const thisWeekLogs =
    workoutLogs?.filter((log) => isThisWeek(log.created_at)).length || 0

  const thisWeekVideos =
    videos?.filter((video) => isThisWeek(video.created_at)).length || 0

  const thisWeekCheckIns =
    checkIns?.filter((checkIn) => isThisWeek(checkIn.created_at)).length || 0

  const needsReviewCount =
    unreviewedLogs.length + unreviewedVideos.length + unreviewedCheckIns.length

  const totalTasks =
    needsReviewCount + inactiveClients.length + noSessionClients.length

  return (
    <div className="flex flex-col gap-3 pb-8">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-smc-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.018))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.78)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/60 to-transparent" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/85">
                Coach Calendar
              </p>

              <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white">
                Today’s Coaching Tasks
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
                A simple view of who needs review, who has gone quiet, and what
                has happened this week.
              </p>
            </div>

            <Link
              href="/coach"
              className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/60 transition hover:border-smc-gold/35 hover:text-white"
            >
              Dashboard
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className={innerCard}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Total Tasks
              </p>
              <p className="mt-1 text-3xl font-black text-smc-gold">
                {totalTasks}
              </p>
            </div>

            <div className={innerCard}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Needs Review
              </p>
              <p className="mt-1 text-3xl font-black text-white">
                {needsReviewCount}
              </p>
            </div>

            <div className={innerCard}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Inactive
              </p>
              <p className="mt-1 text-3xl font-black text-white">
                {inactiveClients.length}
              </p>
            </div>

            <div className={innerCard}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                No Sessions
              </p>
              <p className="mt-1 text-3xl font-black text-white">
                {noSessionClients.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={shellCard}>
        <div className="relative z-10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                Needs Review
              </p>
              <h2 className="mt-1 text-lg font-black text-white">
                Logs, Videos & Check-ins
              </h2>
            </div>

            <Link
              href="/coach/review"
              className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold transition hover:border-smc-gold/50"
            >
              Review Queue
            </Link>
          </div>

          {needsReviewCount === 0 ? (
            <div className={innerCard}>
              <p className="text-sm font-bold text-white">All clear.</p>
              <p className="mt-1 text-xs text-white/40">
                No unreviewed logs, videos or check-ins waiting.
              </p>
            </div>
          ) : (
            <div className="grid gap-2.5 lg:grid-cols-3">
              {unreviewedLogs.slice(0, 6).map((log) => (
                <ClientTaskCard
                  key={`log-${log.id}`}
                  client={clientMap[log.user_id]}
                  label="Log"
                  detail={`${log.exercise_name || "Workout log"} · ${formatDate(
                    log.created_at
                  )}`}
                />
              ))}

              {unreviewedVideos.slice(0, 6).map((video) => (
                <ClientTaskCard
                  key={`video-${video.id}`}
                  client={clientMap[video.user_id]}
                  label="Video"
                  detail={`${video.exercise_name || "Exercise video"} · ${formatDate(
                    video.created_at
                  )}`}
                />
              ))}

              {unreviewedCheckIns.slice(0, 6).map((checkIn) => (
                <ClientTaskCard
                  key={`checkin-${checkIn.id}`}
                  client={clientMap[checkIn.user_id]}
                  label="Check-in"
                  detail={`Training ${checkIn.training_rating || "-"} · Recovery ${
                    checkIn.recovery_rating || "-"
                  } · Nutrition ${checkIn.nutrition_rating || "-"}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className={shellCard}>
          <div className="relative z-10">
            <div className="mb-3">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-red-400/80">
                Inactive / No Sessions
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                Clients Going Quiet
              </h2>
            </div>

            <div className="flex flex-col gap-2.5">
              {inactiveClients.slice(0, 8).map((client) => (
                <ClientTaskCard
                  key={`inactive-${client.id}`}
                  client={client}
                  label={
                    client.days === null ? "No activity" : `${client.days}d`
                  }
                  detail={
                    client.lastActivity
                      ? `Last activity: ${formatDate(client.lastActivity)}`
                      : "No tracked activity yet."
                  }
                  tone="red"
                />
              ))}

              {inactiveClients.length === 0 && (
                <div className={innerCard}>
                  <p className="text-sm font-bold text-white">
                    Everyone is active.
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    No clients are currently inactive for 5+ days.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={shellCard}>
          <div className="relative z-10">
            <div className="mb-3">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                Check-ins
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                Recent Check-ins Needing Review
              </h2>
            </div>

            <div className="flex flex-col gap-2.5">
              {unreviewedCheckIns.slice(0, 8).map((checkIn) => (
                <ClientTaskCard
                  key={`recent-checkin-${checkIn.id}`}
                  client={clientMap[checkIn.user_id]}
                  label="Review"
                  detail={`Bodyweight ${checkIn.bodyweight || "-"} · Steps ${
                    checkIn.cardio_steps || "-"
                  } · ${formatDate(checkIn.created_at)}`}
                />
              ))}

              {unreviewedCheckIns.length === 0 && (
                <div className={innerCard}>
                  <p className="text-sm font-bold text-white">
                    No check-ins waiting.
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Recent check-ins are reviewed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className={shellCard}>
        <div className="relative z-10">
          <div className="mb-3">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
              This Week Snapshot
            </p>

            <h2 className="mt-1 text-lg font-black text-white">
              Team Activity This Week
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className={innerCard}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Sessions
              </p>
              <p className="mt-1 text-3xl font-black text-white">
                {thisWeekSessions}
              </p>
            </div>

            <div className={innerCard}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Logs
              </p>
              <p className="mt-1 text-3xl font-black text-white">
                {thisWeekLogs}
              </p>
            </div>

            <div className={innerCard}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Videos
              </p>
              <p className="mt-1 text-3xl font-black text-white">
                {thisWeekVideos}
              </p>
            </div>

            <div className={innerCard}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Check-ins
              </p>
              <p className="mt-1 text-3xl font-black text-white">
                {thisWeekCheckIns}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default CoachCalendarPage