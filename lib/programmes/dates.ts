const DAY_IN_MS = 1000 * 60 * 60 * 24
const WEEK_IN_MS = DAY_IN_MS * 7

export function parseProgrammeDate(
  value?: string | Date | null
): Date | null {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value)
  }

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/

  const parsed = dateOnlyPattern.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function startOfLocalDay(
  value?: string | Date | null
): Date {
  const parsed = parseProgrammeDate(value) || new Date()

  parsed.setHours(0, 0, 0, 0)

  return parsed
}

export function startOfProgrammeWeek(
  value?: string | Date | null
): Date {
  const date = startOfLocalDay(value)

  const day = date.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1

  date.setDate(date.getDate() - daysFromMonday)

  return date
}

export function getProgrammeWeeksElapsed({
  programmeStartDate,
  now = new Date(),
}: {
  programmeStartDate?: string | null
  now?: Date
}) {
  const programmeWeekStart = startOfProgrammeWeek(
    programmeStartDate
  )

  const currentWeekStart = startOfProgrammeWeek(now)

  return Math.max(
    0,
    Math.floor(
      (currentWeekStart.getTime() -
        programmeWeekStart.getTime()) /
        WEEK_IN_MS
    )
  )
}

export function calculateProgrammeEndDate({
  startDate,
  plannedWeeks,
}: {
  startDate?: string | null
  plannedWeeks?: number | null
}) {
  const parsedStart = parseProgrammeDate(startDate)
  const weeks = Number(plannedWeeks)

  if (
    !parsedStart ||
    !Number.isFinite(weeks) ||
    weeks < 1
  ) {
    return null
  }

  const endDate = new Date(parsedStart)

  endDate.setDate(
    endDate.getDate() + weeks * 7 - 1
  )

  return [
    endDate.getFullYear(),
    String(endDate.getMonth() + 1).padStart(2, "0"),
    String(endDate.getDate()).padStart(2, "0"),
  ].join("-")
}

export function isProgrammeExpired({
  endDate,
  now = new Date(),
}: {
  endDate?: string | null
  now?: Date
}) {
  const parsedEndDate = parseProgrammeDate(endDate)

  if (!parsedEndDate) return false

  parsedEndDate.setHours(23, 59, 59, 999)

  return parsedEndDate.getTime() < now.getTime()
}