"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function CreateProgramme() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
const [selectedClient, setSelectedClient] = useState("")

  const [title, setTitle] = useState("")
  const [weekNumber, setWeekNumber] = useState(1)

  const [sessions, setSessions] = useState([
    {
      day: "Day 1",
      title: "",
      exercises: [{ name: "", sets: "", reps: "" }],
    },
  ])

  const [loading, setLoading] = useState(false)

  function addSession() {
    setSessions([
      ...sessions,
      {
        day: `Day ${sessions.length + 1}`,
        title: "",
        exercises: [{ name: "", sets: "", reps: "" }],
      },
    ])
  }

  function addExercise(sessionIndex: number) {
    const updated = [...sessions]
    updated[sessionIndex].exercises.push({
      name: "",
      sets: "",
      reps: "",
    })
    setSessions(updated)
  }

  function updateSession(index: number, field: "day" | "title", value: string) {
    const updated = [...sessions]
    updated[index][field] = value
    setSessions(updated)
  }

  function updateExercise(
    sessionIndex: number,
    exerciseIndex: number,
    field: "name" | "sets" | "reps",
    value: string
  ) {
    const updated = [...sessions]
    updated[sessionIndex].exercises[exerciseIndex][field] = value
    setSessions(updated)
  }

  useEffect(() => {
  async function fetchClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("id, user_id, name")

    if (!error && data) {
      setClients(data)
    } else {
      console.log("Client fetch error:", error)
    }
  }

  fetchClients()
}, [])

async function handleSubmit() {
  setLoading(true)

  if (!selectedClient) {
    alert("Please select a client")
    setLoading(false)
    return
  }

  console.log("Saving with client:", selectedClient)

const newProgramme = {
  title: title,
  week_number: weekNumber,
  user_id: selectedClient,
}

console.log("Programme payload:", newProgramme)

const { data: programme, error: programmeError } = await supabase
  .from("programmes")
  .insert(newProgramme)
  .select("id, title, week_number, user_id")
  .single()

    if (programmeError) {
      console.log("Programme error:", JSON.stringify(programmeError, null, 2))
      alert(programmeError.message || "Error creating programme")
      setLoading(false)
      return
    }

    for (const session of sessions) {
      const { error: sessionError } = await supabase
        .from("programme_sessions")
        .insert({
          programme_id: programme.id,
          day: session.day,
          title: session.title,
          exercises: session.exercises,
        })

      if (sessionError) {
        console.log("Session error:", JSON.stringify(sessionError, null, 2))
        alert(sessionError.message || "Error creating session")
        setLoading(false)
        return
      }
    }

    setLoading(false)
    router.push("/coach")
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Create Programme</h1>
<select
  className="w-full mb-4 p-2 bg-black border"
  value={selectedClient}
  onChange={(e) => setSelectedClient(e.target.value)}
>
  <option value="">Select Client</option>
  {clients.map((client) => (
    <option key={client.id} value={client.user_id}>
      {client.name}
    </option>
  ))}
</select>
      <input
        className="w-full mb-2 p-2 bg-black border"
        placeholder="Programme Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        type="number"
        className="w-full mb-4 p-2 bg-black border"
        placeholder="Week Number"
        value={weekNumber}
        onChange={(e) => setWeekNumber(Number(e.target.value))}
      />

      {sessions.map((session, sIndex) => (
        <div key={sIndex} className="mb-6 border p-4">
          <h2 className="font-bold mb-2">{session.day}</h2>

          <input
            className="w-full mb-2 p-2 bg-black border"
            placeholder="Session Title"
            value={session.title}
            onChange={(e) => updateSession(sIndex, "title", e.target.value)}
          />

          {session.exercises.map((exercise, eIndex) => (
            <div key={eIndex} className="mb-2 flex gap-2">
              <input
                className="p-2 bg-black border w-1/3"
                placeholder="Exercise"
                value={exercise.name}
                onChange={(e) =>
                  updateExercise(sIndex, eIndex, "name", e.target.value)
                }
              />

              <input
                className="p-2 bg-black border w-1/3"
                placeholder="Sets"
                value={exercise.sets}
                onChange={(e) =>
                  updateExercise(sIndex, eIndex, "sets", e.target.value)
                }
              />

              <input
                className="p-2 bg-black border w-1/3"
                placeholder="Reps"
                value={exercise.reps}
                onChange={(e) =>
                  updateExercise(sIndex, eIndex, "reps", e.target.value)
                }
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() => addExercise(sIndex)}
            className="text-sm text-yellow-400"
          >
            + Add Exercise
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addSession}
        className="mb-4 text-yellow-400"
      >
        + Add Session
      </button>

      <br />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="bg-white text-black px-4 py-2"
      >
        {loading ? "Saving..." : "Save Programme"}
      </button>
    </div>
  )
}