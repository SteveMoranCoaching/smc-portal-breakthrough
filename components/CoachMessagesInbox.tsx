"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Client = {
  id: string
  user_id: string
  name: string | null
  email: string | null
}

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

type MessageThread = {
  client: Client
  latestMessage: Message
  unreadCount: number
}

function getPreview(message: Message) {
  if (message.body?.trim()) return message.body.trim()

  if (message.attachment_type === "image") return "Sent an image"
  if (message.attachment_type === "video") return "Sent a video"
  if (message.attachment_name) return `Sent ${message.attachment_name}`

  return "Sent an attachment"
}

function formatMessageTime(dateString: string) {
  const date = new Date(dateString)

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function buildThreads(clients: Client[], messages: Message[]): MessageThread[] {
  return clients
    .map((client) => {
      const clientMessages = messages.filter(
        (message) => message.client_user_id === client.user_id
      )

      const latestMessage = clientMessages[0]

      const unreadCount = clientMessages.filter(
        (message) =>
          message.sender_id === client.user_id &&
          message.read_by_coach === false
      ).length

      return {
        client,
        latestMessage,
        unreadCount,
      }
    })
    .filter((thread): thread is MessageThread => Boolean(thread.latestMessage))
    .sort(
      (a, b) =>
        new Date(b.latestMessage.created_at).getTime() -
        new Date(a.latestMessage.created_at).getTime()
    )
}

export default function CoachMessagesInbox({
  initialClients,
  initialMessages,
  currentUserId,
}: {
  initialClients: Client[]
  initialMessages: Message[]
  currentUserId: string
}) {
  const [hasMounted, setHasMounted] = useState(false)
  const [clients] = useState<Client[]>(initialClients || [])
  const [messages, setMessages] = useState<Message[]>(initialMessages || [])
  const [search, setSearch] = useState("")
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting")

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    setRealtimeStatus("connecting")

    const channel = supabase
      .channel(`coach-messages-inbox-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        async () => {
          const { data } = await supabase
            .from("messages")
            .select("*")
            .order("created_at", { ascending: false })

          setMessages((data || []) as Message[])
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
  }, [currentUserId])

  const messageThreads = useMemo(
    () => buildThreads(clients, messages),
    [clients, messages]
  )

  const totalUnread = useMemo(
    () => messageThreads.reduce((total, thread) => total + thread.unreadCount, 0),
    [messageThreads]
  )

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return messageThreads

    return messageThreads.filter((thread) => {
      const clientName = thread.client.name?.toLowerCase() || ""
      const clientEmail = thread.client.email?.toLowerCase() || ""
      const preview = getPreview(thread.latestMessage).toLowerCase()

      return (
        clientName.includes(query) ||
        clientEmail.includes(query) ||
        preview.includes(query)
      )
    })
  }, [messageThreads, search])

  return (
    <>
      <div className="mb-4 space-y-3 rounded-3xl border border-gray-800 bg-gray-950 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">
              Inbox
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {messageThreads.length} active thread
              {messageThreads.length === 1 ? "" : "s"}
              {totalUnread > 0 ? ` · ${totalUnread} unread` : ""}
            </p>
          </div>

          {realtimeStatus === "disconnected" && (
            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
              Reconnect on refresh
            </span>
          )}
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by client, email, or message..."
          className="w-full rounded-2xl border border-gray-800 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-yellow-400"
        />
      </div>

      <section className="space-y-3">
        {filteredThreads.length > 0 ? (
          filteredThreads.map((thread) => {
            const client = thread.client
            const latestMessage = thread.latestMessage
            const unreadCount = thread.unreadCount
            const sentByCoach = latestMessage.sender_id === currentUserId
            const preview = getPreview(latestMessage)

            return (
              <Link
                key={client.id}
                href={`/coach/messages/${client.user_id}`}
                className={`block rounded-3xl border p-4 transition active:scale-[0.99] ${
                  unreadCount > 0
                    ? "border-yellow-500/40 bg-yellow-500/10 hover:border-yellow-400"
                    : "border-gray-800 bg-gray-950 hover:border-yellow-400"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-bold text-white">
                        {client.name || client.email || "Unnamed Client"}
                      </h2>

                      {unreadCount > 0 && (
                        <span className="rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-bold uppercase text-black">
                          Needs reply
                        </span>
                      )}
                    </div>

                    {client.email && client.name && (
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {client.email}
                      </p>
                    )}

                    <p
                      className={`mt-2 line-clamp-2 text-sm ${
                        unreadCount > 0
                          ? "font-semibold text-white"
                          : "text-gray-400"
                      }`}
                    >
                      {sentByCoach ? "You: " : ""}
                      {preview}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {hasMounted
                        ? formatMessageTime(latestMessage.created_at)
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {unreadCount > 0 && (
                      <div className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-yellow-400 px-2 text-xs font-bold text-black">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </div>
                    )}

                    <span className="text-xs text-gray-600">Open →</span>
                  </div>
                </div>
              </Link>
            )
          })
        ) : (
          <div className="rounded-3xl border border-gray-800 bg-gray-950 p-5 text-sm text-gray-400">
            {search.trim() ? (
              <>
                <p className="font-semibold text-white">No matches found.</p>
                <p className="mt-1">
                  Try searching by client name, email, or something from the
                  message preview.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-white">
                  No client conversations yet.
                </p>
                <p className="mt-1">
                  Once clients send messages, their threads will appear here.
                </p>
              </>
            )}
          </div>
        )}
      </section>
    </>
  )
}