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
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        You must be logged in.
      </main>
    )
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        You do not have permission to view this page.
      </main>
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

  const unreadMessageCount = unreadMessages || 0
  const totalNewItems =
    newVideoCount + newLogCount + newCheckInCount + unreadMessageCount

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

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const month = date.toLocaleString("en-GB", { month: "short" })
    const year = date.getFullYear()

    return `${day} ${month} ${year}`
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
          reason = "No sessions completed yet"
        } else if (isInactive) {
          priorityScore = 2
          reason = "No session in 5+ days"
        } else if (isLowRating) {
          priorityScore = 1
          reason = "Low session rating"
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

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Coach Control Centre</h1>
            <p className="mt-2 text-gray-400">
              Review client logs, uploads, session completions, and coaching
              insights.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-5 py-3">
              <p className="text-sm text-gray-300">New items waiting</p>
              <p className="text-3xl font-bold text-yellow-400">
                {totalNewItems}
              </p>
            </div>

            <Link
              href="/coach/review"
              className="rounded-xl bg-yellow-500 px-4 py-3 font-semibold text-black transition hover:bg-yellow-400"
            >
              Review →
            </Link>
          </div>
        </div>

        {resolvedSearchParams?.posted === "true" && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
            Post published successfully.
          </div>
        )}

        <Link
          href="/coach/messages"
          className="block rounded-3xl border border-gray-800 bg-gray-950 p-5 transition hover:border-yellow-500"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
                Messages
              </p>
              <h2 className="mt-2 text-xl font-bold text-white">
                Client Messages
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                View and reply to client messages.
              </p>
            </div>

            <RealtimeUnreadMessageCount
  initialCount={unreadMessageCount}
  currentUserId={user.id}
  mode="coach"
/>
          </div>
        </Link>

        <section className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white">
              Create Team Feed Post
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Post team updates, PBs, competition news and announcements to the
              SMC Home feed.
            </p>
          </div>

          <form action={createTeamFeedPost} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Post type
              </label>

              <select
                name="type"
                defaultValue="Announcement"
                className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 text-white outline-none focus:border-yellow-500"
              >
                <option value="Announcement">Announcement</option>
                <option value="PB">PB</option>
                <option value="Competition">Competition</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Title
              </label>

              <input
                name="title"
                required
                placeholder="e.g. Massive PB from Team SMC"
                className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Body
              </label>

              <textarea
                name="body"
                required
                rows={4}
                placeholder="Write the update here..."
                className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-yellow-500"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-black transition hover:bg-yellow-400"
            >
              Publish to SMC Home →
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white">
              Recent Team Posts
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Latest posts currently showing on the SMC Home feed.
            </p>
          </div>

          {recentPosts && recentPosts.length > 0 ? (
            <div className="space-y-3">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-gray-800 bg-black p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold uppercase text-black">
                      {post.type}
                    </span>

                    <span className="text-xs text-gray-500">
                      {formatDate(post.created_at)}
                    </span>
                  </div>

                  <h3 className="font-semibold text-white">{post.title}</h3>

                  <p className="mt-2 text-sm leading-relaxed text-gray-300">
                    {shortenText(post.body)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <p className="text-sm text-gray-400">
                No team posts have been created yet.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white">
              Recent Client Check-Ins
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Latest client check-ins submitted for coach review.
            </p>
          </div>

          {recentCheckIns && recentCheckIns.length > 0 ? (
            <div className="space-y-3">
              {recentCheckIns.map((checkIn) => (
                <Link
                  key={checkIn.id}
                  href={`/coach/check-ins/${checkIn.id}`}
                  className="block rounded-xl border border-gray-800 bg-black p-4 transition hover:border-yellow-500"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">
                        {clientMap[checkIn.user_id] || "Unknown client"}
                      </h3>

                      {!checkIn.reviewed && (
                        <span className="rounded-full bg-yellow-500 px-2 py-1 text-[10px] font-bold uppercase text-black">
                          NEW
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-gray-500">
                      {formatDate(checkIn.created_at)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full border border-gray-800 px-3 py-1 text-gray-300">
                      Bodyweight: {checkIn.bodyweight ?? "—"}kg
                    </span>

                    <span className="rounded-full border border-gray-800 px-3 py-1 text-gray-300">
                      Training: {checkIn.training_rating ?? "—"}/10
                    </span>

                    <span className="rounded-full border border-gray-800 px-3 py-1 text-gray-300">
                      Recovery: {checkIn.recovery_rating ?? "—"}/10
                    </span>

                    <span className="rounded-full border border-gray-800 px-3 py-1 text-gray-300">
                      Nutrition: {checkIn.nutrition_rating ?? "—"}/10
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <p className="text-sm text-gray-400">
                No client check-ins have been submitted yet.
              </p>
            </div>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
            <p className="text-sm text-gray-400">New logs</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">
              {newLogCount}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
            <p className="text-sm text-gray-400">New videos</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">
              {newVideoCount}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
            <p className="text-sm text-gray-400">New check-ins</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">
              {newCheckInCount}
            </p>
          </div>

          <Link
            href="/coach/messages"
            className="rounded-2xl border border-gray-800 bg-gray-950 p-4 transition hover:border-yellow-500"
          >
            <p className="text-sm text-gray-400">Unread messages</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">
              <RealtimeUnreadMessageCount
  initialCount={unreadMessageCount}
  currentUserId={user.id}
  mode="coach"
  variant="number"
/>
            </p>
          </Link>

          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-gray-400">Need attention</p>
            <p className="mt-1 text-2xl font-bold text-red-400">
              {clientsNeedingAttention}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Needs Attention
              </h2>
              <p className="text-sm text-gray-400">
                Clients automatically flagged based on completion history and
                session ratings.
              </p>
            </div>

            <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-black">
              {priorityClients.length} flagged
            </span>
          </div>

          {priorityClients.length === 0 ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
              <p className="font-semibold text-green-400">All clear</p>
              <p className="mt-1 text-sm text-gray-300">
                No clients are currently flagged for missed sessions or low
                ratings.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {priorityClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/coach/${client.id}`}
                  className="block rounded-xl border border-red-500/30 bg-black p-4 transition hover:border-yellow-500"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">
                          {client.name}
                        </h3>

                        <span className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold uppercase text-black">
                          {client.reason}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-gray-400">
                        {client.email}
                      </p>

                      {client.lastNotes && (
                        <p className="mt-2 max-w-xl text-sm text-gray-300">
                          “{client.lastNotes}”
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm sm:justify-end">
                      <span className="rounded-full border border-gray-700 px-3 py-1 text-gray-300">
                        Last session:{" "}
                        {client.lastSession
                          ? formatDate(client.lastSession)
                          : "None"}
                      </span>

                      {client.lastRating !== undefined &&
                      client.lastRating !== null ? (
                        <span className="rounded-full bg-orange-500 px-3 py-1 font-semibold text-black">
                          Rating {client.lastRating}/10
                        </span>
                      ) : (
                        <span className="rounded-full border border-gray-700 px-3 py-1 text-gray-400">
                          No rating
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <h2 className="mb-4 text-xl font-semibold">Coach Insights</h2>

          <div className="space-y-3">
            {clients?.map((client) => {
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

              return (
                <Link
                  key={client.id}
                  href={`/coach/${client.id}`}
                  className="block rounded-xl border border-gray-800 bg-black p-4 transition hover:border-yellow-500"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>
                      <p className="text-sm text-gray-400">{client.email}</p>

                      {lastNotes && (
                        <p className="mt-2 max-w-xl text-sm text-gray-300">
                          “{lastNotes}”
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm sm:justify-end">
                      <span className="rounded-full border border-gray-700 px-3 py-1 text-gray-300">
                        Last session:{" "}
                        {lastSession ? formatDate(lastSession) : "None"}
                      </span>

                      {lastRating !== undefined && lastRating !== null ? (
                        <span className="rounded-full bg-yellow-500 px-3 py-1 font-semibold text-black">
                          Rating {lastRating}/10
                        </span>
                      ) : (
                        <span className="rounded-full border border-gray-700 px-3 py-1 text-gray-400">
                          No rating
                        </span>
                      )}

                      {hasNoSessions && (
                        <span className="rounded-full bg-red-500 px-3 py-1 font-semibold text-black">
                          No sessions yet
                        </span>
                      )}

                      {isInactive && (
                        <span className="rounded-full bg-red-500 px-3 py-1 font-semibold text-black">
                          No session in 5+ days
                        </span>
                      )}

                      {isLowRating && (
                        <span className="rounded-full bg-orange-500 px-3 py-1 font-semibold text-black">
                          Low rating
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
          <h2 className="mb-4 text-xl font-semibold">Clients</h2>

          <div className="space-y-3">
            {clients?.map((client) => {
              const unreviewed = unreviewedCountMap[client.user_id] || 0
              const lastActivity = lastActivityMap[client.user_id]

              return (
                <Link
                  key={client.id}
                  href={`/coach/${client.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-black p-4 transition hover:border-yellow-500 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-semibold">{client.name}</h3>
                    <p className="text-sm text-gray-400">{client.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {unreviewed > 0 ? (
                      <span className="rounded-full bg-yellow-500 px-3 py-1 font-semibold text-black">
                        {unreviewed} unreviewed
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-500 px-3 py-1 font-semibold text-black">
                        All reviewed
                      </span>
                    )}

                    <span className="text-gray-400">
                      Last activity:{" "}
                      {lastActivity ? formatDate(lastActivity) : "None yet"}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <CoachActivityFeed
          activityItems={activityItems}
          newVideoCount={newVideoCount}
          newLogCount={newLogCount}
          newCheckInCount={newCheckInCount}
        />
      </div>
    </main>
  )
}