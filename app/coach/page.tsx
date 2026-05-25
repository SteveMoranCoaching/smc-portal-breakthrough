import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import CoachActivityFeed from "@/components/CoachActivityFeed"
import RealtimeUnreadMessageCount from "@/components/RealtimeUnreadMessageCount"
import { requireCoach } from "@/lib/authGuards"

export const dynamic = "force-dynamic"

type SetEntry = {
  weight: string
  reps: string
  rpe: string
}

const shellCard =
  "relative overflow-hidden rounded-[1.1rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.014))] p-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.56)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.1rem] before:bg-[linear-gradient(rgba(255,255,255,0.028),transparent)]"

const innerCard =
  "rounded-[0.9rem] border border-white/[0.065] bg-black/42 p-2.5 shadow-[0_6px_16px_rgba(0,0,0,0.3)] backdrop-blur-md"

const goldPill =
  "rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-smc-gold"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

async function createTeamFeedPost(formData: FormData) {
  "use server"

  const title = String(formData.get("title") || "").trim()
  const body = String(formData.get("body") || "").trim()
  const type = String(formData.get("type") || "Announcement")

  if (!title || !body) return

  const supabase = await createSupabaseServerClient()

  await supabase.from("team_feed_posts").insert({
    title,
    body,
    type,
  })

  revalidatePath("/dashboard")
  revalidatePath("/coach")

  redirect("/coach?posted=true")
}

async function approvePBToTeamFeed(formData: FormData) {
  "use server"

  const pbId = String(formData.get("pbId") || "")
  if (!pbId) return

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") return

  const { data: pb } = await supabase
    .from("exercise_pbs")
    .select("id, user_id, exercise_name, pb_type, weight, reps, estimated_1rm")
    .eq("id", pbId)
    .single()

  if (!pb) return

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("user_id", pb.user_id)
    .single()

  const clientName = client?.name || "Team SMC lifter"

  const pbLabel =
    pb.pb_type === "heaviest"
      ? "new heaviest lift"
      : pb.pb_type === "estimated_1rm"
        ? "new estimated 1RM"
        : "new rep PB"

  await supabase.from("team_feed_posts").insert({
    title: `${clientName} hit a ${pbLabel}`,
    body: `${clientName} just logged ${pb.weight}kg × ${pb.reps} on ${pb.exercise_name}. Estimated 1RM: ${pb.estimated_1rm}kg.`,
    type: "PB",
  })

  await supabase
    .from("exercise_pbs")
    .update({
      team_feed_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", pbId)

  revalidatePath("/dashboard")
  revalidatePath("/coach")

  redirect("/coach?posted=true")
}

async function dismissPBFromTeamFeed(formData: FormData) {
  "use server"

  const pbId = String(formData.get("pbId") || "")
  if (!pbId) return

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") return

  await supabase
    .from("exercise_pbs")
    .update({
      team_feed_status: "dismissed",
      approved_at: null,
      approved_by: user.id,
    })
    .eq("id", pbId)

  revalidatePath("/coach")
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = date.toLocaleString("en-GB", { month: "short" })

  return `${day} ${month}`
}

function daysSince(dateString?: string) {
  if (!dateString) return null

  const diff =
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)

  return Math.floor(diff)
}

export default async function CoachDashboard({
  searchParams,
}: {
  searchParams?: { posted?: string } | Promise<{ posted?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const { supabase, user } = await requireCoach()

  const { count: unreadMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .neq("sender_id", user.id)
    .eq("read_by_coach", false)

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, user_id, name, email, goal, status")
    .order("name", { ascending: true })

  if (error) {
    return <div className="p-6 text-white">Error loading clients.</div>
  }

  const { data: pendingPBs } = await supabase
    .from("exercise_pbs")
    .select(
      "id, user_id, exercise_name, pb_type, weight, reps, estimated_1rm, previous_best, created_at, team_feed_status"
    )
    .eq("team_feed_status", "pending")
    .order("created_at", { ascending: false })
    .limit(10)

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select("id, user_id, exercise_name, created_at, reviewed")
    .order("created_at", { ascending: false })
    .limit(50)

  const { data: workoutLogs } = await supabase
    .from("workout_logs")
    .select(
      "id, user_id, exercise_name, sets_completed, notes, created_at, reviewed"
    )
    .order("created_at", { ascending: false })
    .limit(50)

  const { data: sessions } = await supabase
    .from("session_completions")
    .select(
      "id, user_id, programme_id, session_id, completed, session_rating, notes, created_at"
    )
    .order("created_at", { ascending: false })

  const { data: recentCheckIns } = await supabase
    .from("check_ins")
    .select(
      "id, user_id, created_at, bodyweight, training_rating, recovery_rating, nutrition_rating, cardio_steps, notes, reviewed"
    )
    .order("created_at", { ascending: false })
    .limit(50)

  const clientMap: Record<string, string> = {}
  const clientIdMap: Record<string, string> = {}
  const unreviewedCountMap: Record<string, number> = {}
  const lastActivityMap: Record<string, string> = {}
  const lastSessionMap: Record<string, string> = {}
  const lastRatingMap: Record<string, number | null> = {}
  const lastSessionNotesMap: Record<string, string | null> = {}

  clients?.forEach((client) => {
    clientMap[client.user_id] = client.name
    clientIdMap[client.user_id] = client.id
    unreviewedCountMap[client.user_id] = 0
  })

  const newVideoCount = videos?.filter((video) => !video.reviewed).length || 0
  const newLogCount = workoutLogs?.filter((log) => !log.reviewed).length || 0
  const newCheckInCount =
    recentCheckIns?.filter((checkIn) => !checkIn.reviewed).length || 0
  const pendingPBCount = pendingPBs?.length || 0
  const unreadMessageCount = unreadMessages || 0

  const totalNewItems =
    newVideoCount +
    newLogCount +
    newCheckInCount +
    unreadMessageCount +
    pendingPBCount

  videos?.forEach((video) => {
    if (!video.reviewed) {
      unreviewedCountMap[video.user_id] =
        (unreviewedCountMap[video.user_id] || 0) + 1
    }

    if (
      !lastActivityMap[video.user_id] ||
      new Date(video.created_at) > new Date(lastActivityMap[video.user_id])
    ) {
      lastActivityMap[video.user_id] = video.created_at
    }
  })

  workoutLogs?.forEach((log) => {
    if (!log.reviewed) {
      unreviewedCountMap[log.user_id] =
        (unreviewedCountMap[log.user_id] || 0) + 1
    }

    if (
      !lastActivityMap[log.user_id] ||
      new Date(log.created_at) > new Date(lastActivityMap[log.user_id])
    ) {
      lastActivityMap[log.user_id] = log.created_at
    }
  })

  recentCheckIns?.forEach((checkIn) => {
    if (!checkIn.reviewed) {
      unreviewedCountMap[checkIn.user_id] =
        (unreviewedCountMap[checkIn.user_id] || 0) + 1
    }

    if (
      !lastActivityMap[checkIn.user_id] ||
      new Date(checkIn.created_at) > new Date(lastActivityMap[checkIn.user_id])
    ) {
      lastActivityMap[checkIn.user_id] = checkIn.created_at
    }
  })

  sessions
    ?.filter((session) => session.completed === true)
    .forEach((session) => {
      if (!lastSessionMap[session.user_id]) {
        lastSessionMap[session.user_id] = session.created_at
        lastRatingMap[session.user_id] = session.session_rating
        lastSessionNotesMap[session.user_id] = session.notes
      }
    })

  const activityItems = [
    ...(videos || []).map((video) => ({
      type: "video" as const,
      id: video.id,
      user_id: video.user_id,
      clientId: clientIdMap[video.user_id],
      clientName: clientMap[video.user_id] || "Unknown client",
      exercise_name: video.exercise_name,
      created_at: video.created_at,
      reviewed: video.reviewed,
    })),
    ...(workoutLogs || []).map((log) => ({
      type: "log" as const,
      id: log.id,
      user_id: log.user_id,
      clientId: clientIdMap[log.user_id],
      clientName: clientMap[log.user_id] || "Unknown client",
      exercise_name: log.exercise_name,
      created_at: log.created_at,
      reviewed: log.reviewed,
      sets_completed: log.sets_completed as SetEntry[] | null,
      notes: log.notes,
    })),
    ...(recentCheckIns || []).map((checkIn) => ({
      type: "check-in" as const,
      id: checkIn.id,
      user_id: checkIn.user_id,
      clientId: clientIdMap[checkIn.user_id],
      clientName: clientMap[checkIn.user_id] || "Unknown client",
      created_at: checkIn.created_at,
      reviewed: checkIn.reviewed,
      notes: checkIn.notes,
      bodyweight: checkIn.bodyweight,
      training_rating: checkIn.training_rating,
      recovery_rating: checkIn.recovery_rating,
      nutrition_rating: checkIn.nutrition_rating,
      cardio_steps: checkIn.cardio_steps,
    })),
  ]
    .filter((item) => item.clientId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 10)

  const priorityClients =
    clients
      ?.map((client) => {
        const lastSession = lastSessionMap[client.user_id]
        const lastRating = lastRatingMap[client.user_id]
        const lastNotes = lastSessionNotesMap[client.user_id]
        const days = daysSince(lastSession)

        const hasNoSessions = !lastSession
        const isInactive = days !== null && days > 5
        const isLowRating =
          lastRating !== undefined &&
          lastRating !== null &&
          lastRating <= 5

        let priorityScore = 0
        let reason = ""

        if (hasNoSessions) {
          priorityScore = 3
          reason = "No sessions"
        } else if (isInactive) {
          priorityScore = 2
          reason = "Inactive"
        } else if (isLowRating) {
          priorityScore = 1
          reason = "Low rating"
        }

        return {
          ...client,
          lastSession,
          lastRating,
          lastNotes,
          days,
          priorityScore,
          reason,
        }
      })
      .filter((client) => client.priorityScore > 0)
      .sort((a, b) => b.priorityScore - a.priorityScore) || []

  const clientsNeedingAttention = priorityClients.length

  const topClients =
    clients
      ?.map((client) => ({
        ...client,
        unreviewed: unreviewedCountMap[client.user_id] || 0,
        lastActivity: lastActivityMap[client.user_id],
      }))
      .sort((a, b) => {
        if (b.unreviewed !== a.unreviewed) return b.unreviewed - a.unreviewed

        return (
          new Date(b.lastActivity || 0).getTime() -
          new Date(a.lastActivity || 0).getTime()
        )
      })
      .slice(0, 6) || []

  const missionTitle =
    totalNewItems > 0
      ? `${totalNewItems} items need your eyes`
      : "All clear for now"

  const missionSubtitle =
    clientsNeedingAttention > 0
      ? `${clientsNeedingAttention} client${
          clientsNeedingAttention === 1 ? "" : "s"
        } flagged for attention.`
      : totalNewItems > 0
        ? "Clear the review queue, reply to messages, then update programming."
        : "No urgent coaching actions waiting."

  return (
    <div className="relative flex flex-col gap-2.5 overflow-hidden pb-8">
      <div className="pointer-events-none absolute inset-x-[-40px] top-[-120px] h-[320px] rounded-full bg-smc-gold/10 blur-[90px]" />
      <div className="pointer-events-none absolute right-[-90px] top-[260px] h-[240px] w-[240px] rounded-full bg-smc-gold/8 blur-[80px]" />

      <section className="relative overflow-hidden rounded-[1.45rem] border border-smc-gold/25 bg-black p-3 shadow-[0_20px_50px_rgba(0,0,0,0.82)]">
        <div className="absolute inset-0 bg-[url('/images/coach-hero-placeholder.png')] bg-cover bg-center opacity-55 saturate-[1.08] contrast-[1.08]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(212,175,55,0.25),transparent_30%),linear-gradient(90deg,rgba(0,0,0,0.9),rgba(0,0,0,0.64),rgba(0,0,0,0.36)),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.9))]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_28%,rgba(212,175,55,0.06)_72%,transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

        <div className="relative z-10 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold">
              Today’s Mission
            </p>

            <h1 className="mt-1.5 text-2xl font-black leading-tight tracking-tight text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.85)] sm:text-3xl">
              {missionTitle}
            </h1>

            <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/64">
              {missionSubtitle}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/coach/review"
                className="inline-flex min-h-[36px] items-center justify-center rounded-[0.9rem] bg-smc-gold px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[0_0_26px_rgba(212,175,55,0.34)] transition hover:brightness-110 active:scale-[0.98]"
              >
                Start Review
              </Link>

              <Link
                href="/coach/calendar"
                className="inline-flex min-h-[36px] items-center justify-center rounded-[0.9rem] border border-smc-gold/35 bg-black/42 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-smc-gold backdrop-blur-md transition hover:border-smc-gold/60 hover:bg-smc-gold/10"
              >
                Calendar
              </Link>

              <Link
                href="/coach/clients"
                className="inline-flex min-h-[36px] items-center justify-center rounded-[0.9rem] border border-smc-gold/35 bg-black/42 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-smc-gold backdrop-blur-md transition hover:border-smc-gold/60 hover:bg-smc-gold/10"
              >
                Clients
              </Link>

              <Link
                href="/coach/clients/new"
                className="inline-flex min-h-[36px] items-center justify-center rounded-[0.9rem] border border-white/[0.12] bg-black/42 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/76 backdrop-blur-md transition hover:border-smc-gold/40 hover:text-white"
              >
                Add Client
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
            <Link
              href="/coach/review"
              className={`${innerCard} min-h-[68px] bg-black/50 transition hover:border-smc-gold/40`}
            >
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/42">
                Waiting
              </p>
              <p className="mt-1 text-xl font-black text-smc-gold">
                {totalNewItems}
              </p>
            </Link>

            <Link
              href="/coach/messages"
              className={`${innerCard} min-h-[68px] bg-black/50 transition hover:border-smc-gold/40`}
            >
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/42">
                Messages
              </p>
              <p className="mt-1 text-xl font-black text-white">
                <RealtimeUnreadMessageCount
                  initialCount={unreadMessageCount}
                  currentUserId={user.id}
                  mode="coach"
                  variant="number"
                />
              </p>
            </Link>

            <Link
              href="/coach/review"
              className={`${innerCard} min-h-[68px] bg-black/50 transition hover:border-smc-gold/40`}
            >
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/42">
                Reviews
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {newLogCount + newVideoCount + newCheckInCount}
              </p>
            </Link>

            <Link
              href="/coach/calendar"
              className={`${innerCard} min-h-[68px] bg-black/50 transition hover:border-smc-gold/40`}
            >
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/42">
                Calendar
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {clientsNeedingAttention}
              </p>
            </Link>
          </div>
        </div>
      </section>

      {resolvedSearchParams?.posted === "true" && (
        <div className="rounded-[1rem] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          Post published successfully.
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Link
          href="/coach/review"
          className={`${shellCard} block min-h-[92px] transition hover:border-smc-gold/35 hover:bg-white/[0.035]`}
        >
          <div className="relative z-10">
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/75">
              Focus
            </p>
            <h2 className="mt-1.5 text-sm font-black text-white">
              Coaching Queue
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-white/42">
              {newLogCount} logs · {newVideoCount} videos · {newCheckInCount}{" "}
              check-ins
            </p>
          </div>
        </Link>

        <Link
          href="/coach/calendar"
          className={`${shellCard} block min-h-[92px] transition hover:border-smc-gold/35 hover:bg-white/[0.035]`}
        >
          <div className="relative z-10">
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/75">
              Calendar
            </p>
            <h2 className="mt-1.5 text-sm font-black text-white">
              Coaching Tasks
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-white/42">
              Today, this week and who needs eyes.
            </p>
          </div>
        </Link>

        <Link
          href="/coach/clients"
          className={`${shellCard} block min-h-[92px] transition hover:border-smc-gold/35 hover:bg-white/[0.035]`}
        >
          <div className="relative z-10">
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/75">
              Roster
            </p>
            <h2 className="mt-1.5 text-sm font-black text-white">
              Client Hub
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-white/42">
              Search, filter and manage all clients.
            </p>
          </div>
        </Link>

        <Link
          href="/coach/messages"
          className={`${shellCard} block min-h-[92px] transition hover:border-smc-gold/35 hover:bg-white/[0.035]`}
        >
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/75">
                Comms
              </p>
              <h2 className="mt-1.5 text-sm font-black text-white">Messages</h2>
              <p className="mt-1 text-[11px] leading-4 text-white/42">
                Keep support moving.
              </p>
            </div>

            <div className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2 py-1 text-[10px] font-black text-smc-gold">
  <RealtimeUnreadMessageCount
    initialCount={unreadMessageCount}
    currentUserId={user.id}
    mode="coach"
    variant="number"
  />
</div>
          </div>
        </Link>

                <Link
          href="/coach/programmes"
          className={`${shellCard} block min-h-[92px] transition hover:border-smc-gold/35 hover:bg-white/[0.035]`}
        >
          <div className="relative z-10">
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/75">
              Build
            </p>
            <h2 className="mt-1.5 text-sm font-black text-white">
              Programming
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-white/42">
              Upload, edit and manage blocks.
            </p>
          </div>
        </Link>

        <Link
          href="/coach/exercise-demos"
          className={`${shellCard} block min-h-[92px] transition hover:border-smc-gold/35 hover:bg-white/[0.035]`}
        >
          <div className="relative z-10">
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/75">
              Library
            </p>
            <h2 className="mt-1.5 text-sm font-black text-white">
              Exercise Demos
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-white/42">
              Add, edit and manage exercise videos.
            </p>
          </div>
        </Link>
      </div>

      {priorityClients.length > 0 && (
        <section className="relative overflow-hidden rounded-[1.25rem] border border-smc-gold/16 bg-black p-3 shadow-[0_16px_38px_rgba(0,0,0,0.72)]">
          <div className="absolute inset-0 bg-[url('/images/coach-priority-placeholder.png')] bg-cover bg-center opacity-34 saturate-[0.9] contrast-[1.08]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(212,175,55,0.16),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(239,68,68,0.12),transparent_26%),linear-gradient(90deg,rgba(0,0,0,0.9),rgba(0,0,0,0.68)),linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.94))]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/50 to-transparent" />

          <div className="relative z-10">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/85">
                  Priority
                </p>

                <h2 className="mt-1 text-base font-black text-white">
                  Clients Needing Attention
                </h2>
              </div>

              <Link
                href="/coach/calendar"
                className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-smc-gold backdrop-blur-sm transition hover:border-smc-gold/50"
              >
                {priorityClients.length} flagged
              </Link>
            </div>

            <div className="grid gap-2 lg:grid-cols-2">
              {priorityClients.slice(0, 6).map((client) => (
                <Link
                  key={client.id}
                  href={`/coach/${client.id}`}
                  className="block rounded-[0.95rem] border border-white/[0.07] bg-black/50 p-2.5 backdrop-blur-md transition hover:border-smc-gold/35 hover:bg-black/60"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-smc-gold/24 bg-smc-gold/10 text-[11px] font-black text-smc-gold">
                      {getInitials(client.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-white">
                            {client.name}
                          </h3>

                          <p className="mt-0.5 truncate text-[11px] text-white/36">
                            {client.email}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-amber-400/25 bg-amber-400/12 px-2 py-0.5 text-[8px] font-black uppercase text-amber-200">
                          {client.reason}
                        </span>
                      </div>

                      {client.lastNotes && (
                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-white/54">
                          “{client.lastNotes}”
                        </p>
                      )}

                      <p className="mt-1.5 text-[10px] text-white/34">
                        Last session:{" "}
                        {client.lastSession
                          ? formatDate(client.lastSession)
                          : "None"}
                        {client.lastRating !== undefined &&
                          client.lastRating !== null &&
                          ` · ${client.lastRating}/10`}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden rounded-[1.1rem] border border-white/[0.06] bg-black p-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.62)]">
        <div className="absolute inset-0 bg-[url('/images/coach-activity-placeholder.png')] bg-cover bg-center opacity-20 saturate-[0.9] contrast-[1.05]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(212,175,55,0.12),transparent_30%),linear-gradient(180deg,rgba(0,0,0,0.72),rgba(0,0,0,0.92))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

        <div className="relative z-10">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                Snapshot
              </p>

              <h2 className="mt-1 text-base font-black text-white">
                Recent / Review Clients
              </h2>
            </div>

            <Link
              href="/coach/clients"
              className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-smc-gold transition hover:border-smc-gold/50"
            >
              View All
            </Link>
          </div>

          <div className="grid gap-2 lg:grid-cols-2">
            {topClients.map((client) => (
              <Link
                key={client.id}
                href={`/coach/${client.id}`}
                className={`${innerCard} block bg-black/52 transition hover:border-smc-gold/35 hover:bg-black/62`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-smc-gold/20 bg-smc-gold/10 text-[11px] font-black text-smc-gold">
                    {getInitials(client.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-black text-white">
                      {client.name}
                    </h3>
                    <p className="mt-0.5 truncate text-[11px] text-white/32">
                      {client.email}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {client.unreviewed > 0 ? (
                      <span className={goldPill}>{client.unreviewed} new</span>
                    ) : (
                      <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-green-400">
                        Clear
                      </span>
                    )}

                    <p className="mt-1 text-[10px] text-white/28">
                      {client.lastActivity
                        ? formatDate(client.lastActivity)
                        : "No activity"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CoachActivityFeed
        activityItems={activityItems}
        newVideoCount={newVideoCount}
        newLogCount={newLogCount}
        newCheckInCount={newCheckInCount}
      />
    </div>
  )
}