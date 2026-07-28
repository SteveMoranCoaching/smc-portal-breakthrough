"use client"

import { useMemo, useState } from "react"

type LogPrimaryField =
  | "kg"
  | "bodyweight"
  | "height"
  | "speed"
  | "distance"
  | "none"

type LogSecondaryField =
  | "reps"
  | "time"
  | "distance"
  | "calories"
  | "rounds"
  | "none"

type ExerciseLogType = {
  primary: LogPrimaryField
  secondary: LogSecondaryField
}

type PrescriptionBlock = {
  label?: string
  sets?: string | number
  reps?: string | number
  load?: string
  notes?: string
}

type ExerciseSection = "main" | "warmup" | "circuit" | "stretch"

type CircuitExercise = {
  name?: string
  prescription?: string
}

type Exercise = {
  name?: string
  prescription?: string
  prescriptions?: PrescriptionBlock[]
  sets?: string | number
  reps?: string | number
  section?: ExerciseSection | string
  logType?: ExerciseLogType
  circuit?: {
    rounds?: number
    workSeconds?: number
    restSeconds?: number
    exercises?: CircuitExercise[]
  }
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
  bodyweight?: string
  height?: string
  speed?: string
  distance?: string
  reps: string
  time?: string
  calories?: string
  rounds?: string
  rpe: string
}

type ExerciseEntry = {
  exerciseName: string
  section: ExerciseSection
  prescription: string
  notes: string
  sets: SetEntry[]
}

const defaultLogType: ExerciseLogType = {
  primary: "kg",
  secondary: "reps",
}

const primaryFieldConfig: Record<
  LogPrimaryField,
  {
    key: keyof SetEntry | ""
    label: string
    placeholder: string
    inputMode: "decimal" | "numeric" | "text"
    type: string
  }
> = {
  kg: {
    key: "weight",
    label: "Kg",
    placeholder: "Kg",
    inputMode: "decimal",
    type: "number",
  },
  bodyweight: {
    key: "bodyweight",
    label: "BW",
    placeholder: "BW",
    inputMode: "text",
    type: "text",
  },
  height: {
    key: "height",
    label: "Height",
    placeholder: "Height",
    inputMode: "decimal",
    type: "number",
  },
  speed: {
    key: "speed",
    label: "Speed",
    placeholder: "Speed",
    inputMode: "decimal",
    type: "number",
  },
  distance: {
    key: "distance",
    label: "Distance",
    placeholder: "Distance",
    inputMode: "decimal",
    type: "number",
  },
  none: {
    key: "",
    label: "",
    placeholder: "",
    inputMode: "text",
    type: "text",
  },
}

const secondaryFieldConfig: Record<
  LogSecondaryField,
  {
    key: keyof SetEntry | ""
    label: string
    placeholder: string
    inputMode: "decimal" | "numeric" | "text"
    type: string
  }
> = {
  reps: {
    key: "reps",
    label: "Reps",
    placeholder: "Reps",
    inputMode: "numeric",
    type: "number",
  },
  time: {
    key: "time",
    label: "Time",
    placeholder: "Time",
    inputMode: "text",
    type: "text",
  },
  distance: {
    key: "distance",
    label: "Distance",
    placeholder: "Distance",
    inputMode: "decimal",
    type: "number",
  },
  calories: {
    key: "calories",
    label: "Calories",
    placeholder: "Cals",
    inputMode: "numeric",
    type: "number",
  },
  rounds: {
    key: "rounds",
    label: "Rounds",
    placeholder: "Rounds",
    inputMode: "numeric",
    type: "number",
  },
  none: {
    key: "",
    label: "",
    placeholder: "",
    inputMode: "text",
    type: "text",
  },
}

function normaliseSection(section?: string | null): ExerciseSection {
  const value = String(section || "main").toLowerCase().trim()

  if (
    value === "warmup" ||
    value === "warm-up" ||
    value === "warm up" ||
    value === "mobility" ||
    value === "activation"
  ) {
    return "warmup"
  }

  if (
    value === "stretch" ||
    value === "stretches" ||
    value === "post-session-stretch" ||
    value === "post session stretch" ||
    value === "post_session_stretch" ||
    value === "cooldown" ||
    value === "cool-down" ||
    value === "cool down"
  ) {
    return "stretch"
  }

  if (
    value === "circuit" || value === "superset" ||
    value === "circuit block" ||
    value === "conditioning circuit"
  ) {
    return "circuit"
  }

  return "main"
}

function getSectionLabel(section: ExerciseSection) {
  if (section === "warmup") return "Warm-Up"
  if (section === "circuit") return "Circuit"
  if (section === "stretch") return "Stretch"

  return "Main Exercise"
}

function getSectionBody(section: ExerciseSection) {
  if (section === "warmup") {
    return "Warm-up exercise completed as part of the session."
  }

  if (section === "circuit") {
    return "Circuit block completed as part of the session."
  }

  if (section === "stretch") {
    return "Stretch completed as part of the session."
  }

  return "This exercise is completed as part of the session."
}

function getExerciseLogType(exercise?: Exercise | null): ExerciseLogType {
  return {
    primary: exercise?.logType?.primary || defaultLogType.primary,
    secondary: exercise?.logType?.secondary || defaultLogType.secondary,
  }
}

function createBlankSet(exercise?: Exercise | null, inferredReps = ""): SetEntry {
  const logType = getExerciseLogType(exercise)
  const primaryKey = primaryFieldConfig[logType.primary].key
  const secondaryKey = secondaryFieldConfig[logType.secondary].key

  return {
    weight: "",
    bodyweight: primaryKey === "bodyweight" ? "BW" : "",
    height: "",
    speed: "",
    distance: "",
    reps: secondaryKey === "reps" ? inferredReps : "",
    time: "",
    calories: "",
    rounds: "",
    rpe: "",
  }
}

function getSetFieldValue(set: SetEntry, field: keyof SetEntry | "") {
  if (!field) return ""

  return String(set[field] || "")
}

function formatFlexibleSet(set: any, exercise?: Exercise | null) {
  const logType = getExerciseLogType(exercise)
  const primary = primaryFieldConfig[logType.primary]
  const secondary = secondaryFieldConfig[logType.secondary]
  const parts: string[] = []

  if (primary.key) {
    const value = getSetFieldValue(set, primary.key)

    if (value) {
      parts.push(
        logType.primary === "bodyweight"
          ? "BW"
          : `${value}${primary.label === "Kg" ? "kg" : ` ${primary.label}`}`
      )
    }
  }

  if (secondary.key) {
    const value = getSetFieldValue(set, secondary.key)

    if (value) {
      parts.push(
        logType.secondary === "reps"
          ? `× ${value}`
          : `${value} ${secondary.label}`
      )
    }
  }

  if (set.rpe) parts.push(`@ RPE ${set.rpe}`)

  return parts.length > 0 ? parts.join(" ") : "No data"
}

function getDayOrder(day?: string | null) {
  const match = String(day || "").match(/\d+/)

  return match ? Number(match[0]) : 999
}

function inferSetCount(exercise: Exercise) {
  const prescriptionBlocks = Array.isArray(exercise.prescriptions)
    ? exercise.prescriptions
    : []

  const blockSetCount = prescriptionBlocks.reduce((total, block) => {
    const sets = Number(block.sets)

    return Number.isFinite(sets) && sets > 0
      ? total + sets
      : total
  }, 0)

  if (blockSetCount > 0) {
    return blockSetCount
  }

  const directSets = Number(exercise.sets)

  if (Number.isFinite(directSets) && directSets > 0) {
    return directSets
  }

  const prescription = String(exercise.prescription || "")
  const match = prescription.match(/(\d+)\s*x\s*\d+/i)

  return match?.[1] ? Number(match[1]) : 1
}

function inferReps(exercise: Exercise) {
  if (exercise.reps) return String(exercise.reps)

  const prescription = String(exercise.prescription || "")
  const match = prescription.match(/\d+\s*x\s*(\d+)/i)

  return match?.[1] || ""
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

function getPreviousPerformance(previousLog: any, exercise?: Exercise | null) {
  const sets = Array.isArray(previousLog?.sets_completed)
    ? previousLog.sets_completed
    : []

  const displaySets = sets
    .map((set: any) => formatFlexibleSet(set, exercise))
    .filter((line: string) => line && line !== "No data")

  if (displaySets.length === 0) return null

  return {
    date: formatLogDate(previousLog?.created_at),
    setCount: displaySets.length,
    displaySets,
  }
}

function buildEntries(session?: ProgrammeSession | null): ExerciseEntry[] {
  return (session?.exercises || []).map((exercise) => {
    const section = normaliseSection(exercise.section)
    const setCount = section === "main" ? inferSetCount(exercise) : 0
    const inferredReps = section === "main" ? inferReps(exercise) : ""

    return {
      exerciseName: exercise.name || "Unnamed exercise",
      section,
      prescription: exercise.prescription || "",
      notes: "",
      sets:
        section === "main"
          ? Array.from({ length: setCount }, () =>
              createBlankSet(exercise, inferredReps)
            )
          : [],
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
    const exercise = selectedSession?.exercises?.[exerciseIndex]

    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === exerciseIndex
          ? {
              ...entry,
              sets: [...entry.sets, createBlankSet(exercise)],
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
              ? entry.sets.filter(
                  (_, currentSetIndex) => currentSetIndex !== setIndex
                )
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

      {entries.length === 0 ? (
        <section className="rounded-[1.45rem] border border-white/[0.07] bg-white/[0.03] p-4 text-sm text-white/45">
          No exercises found in this session.
        </section>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, exerciseIndex) => {
            const exercise = selectedSession?.exercises?.[exerciseIndex]
            const previousLog = getPreviousLogForExercise(
              previousLogs,
              entry.exerciseName
            )
            const previousPerformance = getPreviousPerformance(
              previousLog,
              exercise
            )

            return (
              <section
                key={`${entry.exerciseName}-${exerciseIndex}`}
                className="relative overflow-hidden rounded-[1.45rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 shadow-[0_16px_38px_rgba(0,0,0,0.62)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)] sm:p-5"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                      {getSectionLabel(entry.section)}
                    </p>

                    <h3 className="mt-1 text-lg font-black text-white">
                      {entry.exerciseName}
                    </h3>

                    {entry.prescription && (
                      <p className="mt-1 text-sm leading-5 text-white/45">
                        {entry.prescription}
                      </p>
                    )}

                    {entry.section === "main" && previousPerformance && (
                      <div className="mt-3 rounded-[1rem] border border-smc-gold/15 bg-smc-gold/[0.06] p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-smc-gold/75">
                            Previous Performance
                          </p>

                          <p className="text-[10px] font-bold text-white/35">
                            {previousPerformance.date}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          {previousPerformance.displaySets
                            .slice(0, 4)
                            .map((line: string, index: number) => (
                              <div
                                key={`${line}-${index}`}
                                className="rounded-[0.85rem] border border-white/[0.06] bg-black/30 px-2.5 py-2"
                              >
                                <p className="text-sm font-black text-white">
                                  {line}
                                </p>
                              </div>
                            ))}
                        </div>

                        <p className="mt-2 text-[10px] font-bold text-white/40">
                          {previousPerformance.setCount} set
                          {previousPerformance.setCount === 1 ? "" : "s"} logged
                        </p>
                      </div>
                    )}
                  </div>

                  {entry.section === "main" ? (
                    <>
                      <div className="space-y-2">
                        {entry.sets.map((set, setIndex) => {
                          const logType = getExerciseLogType(exercise)
                          const primaryField =
                            primaryFieldConfig[logType.primary]
                          const secondaryField =
                            secondaryFieldConfig[logType.secondary]
                          const primaryKey = primaryField.key
                          const secondaryKey = secondaryField.key

                          return (
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
                                    onClick={() =>
                                      removeSet(exerciseIndex, setIndex)
                                    }
                                    className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-300"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                {primaryKey && (
                                  <div>
                                    <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                                      {primaryField.label}
                                    </label>
                                    <input
                                      type={primaryField.type}
                                      inputMode={primaryField.inputMode}
                                      value={getSetFieldValue(set, primaryKey)}
                                      onChange={(event) =>
                                        updateSet(
                                          exerciseIndex,
                                          setIndex,
                                          primaryKey,
                                          event.target.value
                                        )
                                      }
                                      placeholder={primaryField.placeholder}
                                      className="min-h-[44px] w-full rounded-[0.85rem] border border-white/[0.07] bg-[#05070c] px-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/45"
                                    />
                                  </div>
                                )}

                                {secondaryKey && (
                                  <div>
                                    <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                                      {secondaryField.label}
                                    </label>
                                    <input
                                      type={secondaryField.type}
                                      inputMode={secondaryField.inputMode}
                                      value={getSetFieldValue(set, secondaryKey)}
                                      onChange={(event) =>
                                        updateSet(
                                          exerciseIndex,
                                          setIndex,
                                          secondaryKey,
                                          event.target.value
                                        )
                                      }
                                      placeholder={secondaryField.placeholder}
                                      className="min-h-[44px] w-full rounded-[0.85rem] border border-white/[0.07] bg-[#05070c] px-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/45"
                                    />
                                  </div>
                                )}

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
                          )
                        })}
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
                    </>
                  ) : (
                    <div className="rounded-[1rem] border border-white/[0.06] bg-black/30 p-4 text-sm text-white/50">
                      {getSectionBody(entry.section)}

                      {entry.section === "circuit" &&
                        exercise?.circuit?.exercises?.length ? (
                        <div className="mt-3 space-y-2">
                          {exercise.circuit.exercises.map(
                            (item: CircuitExercise, index: number) => (
                              <div
                                key={`${item.name}-${index}`}
                                className="rounded-[0.85rem] border border-white/[0.05] bg-black/35 px-3 py-2"
                              >
                                <p className="text-xs font-black text-white">
                                  {item.name || `Circuit exercise ${index + 1}`}
                                </p>

                                {item.prescription && (
                                  <p className="mt-0.5 text-[11px] text-white/40">
                                    {item.prescription}
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
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
