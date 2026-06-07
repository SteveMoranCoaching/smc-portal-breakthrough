import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

const glassCard =
  "relative overflow-hidden rounded-[1.55rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] shadow-[0_14px_34px_rgba(0,0,0,0.66)]"

const labelStyle =
  "text-[8px] font-semibold uppercase tracking-[0.24em] text-smc-gold"

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

function getSelectedDateLabel(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function buildCalendarDays(monthStart: Date) {
  const firstDay = new Date(monthStart)
  const monthEnd = getMonthEnd(monthStart)

  const calendarStart = new Date(firstDay)
  const dayOfWeek = calendarStart.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  calendarStart.setDate(calendarStart.getDate() + mondayOffset)

  const days = []

  for (let index = 0; index < 42; index++) {
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

  return {
    days,
    monthEnd,
  }
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
        className="mt-1 h-2.5 w-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.18)]"
        style={{ backgroundColor: colours[0] }}
      />
    )
  }

  if (colours.length === 2) {
    return (
      <span
        className="mt-1 h-2.5 w-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.18)]"
        style={{
          background: `linear-gradient(90deg, ${colours[0]} 0 50%, ${colours[1]} 50% 100%)`,
        }}
      />
    )
  }

  return (
    <span
      className="mt-1 h-2.5 w-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.18)]"
      style={{
        background: `conic-gradient(${colours[0]} 0deg 120deg, ${colours[1]} 120deg 240deg, ${colours[2]} 240deg 360deg)`,
      }}
    />
  )
}

function LegendItem({
  colourClass,
  label,
}: {
  colourClass: string
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${colourClass}`} />
      <span className="text-[11px] text-white/50">{label}</span>
    </div>
  )
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const params = await searchParams
  const selectedDate = params?.date || formatDateKey(new Date())

  const monthStart = getMonthStart()
  const { days, monthEnd } = buildCalendarDays(monthStart)

  const monthStartIso = monthStart.toISOString()
  const monthEndIso = monthEnd.toISOString()

  const [
    { data: sessionCompletions, error: completionError },
    { data: checkIns, error: checkInError },
    { data: pbs, error: pbError },
{ data: plannedSessions, error: plannedError },
  ] = await Promise.all([
    supabase
      .from("session_completions")
      .select("id, session_id, created_at")
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("created_at", monthStartIso)
      .lt("created_at", monthEndIso),

    supabase
  .from("check_ins")
  .select(`
    id,
    created_at,
    bodyweight,
    training_rating,
    recovery_rating,
    nutrition_rating,
    cardio_steps,
    notes,
    coach_feedback
  `)
  .eq("user_id", user.id)
  .gte("created_at", monthStartIso)
  .lt("created_at", monthEndIso),

    supabase
      .from("exercise_pbs")
      .select("id, exercise_name, pb_type, weight, reps, estimated_1rm, created_at")
      .eq("user_id", user.id)
      .gte("created_at", monthStartIso)
      .lt("created_at", monthEndIso),

    supabase
  .from("client_weekly_session_schedule")
  .select("id, session_id, planned_date")
  .eq("user_id", user.id)
  .gte("planned_date", monthStartIso)
  .lt("planned_date", monthEndIso),  
  ])

  if (completionError || checkInError || pbError || plannedError) {
    throw new Error("Calendar failed to load")
  }

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

  const completedWorkoutDays = Object.values(activityMap).filter(
    (activity) => activity.workout
  ).length

  const checkInDays = Object.values(activityMap).filter(
    (activity) => activity.checkIn
  ).length

  const pbDays = Object.values(activityMap).filter((activity) => activity.pb)
    .length

  const selectedWorkouts = (sessionCompletions || []).filter(
    (item: any) => getDateKeyFromTimestamp(item.created_at) === selectedDate
  )

  const selectedSessionIds = selectedWorkouts.map((item: any) => item.session_id)

const { data: selectedSessions } =
  selectedSessionIds.length > 0
    ? await supabase
        .from("programme_sessions")
        .select("id, week_number, day, title")
        .in("id", selectedSessionIds)
    : { data: [] }

const selectedWorkoutDetails = selectedWorkouts.map((workout: any) => {
  const session = selectedSessions?.find(
    (item: any) => item.id === workout.session_id
  )

  return {
    ...workout,
    session,
  }
})

  const selectedCheckIns = (checkIns || []).filter(
    (item: any) => getDateKeyFromTimestamp(item.created_at) === selectedDate
  )

  const selectedPBs = (pbs || []).filter(
    (item: any) => getDateKeyFromTimestamp(item.created_at) === selectedDate
  )

  return (
    <div className="flex flex-col gap-3 pb-4">
      <section className={glassCard}>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[64%] bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.16),transparent_46%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

        <div className="relative z-10 p-4">
          <p className={labelStyle}>SMC Activity</p>

          <h1 className="mt-2 text-[1.55rem] font-black leading-tight tracking-[-0.055em] text-smc-text">
            Training Calendar
          </h1>

          <p className="mt-2 text-xs leading-5 text-smc-muted">
            See your month at a glance. Split dots mean multiple wins landed on
            the same day.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-[1rem] border border-white/[0.06] bg-black/35 p-3 text-center">
              <p className="text-lg font-black text-white">
                {completedWorkoutDays}
              </p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-white/35">
                Workouts
              </p>
            </div>

            <div className="rounded-[1rem] border border-white/[0.06] bg-black/35 p-3 text-center">
              <p className="text-lg font-black text-white">{checkInDays}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-white/35">
                Check-ins
              </p>
            </div>

            <div className="rounded-[1rem] border border-white/[0.06] bg-black/35 p-3 text-center">
              <p className="text-lg font-black text-white">{pbDays}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-white/35">
                PB Days
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${glassCard} p-3.5`}>
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={labelStyle}>Month View</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-white">
                {getMonthLabel(monthStart)}
              </h2>
            </div>

            <Link
              href="/dashboard/workouts"
              className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-smc-gold transition active:scale-[0.98]"
            >
              Plan week
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            <LegendItem colourClass="bg-white/40" label="Planned" />
            <LegendItem colourClass="bg-emerald-400" label="Workout" />
            <LegendItem colourClass="bg-blue-400" label="Check-in" />
            <LegendItem colourClass="bg-smc-gold" label="PB" />
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="py-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/30"
              >
                {day}
              </div>
            ))}

            {days.map((day) => {
              const activity = activityMap[day.key]

              return (
                <Link
                  href={`/dashboard/calendar?date=${day.key}`}
                  key={day.key}
                  className={`flex min-h-[48px] flex-col items-center justify-start rounded-[1rem] border px-1.5 py-2 transition active:scale-[0.98] ${
                    day.key === selectedDate
                      ? "border-smc-gold/55 bg-smc-gold/15"
                      : day.isToday
                        ? "border-smc-gold/35 bg-smc-gold/10"
                        : day.isCurrentMonth
                          ? "border-white/[0.055] bg-black/28"
                          : "border-white/[0.025] bg-white/[0.015]"
                  }`}
                >
                  <span
                    className={`text-[11px] font-black ${
                      day.isCurrentMonth ? "text-white/75" : "text-white/20"
                    } ${day.isToday || day.key === selectedDate ? "text-smc-gold" : ""}`}
                  >
                    {day.dayNumber}
                  </span>

                  <ActivityDot activity={activity} />
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className={`${glassCard} p-3.5`}>
        <div className="relative z-10">
          <p className={labelStyle}>Selected Day</p>

          <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-white">
            {getSelectedDateLabel(selectedDate)}
          </h2>

          <div className="mt-4 flex flex-col gap-2">
            {selectedWorkoutDetails.length > 0 && (
  <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
    <p className="text-sm font-bold text-emerald-400">
      🟢 Workout Completed
    </p>

    <div className="mt-2 flex flex-col gap-1">
      {selectedWorkoutDetails.map((workout: any) => (
        <p key={workout.id} className="text-xs text-white/60">
          Week {workout.session?.week_number || "—"} ·{" "}
          {workout.session?.day || "Session"} ·{" "}
          {workout.session?.title || "Workout"} completed
        </p>
      ))}
    </div>
  </div>
)}

            {selectedCheckIns.length > 0 &&
  selectedCheckIns.map((checkIn: any) => (
    <div
      key={checkIn.id}
      className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3"
    >
      <p className="text-sm font-bold text-blue-400">
        🔵 Weekly Check-in
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/70">
        <div>
          <span className="text-white/40">Bodyweight</span>
          <p>{checkIn.bodyweight || "-"}kg</p>
        </div>

        <div>
          <span className="text-white/40">Training</span>
          <p>{checkIn.training_rating || "-"}/10</p>
        </div>

        <div>
          <span className="text-white/40">Recovery</span>
          <p>{checkIn.recovery_rating || "-"}/10</p>
        </div>

        <div>
          <span className="text-white/40">Nutrition</span>
          <p>{checkIn.nutrition_rating || "-"}/10</p>
        </div>
      </div>

      {checkIn.cardio_steps && (
        <div className="mt-3">
          <p className="text-[11px] text-white/40">
            Steps / Cardio
          </p>
          <p className="text-xs text-white/70">
            {checkIn.cardio_steps}
          </p>
        </div>
      )}

      {checkIn.notes && (
        <div className="mt-3">
          <p className="text-[11px] text-white/40">
            Client Notes
          </p>
          <p className="text-xs text-white/70">
            {checkIn.notes}
          </p>
        </div>
      )}

      {checkIn.coach_feedback && (
        <div className="mt-3 rounded-lg bg-white/[0.03] p-2">
          <p className="text-[11px] text-white/40">
            Coach Feedback
          </p>
          <p className="text-xs text-white/70">
            {checkIn.coach_feedback}
          </p>
        </div>
      )}
    </div>
  ))}

            {selectedPBs.length > 0 && (
  <div className="rounded-xl border border-smc-gold/20 bg-smc-gold/5 p-3">
    <p className="text-sm font-bold text-smc-gold">
      🟡 PB Achieved
    </p>

    <div className="mt-2 flex flex-col gap-1">
      {selectedPBs.map((pb: any) => (
        <p key={pb.id} className="text-xs text-white/60">
          {pb.exercise_name} ·{" "}
          {pb.weight ? `${pb.weight}kg` : ""}
          {pb.reps ? ` x ${pb.reps}` : ""}
          {pb.estimated_1rm
            ? ` · est. ${Math.round(pb.estimated_1rm)}kg`
            : ""}
        </p>
      ))}
    </div>
  </div>
)}

            {!selectedWorkouts.length &&
              !selectedCheckIns.length &&
              !selectedPBs.length && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm text-white/40">
                    No activity recorded for this day.
                  </p>
                </div>
              )}
          </div>
        </div>
      </section>
    </div>
  )
}
