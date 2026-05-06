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
  if (message.body?.trim()) return message.body

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

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
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

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  const messageThreads = useMemo(
    () => buildThreads(clients, messages),
    [clients, messages]
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
      <div className="mb-4 rounded-3xl border border-gray-800 bg-gray-950 p-3">
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
                className={`block rounded-3xl border p-4 transition ${
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
                          NEW
                        </span>
                      )}
                    </div>

                    <p
                      className={`mt-2 truncate text-sm ${
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

                  {unreadCount > 0 && (
                    <div className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-yellow-400 px-2 text-xs font-bold text-black">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </div>
                  )}
                </div>
              </Link>
            )
          })
        ) : (
          <div className="rounded-3xl border border-gray-800 bg-gray-950 p-5 text-sm text-gray-400">
            {search.trim()
              ? "No conversations match that search."
              : "No client conversations yet."}
          </div>
        )}
      </section>
    </>
  )
}