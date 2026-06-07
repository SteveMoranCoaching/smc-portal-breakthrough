"use client"

import { useState } from "react"

type Session = {
  id: string
  title: string
}

type ScheduleItem = {
  session_id: string
  planned_date: string
  planned_order: number
}

type Props = {
  programmeId: string
  weekNumber: number
  sessions: Session[]
  existingSchedule: ScheduleItem[]
  completedSessionIds: string[]
}

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

export default function WeeklyWorkoutPlanner({
  programmeId,
  weekNumber,
  sessions,
  existingSchedule,
  completedSessionIds,
}: Props) {
  const initialState: Record<string, string> = {}

  days.forEach((day) => {
    initialState[day] = ""
  })

  existingSchedule.forEach((item) => {
    const dayIndex = Number(item.planned_order) - 1
    const day = days[dayIndex]

    if (day) {
      initialState[day] = item.session_id
    }
  })

  const [schedule, setSchedule] = useState(initialState)
  const [saving, setSaving] = useState(false)

  async function saveSchedule() {
    setSaving(true)

    const scheduleRows = days
      .map((day, index) => ({
        day,
        dayIndex: index,
        sessionId: schedule[day],
      }))
      .filter((item) => item.sessionId)

    const response = await fetch("/api/workout-schedule/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        programmeId,
        weekNumber,
        scheduleRows,
      }),
    })

    const result = await response.json()

    setSaving(false)

    if (!response.ok) {
      alert(result.error || "Schedule save failed")
      return
    }

    window.location.reload()
  }

  function getStatusForDay(day: string) {
    const selectedSessionId = schedule[day]

    if (!selectedSessionId) return null

    const completed = completedSessionIds.includes(selectedSessionId)

    return completed ? "completed" : "planned"
  }

  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-black/30 p-4">
      <h2 className="text-base font-black text-white">This Week</h2>

      <p className="mt-1 text-xs text-white/50">
        Choose which session you plan to perform each day.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {days.map((day) => {
          const status = getStatusForDay(day)

          return (
            <div key={day}>
              <p className="mb-1 text-xs font-bold text-smc-gold">{day}</p>

              <div className="flex items-center gap-3">
                <select
                  value={schedule[day]}
                  onChange={(event) =>
                    setSchedule({
                      ...schedule,
                      [day]: event.target.value,
                    })
                  }
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
                >
                  <option value="">None</option>

                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                  ))}
                </select>

                {status === "completed" ? (
                  <div className="flex min-w-[86px] items-center justify-end gap-2 whitespace-nowrap">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-medium text-white/60">
                      Completed
                    </span>
                  </div>
                ) : status === "planned" ? (
                  <div className="flex min-w-[86px] items-center justify-end gap-2 whitespace-nowrap">
                    <div className="h-2.5 w-2.5 rounded-full bg-white/25" />
                    <span className="text-[11px] text-white/45">
                      Planned
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={saveSchedule}
        disabled={saving}
        className="mt-4 w-full rounded-xl bg-smc-gold py-3 text-sm font-black text-black disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Weekly Plan"}
      </button>
    </section>
  )
}
