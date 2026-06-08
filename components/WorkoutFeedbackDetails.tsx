"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

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
  const markedRead = useRef(false)

  async function markAsRead() {
    if (markedRead.current) return
    markedRead.current = true

    if (item.source === "video") {
      await supabase
        .from("exercise_videos")
        .update({ feedback_read: true })
        .eq("id", item.id)
    } else {
      await supabase
        .from("workout_logs")
        .update({ feedback_read: true })
        .eq("id", item.id)
    }

    router.refresh()
  }

  return (
    <details
      onToggle={(event) => {
        if (event.currentTarget.open) {
          markAsRead()
        }
      }}
      className={`rounded-[1rem] border ${softBorder} bg-[#070707] p-3`}
    >
      <summary className="cursor-pointer list-none">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="rounded-full bg-smc-gold/90 px-2 py-0.5 text-[8px] font-black uppercase text-black">
            {item.type}
          </span>

          <span className="text-[11px] text-smc-muted-soft">
            {dateLabel}
          </span>
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
      </div>
    </details>
  )
}
