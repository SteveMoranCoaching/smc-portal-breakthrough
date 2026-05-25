import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { requireCoach } from "@/lib/authGuards"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

const innerCard =
  "rounded-[1.05rem] border border-white/[0.06] bg-[#070707] p-3 shadow-[0_8px_22px_rgba(0,0,0,0.32)]"

const goldPill =
  "rounded-full border border-smc-gold/20 bg-smc-gold/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold"

const inputStyle =
  "min-h-[44px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"

const goalOptions = [
  "All",
  "Powerlifting",
  "Fat loss",
  "Muscle build",
  "General strength",
  "Rehab / return to training",
  "Other",
  "Uncategorised",
]

const statusOptions = ["All", "Active", "Onboarding", "Paused", "Inactive"]

const sortOptions = [
  { label: "A-Z", value: "az" },
  { label: "Newest added", value: "newest" },
  { label: "Most recent activity", value: "activity" },
  { label: "Needs review", value: "review" },
]

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
  if (!dateString) return "No activity"

  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = date.toLocaleString("en-GB", { month: "short" })

  return `${day} ${month}`
}

export default async function CoachClientsPage({
  searchParams,
}: {
  searchParams?:
    | { goal?: string; status?: string; sort?: string; q?: string }
    | Promise<{ goal?: string; status?: string; sort?: string; q?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const selectedGoal = resolvedSearchParams?.goal || "All"
  const selectedStatus = resolvedSearchParams?.status || "All"
  const selectedSort = resolvedSearchParams?.sort || "az"
  const query = String(resolvedSearchParams?.q || "").trim().toLowerCase()

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

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, user_id, name, email, goal, status, created_at")
    .order("name", { ascending: true })

  if (error) {
    return <div className="p-6 text-white">Error loading clients.</div>
  }

  const userIds = clients?.map((client) => client.user_id) || []

  const { data: videos } =
    userIds.length > 0
      ? await supabase
          .from("exercise_videos")
          .select("id, user_id, created_at, reviewed")
          .in("user_id", userIds)
          .order("created_at", { ascending: false })
      : { data: [] }

  const { data: workoutLogs } =
    userIds.length > 0
      ? await supabase
          .from("workout_logs")
          .select("id, user_id, created_at, reviewed")
          .in("user_id", userIds)
          .order("created_at", { ascending: false })
      : { data: [] }

  const { data: checkIns } =
    userIds.length > 0
      ? await supabase
          .from("check_ins")
          .select("id, user_id, created_at, reviewed")
          .in("user_id", userIds)
          .order("created_at", { ascending: false })
      : { data: [] }

  const reviewCountMap: Record<string, number> = {}
  const lastActivityMap: Record<string, string> = {}

  clients?.forEach((client) => {
    reviewCountMap[client.user_id] = 0
  })

  ;[...(videos || []), ...(workoutLogs || []), ...(checkIns || [])].forEach(
    (item: any) => {
      if (!item.reviewed) {
        reviewCountMap[item.user_id] = (reviewCountMap[item.user_id] || 0) + 1
      }

      if (
        !lastActivityMap[item.user_id] ||
        new Date(item.created_at) > new Date(lastActivityMap[item.user_id])
      ) {
        lastActivityMap[item.user_id] = item.created_at
      }
    }
  )

  const enrichedClients =
    clients?.map((client) => ({
      ...client,
      goal: client.goal || "Uncategorised",
      status: client.status || "Active",
      reviewCount: reviewCountMap[client.user_id] || 0,
      lastActivity: lastActivityMap[client.user_id] || null,
    })) || []

  const filteredClients = enrichedClients
    .filter((client) => {
      const matchesGoal = selectedGoal === "All" || client.goal === selectedGoal
      const matchesStatus =
        selectedStatus === "All" || client.status === selectedStatus
      const matchesQuery =
        !query ||
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query)

      return matchesGoal && matchesStatus && matchesQuery
    })
    .sort((a, b) => {
      if (selectedSort === "newest") {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        )
      }

      if (selectedSort === "activity") {
        return (
          new Date(b.lastActivity || 0).getTime() -
          new Date(a.lastActivity || 0).getTime()
        )
      }

      if (selectedSort === "review") {
        return b.reviewCount - a.reviewCount
      }

      return a.name.localeCompare(b.name)
    })

  const activeCount = enrichedClients.filter(
    (client) => client.status === "Active"
  ).length

  const onboardingCount = enrichedClients.filter(
    (client) => client.status === "Onboarding"
  ).length

  const pausedInactiveCount = enrichedClients.filter(
    (client) => client.status === "Paused" || client.status === "Inactive"
  ).length

  const totalReviewCount = enrichedClients.reduce(
    (total, client) => total + client.reviewCount,
    0
  )

  return (
    <div className="flex flex-col gap-3 pb-8">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-smc-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.018))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.78)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/60 to-transparent" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/85">
              Client CRM
            </p>

            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white">
              Clients
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
              Search, sort and manage your full coaching roster without cluttering the dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/coach"
              className="inline-flex min-h-[42px] items-center justify-center rounded-[1rem] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-smc-gold/35 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/coach/clients/new"
              className="inline-flex min-h-[42px] items-center justify-center rounded-[1rem] bg-smc-gold px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_0_22px_rgba(212,175,55,0.22)] transition hover:brightness-110 active:scale-[0.98]"
            >
              Add Client
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className={innerCard}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Total
          </p>
          <p className="mt-1 text-2xl font-black text-white">
            {enrichedClients.length}
          </p>
        </div>

        <div className={innerCard}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Active
          </p>
          <p className="mt-1 text-2xl font-black text-smc-gold">
            {activeCount}
          </p>
        </div>

        <div className={innerCard}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Onboarding
          </p>
          <p className="mt-1 text-2xl font-black text-white">
            {onboardingCount}
          </p>
        </div>

        <div className={innerCard}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Review Items
          </p>
          <p className="mt-1 text-2xl font-black text-red-400">
            {totalReviewCount}
          </p>
        </div>
      </div>

      <section className={shellCard}>
        <div className="relative z-10">
          <form className="grid gap-2 lg:grid-cols-[1fr_190px_160px_190px_auto]">
            <input
              name="q"
              defaultValue={resolvedSearchParams?.q || ""}
              placeholder="Search name or email..."
              className={inputStyle}
            />

            <select
              name="goal"
              defaultValue={selectedGoal}
              className={inputStyle}
            >
              {goalOptions.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>

            <select
              name="status"
              defaultValue={selectedStatus}
              className={inputStyle}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              name="sort"
              defaultValue={selectedSort}
              className={inputStyle}
            >
              {sortOptions.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="min-h-[44px] rounded-[1rem] border border-smc-gold/25 bg-smc-gold/10 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-smc-gold transition hover:border-smc-gold/50 hover:bg-smc-gold/15"
            >
              Filter
            </button>
          </form>
        </div>
      </section>

      <section className={shellCard}>
        <div className="relative z-10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                Roster
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                {filteredClients.length} Client
                {filteredClients.length === 1 ? "" : "s"}
              </h2>
            </div>

            {pausedInactiveCount > 0 && (
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
                {pausedInactiveCount} paused/inactive
              </span>
            )}
          </div>

          {filteredClients.length === 0 ? (
            <div className="rounded-[1rem] border border-white/[0.06] bg-[#05070c] p-4 text-sm text-white/45">
              No clients found for this search/filter.
            </div>
          ) : (
            <div className="grid gap-2.5 lg:grid-cols-2">
              {filteredClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/coach/${client.id}`}
                  className={`${innerCard} block transition hover:border-smc-gold/35`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-smc-gold/20 bg-smc-gold/10 text-xs font-black text-smc-gold">
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

                        {client.reviewCount > 0 ? (
                          <span className="shrink-0 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-300">
                            {client.reviewCount} review
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-green-400">
                            Clear
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={goldPill}>{client.goal}</span>

                        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
                          {client.status}
                        </span>

                        <span className="text-[11px] text-white/30">
                          Last: {formatDate(client.lastActivity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}