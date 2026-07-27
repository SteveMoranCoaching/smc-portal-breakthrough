"use client"

import { ChangeEvent, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import MessageToast from "@/components/MessageToast"
import { showBrowserNotification } from "@/components/useBrowserNotifications"

type Message = {
  id: string
  created_at: string
  sender_id: string
  recipient_id: string
  client_user_id: string
  body: string | null
  read_by_client: boolean
  read_by_coach: boolean
  attachment_path?: string | null
  attachment_type?: string | null
  attachment_name?: string | null
}

export function MessageTypingTextarea({
  clientUserId,
  currentUserId,
  name = "body",
  rows = 3,
  placeholder = "Write a message...",
}: {
  clientUserId: string
  currentUserId: string
  name?: string
  rows?: number
  placeholder?: string
}) {
  const lastSentRef = useRef(0)
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  )

  useEffect(() => {
    const channel = supabase.channel(`message-typing-${clientUserId}`, {
      config: {
        broadcast: {
          self: false,
        },
      },
    })

    typingChannelRef.current = channel
    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
      typingChannelRef.current = null
    }
  }, [clientUserId])

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value.trim()
    if (!value) return

    const now = Date.now()

    if (now - lastSentRef.current < 700) return
    lastSentRef.current = now

    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: {
        clientUserId,
        userId: currentUserId,
      },
    })
  }

  return (
    <textarea
      name={name}
      rows={rows}
      placeholder={placeholder}
      onChange={handleChange}
      className="max-h-32 w-full resize-none rounded-[1rem] border border-white/[0.06] bg-[#05070c] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"
    />
  )
}

export default function RealtimeMessageThread({
  initialMessages,
  currentUserId,
  clientUserId,
  unreadMessageIds = [],
  otherUserName = "New Message",
}: {
  initialMessages: Message[]
  currentUserId: string
  clientUserId: string
  unreadMessageIds?: string[]
  otherUserName?: string
}) {
  const [hasMounted, setHasMounted] = useState(false)
  const [messages, setMessages] = useState<Message[]>(initialMessages || [])
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting")
  const [toastMessage, setToastMessage] = useState<{
    sender: string
    body: string
  } | null>(null)

  const [downloadingMessageId, setDownloadingMessageId] = useState<string | null>(
  null
)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBrowserNotificationRef = useRef<string | null>(null)
  const previousMessageCountRef = useRef(initialMessages?.length || 0)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    setMessages(initialMessages || [])
    previousMessageCountRef.current = initialMessages?.length || 0
  }, [initialMessages])

  useEffect(() => {
    const shouldUseSmoothScroll =
      messages.length > previousMessageCountRef.current

    bottomRef.current?.scrollIntoView({
      behavior: shouldUseSmoothScroll ? "smooth" : "auto",
      block: "end",
    })

    previousMessageCountRef.current = messages.length
  }, [messages.length, isOtherUserTyping])

  function getMessagePreview(message: Message) {
    if (message.body?.trim()) return message.body.trim()
    if (message.attachment_type === "image") return "Sent an image"
    if (message.attachment_type === "video") return "Sent a video"
    if (message.attachment_name) return `Sent ${message.attachment_name}`

    return "Sent an attachment"
  }

  function shouldShowBrowserNotification(message: Message) {
    if (message.sender_id === currentUserId) return false
    if (lastBrowserNotificationRef.current === message.id) return false

    const pageIsVisible =
      typeof document !== "undefined" && document.visibilityState === "visible"

    const windowIsFocused =
      typeof document !== "undefined" && document.hasFocus()

    if (pageIsVisible && windowIsFocused) return false

    return true
  }

  function showInAppToast(sender: string, body: string) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }

    setToastMessage({ sender, body })

    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  async function handleAttachmentDownload(
  messageId: string,
  downloadUrl: string,
  fileName?: string | null
) {
  if (downloadingMessageId) return

  setDownloadingMessageId(messageId)
  showInAppToast("Download", "Preparing your file...")

  try {
    const response = await fetch(downloadUrl)

    if (!response.ok) {
      throw new Error("Download failed")
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = objectUrl
    link.download = fileName || "attachment"

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(objectUrl)

    showInAppToast("Download", "Download started")
  } catch (error) {
    console.error(error)
    showInAppToast("Download", "Unable to download file")
  } finally {
    setDownloadingMessageId(null)
  }
}

  useEffect(() => {
    setRealtimeStatus("connecting")

    const channel = supabase
      .channel(`messages-thread-${clientUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `client_user_id=eq.${clientUserId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message

          setMessages((current) => {
            const alreadyExists = current.some(
              (message) => message.id === newMessage.id
            )

            if (alreadyExists) return current

            return [...current, newMessage]
          })

          if (newMessage.sender_id !== currentUserId) {
            setIsOtherUserTyping(false)

            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current)
            }

            const preview = getMessagePreview(newMessage)

            showInAppToast(otherUserName, preview)

            if (shouldShowBrowserNotification(newMessage)) {
              lastBrowserNotificationRef.current = newMessage.id

              showBrowserNotification({
                title: otherUserName,
                body: preview,
              })
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected")
          return
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeStatus("disconnected")
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientUserId, currentUserId, otherUserName])

  useEffect(() => {
    const typingChannel = supabase
      .channel(`message-typing-${clientUserId}`, {
        config: {
          broadcast: {
            self: false,
          },
        },
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.userId === currentUserId) return
        if (payload?.clientUserId !== clientUserId) return

        setIsOtherUserTyping(true)

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }

        typingTimeoutRef.current = setTimeout(() => {
          setIsOtherUserTyping(false)
        }, 2500)
      })
      .subscribe()

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      supabase.removeChannel(typingChannel)
    }
  }, [clientUserId, currentUserId])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  function getAttachmentUrl(path: string) {
  return supabase.storage
    .from("message-attachments")
    .getPublicUrl(path).data.publicUrl
}

function getAttachmentDownloadUrl(
  path: string,
  fileName?: string | null
) {
  return supabase.storage
    .from("message-attachments")
    .getPublicUrl(path, {
      download: fileName || true,
    }).data.publicUrl
}

  return (
    <>
      <MessageToast message={toastMessage} />

      {realtimeStatus === "disconnected" && (
        <div className="rounded-[1rem] border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
          Realtime paused. New messages may appear after refresh.
        </div>
      )}

      {(!messages || messages.length === 0) && (
        <div className="rounded-[1rem] border border-dashed border-white/[0.08] bg-black/35 p-4 text-sm text-white/40">
          No messages yet. Send the first one below.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId
          const attachmentUrl = message.attachment_path
            ? getAttachmentUrl(message.attachment_path)
            : null

          const attachmentDownloadUrl = message.attachment_path
  ? getAttachmentDownloadUrl(
      message.attachment_path,
      message.attachment_name
    )
  : null  

          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] overflow-hidden rounded-[1.05rem] px-3 py-2.5 text-sm leading-5 shadow-[0_8px_20px_rgba(0,0,0,0.28)] ${
                  isOwn
                    ? "bg-smc-gold text-black"
                    : "border border-white/[0.07] bg-black/55 text-white"
                }`}
              >
                {unreadMessageIds.includes(message.id) && !isOwn && (
                  <span className="mb-1.5 inline-block rounded-full bg-smc-gold px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-black">
                    New
                  </span>
                )}

                <div className="space-y-2">
                  {message.body && (
                    <p className="whitespace-pre-wrap break-words">
                      {message.body}
                    </p>
                  )}

                  {attachmentUrl && message.attachment_type === "image" && (
                    <img
                      src={attachmentUrl}
                      alt={message.attachment_name || "Attachment"}
                      loading="lazy"
                      className="max-h-64 w-full rounded-[0.9rem] object-cover"
                    />
                  )}

                  {attachmentUrl && message.attachment_type === "video" && (
                    <video
                      controls
                      preload="metadata"
                      src={attachmentUrl}
                      className="max-h-64 w-full rounded-[0.9rem]"
                    />
                  )}

                  {attachmentUrl && message.attachment_type === "file" && (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex rounded-[0.8rem] px-3 py-2 text-xs font-bold underline ${
                        isOwn ? "bg-black/10 text-black" : "bg-white/[0.06] text-white"
                      }`}
                    >
                      {message.attachment_name || "View attachment"}
                    </a>
                  )}

                  {attachmentDownloadUrl && (
  <button
    type="button"
    disabled={downloadingMessageId === message.id}
    onClick={() =>
      handleAttachmentDownload(
        message.id,
        attachmentDownloadUrl,
        message.attachment_name
      )
    }
    className={`inline-flex items-center rounded-[0.75rem] px-2.5 py-1.5 text-[11px] font-bold transition disabled:cursor-wait disabled:opacity-60 ${
      isOwn
        ? "bg-black/10 text-black hover:bg-black/15"
        : "bg-white/[0.07] text-white/75 hover:bg-white/[0.11] hover:text-white"
    }`}
  >
    {downloadingMessageId === message.id
      ? "Preparing download..."
      : "Download"}
  </button>
)}
                </div>

                <p
                  className={`mt-1.5 text-[10px] leading-none ${
                    isOwn ? "text-black/55" : "text-white/30"
                  }`}
                >
                  {hasMounted
                    ? new Date(message.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
              </div>
            </div>
          )
        })}

        {isOtherUserTyping && (
          <div className="flex justify-start">
            <div className="rounded-[1rem] border border-white/[0.07] bg-black/55 px-3 py-2 text-xs text-white/40">
              {otherUserName} is typing...
            </div>
          </div>
        )}
      </div>

      <div ref={bottomRef} />
    </>
  )
}