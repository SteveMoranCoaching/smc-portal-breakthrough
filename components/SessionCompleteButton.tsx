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
          className="block w-full rounded-2xl border border-emerald-400/25 bg-emerald-400 px-4 py-3 text-center text-sm font-extrabold text-black shadow-[0_0_24px_rgba(52,211,153,0.18)] transition hover:brightness-110 active:scale-[0.98]"
        >
          Mark session complete
        </button>
      ) : (
        <div className="space-y-3 rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-4 shadow-2xl">
          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.24)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-smc-gold/75">
              Finish session
            </p>

            <p className="mt-2 text-lg font-extrabold tracking-tight text-white">
              How did the session feel?
            </p>
          </div>

          <input
            type="number"
            min={1}
            max={10}
            placeholder="Session rating (1–10)"
            value={rating ?? ""}
            onChange={(e) =>
              setRating(e.target.value ? Number(e.target.value) : null)
            }
            className="w-full rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(0,0,0,0.24)] p-4 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-smc-gold/70 focus:shadow-[0_0_18px_rgba(212,175,55,0.12)]"
          />

          <textarea
            placeholder="Optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24 w-full rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(0,0,0,0.24)] p-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-smc-gold/70 focus:shadow-[0_0_18px_rgba(212,175,55,0.12)]"
          />

          {message && (
            <p className="rounded-2xl border border-smc-gold/25 bg-smc-gold/[0.08] p-3 text-sm font-medium text-smc-gold">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="block w-full rounded-2xl bg-smc-gold px-4 py-3 text-center text-sm font-extrabold text-black shadow-[0_0_24px_rgba(212,175,55,0.22)] transition hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "Saving..." : "Confirm session complete"}
          </button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="block w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-center text-sm font-bold text-white/70 transition hover:bg-[rgba(255,255,255,0.07)] active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}