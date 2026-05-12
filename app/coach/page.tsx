import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import CoachActivityFeed from "@/components/CoachActivityFeed"
import RealtimeUnreadMessageCount from "@/components/RealtimeUnreadMessageCount"

export const dynamic = "force-dynamic"

type SetEntry = {
  weight: string
  reps: string
  rpe: string
}

const shellCard =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

const innerCard =
  "rounded-[1.05rem] border border-white/[0.06] bg-[#070707] p-3 shadow-[0_8px_22px_rgba(0,0,0,0.32)]"

const goldPill =
  "rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold"

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

function shortenText(text: string, maxLength = 120) {
  if (!text) return ""
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
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

  const { count: unreadMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .neq("sender_id", user.id)
    .eq("read_by_coach", false)

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, user_id, name, email")
    .order("name", { ascending: true })

  if (error) {
    return <div className="p-6 text-white">Error loading clients.</div>
  }

  const { data: recentPosts } = await supabase
    .from("team_feed_posts")
    .select("id, title, body, type, created_at")
    .order("created_at", { ascending: false })
    .limit(5)

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
    .slice(0, 30)

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

  const topClients = clients
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
    <div className="flex flex-col gap-3 pb-8">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-smc-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.018))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.78)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/60 to-transparent" />

        <div className="relative z-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/85">
              Today’s Mission
            </p>

            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white">
              {missionTitle}
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
              {missionSubtitle}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/coach/review"
                className="inline-flex min-h-[42px] items-center justify-center rounded-[1rem] bg-smc-gold px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_0_22px_rgba(212,175,55,0.22)] transition hover:brightness-110 active:scale-[0.98]"
              >
                Start Review
              </Link>

              <Link
                href="/coach/messages"
                className="inline-flex min-h-[42px] items-center justify-center rounded-[1rem] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-smc-gold/35 hover:text-white"
              >
                Messages
              </Link>

              <Link
                href="/coach/programmes"
                className="inline-flex min-h-[42px] items-center justify-center rounded-[1rem] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-smc-gold/35 hover:text-white"
              >
                Programmes
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/coach/review" className={`${innerCard} transition hover:border-smc-gold/35`}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Waiting
              </p>
              <p className="mt-1 text-3xl font-black text-smc-gold">
                {totalNewItems}
              </p>
            </Link>

            <Link href="/coach/messages" className={`${innerCard} transition hover:border-smc-gold/35`}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Messages
              </p>
              <p className="mt-1 text-3xl font-black text-white">
                <RealtimeUnreadMessageCount
                  initialCount={unreadMessageCount}
                  currentUserId={user.id}
                  mode="coach"
                  variant="number"
                />
              </p>
            </Link>

            <Link href="/coach/review" className={`${innerCard} transition hover:border-smc-gold/35`}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Reviews
              </p>
              <p className="mt-1 text-3xl font-black text-white">
                {newLogCount + newVideoCount + newCheckInCount}
              </p>
            </Link>

            <div className={innerCard}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Attention
              </p>
              <p className="mt-1 text-3xl font-black text-red-400">
                {clientsNeedingAttention}
              </p>
            </div>
          </div>
        </div>
      </section>

      {resolvedSearchParams?.posted === "true" && (
        <div className="rounded-[1rem] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          Post published successfully.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <Link
          href="/coach/review"
          className={`${shellCard} block transition hover:border-smc-gold/35`}
        >
          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
              Focus
            </p>

            <h2 className="mt-1.5 text-lg font-black text-white">
              Coaching Queue
            </h2>

            <p className="mt-1 text-xs leading-5 text-white/45">
              {newLogCount} logs · {newVideoCount} videos · {newCheckInCount} check-ins
            </p>
          </div>
        </Link>

        <Link
          href="/coach/messages"
          className={`${shellCard} block transition hover:border-smc-gold/35`}
        >
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                Comms
              </p>

              <h2 className="mt-1.5 text-lg font-black text-white">
                Client Messages
              </h2>

              <p className="mt-1 text-xs leading-5 text-white/45">
                Keep client support moving.
              </p>
            </div>

            <RealtimeUnreadMessageCount
              initialCount={unreadMessageCount}
              currentUserId={user.id}
              mode="coach"
            />
          </div>
        </Link>

        <Link
          href="/coach/programmes"
          className={`${shellCard} block transition hover:border-smc-gold/35`}
        >
          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
              Build
            </p>

            <h2 className="mt-1.5 text-lg font-black text-white">
              Client Programming
            </h2>

            <p className="mt-1 text-xs leading-5 text-white/45">
              Upload, edit and manage training blocks.
            </p>
          </div>
        </Link>
      </div>

      {priorityClients.length > 0 && (
        <section className={shellCard}>
          <div className="relative z-10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-red-400/80">
                  Priority
                </p>

                <h2 className="mt-1 text-lg font-black text-white">
                  Clients Needing Attention
                </h2>
              </div>

              <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-300">
                {priorityClients.length} flagged
              </span>
            </div>

            <div className="grid gap-2.5 lg:grid-cols-2">
              {priorityClients.slice(0, 6).map((client) => (
                <Link
                  key={client.id}
                  href={`/coach/${client.id}`}
                  className={`${innerCard} block transition hover:border-smc-gold/35`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-xs font-black text-red-300">
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

                        <span className="shrink-0 rounded-full bg-red-500/90 px-2 py-0.5 text-[8px] font-black uppercase text-black">
                          {client.reason}
                        </span>
                      </div>

                      {client.lastNotes && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/50">
                          “{client.lastNotes}”
                        </p>
                      )}

                      <p className="mt-2 text-[11px] text-white/30">
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

      <section className={shellCard}>
        <div className="relative z-10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                Clients
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                Client Command List
              </h2>
            </div>

            <span className="text-[11px] text-white/35">
              {clients?.length || 0} total
            </span>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-2">
            {topClients?.map((client) => (
              <Link
                key={client.id}
                href={`/coach/${client.id}`}
                className={`${innerCard} block transition hover:border-smc-gold/35`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-smc-gold/20 bg-smc-gold/10 text-xs font-black text-smc-gold">
                    {getInitials(client.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-black text-white">
                      {client.name}
                    </h3>
                    <p className="mt-1 truncate text-xs text-white/35">
                      {client.email}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {client.unreviewed > 0 ? (
                      <span className={goldPill}>{client.unreviewed} new</span>
                    ) : (
                      <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-green-400">
                        Clear
                      </span>
                    )}

                    <p className="mt-1.5 text-[11px] text-white/30">
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

      {pendingPBCount > 0 && (
        <section className={shellCard}>
          <div className="relative z-10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                  Team Feed
                </p>
                <h2 className="mt-1 text-lg font-black text-white">
                  PB Approval Strip
                </h2>
              </div>

              <span className={goldPill}>{pendingPBCount} pending</span>
            </div>

            <div className="grid gap-2.5 lg:grid-cols-3">
              {pendingPBs?.slice(0, 3).map((pb) => (
                <div key={pb.id} className={innerCard}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={goldPill}>PB</span>
                    <span className="text-[11px] text-white/30">
                      {formatDate(pb.created_at)}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-white">
                    {clientMap[pb.user_id] || "Unknown client"}
                  </h3>

                  <p className="mt-1 text-xs text-white/45">
                    {pb.exercise_name}
                  </p>

                  <p className="mt-2 text-xl font-black text-white">
                    {pb.weight}kg × {pb.reps}
                  </p>

                  <p className="mt-1 text-xs text-smc-gold/80">
                    Est. 1RM: {pb.estimated_1rm}kg
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <form action={approvePBToTeamFeed}>
                      <input type="hidden" name="pbId" value={pb.id} />
                      <button
                        type="submit"
                        className="min-h-[38px] w-full rounded-[0.85rem] bg-smc-gold px-3 py-2 text-xs font-black text-black transition hover:brightness-110"
                      >
                        Approve
                      </button>
                    </form>

                    <form action={dismissPBFromTeamFeed}>
                      <input type="hidden" name="pbId" value={pb.id} />
                      <button
                        type="submit"
                        className="min-h-[38px] w-full rounded-[0.85rem] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/55 transition hover:border-red-500/40 hover:text-red-300"
                      >
                        Private
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>

            {pendingPBCount > 3 && (
              <p className="mt-3 text-center text-xs text-white/35">
                Showing top 3 of {pendingPBCount} pending PBs.
              </p>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <section className={shellCard}>
          <div className="relative z-10">
            <div className="mb-3">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                SMC Home
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                Create Team Feed Post
              </h2>
            </div>

            <form action={createTeamFeedPost} className="space-y-2.5">
              <select
                name="type"
                defaultValue="Announcement"
                className="min-h-[42px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none focus:border-smc-gold/45"
              >
                <option value="Announcement">Announcement</option>
                <option value="PB">PB</option>
                <option value="Competition">Competition</option>
              </select>

              <input
                name="title"
                required
                placeholder="Post title"
                className="min-h-[42px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
              />

              <textarea
                name="body"
                required
                rows={3}
                placeholder="Write the update here..."
                className="w-full resize-none rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
              />

              <button
                type="submit"
                className="min-h-[42px] w-full rounded-[1rem] bg-smc-gold px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:brightness-110"
              >
                Publish to SMC Home
              </button>
            </form>
          </div>
        </section>

        {recentPosts && recentPosts.length > 0 && (
          <section className={shellCard}>
            <div className="relative z-10">
              <div className="mb-3">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                  Recent Posts
                </p>

                <h2 className="mt-1 text-lg font-black text-white">
                  Team Feed Activity
                </h2>
              </div>

              <div className="flex flex-col gap-2.5">
                {recentPosts.slice(0, 3).map((post) => (
                  <div key={post.id} className={innerCard}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className={goldPill}>{post.type}</span>

                      <span className="text-[11px] text-white/30">
                        {formatDate(post.created_at)}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-white">
                      {post.title}
                    </h3>

                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-white/50">
                      {shortenText(post.body)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <CoachActivityFeed
        activityItems={activityItems}
        newVideoCount={newVideoCount}
        newLogCount={newLogCount}
        newCheckInCount={newCheckInCount}
      />
    </div>
  )
}