export type ProgrammeSession = {
  id: string
  week_number?: number | null
  day?: string | null
  title?: string | null
  exercises?: unknown[]
}

export type ProgrammeRecord = {
  id: string
  user_id?: string | null
  title?: string | null
  notes?: string | null
  week_number?: number | null
  planned_weeks?: number | null
  start_date?: string | null
  end_date?: string | null
  created_at?: string | null
  coach_current_week?: number | null
  is_active?: boolean | null
  programme_sessions?: ProgrammeSession[] | null
}

export type ProgrammeWeekInput = {
  programmeStartDate?: string | null
  coachCurrentWeek?: number | null
  sessions: ProgrammeSession[]
  completedSessionIds: Set<string>
  now?: Date
}

export type ProgrammeProgress = {
  completedCount: number
  totalCount: number
  remainingCount: number
  percentage: number
  complete: boolean
}