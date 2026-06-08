"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type FeedbackItem = {
  id: string
  source: string
  type: string
  exerciseName: string
  feedback: string
}

export default function WorkoutFeedbackDetails({
  item,
  softBorder,
  dateLabel,
}: {
  item: FeedbackItem
  softBorder: string
  dateLabel: string
}) {
  const router = useRouter()
  const [markingRead, setMarkingRead] = useState(false)
  const [read, setRead] = useState(false)

  async function markAsRead() {
    if (read || markingRead) return

    setMarkingRead(true)

    const response = await fetch("/api/feedback/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: item.id,
        source: item.source,
      }),
    })

    setMarkingRead(false)

    if (!response.ok) return

    setRead(true)
    router.refresh()
  }

  return (
    <details className={`rounded-[1rem] border ${softBorder} bg-[#070707] p-3`}>
      <summary className="cursor-pointer list-none">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="rounded-full bg-smc-gold/90 px-2 py-0.5 text-[8px] font-black uppercase text-black">
            {item.type}
          </span>

          <span className="text-[11px] text-smc-muted-soft">{dateLabel}</span>
        </div>

        <p className="break-words text-xs font-bold text-smc-text">
          {item.exerciseName}
        </p>

        <p className="mt-1 text-[11px] font-bold text-smc-gold">
          Tap to read feedback ↓
        </p>
      </summary>

      <div className="mt-2 border-t border-white/5 pt-2">
        <p className="whitespace-pre-wrap break-words text-xs leading-5 text-zinc-300">
          {item.feedback}
        </p>

        <button
          type="button"
          onClick={markAsRead}
          disabled={read || markingRead}
          className="mt-3 w-full rounded-2xl bg-smc-gold px-4 py-2.5 text-xs font-black text-black disabled:opacity-50"
        >
          {read ? "Marked as read" : markingRead ? "Marking..." : "Mark as read"}
        </button>
      </div>
    </details>
  )
}