"use client"

import { useMemo, useState } from "react"

type Exercise = {
  name?: string
  prescription?: string
  sets?: string | number
  reps?: string | number
}

type ProgrammeSession = {
  id: string
  week_number?: number | null
  day?: string | null
  title?: string | null
  exercises?: Exercise[] | null
}

type Programme = {
  id: string
  title?: string | null
  is_active?: boolean | null
  programme_sessions?: ProgrammeSession[] | null
}

type SetEntry = {
  weight: string
  reps: string
  rpe: string
}

type ExerciseEntry = {
  exerciseName: string
  prescription: string
  notes: string
  sets: SetEntry[]
}

type PreviousPerformanceSet = {
  weight: number
  reps: number
  rpe: string
  estimated1RM: number
}

function getDayOrder(day?: string | null) {
  const match = String(day || "").match(/\d+/)
  return match ? Number(match[0]) : 999
}

function inferSetCount(exercise: Exercise) {
  const directSets = Number(exercise.sets)

  if (Number.isFinite(directSets) && directSets > 0) {
    return Math.min(directSets, 12)
  }

  const prescription = String(exercise.prescription || "")

  const match = prescription.match(/(\d+)\s*x\s*\d+/i)

  if (match?.[1]) {
    return Math.min(Number(match[1]), 12)
  }

  return 1
}

function inferReps(exercise: Exercise) {
  if (exercise.reps) return String(exercise.reps)

  const prescription = String(exercise.prescription || "")
  const match = prescription.match(/\d+\s*x\s*(\d+)/i)

  return match?.[1] || ""
}

function toNumber(value: string | number | null | undefined) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function estimateOneRM(weight: number, reps: number) {
  if (!weight || !reps) return 0
  return Math.round(weight * (1 + reps / 30))
}

function formatLogDate(dateString?: string | null) {
  if (!dateString) return "No date"

  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}

function getPreviousLogForExercise(previousLogs: any[], exerciseName: string) {
  return previousLogs.find(
    (log) =>
      String(log.exercise_name || "").toLowerCase().trim() ===
      String(exerciseName || "").toLowerCase().trim()
  )
}

function getPreviousPerformance(previousLog: any) {
  const sets = Array.isArray(previousLog?.sets_completed)
    ? previousLog.sets_completed
    : []

  const parsedSets: PreviousPerformanceSet[] = sets
    .map((set: SetEntry) => {
      const weight = toNumber(set.weight)
      const reps = toNumber(set.reps)

      return {
        weight,
        reps,
        rpe: set.rpe || "",
        estimated1RM: estimateOneRM(weight, reps),
      }
    })
    .filter((set: PreviousPerformanceSet) => set.weight > 0 && set.reps > 0)

  if (parsedSets.length === 0) return null

  const bestSet = parsedSets.reduce((best, set) =>
    set.estimated1RM > best.estimated1RM ? set : best
  )

  return {
    date: formatLogDate(previousLog?.created_at),
    setCount: parsedSets.length,
    bestSet,
  }
}

function buildEntries(session?: ProgrammeSession | null): ExerciseEntry[] {
  return (session?.exercises || []).map((exercise) => {
    const setCount = inferSetCount(exercise)
    const inferredReps = inferReps(exercise)

    return {
      exerciseName: exercise.name || "Unnamed exercise",
      prescription: exercise.prescription || "",
      notes: "",
      sets: Array.from({ length: setCount }, () => ({
        weight: "",
        reps: inferredReps,
        rpe: "",
      })),
    }
  })
}

export default function CoachSessionEntryForm({
  clientId,
  programmes,
  previousLogs = [],
  action,
}: {
  clientId: string
  programmes: Programme[]
  previousLogs?: any[]
  action: (formData: FormData) => void
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

  const [programmeId, setProgrammeId] = useState(sortedProgrammes[0]?.id || "")

  const selectedProgramme =
    sortedProgrammes.find((programme) => programme.id === programmeId) ||
    sortedProgrammes[0]

  const sortedSessions = useMemo(() => {
    return [...(selectedProgramme?.programme_sessions || [])].sort((a, b) => {
      const weekA = Number(a.week_number || 1)
      const weekB = Number(b.week_number || 1)

      if (weekA !== weekB) return weekA - weekB

      return getDayOrder(a.day) - getDayOrder(b.day)
    })
  }, [selectedProgramme])

  const [sessionId, setSessionId] = useState(sortedSessions[0]?.id || "")

  const selectedSession =
    sortedSessions.find((session) => session.id === sessionId) ||
    sortedSessions[0]

  const [entries, setEntries] = useState<ExerciseEntry[]>(() =>
    buildEntries(selectedSession)
  )

  function handleProgrammeChange(nextProgrammeId: string) {
    const nextProgramme =
      sortedProgrammes.find((programme) => programme.id === nextProgrammeId) ||
      sortedProgrammes[0]

    const nextSessions = [...(nextProgramme?.programme_sessions || [])].sort(
      (a, b) => {
        const weekA = Number(a.week_number || 1)
        const weekB = Number(b.week_number || 1)

        if (weekA !== weekB) return weekA - weekB

        return getDayOrder(a.day) - getDayOrder(b.day)
      }
    )

    const nextSession = nextSessions[0]

    setProgrammeId(nextProgrammeId)
    setSessionId(nextSession?.id || "")
    setEntries(buildEntries(nextSession))
  }

  function handleSessionChange(nextSessionId: string) {
    const nextSession =
      sortedSessions.find((session) => session.id === nextSessionId) ||
      sortedSessions[0]

    setSessionId(nextSessionId)
    setEntries(buildEntries(nextSession))
  }

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetEntry,
    value: string
  ) {
    setEntries((current) =>
      current.map((entry, entryIndex) => {
        if (entryIndex !== exerciseIndex) return entry

        return {
          ...entry,
          sets: entry.sets.map((set, currentSetIndex) =>
            currentSetIndex === setIndex ? { ...set, [field]: value } : set
          ),
        }
      })
    )
  }

  function updateNotes(exerciseIndex: number, value: string) {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === exerciseIndex ? { ...entry, notes: value } : entry
      )
    )
  }

  function addSet(exerciseIndex: number) {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === exerciseIndex
          ? {
              ...entry,
              sets: [...entry.sets, { weight: "", reps: "", rpe: "" }],
            }
          : entry
      )
    )
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setEntries((current) =>
      current.map((entry, entryIndex) => {
        if (entryIndex !== exerciseIndex) return entry

        return {
          ...entry,
          sets:
            entry.sets.length > 1
              ? entry.sets.filter((_, currentSetIndex) => currentSetIndex !== setIndex)
              : entry.sets,
        }
      })
    )
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="programmeId" value={programmeId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="entriesJson" value={JSON.stringify(entries)} />

      <section className="relative overflow-hidden rounded-[1.45rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 shadow-[0_16px_38px_rgba(0,0,0,0.62)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)] sm:p-5">
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
                onChange={(event) => handleProgrammeChange(event.target.value)}
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
                onChange={(event) => handleSessionChange(event.target.value)}
                className="min-h-[46px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none focus:border-smc-gold/45"
              >
                {sortedSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    Week {session.week_number || 1} · {session.day || "Session"} ·{" "}
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

      {entries.length === 0 ? (
        <section className="rounded-[1.45rem] border border-white/[0.07] bg-white/[0.03] p-4 text-sm text-white/45">
          No exercises found in this session.
        </section>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, exerciseIndex) => {
            const previousLog = getPreviousLogForExercise(
              previousLogs,
              entry.exerciseName
            )
            const previousPerformance = getPreviousPerformance(previousLog)

            return (
            <section
              key={`${entry.exerciseName}-${exerciseIndex}`}
              className="relative overflow-hidden rounded-[1.45rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 shadow-[0_16px_38px_rgba(0,0,0,0.62)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)] sm:p-5"
            >
              <div className="relative z-10">
                <div className="mb-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                    Exercise {exerciseIndex + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-white">
                    {entry.exerciseName}
                  </h3>

                  {entry.prescription && (
                    <p className="mt-1 text-sm leading-5 text-white/45">
                      {entry.prescription}
                    </p>
                  )}

                  {previousPerformance && (
                    <div className="mt-3 rounded-[1rem] border border-smc-gold/15 bg-smc-gold/[0.06] p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-smc-gold/75">
                          Previous Performance
                        </p>

                        <p className="text-[10px] font-bold text-white/35">
                          {previousPerformance.date}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-[0.85rem] border border-white/[0.06] bg-black/30 p-2.5">
                          <p className="text-sm font-black text-white">
                            {previousPerformance.bestSet.weight}kg ×{" "}
                            {previousPerformance.bestSet.reps}
                          </p>
                          <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white/35">
                            Best Previous Set
                          </p>
                        </div>

                        <div className="rounded-[0.85rem] border border-white/[0.06] bg-black/30 p-2.5">
                          <p className="text-sm font-black text-white">
                            {previousPerformance.setCount}
                          </p>
                          <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white/35">
                            Sets Logged
                          </p>
                        </div>
                      </div>

                      {previousPerformance.bestSet.rpe && (
                        <p className="mt-2 text-[10px] font-bold text-white/40">
                          Best set RPE {previousPerformance.bestSet.rpe}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {entry.sets.map((set, setIndex) => (
                    <div
                      key={setIndex}
                      className="rounded-[1rem] border border-white/[0.06] bg-black/35 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                          Set {setIndex + 1}
                        </p>

                        {entry.sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSet(exerciseIndex, setIndex)}
                            className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                            Weight
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={set.weight}
                            onChange={(event) =>
                              updateSet(
                                exerciseIndex,
                                setIndex,
                                "weight",
                                event.target.value
                              )
                            }
                            placeholder="kg"
                            className="min-h-[44px] w-full rounded-[0.85rem] border border-white/[0.07] bg-[#05070c] px-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/45"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                            Reps
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={set.reps}
                            onChange={(event) =>
                              updateSet(
                                exerciseIndex,
                                setIndex,
                                "reps",
                                event.target.value
                              )
                            }
                            placeholder="reps"
                            className="min-h-[44px] w-full rounded-[0.85rem] border border-white/[0.07] bg-[#05070c] px-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/45"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                            RPE
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="1"
                            max="10"
                            value={set.rpe}
                            onChange={(event) =>
                              updateSet(
                                exerciseIndex,
                                setIndex,
                                "rpe",
                                event.target.value
                              )
                            }
                            placeholder="/10"
                            className="min-h-[44px] w-full rounded-[0.85rem] border border-white/[0.07] bg-[#05070c] px-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/45"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addSet(exerciseIndex)}
                  className="mt-3 min-h-[38px] rounded-[0.95rem] border border-smc-gold/25 bg-smc-gold/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-smc-gold transition hover:bg-smc-gold hover:text-black"
                >
                  + Add Set
                </button>

                <div className="mt-3">
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    Exercise notes
                  </label>
                  <textarea
                    value={entry.notes}
                    onChange={(event) =>
                      updateNotes(exerciseIndex, event.target.value)
                    }
                    rows={3}
                    placeholder="Technique notes, changes, reasons for adjustments..."
                    className="w-full resize-none rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
                  />
                </div>
              </div>
            </section>
            )
          })}
        </div>
      )}

      <section className="relative overflow-hidden rounded-[1.45rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 shadow-[0_16px_38px_rgba(0,0,0,0.62)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)] sm:p-5">
        <div className="relative z-10 space-y-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
              Session Summary
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Overall Notes
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                Session rating /10
              </label>
              <input
                name="sessionRating"
                type="number"
                min="1"
                max="10"
                placeholder="/10"
                className="min-h-[46px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                Duration minutes
              </label>
              <input
                name="durationMinutes"
                type="number"
                min="1"
                placeholder="e.g. 60"
                className="min-h-[46px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
              Session notes
            </label>
            <textarea
              name="sessionNotes"
              rows={4}
              placeholder="Overall session notes, adjustments, wins, issues, next-session reminders..."
              className="w-full resize-none rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
            />
          </div>

          <button
            type="submit"
            className="min-h-[48px] w-full rounded-[1rem] bg-smc-gold px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:brightness-110"
          >
            Save Coach Session
          </button>
        </div>
      </section>
    </form>
  )
}