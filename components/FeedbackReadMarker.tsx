"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Props = {
  unreadLogIds: string[]
  unreadVideoIds: string[]
}

export default function FeedbackReadMarker({
  unreadLogIds,
  unreadVideoIds,
}: Props) {
  const router = useRouter()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    async function markAsRead() {
      const updates = []

      if (unreadLogIds.length > 0) {
        updates.push(
          supabase
            .from("workout_logs")
            .update({ feedback_read: true })
            .in("id", unreadLogIds)
        )
      }

      if (unreadVideoIds.length > 0) {
        updates.push(
          supabase
            .from("exercise_videos")
            .update({ feedback_read: true })
            .in("id", unreadVideoIds)
        )
      }

      if (updates.length === 0) return

      await Promise.all(updates)

      router.refresh()
    }

    markAsRead()
  }, [router, unreadLogIds, unreadVideoIds])

  return null
}