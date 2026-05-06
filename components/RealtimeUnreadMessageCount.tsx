"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function RealtimeUnreadMessageCount({
  initialCount = 0,
  currentUserId,
  mode,
  variant = "pill",
}: {
  initialCount?: number
  currentUserId: string
  mode: "client" | "coach"
  variant?: "pill" | "number"
}) {
  const [count, setCount] = useState(initialCount)

  const channelNameRef = useRef(
    `live-unread-${mode}-${currentUserId}-${Math.random()
      .toString(36)
      .slice(2)}`
  )

  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  useEffect(() => {
    async function refreshCount() {
      let query = supabase
        .from("messages")
        .select("*", { count: "exact", head: true })

      if (mode === "client") {
        query = query
          .eq("recipient_id", currentUserId)
          .eq("read_by_client", false)
      }

      if (mode === "coach") {
        query = query
          .neq("sender_id", currentUserId)
          .eq("read_by_coach", false)
      }

      const { count: freshCount } = await query

      setCount(freshCount || 0)
    }

    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          refreshCount()
        }
      )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, mode])

  if (variant === "number") {
    return <>{count}</>
  }

  if (count > 0) {
    return (
      <div className="w-fit rounded-full bg-yellow-500 px-4 py-2 text-sm font-bold text-black">
        {count} unread
      </div>
    )
  }

  return (
    <div className="w-fit rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300">
      No unread messages
    </div>
  )
}