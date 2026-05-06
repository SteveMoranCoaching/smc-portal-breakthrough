import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import RealtimeMessageThread from "@/components/RealtimeMessageThread"
import MessageComposer from "@/components/MessageComposer"
import NotificationPermissionButton from "@/components/NotificationPermissionButton"

export const dynamic = "force-dynamic"

export default async function CoachClientMessagesPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        You must be logged in.
      </main>
    )
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        Coach access only.
      </main>
    )
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, user_id, name, email")
    .eq("user_id", clientId)
    .single()

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("client_user_id", clientId)
    .order("created_at", { ascending: true })

  const unreadMessageIds =
    messages
      ?.filter(
        (message) =>
          message.sender_id === clientId && message.read_by_coach === false
      )
      .map((message) => message.id) || []

  if (unreadMessageIds.length > 0) {
    await supabase
      .from("messages")
      .update({ read_by_coach: true })
      .in("id", unreadMessageIds)
  }

  const clientName = client?.name || client?.email || "Client"

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl flex-col">
        <header className="mb-5">
          <Link href="/coach/messages" className="text-sm text-yellow-400">
            ← Back to Messages
          </Link>

          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            Client Thread
          </p>
          <h1 className="mt-2 text-3xl font-bold">{clientName}</h1>
        </header>

        <div className="mb-4">
          <NotificationPermissionButton />
        </div>

        <section className="flex-1 space-y-3 rounded-3xl border border-gray-800 bg-gray-950 p-4">
          <RealtimeMessageThread
            initialMessages={messages || []}
            currentUserId={user.id}
            clientUserId={clientId}
            unreadMessageIds={unreadMessageIds}
            otherUserName={clientName}
          />
        </section>

        <MessageComposer
          currentUserId={user.id}
          recipientId={clientId}
          clientUserId={clientId}
          isCoach={true}
          placeholder="Write a message..."
        />
      </div>
    </main>
  )
}