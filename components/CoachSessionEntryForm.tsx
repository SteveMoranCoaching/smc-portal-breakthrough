"use client"

import { useMemo, useState } from "react"
import WorkoutSessionForm from "@/components/WorkoutSessionForm"

type ProgrammeSession = {
  id: string
  week_number?: number | null
  day?: string | null
  title?: string | null
  exercises?: any[] | null
}

type Programme = {
  id: string
  title?: string | null
  is_active?: boolean | null
  programme_sessions?: ProgrammeSession[] | null
}

type CoachSavePayload = {
  clientId: string
  programmeId: string
  sessionId: string
  entries: any[]
  sessionRating?: string
  sessionNotes?: string
}

const card =
  "relative overflow-hidden rounded-[1.45rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] shadow-[0_16px_38px_rgba(0,0,0,0.62)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

function getDayOrder(day?: string | null) {
  const match = String(day || "").match(/\d+/)

  return match ? Number(match[0]) : 999
}

function sortSessions(sessions: ProgrammeSession[] = []) {
  return [...sessions].sort((a, b) => {
    const weekA = Number(a.week_number || 1)
    const weekB = Number(b.week_number || 1)

    if (weekA !== weekB) return weekA - weekB

    return getDayOrder(a.day) - getDayOrder(b.day)
  })
}

export default function CoachSessionEntryForm({
  clientId,
  userId,
  programmes,
  previousLogs = [],
  exerciseDemos = [],
  onCoachSave,
}: {
  clientId: string
  userId: string
  programmes: Programme[]
  previousLogs?: any[]
  exerciseDemos?: any[]
  onCoachSave: (payload: CoachSavePayload) => Promise<any>
}) {
  const sortedProgrammes = useMemo(
    () =>
      [...programmes].sort((a, b) => {
        if (a.is_active && !b.is_active) return -1
        if (!a.is_active && b.is_active) return 1
        return 0
      }),
    [programmes]
  )

  const [programmeId, setProgrammeId] = useState(
    sortedProgrammes[0]?.id || ""
  )

  const selectedProgramme =
    sortedProgrammes.find((programme) => programme.id === programmeId) ||
    sortedProgrammes[0]

  const sortedSessions = useMemo(
    () => sortSessions(selectedProgramme?.programme_sessions || []),
    [selectedProgramme]
  )

  const [sessionId, setSessionId] = useState(
    sortedSessions[0]?.id || ""
  )

  const selectedSession =
    sortedSessions.find((session) => session.id === sessionId) ||
    sortedSessions[0]

  function handleProgrammeChange(nextProgrammeId: string) {
    const nextProgramme =
      sortedProgrammes.find(
        (programme) => programme.id === nextProgrammeId
      ) || sortedProgrammes[0]

    const nextSessions = sortSessions(
      nextProgramme?.programme_sessions || []
    )

    setProgrammeId(nextProgrammeId)
    setSessionId(nextSessions[0]?.id || "")
  }

  return (
    <div className="space-y-4">
      <section className={`${card} p-4 sm:p-5`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent" />

        <div className="relative z-10 space-y-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
              Session Setup
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              Choose Programme & Session
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                Programme
              </label>

              <select
                value={programmeId}
                onChange={(event) =>
                  handleProgrammeChange(event.target.value)
                }
                className="min-h-[46px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none focus:border-smc-gold/45"
              >
                {sortedProgrammes.map((programme) => (
                  <option key={programme.id} value={programme.id}>
                    {programme.title || "Untitled programme"}
                    {programme.is_active ? " — Active" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                Session
              </label>

              <select
                value={sessionId}
                onChange={(event) =>
                  setSessionId(event.target.value)
                }
                className="min-h-[46px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none focus:border-smc-gold/45"
              >
                {sortedSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    Week {session.week_number || 1} ·{" "}
                    {session.day || "Session"} ·{" "}
                    {session.title || "Untitled"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedSession && (
            <div className="rounded-[1rem] border border-smc-gold/15 bg-smc-gold/[0.06] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold/75">
                Selected
              </p>

              <p className="mt-1 text-sm font-bold text-white">
                Week {selectedSession.week_number || 1} ·{" "}
                {selectedSession.day || "Session"} ·{" "}
                {selectedSession.title || "Untitled session"}
              </p>
            </div>
          )}
        </div>
      </section>

      {selectedSession ? (
        <WorkoutSessionForm
          key={`${programmeId}-${selectedSession.id}`}
          session={selectedSession}
          programmeId={programmeId}
          userId={userId}
          previousLogs={previousLogs}
          exerciseDemos={exerciseDemos}
          existingLogs={[]}
          mode="coach"
          coachClientId={clientId}
          onCoachSave={onCoachSave}
        />
      ) : (
        <section className={`${card} p-4 sm:p-5`}>
          <p className="text-sm font-bold text-white/50">
            No sessions found in this programme.
          </p>
        </section>
      )}
    </div>
  )
}