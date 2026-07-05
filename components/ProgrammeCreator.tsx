"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Client = {
  id: string
  user_id: string
  name: string
  email: string
}

type CircuitExercise = {
  name: string
  prescription: string
}

type LogPrimaryField = "kg" | "bodyweight" | "height" | "speed" | "distance" | "none"
type LogSecondaryField = "reps" | "time" | "distance" | "calories" | "rounds" | "none"

type ExerciseLogType = {
  primary: LogPrimaryField
  secondary: LogSecondaryField
}

const defaultLogType: ExerciseLogType = {
  primary: "kg",
  secondary: "reps",
}

const primaryLogOptions: { value: LogPrimaryField; label: string }[] = [
  { value: "kg", label: "Kg" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "height", label: "Height" },
  { value: "speed", label: "Speed" },
  { value: "distance", label: "Distance" },
  { value: "none", label: "None" },
]

const secondaryLogOptions: { value: LogSecondaryField; label: string }[] = [
  { value: "reps", label: "Reps" },
  { value: "time", label: "Time" },
  { value: "distance", label: "Distance" },
  { value: "calories", label: "Calories" },
  { value: "rounds", label: "Rounds" },
  { value: "none", label: "None" },
]

function normaliseLogType(logType?: Partial<ExerciseLogType> | null): ExerciseLogType {
  return {
    primary: logType?.primary || defaultLogType.primary,
    secondary: logType?.secondary || defaultLogType.secondary,
  }
}

type Exercise = {
  name: string
  prescription: string
  section?: "main" | "warmup" | "stretch" | "circuit"
  logType?: ExerciseLogType
  circuit?: {
    rounds: number
    workSeconds: number
    restSeconds: number
    exercises: CircuitExercise[]
  }
}

type Session = {
  day: string
  title: string
  exercises: Exercise[]
}

type ToastType = "success" | "error" | "info"

type Toast = {
  type: ToastType
  text: string
}

const inputStyle =
  "w-full rounded-[0.95rem] border border-white/[0.08] bg-black/45 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-smc-gold/45 focus:bg-black/70"

const labelStyle =
  "mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35"

const cardStyle =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] shadow-[0_16px_38px_rgba(0,0,0,0.62)]"

const defaultSessions: Session[] = [
  {
    day: "Day 1",
    title: "",
    exercises: [{ name: "", prescription: "", section: "main", logType: defaultLogType }],
  },
]

function buildWeeks(length: number) {
  return Array.from({ length }, (_, index) => index + 1)
}

function shouldSaveExercise(exercise: Exercise) {
  const hasBasicDetails =
    Boolean(exercise.name.trim()) || Boolean(exercise.prescription.trim())

  const hasCircuitDetails =
    exercise.section === "circuit" &&
    Boolean(
      exercise.circuit?.exercises?.some(
        (item) => item.name.trim() || item.prescription.trim()
      )
    )

  return hasBasicDetails || hasCircuitDetails
}

function calculateEndDate(start: string, weeksValue: string | number) {
  if (!start) return ""

  const weeks = Math.max(1, Number(weeksValue) || 1)

  const [year, month, day] = start.split("-").map(Number)
  const date = new Date(year, month - 1, day)

  date.setDate(date.getDate() + weeks * 7 - 1)

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")

  return `${yyyy}-${mm}-${dd}`
}

function createSessionsByWeek(length: number) {
  return buildWeeks(length).reduce(
    (acc, week) => ({
      ...acc,
      [week]: defaultSessions.map((session) => ({
        ...session,
        exercises: session.exercises.map((exercise) => ({ ...exercise })),
      })),
    }),
    {} as Record<number, Session[]>
  )
}

export default function ProgrammeCreator() {
  const router = useRouter()

  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [clientUserId, setClientUserId] = useState("")
  const [title, setTitle] = useState("")
  const [programmeLength, setProgrammeLength] = useState("4")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [activeWeek, setActiveWeek] = useState(1)
  const [notes, setNotes] = useState("")
  const [openSessions, setOpenSessions] = useState<number[]>([0])

  const [sessionsByWeek, setSessionsByWeek] = useState<Record<number, Session[]>>(
    createSessionsByWeek(4)
  )

  const [saving, setSaving] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const sessionRefs = useRef<Array<HTMLDivElement | null>>([])
  const pendingScrollIndex = useRef<number | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const weeks = useMemo(
    () => buildWeeks(Number(programmeLength) || 1),
    [programmeLength]
  )

  const sessions = sessionsByWeek[activeWeek] ?? defaultSessions

  useEffect(() => {
  setEndDate(calculateEndDate(startDate, programmeLength))
}, [startDate, programmeLength])

  const selectedClient = useMemo(
    () => clients.find((client) => client.user_id === clientUserId),
    [clients, clientUserId]
  )

  const totalSessions = useMemo(
    () =>
      Object.values(sessionsByWeek).reduce(
        (total, weekSessions) => total + weekSessions.length,
        0
      ),
    [sessionsByWeek]
  )

  const totalExercises = useMemo(
    () =>
      Object.values(sessionsByWeek).reduce(
        (total, weekSessions) =>
          total +
          weekSessions.reduce(
            (weekTotal, session) => weekTotal + session.exercises.length,
            0
          ),
        0
      ),
    [sessionsByWeek]
  )

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (pendingScrollIndex.current === null) return

    const target = sessionRefs.current[pendingScrollIndex.current]

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })

      pendingScrollIndex.current = null
    }
  }, [sessions.length])

  useEffect(() => {
    async function loadClients() {
      setLoadingClients(true)

      const { data, error } = await supabase
        .from("clients")
        .select("id, user_id, name, email")
        .order("name", { ascending: true })

      if (error) {
        showToast({
          type: "error",
          text: "Could not load clients.",
        })
      }

      if (data) setClients(data)

      setLoadingClients(false)
    }

    loadClients()
  }, [])

  function showToast(nextToast: Toast) {
    setToast(nextToast)

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 2800)
  }

  function updateActiveWeekSessions(nextSessions: Session[]) {
    setSessionsByWeek((current) => ({
      ...current,
      [activeWeek]: nextSessions,
    }))
  }

  function updateProgrammeLength(nextLengthValue: string) {
    const nextLength = Math.max(1, Number(nextLengthValue) || 1)

    setProgrammeLength(String(nextLength))

    setSessionsByWeek((current) => {
      const nextWeeks = buildWeeks(nextLength)
      const nextState: Record<number, Session[]> = {}

      nextWeeks.forEach((week) => {
        nextState[week] =
          current[week] ??
          defaultSessions.map((session) => ({
            ...session,
            exercises: session.exercises.map((exercise) => ({ ...exercise })),
          }))
      })

      return nextState
    })

    if (activeWeek > nextLength) {
      setActiveWeek(nextLength)
      setOpenSessions([0])
    }
  }

  function toggleSession(index: number) {
    setOpenSessions((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index]
    )
  }

  function updateSession(index: number, field: keyof Session, value: string) {
    const next = [...sessions]
    next[index] = { ...next[index], [field]: value }
    updateActiveWeekSessions(next)
  }

  function updateExercise(
    sessionIndex: number,
    exerciseIndex: number,
    field: keyof Exercise,
    value: string
  ) {
    const next = [...sessions]

    next[sessionIndex] = {
      ...next[sessionIndex],
      exercises: [...next[sessionIndex].exercises],
    }

    const currentExercise = next[sessionIndex].exercises[exerciseIndex]

    next[sessionIndex].exercises[exerciseIndex] = {
      ...currentExercise,
      [field]: value,
      logType: currentExercise.logType || defaultLogType,
      ...(field === "section" && value === "circuit" && !currentExercise.circuit
        ? {
            circuit: {
              rounds: 1,
              workSeconds: 0,
              restSeconds: 0,
              exercises: [{ name: "", prescription: "" }],
            },
          }
        : {}),
    }

    updateActiveWeekSessions(next)
  }

  function updateExerciseLogType(
    sessionIndex: number,
    exerciseIndex: number,
    field: keyof ExerciseLogType,
    value: string
  ) {
    const next = [...sessions]

    next[sessionIndex] = {
      ...next[sessionIndex],
      exercises: [...next[sessionIndex].exercises],
    }

    const currentExercise = next[sessionIndex].exercises[exerciseIndex]
    const currentLogType = normaliseLogType(currentExercise.logType)

    next[sessionIndex].exercises[exerciseIndex] = {
      ...currentExercise,
      logType: {
        ...currentLogType,
        [field]: value as any,
      },
    }

    updateActiveWeekSessions(next)
  }

  function updateCircuitField(
  sessionIndex: number,
  exerciseIndex: number,
  field: "rounds" | "workSeconds" | "restSeconds",
  value: string
) {
  const next = [...sessions]

  const currentExercise = next[sessionIndex].exercises[exerciseIndex]

  next[sessionIndex] = {
    ...next[sessionIndex],
    exercises: [...next[sessionIndex].exercises],
  }

  next[sessionIndex].exercises[exerciseIndex] = {
    ...currentExercise,
    circuit: {
      rounds: currentExercise.circuit?.rounds || 1,
      workSeconds: currentExercise.circuit?.workSeconds || 0,
      restSeconds: currentExercise.circuit?.restSeconds || 0,
      exercises: currentExercise.circuit?.exercises || [
        { name: "", prescription: "" },
      ],
      [field]: Number(value) || 0,
    },
  }

  updateActiveWeekSessions(next)
}

function updateCircuitExercise(
  sessionIndex: number,
  exerciseIndex: number,
  circuitExerciseIndex: number,
  field: "name" | "prescription",
  value: string
) {
  const next = [...sessions]
  const currentExercise = next[sessionIndex].exercises[exerciseIndex]

  const circuitExercises = currentExercise.circuit?.exercises || [
    { name: "", prescription: "" },
  ]

  next[sessionIndex] = {
    ...next[sessionIndex],
    exercises: [...next[sessionIndex].exercises],
  }

  next[sessionIndex].exercises[exerciseIndex] = {
    ...currentExercise,
    circuit: {
      rounds: currentExercise.circuit?.rounds || 1,
      workSeconds: currentExercise.circuit?.workSeconds || 0,
      restSeconds: currentExercise.circuit?.restSeconds || 0,
      exercises: circuitExercises.map((item, index) =>
        index === circuitExerciseIndex ? { ...item, [field]: value } : item
      ),
    },
  }

  updateActiveWeekSessions(next)
}

function addCircuitExercise(sessionIndex: number, exerciseIndex: number) {
  const next = [...sessions]
  const currentExercise = next[sessionIndex].exercises[exerciseIndex]

  next[sessionIndex] = {
    ...next[sessionIndex],
    exercises: [...next[sessionIndex].exercises],
  }

  next[sessionIndex].exercises[exerciseIndex] = {
    ...currentExercise,
    circuit: {
      rounds: currentExercise.circuit?.rounds || 1,
      workSeconds: currentExercise.circuit?.workSeconds || 0,
      restSeconds: currentExercise.circuit?.restSeconds || 0,
      exercises: [
        ...(currentExercise.circuit?.exercises || [
          { name: "", prescription: "" },
        ]),
        { name: "", prescription: "" },
      ],
    },
  }

  updateActiveWeekSessions(next)
}

function removeCircuitExercise(
  sessionIndex: number,
  exerciseIndex: number,
  circuitExerciseIndex: number
) {
  const next = [...sessions]
  const currentExercise = next[sessionIndex].exercises[exerciseIndex]
  const circuitExercises = currentExercise.circuit?.exercises || []

  if (circuitExercises.length <= 1) return

  next[sessionIndex] = {
    ...next[sessionIndex],
    exercises: [...next[sessionIndex].exercises],
  }

  next[sessionIndex].exercises[exerciseIndex] = {
    ...currentExercise,
    circuit: {
      rounds: currentExercise.circuit?.rounds || 1,
      workSeconds: currentExercise.circuit?.workSeconds || 0,
      restSeconds: currentExercise.circuit?.restSeconds || 0,
      exercises: circuitExercises.filter(
        (_, index) => index !== circuitExerciseIndex
      ),
    },
  }

  updateActiveWeekSessions(next)
}

  function addSession() {
    const nextIndex = sessions.length
    pendingScrollIndex.current = nextIndex

    updateActiveWeekSessions([
      ...sessions,
      {
        day: `Day ${sessions.length + 1}`,
        title: "",
        exercises: [{ name: "", prescription: "", section: "main", logType: defaultLogType }],
      },
    ])

    setOpenSessions((current) => [...current, nextIndex])
  }

  function removeSession(sessionIndex: number) {
    if (sessions.length === 1) return

    const sessionName =
      sessions[sessionIndex].title || sessions[sessionIndex].day || "this session"

    const confirmed = window.confirm(
      `Remove ${sessionName} from Week ${activeWeek}?`
    )

    if (!confirmed) return

    updateActiveWeekSessions(sessions.filter((_, index) => index !== sessionIndex))
    setOpenSessions((current) =>
      current
        .filter((index) => index !== sessionIndex)
        .map((index) => (index > sessionIndex ? index - 1 : index))
    )

    showToast({
      type: "info",
      text: "Session removed.",
    })
  }

  function addExercise(sessionIndex: number) {
    const next = [...sessions]

    next[sessionIndex] = {
      ...next[sessionIndex],
      exercises: [
        ...next[sessionIndex].exercises,
        { name: "", prescription: "", section: "main", logType: defaultLogType },
      ],
    }

    updateActiveWeekSessions(next)

    if (!openSessions.includes(sessionIndex)) {
      setOpenSessions((current) => [...current, sessionIndex])
    }
  }

  function removeExercise(sessionIndex: number, exerciseIndex: number) {
    const next = [...sessions]

    if (next[sessionIndex].exercises.length === 1) return

    const exerciseName =
      next[sessionIndex].exercises[exerciseIndex].name ||
      `Exercise ${exerciseIndex + 1}`

    const confirmed = window.confirm(
      `Remove ${exerciseName} from Week ${activeWeek}?`
    )

    if (!confirmed) return

    next[sessionIndex] = {
      ...next[sessionIndex],
      exercises: next[sessionIndex].exercises.filter(
        (_, index) => index !== exerciseIndex
      ),
    }

    updateActiveWeekSessions(next)

    showToast({
      type: "info",
      text: "Exercise removed.",
    })
  }

  function duplicateActiveWeekToNext() {
    const nextWeek = activeWeek + 1

    if (!weeks.includes(nextWeek)) {
      showToast({
        type: "error",
        text: "There is no next week to duplicate into.",
      })
      return
    }

    const confirmed = window.confirm(
      `Copy Week ${activeWeek} into Week ${nextWeek}? This will replace Week ${nextWeek}.`
    )

    if (!confirmed) return

    setSessionsByWeek((current) => ({
      ...current,
      [nextWeek]: sessions.map((session) => ({
        ...session,
        exercises: session.exercises.map((exercise) => ({ ...exercise })),
      })),
    }))

    setActiveWeek(nextWeek)
    setOpenSessions([0])

    showToast({
      type: "success",
      text: `Week ${activeWeek} copied into Week ${nextWeek}.`,
    })
  }

  async function saveProgramme() {
    if (saving) return

    if (!clientUserId) {
      showToast({
        type: "error",
        text: "Choose a client before saving.",
      })
      return
    }

    if (!title.trim()) {
      showToast({
        type: "error",
        text: "Add a programme title before saving.",
      })
      return
    }

    if (!programmeLength || Number.isNaN(Number(programmeLength))) {
      showToast({
        type: "error",
        text: "Add a valid programme length before saving.",
      })
      return
    }

    setSaving(true)

    showToast({
      type: "info",
      text: "Creating programme...",
    })

    const { error: deactivateError } = await supabase
  .from("programmes")
  .update({ is_active: false })
  .eq("user_id", clientUserId)

if (deactivateError) {
  setSaving(false)
  showToast({
    type: "error",
    text: "Could not deactivate the previous programme.",
  })
  return
}

const { data: programme, error: programmeError } = await supabase
  .from("programmes")
  .insert({
    user_id: clientUserId,
    title: title.trim(),
    week_number: 1,
    notes: notes.trim(),
    is_active: true,
    start_date: startDate || null,
    end_date: endDate || null,
  })
  .select()
  .single()

    if (programmeError || !programme) {
      setSaving(false)
      showToast({
        type: "error",
        text: "Error creating programme.",
      })
      return
    }

    const sessionRows = weeks.flatMap((week) =>
      (sessionsByWeek[week] ?? []).map((session) => ({
        programme_id: programme.id,
        week_number: week,
        day: session.day.trim(),
        title: session.title.trim(),
        exercises: session.exercises.filter(shouldSaveExercise),
      }))
    )

    const { error: sessionsError } = await supabase
      .from("programme_sessions")
      .insert(sessionRows)

    if (sessionsError) {
      setSaving(false)
      showToast({
        type: "error",
        text: "Programme created, but sessions failed to save.",
      })
      return
    }

    setRedirecting(true)

    showToast({
      type: "success",
      text: "Programme created successfully.",
    })

    setTimeout(() => {
      router.push(`/coach/programmes/${programme.id}/edit`)
    }, 550)
  }

  return (
    <main className="min-h-screen bg-black pb-28 text-white">
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-40 px-4">
          <div
            className={`mx-auto max-w-5xl rounded-[1rem] border px-4 py-3 text-sm font-bold shadow-[0_16px_36px_rgba(0,0,0,0.65)] backdrop-blur-xl ${
              toast.type === "success"
                ? "border-smc-gold/25 bg-smc-gold/15 text-smc-gold"
                : toast.type === "error"
                  ? "border-red-400/25 bg-red-500/10 text-red-200"
                  : "border-white/[0.08] bg-white/[0.055] text-white/65"
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/50 transition hover:border-smc-gold/35 hover:text-white"
          >
            ← Back
          </button>

          <span className="rounded-full border border-smc-gold/20 bg-smc-gold/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-smc-gold">
            Programme Builder
          </span>
        </div>

        <section className={`${cardStyle} p-4 sm:p-5`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent" />

          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
              SMC Coaching
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              Create Programme
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">
              Build a multi-week training block with separate editable weeks.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-[1rem] border border-white/[0.06] bg-black/35 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
                  Weeks
                </p>
                <p className="mt-1 text-xl font-black">{programmeLength}</p>
              </div>

              <div className="rounded-[1rem] border border-white/[0.06] bg-black/35 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
                  Sessions
                </p>
                <p className="mt-1 text-xl font-black">{totalSessions}</p>
              </div>

              <div className="rounded-[1rem] border border-white/[0.06] bg-black/35 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
                  Exercises
                </p>
                <p className="mt-1 text-xl font-black">{totalExercises}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={`${cardStyle} p-4 sm:p-5`}>
          <div className="relative z-10 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelStyle}>Client</label>
              <select
                value={clientUserId}
                onChange={(e) => setClientUserId(e.target.value)}
                disabled={loadingClients || saving || redirecting}
                className={inputStyle}
              >
                <option value="">
                  {loadingClients ? "Loading clients..." : "Select client"}
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.user_id}>
                    {client.name} — {client.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelStyle}>Programme title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SBD Block - May ’26"
                className={inputStyle}
              />
            </div>

            <div>
              <label className={labelStyle}>Programme length</label>
              <select
                value={programmeLength}
                onChange={(e) => updateProgrammeLength(e.target.value)}
                className={inputStyle}
              >
                {Array.from({ length: 16 }, (_, index) => index + 1).map((week) => (
                  <option key={week} value={week}>
                    {week} week{week === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelStyle}>Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputStyle}
              />
            </div>

            <div>
              <label className={labelStyle}>End date</label>
              <input
                type="date"
                value={endDate}
                readOnly
                className={`${inputStyle} text-white/45`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelStyle}>Coach notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="General notes for the full block..."
                className={`${inputStyle} min-h-24 resize-none leading-6`}
              />
            </div>
          </div>
        </section>

        <section className={`${cardStyle} p-3 sm:p-4`}>
          <div className="relative z-10 flex gap-2 overflow-x-auto pb-1">
            {weeks.map((week) => (
              <button
                key={week}
                type="button"
                onClick={() => {
                  setActiveWeek(week)
                  setOpenSessions([0])
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                  activeWeek === week
                    ? "bg-smc-gold text-black"
                    : "border border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-smc-gold/30 hover:text-smc-gold"
                }`}
              >
                Week {week}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={labelStyle}>Active Week</p>
              <h2 className="text-xl font-black">Week {activeWeek}</h2>
            </div>

            <button
              type="button"
              onClick={duplicateActiveWeekToNext}
              className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-smc-gold transition hover:bg-smc-gold hover:text-black"
            >
              Copy to next week
            </button>
          </div>

          {sessions.map((session, sessionIndex) => {
            const isOpen = openSessions.includes(sessionIndex)

            return (
              <div
                key={sessionIndex}
                ref={(element) => {
                  sessionRefs.current[sessionIndex] = element
                }}
                className={cardStyle}
              >
                <button
                  type="button"
                  onClick={() => toggleSession(sessionIndex)}
                  className="relative z-10 flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-white/[0.025]"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-smc-gold/75">
                      {session.day || `Day ${sessionIndex + 1}`}
                    </p>

                    <h2 className="mt-1 truncate text-lg font-black">
                      {session.title || "Untitled session"}
                    </h2>

                    <p className="mt-0.5 text-xs text-white/40">
                      Week {activeWeek} · {session.exercises.length} exercise
                      {session.exercises.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-black/35 text-lg text-white/55">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="relative z-10 space-y-4 border-t border-white/[0.06] p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelStyle}>Day label</label>
                        <input
                          value={session.day}
                          onChange={(e) =>
                            updateSession(sessionIndex, "day", e.target.value)
                          }
                          className={inputStyle}
                        />
                      </div>

                      <div>
                        <label className={labelStyle}>Session title</label>
                        <input
                          value={session.title}
                          onChange={(e) =>
                            updateSession(
                              sessionIndex,
                              "title",
                              e.target.value
                            )
                          }
                          placeholder="e.g. Squat + Bench"
                          className={inputStyle}
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {session.exercises.map((exercise, exerciseIndex) => (
                        <div
                          key={exerciseIndex}
                          className="rounded-[1rem] border border-white/[0.06] bg-black/35 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
                                Exercise {exerciseIndex + 1}
                              </p>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${
                                  exercise.section === "warmup"
                                    ? "border border-smc-gold/25 bg-smc-gold/10 text-smc-gold"
                                    : "border border-white/[0.06] bg-white/[0.035] text-white/35"
                                }`}
                              >
                                {exercise.section === "warmup"
  ? "Warm-up"
  : exercise.section === "stretch"
    ? "Stretch"
    : exercise.section === "circuit"
      ? "Circuit"
      : "Main"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeExercise(sessionIndex, exerciseIndex)
                              }
                              disabled={session.exercises.length === 1}
                              className="text-xs font-bold text-white/30 transition hover:text-red-300 disabled:opacity-20"
                            >
                              Remove
                            </button>
                          </div>

{exercise.section === "circuit" ? (
  <div className="space-y-3">
    <select
      value={exercise.section || "main"}
      onChange={(e) =>
        updateExercise(sessionIndex, exerciseIndex, "section", e.target.value)
      }
      className={inputStyle}
    >
      <option value="warmup">Warm-up / Mobility</option>
      <option value="main">Main Exercise</option>
      <option value="circuit">Circuit Block</option>
      <option value="stretch">Post Session Stretch</option>
    </select>

    <div className="grid gap-2.5 sm:grid-cols-2">
      <input
        value={exercise.name}
        onChange={(e) =>
          updateExercise(sessionIndex, exerciseIndex, "name", e.target.value)
        }
        placeholder="Circuit name"
        className={inputStyle}
      />

      <input
        value={exercise.prescription}
        onChange={(e) =>
          updateExercise(
            sessionIndex,
            exerciseIndex,
            "prescription",
            e.target.value
          )
        }
        placeholder="Circuit notes e.g. Rest 90s between rounds"
        className={inputStyle}
      />
    </div>

    <div className="grid gap-2.5 sm:grid-cols-3">
      <input
        type="number"
        value={exercise.circuit?.rounds || 1}
        onChange={(e) =>
          updateCircuitField(
            sessionIndex,
            exerciseIndex,
            "rounds",
            e.target.value
          )
        }
        placeholder="Rounds"
        className={inputStyle}
      />

      <input
        type="number"
        value={exercise.circuit?.workSeconds || ""}
        onChange={(e) =>
          updateCircuitField(
            sessionIndex,
            exerciseIndex,
            "workSeconds",
            e.target.value
          )
        }
        placeholder="Work seconds"
        className={inputStyle}
      />

      <input
        type="number"
        value={exercise.circuit?.restSeconds || ""}
        onChange={(e) =>
          updateCircuitField(
            sessionIndex,
            exerciseIndex,
            "restSeconds",
            e.target.value
          )
        }
        placeholder="Rest seconds"
        className={inputStyle}
      />
    </div>

    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold/70">
        Circuit exercises
      </p>

      {(exercise.circuit?.exercises || [{ name: "", prescription: "" }]).map(
        (circuitExercise, circuitExerciseIndex) => (
          <div
            key={circuitExerciseIndex}
            className="grid gap-2 rounded-[0.9rem] border border-white/[0.06] bg-black/30 p-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input
              value={circuitExercise.name}
              onChange={(e) =>
                updateCircuitExercise(
                  sessionIndex,
                  exerciseIndex,
                  circuitExerciseIndex,
                  "name",
                  e.target.value
                )
              }
              placeholder="Exercise name"
              className={inputStyle}
            />

            <input
              value={circuitExercise.prescription}
              onChange={(e) =>
                updateCircuitExercise(
                  sessionIndex,
                  exerciseIndex,
                  circuitExerciseIndex,
                  "prescription",
                  e.target.value
                )
              }
              placeholder="e.g. 40s / 15 reps / AMRAP"
              className={inputStyle}
            />

            <button
              type="button"
              onClick={() =>
                removeCircuitExercise(
                  sessionIndex,
                  exerciseIndex,
                  circuitExerciseIndex
                )
              }
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
            >
              Remove
            </button>
          </div>
        )
      )}
    </div>

    <button
      type="button"
      onClick={() => addCircuitExercise(sessionIndex, exerciseIndex)}
      className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-smc-gold transition hover:bg-smc-gold hover:text-black"
    >
      + Add circuit exercise
    </button>
  </div>
) : (
                          <div className="grid gap-2.5 sm:grid-cols-[0.8fr_1.2fr_1.2fr_0.9fr_0.9fr]">
                            <select
                              value={exercise.section || "main"}
                              onChange={(e) =>
                                updateExercise(
                                  sessionIndex,
                                  exerciseIndex,
                                  "section",
                                  e.target.value
                                )
                              }
                              className={inputStyle}
                            >
                              <option value="warmup">Warm-up / Mobility</option>
<option value="main">Main Exercise</option>
<option value="circuit">Circuit Block</option>
<option value="stretch">Post Session Stretch</option>
                            </select>

                            <input
                              value={exercise.name}
                              onChange={(e) =>
                                updateExercise(
                                  sessionIndex,
                                  exerciseIndex,
                                  "name",
                                  e.target.value
                                )
                              }
                              placeholder={
  exercise.section === "warmup"
    ? "Warm-up name"
    : exercise.section === "stretch"
      ? "Stretch name"
      : "Exercise name"
}
                              className={inputStyle}
                            />

                            <input
                              value={exercise.prescription}
                              onChange={(e) =>
                                updateExercise(
                                  sessionIndex,
                                  exerciseIndex,
                                  "prescription",
                                  e.target.value
                                )
                              }
                              placeholder={
  exercise.section === "warmup"
    ? "e.g. 2x10 each side"
    : exercise.section === "stretch"
      ? "e.g. 30s holds"
      : "e.g. 3x5 @ RPE 7"
}
                              className={inputStyle}
                            />

                            <select
                              value={normaliseLogType(exercise.logType).primary}
                              onChange={(e) =>
                                updateExerciseLogType(
                                  sessionIndex,
                                  exerciseIndex,
                                  "primary",
                                  e.target.value
                                )
                              }
                              className={inputStyle}
                              title="Primary logging field"
                            >
                              {primaryLogOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>

                            <select
                              value={normaliseLogType(exercise.logType).secondary}
                              onChange={(e) =>
                                updateExerciseLogType(
                                  sessionIndex,
                                  exerciseIndex,
                                  "secondary",
                                  e.target.value
                                )
                              }
                              className={inputStyle}
                              title="Secondary logging field"
                            >
                              {secondaryLogOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => addExercise(sessionIndex)}
                        className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-smc-gold transition hover:bg-smc-gold hover:text-black"
                      >
                        + Add exercise
                      </button>

                      <button
                        type="button"
                        onClick={() => removeSession(sessionIndex)}
                        disabled={sessions.length === 1}
                        className="rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/35 transition hover:border-red-400/30 hover:text-red-300 disabled:opacity-20"
                      >
                        Remove session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <button
            type="button"
            onClick={addSession}
            className="w-full rounded-[1.2rem] border border-dashed border-white/[0.12] bg-white/[0.025] px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-white/45 transition hover:border-smc-gold/35 hover:text-smc-gold"
          >
            + Add session to Week {activeWeek}
          </button>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-black/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white/55">
              {redirecting
                ? "Created — opening editor..."
                : selectedClient
                  ? selectedClient.name
                  : "No client selected"}
            </p>
            <p className="truncate text-[11px] text-white/30">
              {title || "Untitled programme"} · {programmeLength} weeks ·{" "}
              {totalSessions} sessions
            </p>
          </div>

          <button
            type="button"
            onClick={saveProgramme}
            disabled={
              saving || redirecting || !clientUserId || !title || !programmeLength
            }
            className="shrink-0 rounded-full bg-smc-gold px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:brightness-110 disabled:opacity-35"
          >
            {saving ? "Saving..." : redirecting ? "Created" : "Save"}
          </button>
        </div>
      </div>
    </main>
  )
}