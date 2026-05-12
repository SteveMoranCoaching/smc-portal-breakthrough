"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { showBrowserNotification } from "@/components/useBrowserNotifications"

type Message = {
  id: string
  sender_id: string
  recipient_id: string
  client_user_id: string
  body: string | null
  attachment_type?: string | null
  attachment_name?: string | null
}

function getPreview(message: Message) {
  if (message.body?.trim()) return message.body.trim()
  if (message.attachment_type === "image") return "Sent an image"
  if (message.attachment_type === "video") return "Sent a video"
  if (message.attachment_name) return `Sent ${message.attachment_name}`

  return "Sent an attachment"
}

export default function GlobalMessageNotifications({
  currentUserId,
}: {
  currentUserId?: string
}) {
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const lastNotifiedIdRef = useRef<string | null>(null)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`global-message-notifications-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          const message = payload.new as Message

          if (message.sender_id === currentUserId) return
          if (lastNotifiedIdRef.current === message.id) return

          const currentPath = pathnameRef.current

          const pageIsVisible =
            typeof document !== "undefined" &&
            document.visibilityState === "visible"

          const windowIsFocused =
            typeof document !== "undefined" && document.hasFocus()

          const isFocused = pageIsVisible && windowIsFocused

          const isClientMessagePage = currentPath === "/dashboard/messages"

          const isCoachViewingSameThread =
            currentPath === `/coach/messages/${message.client_user_id}`

          if (isFocused && (isClientMessagePage || isCoachViewingSameThread)) {
            return
          }

          lastNotifiedIdRef.current = message.id

          showBrowserNotification({
            title: "New SMC message",
            body: getPreview(message),
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  return null
}