import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import CoachActivityFeed from "@/components/CoachActivityFeed"
import RealtimeUnreadMessageCount from "@/components/RealtimeUnreadMessageCount"
import { requireCoach } from "@/lib/authGuards"
import { getEffectiveProgrammeWeek } from "@/lib/programmes/progression"
import {
  buildCoachAttentionItems,
  getFlagLabel,
} from "@/lib/coachIntelligence"

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

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = monthNames[date.getMonth()]

  return `${day} ${month}`
}

function daysSince(dateString?: string) {
  if (!dateString) return null

  const diff =
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)

  return Math.floor(diff)
}

function getWeekStartDate(dateInput?: string | Date) {
  const date = dateInput ? new Date(dateInput) : new Date()
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)

  const monday = new Date(date)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)

  return monday
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatWeekHeader(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

function getProgrammeStartDate(programme: any) {
  return programme?.start_date || programme?.created_at || null
}

function getUploadedWeekCount(programme: any) {
  const weeks = (programme?.programme_sessions || [])
    .map((session: any) => Number(session.week_number || 1))
    .filter((week: number) => Number.isFinite(week) && week > 0)

  return weeks.length ? Math.max(...weeks) : 0
}

function getProgrammeProgressCell(
  programme: any,
  currentWeek: number,
  weekOffset: number
) {
  if (!programme) {
    return {
      label: "Needs Programme",
      tone: "red" as const,
      icon: "🚨",
    }
  }

  const uploadedWeeks = getUploadedWeekCount(programme)
  const plannedWeeks = Number(
    programme.planned_weeks || uploadedWeeks || 4
  )

  const forecastWeek = currentWeek + weekOffset

  if (forecastWeek > plannedWeeks) {
    return {
      label: "Needs Programme",
      tone: "red" as const,
      icon: "🚨",
    }
  }

  if (forecastWeek > uploadedWeeks) {
    return {
      label: `Week ${forecastWeek}`,
      tone: "yellow" as const,
      icon: "⚠️",
    }
  }

  return {
    label: `Week ${forecastWeek}`,
    tone: "green" as const,
    icon: "",
  }
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
  .eq("status", "Active")
  .order("name", { ascending: true })

  if (error) {
    return <div className="p-6 text-white">Error loading clients.</div>
  }

  const clientUserIds = clients?.map((client) => client.user_id).filter(Boolean) || []

  const { data: programmeProgressProgrammes } =
    clientUserIds.length > 0
      ? await supabase
          .from("programmes")
          .select(`
            id,
            user_id,
            title,
            week_number,
            start_date,
            created_at,
            is_active,
            planned_weeks,
            coach_current_week,
            programme_sessions (
              id,
              week_number,
              day,
              title
            )
          `)
          .in("user_id", clientUserIds)
          .order("is_active", { ascending: false })
          .order("created_at", { ascending: false })
      : { data: [] }

  const { data: pendingPBs } = await supabase
    .from("exercise_pbs")
    .select(
      "id, user_id, exercise_name, pb_type, weight, reps, estimated_1rm, previous_best, created_at, team_feed_status"
    )
    .eq("team_feed_status", "pending")
    .neq("pb_type", "estimated_1rm")
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

  clients?.forEach((client) => {
    clientMap[client.user_id] = client.name
    clientIdMap[client.user_id] = client.id
    unreviewedCountMap[client.user_id] = 0
  })

  const unreviewedSessionKeys = new Set<string>()

;(workoutLogs || [])
  .filter((log: any) => !log.reviewed && log.session_id)
  .forEach((log: any) => {
    unreviewedSessionKeys.add(`${log.user_id}-${log.session_id}`)
  })

;(videos || [])
  .filter((video: any) => !video.reviewed && video.session_id)
  .forEach((video: any) => {
    unreviewedSessionKeys.add(`${video.user_id}-${video.session_id}`)
  })

const newSessionReviewCount = unreviewedSessionKeys.size

const newVideoCount = videos?.filter((video) => !video.reviewed).length || 0
const newLogCount = workoutLogs?.filter((log) => !log.reviewed).length || 0
const newCheckInCount =
  recentCheckIns?.filter((checkIn) => !checkIn.reviewed).length || 0
const pendingPBCount = pendingPBs?.length || 0
const unreadMessageCount = unreadMessages || 0

const reviewQueueCount =
  newSessionReviewCount + newCheckInCount

const totalNewItems =
  reviewQueueCount + unreadMessageCount + pendingPBCount

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

  const coachAttentionItems = buildCoachAttentionItems({
  clients: clients || [],
  workoutLogs: workoutLogs || [],
  videos: videos || [],
  checkIns: recentCheckIns || [],
})

const clientsNeedingAttention = coachAttentionItems.length

  const weekStart = getWeekStartDate()

const programmeForecastWeeks = [
  {
    offset: -1,
    date: addDays(weekStart, -7),
    label: formatWeekHeader(addDays(weekStart, -7)),
    title: "Last Week",
    tone: "past",
  },
  {
    offset: 0,
    date: weekStart,
    label: formatWeekHeader(weekStart),
    title: "This Week",
    tone: "current",
  },
  {
    offset: 1,
    date: addDays(weekStart, 7),
    label: formatWeekHeader(addDays(weekStart, 7)),
    title: "Next Week",
    tone: "future",
  },
  {
    offset: 2,
    date: addDays(weekStart, 14),
    label: formatWeekHeader(addDays(weekStart, 14)),
    title: "Following Week",
    tone: "future",
  },
]

  const programmesByUserId: Record<string, any[]> = {}

  ;(programmeProgressProgrammes || []).forEach((programme: any) => {
    programmesByUserId[programme.user_id] = [
      ...(programmesByUserId[programme.user_id] || []),
      programme,
    ]
  })

  const programmeProgressRows =
    clients?.map((client) => {
      const clientProgrammes = programmesByUserId[client.user_id] || []
      const activeProgramme =
        clientProgrammes.find((programme: any) => programme.is_active) ||
        clientProgrammes[0] ||
        null

      const uploadedWeeks = getUploadedWeekCount(activeProgramme)

const plannedWeeks = activeProgramme
  ? Number(activeProgramme.planned_weeks || uploadedWeeks || 4)
  : 0

const currentWeek = activeProgramme
  ? getEffectiveProgrammeWeek({
      programmeStartDate:
        activeProgramme.start_date || activeProgramme.created_at,
      coachCurrentWeek: activeProgramme.coach_current_week,
      sessions: activeProgramme.programme_sessions || [],
      completedSessionIds: new Set<string>(),
    })
  : 0

const cells = programmeForecastWeeks.map((week) =>
  getProgrammeProgressCell(
    activeProgramme,
    currentWeek,
    week.offset
  )
)

      const nextWeekCell = cells[2]

      const needsNumbers = nextWeekCell?.tone === "yellow"
      const needsProgramme = nextWeekCell?.tone === "red"

      return {
        client,
        activeProgramme,
        uploadedWeeks,
        plannedWeeks,
        currentWeek,
        cells,
        needsNumbers,
        needsProgramme,
      }
    }) || []

  const clientsNeedingNumbers = programmeProgressRows.filter(
    (row) => row.needsNumbers
  ).length

  const clientsNeedingProgrammes = programmeProgressRows.filter(
    (row) => row.needsProgramme
  ).length

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
  reviewQueueCount > 0
    ? `${reviewQueueCount} review item${reviewQueueCount === 1 ? "" : "s"} need your eyes`
    : pendingPBCount > 0
      ? `${pendingPBCount} PB${pendingPBCount === 1 ? "" : "s"} pending approval`
      : unreadMessageCount > 0
        ? `${unreadMessageCount} unread message${unreadMessageCount === 1 ? "" : "s"}`
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

            {coachAttentionItems.length > 0 && (
  <div className="mt-3 flex flex-wrap gap-2">
    {coachAttentionItems.slice(0, 3).map((client) => (
      <Link
        key={client.clientId}
        href={`/coach/${client.clientId}`}
        className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[10px] font-black text-red-300 transition hover:border-red-500/40"
      >
        {client.name} · {getFlagLabel(client.flags[0])}
      </Link>
    ))}
  </div>
)}

            <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/64">
              {missionSubtitle}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
  href={
    reviewQueueCount > 0
      ? "/coach/review"
      : pendingPBCount > 0
        ? "/coach/pbs/review"
        : unreadMessageCount > 0
          ? "/coach/messages"
          : "/coach/calendar"
  }
  className="inline-flex min-h-[36px] items-center justify-center rounded-[0.9rem] bg-smc-gold px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[0_0_26px_rgba(212,175,55,0.34)] transition hover:brightness-110 active:scale-[0.98]"
>
  {reviewQueueCount > 0
    ? "Start Review"
    : pendingPBCount > 0
      ? "Review PBs"
      : unreadMessageCount > 0
        ? "Open Messages"
        : "Open Calendar"}
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
                {reviewQueueCount}
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
                {reviewQueueCount}
              </p>
            </Link>

            <Link
  href="/coach/pbs/review"
  className={`${innerCard} min-h-[68px] bg-black/50 transition hover:border-smc-gold/40`}
>
  <p className="text-[8px] uppercase tracking-[0.18em] text-white/42">
    PBs
  </p>

  <p className="mt-1 text-xl font-black text-white">
    {pendingPBCount}
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


      <section className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-black p-3 shadow-[0_16px_38px_rgba(0,0,0,0.72)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/50 to-transparent" />

        <div className="relative z-10">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/85">
                Programme Planner
              </p>

              <h2 className="mt-1 text-base font-black text-white">
                Client Programme Progress
              </h2>

              <p className="mt-1 text-[11px] leading-4 text-white/42">
                Forecasts who needs numbers adding and who needs a new block.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="rounded-full border border-amber-400/25 bg-amber-400/12 px-2 py-0.5 text-[8px] font-black uppercase text-amber-200">
                {clientsNeedingNumbers} need numbers
              </span>

              <span className="rounded-full border border-red-500/25 bg-red-500/12 px-2 py-0.5 text-[8px] font-black uppercase text-red-300">
                {clientsNeedingProgrammes} need programmes
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[1rem] border border-white/[0.06] bg-black/40">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[1.25fr_repeat(4,0.8fr)_0.9fr] border-b border-white/[0.06] bg-white/[0.025]">
                <div className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/42">
                  Client
                </div>

                {programmeForecastWeeks.map((week) => (
  <div
    key={week.label}
    className={`px-2 py-2 text-center text-[8px] font-black uppercase tracking-[0.16em] ${
      week.tone === "current"
        ? "border-x border-smc-gold/25 bg-smc-gold/[0.08] text-smc-gold"
        : week.tone === "past"
          ? "bg-white/[0.015] text-white/24"
          : "bg-white/[0.025] text-white/38"
    }`}
  >
    <span className="block">{week.title}</span>
    <span className="mt-0.5 block text-[8px] opacity-75">{week.label}</span>
  </div>
))}

                <div className="px-3 py-2 text-right text-[8px] font-black uppercase tracking-[0.2em] text-white/42">
                  Block
                </div>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {programmeProgressRows.map((row) => (
                  <Link
                    key={row.client.id}
                    href={`/coach/${row.client.id}?tab=programme`}
                    className="grid grid-cols-[1.25fr_repeat(4,0.8fr)_0.9fr] items-center transition hover:bg-white/[0.025]"
                  >
                    <div className="min-w-0 px-3 py-2">
                      <p className="truncate text-[12px] font-black text-white">
                        {row.client.name}
                      </p>

                      <p className="mt-0.5 truncate text-[10px] text-white/32">
                        {row.activeProgramme?.title || "No active programme"}
                      </p>
                    </div>

                    {row.cells.map((cell, index) => {
  const week = programmeForecastWeeks[index]

  return (
    <div
      key={`${row.client.id}-${index}`}
      className={`px-1.5 py-2 ${
        week?.tone === "current"
          ? "border-x border-smc-gold/18 bg-smc-gold/[0.045]"
          : week?.tone === "past"
            ? "opacity-45"
            : "opacity-80"
      }`}
    >
      <div
        className={`flex min-h-[30px] items-center justify-center rounded-[0.75rem] border px-2 text-center text-[10px] font-black ${
          cell.tone === "red"
            ? "border-red-500/25 bg-red-500/12 text-red-300"
            : cell.tone === "yellow"
              ? "border-amber-400/25 bg-amber-400/12 text-amber-200"
              : week?.tone === "current"
                ? "border-green-500/30 bg-green-500/12 text-green-300 shadow-[0_0_18px_rgba(34,197,94,0.08)]"
                : "border-green-500/20 bg-green-500/10 text-green-300"
        }`}
      >
        <span className="truncate">
          {cell.label} {cell.icon}
        </span>
      </div>
    </div>
  )
})}

                    <div className="px-3 py-2 text-right">
                      {row.activeProgramme ? (
                        <>
                          <p className="text-[11px] font-black text-white">
                            {row.uploadedWeeks}/{row.plannedWeeks}
                          </p>

                          <p className="mt-0.5 text-[9px] text-white/32">
                            uploaded/planned
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] font-black text-red-300">
                          Missing
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-black p-3 shadow-[0_16px_38px_rgba(0,0,0,0.72)]">
  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/50 to-transparent" />

  <div className="relative z-10">
    <div className="mb-3">
      <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/85">
        Review Centre
      </p>

      <h2 className="mt-1 text-base font-black text-white">
        Action Queues
      </h2>
    </div>

    <div className="grid gap-2 md:grid-cols-3">
      <Link
        href="/coach/review"
        className={`${shellCard} block min-h-[96px] transition hover:border-smc-gold/35 hover:bg-white/[0.035]`}
      >
        <div className="relative z-10">
          <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/75">
            Reviews
          </p>

          <h2 className="mt-1.5 text-2xl font-black text-white">
            {reviewQueueCount}
          </h2>

          <p className="mt-1 text-[11px] leading-4 text-white/42">
            {newLogCount} logs · {newVideoCount} videos · {newCheckInCount} check-ins
          </p>
        </div>
      </Link>

      <Link
        href="/coach/pbs/review"
        className={`${shellCard} block min-h-[96px] transition hover:border-smc-gold/35 hover:bg-white/[0.035]`}
      >
        <div className="relative z-10">
          <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/75">
            PB Approvals
          </p>

          <h2 className="mt-1.5 text-2xl font-black text-white">
            {pendingPBCount}
          </h2>

          <p className="mt-1 text-[11px] leading-4 text-white/42">
            Estimated 1RM PBs awaiting community approval.
          </p>
        </div>
      </Link>

      <Link
        href="/coach/messages"
        className={`${shellCard} block min-h-[96px] transition hover:border-smc-gold/35 hover:bg-white/[0.035]`}
      >
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold/75">
              Messages
            </p>

            <h2 className="mt-1.5 text-2xl font-black text-white">
              <RealtimeUnreadMessageCount
                initialCount={unreadMessageCount}
                currentUserId={user.id}
                mode="coach"
                variant="number"
              />
            </h2>

            <p className="mt-1 text-[11px] leading-4 text-white/42">
              Unread coach messages.
            </p>
          </div>
        </div>
      </Link>
    </div>
  </div>
</section>

      {coachAttentionItems.length > 0 && (
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
                {coachAttentionItems.length} flagged
              </Link>
            </div>

            <div className="grid gap-2 lg:grid-cols-2">
              {coachAttentionItems.slice(0, 6).map((client) => (
                <Link
                  key={client.clientId}
                  href={`/coach/${client.clientId}`}
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
                          {client.summary}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
  {client.flags?.map((flag: string) => (
    <span
      key={flag}
      className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300"
    >
      {flag}
    </span>
  ))}
</div>
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