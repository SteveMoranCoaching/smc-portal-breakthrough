import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import CoachActivityFeed from "@/components/CoachActivityFeed"

export const dynamic = "force-dynamic"

type SetEntry = {
  weight: string
  reps: string
  rpe: string
}

export default async function CoachDashboard() {
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

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, user_id, name, email")
    .order("name", { ascending: true })

  if (error) {
    return <div className="p-6 text-white">Error loading clients.</div>
  }

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select("id, user_id, exercise_name, created_at, reviewed")
    .order("created_at", { ascending: false })
    .limit(50)

  const { data: workoutLogs } = await supabase
    .from("workout_logs")
    .select("id, user_id, exercise_name, sets_completed, notes, created_at, reviewed")
    .order("created_at", { ascending: false })
    .limit(50)

  const { data: sessions } = await supabase
    .from("session_completions")
    .select("id, user_id, programme_id, session_id, completed, session_rating, notes, created_at")
    .order("created_at", { ascending: false })

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
  const totalNewItems = newVideoCount + newLogCount

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
              Review client logs, uploads, session completions, and coaching insights.
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

        <section className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
            <p className="text-sm text-gray-400">New logs</p>
            <p className="mt-1 text-2xl font-bold text-indigo-400">
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
            <p className="text-sm text-gray-400">Active clients</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {clients?.length || 0}
            </p>
          </div>

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
                Clients automatically flagged based on completion history and session ratings.
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
                No clients are currently flagged for missed sessions or low ratings.
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
                        <span className="rounded-full bg-indigo-500 px-3 py-1 font-semibold text-black">
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
        />
      </div>
    </main>
  )
}