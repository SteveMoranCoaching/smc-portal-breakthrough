import type {
  ProgrammeSession,
} from "./types"

export function getSessionDayOrder(
  day?: string | null
) {
  const match = String(day || "").match(/\d+/)

  return match ? Number(match[0]) : 999
}

export function sortProgrammeSessions(
  sessions: ProgrammeSession[]
) {
  return [...sessions].sort((a, b) => {
    const weekA = Number(a.week_number || 1)
    const weekB = Number(b.week_number || 1)

    if (weekA !== weekB) {
      return weekA - weekB
    }

    return (
      getSessionDayOrder(a.day) -
      getSessionDayOrder(b.day)
    )
  })
}

export function getProgrammeWeekNumbers(
  sessions: ProgrammeSession[]
) {
  return Array.from(
    new Set(
      sessions
        .map((session) =>
          Number(session.week_number || 1)
        )
        .filter(
          (week) =>
            Number.isFinite(week) && week > 0
        )
    )
  ).sort((a, b) => a - b)
}

export function groupProgrammeSessionsByWeek(
  sessions: ProgrammeSession[]
) {
  return sortProgrammeSessions(sessions).reduce(
    (
      grouped: Record<number, ProgrammeSession[]>,
      session
    ) => {
      const weekNumber = Number(
        session.week_number || 1
      )

      if (!grouped[weekNumber]) {
        grouped[weekNumber] = []
      }

      grouped[weekNumber].push(session)

      return grouped
    },
    {}
  )
}

export function getUploadedProgrammeWeekCount(
  sessions: ProgrammeSession[]
) {
  const weeks = getProgrammeWeekNumbers(sessions)

  return weeks.length
    ? Math.max(...weeks)
    : 0
}

export function getSessionsForWeek(
  sessions: ProgrammeSession[],
  weekNumber: number
) {
  return sessions.filter(
    (session) =>
      Number(session.week_number || 1) ===
      Number(weekNumber)
  )
}