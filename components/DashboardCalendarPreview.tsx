import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

type ActivityType = "planned" | "workout" | "checkIn" | "pb"

type ActivityMap = Record<
  string,
  { 
    planned: boolean
    workout: boolean
    checkIn: boolean
    pb: boolean
  }
>

const previewCard =
  "relative overflow-hidden rounded-[1.35rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] p-3 shadow-[0_14px_34px_rgba(0,0,0,0.66)]"

function getMonthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function getMonthEnd(monthStart: Date) {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getDateKeyFromTimestamp(timestamp: string) {
  const date = new Date(timestamp)
  return formatDateKey(date)
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
}

function buildMiniMonthDays(monthStart: Date) {
  const firstDay = new Date(monthStart)
  const calendarStart = new Date(firstDay)
  const dayOfWeek = calendarStart.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  calendarStart.setDate(calendarStart.getDate() + mondayOffset)

  const days = []

  for (let index = 0; index < 35; index++) {
    const date = new Date(calendarStart)
    date.setDate(calendarStart.getDate() + index)

    days.push({
      date,
      key: formatDateKey(date),
      dayNumber: date.getDate(),
      isCurrentMonth:
        date.getMonth() === monthStart.getMonth() &&
        date.getFullYear() === monthStart.getFullYear(),
      isToday: formatDateKey(date) === formatDateKey(new Date()),
    })
  }

  return days
}

function addActivity(
  activityMap: ActivityMap,
  timestamp: string,
  type: ActivityType
) {
  const key = getDateKeyFromTimestamp(timestamp)

  if (!activityMap[key]) {
    activityMap[key] = {
  planned: false,
  workout: false,
  checkIn: false,
  pb: false,
}
  }

  activityMap[key][type] = true
}

function ActivityDot({
  activity,
}: {
  activity?: {
    planned: boolean
    workout: boolean
    checkIn: boolean
    pb: boolean
  }
}) {
  if (!activity) return null

  const colours = []

  if (activity.planned && !activity.workout) colours.push("#ffffff66")
if (activity.workout) colours.push("#34d399")
  if (activity.checkIn) colours.push("#60a5fa")
  if (activity.pb) colours.push("#d4af37")

  if (colours.length === 0) return null

  if (colours.length === 1) {
    return (
      <span
        className="mt-1 h-2 w-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.14)]"
        style={{ backgroundColor: colours[0] }}
      />
    )
  }

  if (colours.length === 2) {
    return (
      <span
        className="mt-1 h-2 w-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.14)]"
        style={{
          background: `linear-gradient(90deg, ${colours[0]} 0 50%, ${colours[1]} 50% 100%)`,
        }}
      />
    )
  }

  return (
    <span
      className="mt-1 h-2 w-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.14)]"
      style={{
        background: `conic-gradient(${colours[0]} 0deg 120deg, ${colours[1]} 120deg 240deg, ${colours[2]} 240deg 360deg)`,
      }}
    />
  )
}

export default async function DashboardCalendarPreview() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const monthStart = getMonthStart()
  const monthEnd = getMonthEnd(monthStart)

  const monthStartIso = monthStart.toISOString()
  const monthEndIso = monthEnd.toISOString()

  const [
  { data: plannedSessions },
  { data: sessionCompletions },
  { data: checkIns },
  { data: pbs },
] = await Promise.all([

      supabase
  .from("client_weekly_session_schedule")
  .select("id, session_id, planned_date")
  .eq("user_id", user.id)
  .gte("planned_date", monthStartIso)
  .lt("planned_date", monthEndIso),

      supabase
        .from("session_completions")
        .select("id, session_id, created_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("created_at", monthStartIso)
        .lt("created_at", monthEndIso),

      supabase
        .from("check_ins")
        .select("id, created_at")
        .eq("user_id", user.id)
        .gte("created_at", monthStartIso)
        .lt("created_at", monthEndIso),

      supabase
        .from("exercise_pbs")
        .select("id, created_at")
        .eq("user_id", user.id)
        .gte("created_at", monthStartIso)
        .lt("created_at", monthEndIso),
    ])

  const activityMap: ActivityMap = {}

  ;(plannedSessions || []).forEach((planned: any) => {
  addActivity(activityMap, planned.planned_date, "planned")
})

  ;(sessionCompletions || []).forEach((completion: any) => {
    addActivity(activityMap, completion.created_at, "workout")
  })

  ;(checkIns || []).forEach((checkIn: any) => {
    addActivity(activityMap, checkIn.created_at, "checkIn")
  })

  ;(pbs || []).forEach((pb: any) => {
    addActivity(activityMap, pb.created_at, "pb")
  })

  const days = buildMiniMonthDays(monthStart)

  return (
    <section className={previewCard}>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[54%] bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.13),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/30 to-transparent" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.24em] text-smc-gold">
              Calendar
            </p>

            <h2 className="mt-1 text-[1.05rem] font-black tracking-[-0.04em] text-smc-text">
              {getMonthLabel(monthStart)}
            </h2>
          </div>

          <Link
            href="/dashboard/calendar"
            className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-smc-gold transition active:scale-[0.98]"
          >
            Open for more details
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <div
              key={`${day}-${index}`}
              className="text-center text-[8px] font-black uppercase tracking-[0.16em] text-white/25"
            >
              {day}
            </div>
          ))}

          {days.map((day) => {
            const activity = activityMap[day.key]

            return (
              <Link
                key={day.key}
                href="/dashboard/calendar"
                className={`flex min-h-[34px] flex-col items-center justify-start rounded-[0.75rem] border px-1 py-1.5 transition active:scale-[0.98] ${
                  day.isToday
                    ? "border-smc-gold/35 bg-smc-gold/10"
                    : day.isCurrentMonth
                      ? "border-white/[0.05] bg-black/24"
                      : "border-white/[0.02] bg-white/[0.01]"
                }`}
              >
                <span
                  className={`text-[9px] font-black ${
                    day.isCurrentMonth ? "text-white/65" : "text-white/18"
                  } ${day.isToday ? "text-smc-gold" : ""}`}
                >
                  {day.dayNumber}
                </span>

                <ActivityDot activity={activity} />
              </Link>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
            <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/40" />
                 <span className="text-[9px] text-white/40">Planned</span>
            </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-white/40">Workout</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="text-[9px] text-white/40">Check-in</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-smc-gold" />
            <span className="text-[9px] text-white/40">PB</span>
          </div>
        </div>
      </div>
    </section>
  )
}
