"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

type Props = {
  userId: string
  programmeId: string
  sessionId: string
}

export default function SessionCompleteButton({
  userId,
  programmeId,
  sessionId,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [notes, setNotes] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()

  async function handleSubmit() {
    setMessage("")

    if (!rating || rating < 1 || rating > 10) {
      setMessage("Please add a rating between 1 and 10.")
      return
    }

    setLoading(true)

    const { error } = await supabase.from("session_completions").insert({
      user_id: userId,
      programme_id: programmeId,
      session_id: sessionId,
      completed: true,
      session_rating: rating,
      notes,
    })

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage("Session marked complete.")
    setOpen(false)
    setRating(null)
    setNotes("")
    router.refresh()
  }

  return (
    <div className="w-full">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full rounded-xl border border-green-400 bg-green-500 px-4 py-3 text-center text-sm font-bold text-black shadow-lg"
        >
          Mark session complete
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-black p-4">
          <p className="text-sm font-semibold text-white">
            How did the session feel?
          </p>

          <input
            type="number"
            min={1}
            max={10}
            placeholder="Session rating (1–10)"
            value={rating ?? ""}
            onChange={(e) =>
              setRating(e.target.value ? Number(e.target.value) : null)
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-white placeholder:text-zinc-500"
          />

          <textarea
            placeholder="Optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-white placeholder:text-zinc-500"
          />

          {message && (
            <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="block w-full rounded-xl border border-green-400 bg-green-500 px-4 py-3 text-center text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? "Saving..." : "Confirm session complete"}
          </button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-zinc-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}