import {
  getProgrammeWeeksElapsed,
} from "./dates"

import {
  getProgrammeWeekNumbers,
  getSessionsForWeek,
} from "./sessions"

import type {
  ProgrammeProgress,
  ProgrammeRecord,
  ProgrammeSession,
  ProgrammeWeekInput,
} from "./types"

export function getCurrentProgramme(
  programmes?: ProgrammeRecord[] | null
) {
  if (!programmes?.length) return null

  return (
    programmes.find(
      (programme) => programme.is_active
    ) ||
    programmes[0] ||
    null
  )
}

export function getEffectiveProgrammeWeek({
  programmeStartDate,
  coachCurrentWeek,
  sessions,
  completedSessionIds,
  now = new Date(),
}: ProgrammeWeekInput) {
  const weeks = getProgrammeWeekNumbers(sessions)

  if (!weeks.length) return 1

  const minWeek = weeks[0]
  const maxWeek = weeks[weeks.length - 1]

  const weeksElapsed =
    getProgrammeWeeksElapsed({
      programmeStartDate,
      now,
    })

  const dateBasedWeek = Math.min(
    minWeek + weeksElapsed,
    maxWeek
  )

  let completionBasedWeek = minWeek

  for (const week of weeks) {
    const weekSessions = getSessionsForWeek(
      sessions,
      week
    )

    const weekComplete =
      weekSessions.length > 0 &&
      weekSessions.every((session) =>
        completedSessionIds.has(session.id)
      )

    if (!weekComplete) break

    completionBasedWeek =
      week < maxWeek ? week + 1 : maxWeek
  }

  const coachOverrideWeek =
    coachCurrentWeek !== null &&
    coachCurrentWeek !== undefined &&
    Number.isFinite(Number(coachCurrentWeek))
      ? Math.min(
          Math.max(
            Number(coachCurrentWeek),
            minWeek
          ),
          maxWeek
        )
      : minWeek

  return Math.min(
    Math.max(
      dateBasedWeek,
      completionBasedWeek,
      coachOverrideWeek
    ),
    maxWeek
  )
}

export function getProgrammeProgress({
  sessions,
  completedSessionIds,
}: {
  sessions: ProgrammeSession[]
  completedSessionIds: Set<string>
}): ProgrammeProgress {
  const totalCount = sessions.length

  const completedCount = sessions.filter(
    (session) =>
      completedSessionIds.has(session.id)
  ).length

  const remainingCount = Math.max(
    totalCount - completedCount,
    0
  )

  const percentage =
    totalCount > 0
      ? Math.round(
          (completedCount / totalCount) * 100
        )
      : 0

  return {
    completedCount,
    totalCount,
    remainingCount,
    percentage,
    complete:
      totalCount > 0 &&
      completedCount >= totalCount,
  }
}

export function getNextProgrammeSession({
  sessions,
  currentWeek,
  completedSessionIds,
  scheduledSessionIds = [],
}: {
  sessions: ProgrammeSession[]
  currentWeek: number
  completedSessionIds: Set<string>
  scheduledSessionIds?: string[]
}) {
  const scheduledSessions =
    scheduledSessionIds
      .map((sessionId) =>
        sessions.find(
          (session) => session.id === sessionId
        )
      )
      .filter(
        (
          session
        ): session is ProgrammeSession =>
          Boolean(session)
      )

  return (
    scheduledSessions.find(
      (session) =>
        !completedSessionIds.has(session.id)
    ) ||
    sessions.find(
      (session) =>
        Number(session.week_number || 1) ===
          Number(currentWeek) &&
        !completedSessionIds.has(session.id)
    ) ||
    sessions.find(
      (session) =>
        !completedSessionIds.has(session.id)
    ) ||
    sessions[0] ||
    null
  )
}