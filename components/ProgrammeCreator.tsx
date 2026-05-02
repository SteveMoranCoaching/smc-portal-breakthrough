"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Client = {
  id: string
  user_id: string
  name: string
  email: string
}

type Exercise = {
  name: string
  prescription: string
}

type Session = {
  day: string
  title: string
  exercises: Exercise[]
}

export default function ProgrammeCreator() {
  const [clients, setClients] = useState<Client[]>([])
  const [clientUserId, setClientUserId] = useState("")
  const [title, setTitle] = useState("")
  const [weekNumber, setWeekNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [sessions, setSessions] = useState<Session[]>([
    {
      day: "Day 1",
      title: "",
      exercises: [{ name: "", prescription: "" }],
    },
  ])

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase
        .from("clients")
        .select("id, user_id, name, email")
        .order("name", { ascending: true })

      if (data) setClients(data)
    }

    loadClients()
  }, [])

  function updateSession(index: number, field: keyof Session, value: string) {
    const next = [...sessions]
    next[index] = { ...next[index], [field]: value }
    setSessions(next)
  }

  function updateExercise(
    sessionIndex: number,
    exerciseIndex: number,
    field: keyof Exercise,
    value: string
  ) {
    const next = [...sessions]
    next[sessionIndex].exercises[exerciseIndex][field] = value
    setSessions(next)
  }

  function addSession() {
    setSessions([
      ...sessions,
      {
        day: `Day ${sessions.length + 1}`,
        title: "",
        exercises: [{ name: "", prescription: "" }],
      },
    ])
  }

  function addExercise(sessionIndex: number) {
    const next = [...sessions]
    next[sessionIndex].exercises.push({ name: "", prescription: "" })
    setSessions(next)
  }

  async function saveProgramme() {
    setSaving(true)
    setMessage("Saving programme...")

    const { data: programme, error: programmeError } = await supabase
      .from("programmes")
      .insert({
        user_id: clientUserId,
        title,
        week_number: Number(weekNumber),
        notes,
      })
      .select()
      .single()

    if (programmeError || !programme) {
      setSaving(false)
      setMessage("Error creating programme.")
      return
    }

    const sessionRows = sessions.map((session) => ({
      programme_id: programme.id,
      day: session.day,
      title: session.title,
      exercises: session.exercises,
    }))

    const { error: sessionsError } = await supabase
      .from("programme_sessions")
      .insert(sessionRows)

    setSaving(false)

    if (sessionsError) {
      setMessage("Programme created, but sessions failed to save.")
      return
    }

    setMessage("Programme created successfully.")
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Create Programme</h1>
          <p className="mt-2 text-gray-400">
            Build and assign a programme to a client.
          </p>
        </div>

        <section className="space-y-4 rounded-2xl border border-gray-800 bg-gray-950 p-5">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Client</label>
            <select
              value={clientUserId}
              onChange={(e) => setClientUserId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-black p-3 text-white"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.user_id}>
                  {client.name} — {client.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">
              Programme title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 1 Strength Block"
              className="w-full rounded-lg border border-gray-700 bg-black p-3 text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">
              Week number
            </label>
            <input
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              type="number"
              placeholder="1"
              className="w-full rounded-lg border border-gray-700 bg-black p-3 text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="General notes for the week..."
              className="min-h-28 w-full rounded-lg border border-gray-700 bg-black p-3 text-white"
            />
          </div>
        </section>

        <section className="space-y-5">
          {sessions.map((session, sessionIndex) => (
            <div
              key={sessionIndex}
              className="space-y-4 rounded-2xl border border-gray-800 bg-gray-950 p-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">
                    Day
                  </label>
                  <input
                    value={session.day}
                    onChange={(e) =>
                      updateSession(sessionIndex, "day", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-700 bg-black p-3 text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-400">
                    Session title
                  </label>
                  <input
                    value={session.title}
                    onChange={(e) =>
                      updateSession(sessionIndex, "title", e.target.value)
                    }
                    placeholder="e.g. Squat + Bench"
                    className="w-full rounded-lg border border-gray-700 bg-black p-3 text-white"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {session.exercises.map((exercise, exerciseIndex) => (
                  <div
                    key={exerciseIndex}
                    className="grid gap-3 rounded-xl border border-gray-800 bg-black p-3 sm:grid-cols-2"
                  >
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
                      placeholder="Exercise name"
                      className="rounded-lg border border-gray-700 bg-gray-950 p-3 text-white"
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
                      placeholder="e.g. 3x5 @ RPE 7"
                      className="rounded-lg border border-gray-700 bg-gray-950 p-3 text-white"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => addExercise(sessionIndex)}
                className="rounded-lg border border-yellow-500 px-4 py-2 text-sm font-semibold text-yellow-500"
              >
                + Add exercise
              </button>
            </div>
          ))}

          <button
            onClick={addSession}
            className="rounded-lg border border-gray-600 px-4 py-2 font-semibold text-white"
          >
            + Add session
          </button>
        </section>

        <button
          onClick={saveProgramme}
          disabled={saving || !clientUserId || !title || !weekNumber}
          className="rounded-xl bg-yellow-500 px-6 py-3 font-bold text-black disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save Programme"}
        </button>

        {message && <p className="text-sm text-gray-300">{message}</p>}
      </div>
    </main>
  )
}