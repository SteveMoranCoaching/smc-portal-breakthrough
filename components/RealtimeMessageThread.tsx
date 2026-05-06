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
      className="w-full rounded-2xl border border-gray-800 bg-gray-950 p-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-yellow-400"
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
  const [toastMessage, setToastMessage] = useState<{
    sender: string
    body: string
  } | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBrowserNotificationRef = useRef<string | null>(null)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
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

  useEffect(() => {
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

            setToastMessage({
              sender: otherUserName,
              body: preview,
            })

            setTimeout(() => {
              setToastMessage(null)
            }, 3500)

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
      .subscribe()

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

  function getAttachmentUrl(path: string) {
    return supabase.storage.from("message-attachments").getPublicUrl(path).data
      .publicUrl
  }

  return (
    <>
      <MessageToast message={toastMessage} />

      {(!messages || messages.length === 0) && (
        <div className="rounded-2xl border border-dashed border-gray-800 bg-black p-5 text-sm text-gray-400">
          No messages yet. Send the first one below.
        </div>
      )}

      {messages.map((message) => {
        const isOwn = message.sender_id === currentUserId
        const attachmentUrl = message.attachment_path
          ? getAttachmentUrl(message.attachment_path)
          : null

        return (
          <div
            key={message.id}
            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                isOwn
                  ? "bg-yellow-400 text-black"
                  : "border border-gray-800 bg-black text-white"
              }`}
            >
              {unreadMessageIds.includes(message.id) && !isOwn && (
                <span className="mb-2 inline-block rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-bold uppercase text-black">
                  NEW
                </span>
              )}

              <div className="space-y-3">
                {message.body && (
                  <p className="whitespace-pre-wrap">{message.body}</p>
                )}

                {attachmentUrl && message.attachment_type === "image" && (
                  <img
                    src={attachmentUrl}
                    alt={message.attachment_name || "Attachment"}
                    className="max-h-80 w-full rounded-2xl object-cover"
                  />
                )}

                {attachmentUrl && message.attachment_type === "video" && (
                  <video
                    controls
                    src={attachmentUrl}
                    className="max-h-80 w-full rounded-2xl"
                  />
                )}

                {attachmentUrl && message.attachment_type === "file" && (
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex rounded-xl px-3 py-2 text-xs font-bold underline ${
                      isOwn ? "bg-black/10 text-black" : "bg-gray-900 text-white"
                    }`}
                  >
                    {message.attachment_name || "View attachment"}
                  </a>
                )}
              </div>

              <p
                className={`mt-2 text-[11px] ${
                  isOwn ? "text-black/60" : "text-gray-500"
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
          <div className="rounded-2xl border border-gray-800 bg-black px-4 py-3 text-xs text-gray-400">
            {otherUserName} is typing...
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </>
  )
}