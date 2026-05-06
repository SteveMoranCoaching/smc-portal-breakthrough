import { createSupabaseServerClient } from "@/lib/supabaseServer"
import RealtimeMessageThread from "@/components/RealtimeMessageThread"
import MessageComposer from "@/components/MessageComposer"
import NotificationPermissionButton from "@/components/NotificationPermissionButton"

export const dynamic = "force-dynamic"

export default async function ClientMessagesPage() {
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

  const { data: coach } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "coach")
    .limit(1)
    .single()

  if (!coach) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        Coach account not found.
      </main>
    )
  }

  await supabase
    .from("messages")
    .update({ read_by_client: true })
    .eq("client_user_id", user.id)
    .eq("recipient_id", user.id)
    .eq("read_by_client", false)

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("client_user_id", user.id)
    .order("created_at", { ascending: true })

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl flex-col">
        <header className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            SMC Messages
          </p>
          <h1 className="mt-2 text-3xl font-bold">Coach Chat</h1>
          <p className="mt-2 text-sm text-gray-400">
            Message your coach directly from here.
          </p>
        </header>

        <div className="mb-4">
          <NotificationPermissionButton />
        </div>

        <section className="flex-1 space-y-3 rounded-3xl border border-gray-800 bg-gray-950 p-4">
          <RealtimeMessageThread
            initialMessages={messages || []}
            currentUserId={user.id}
            clientUserId={user.id}
            otherUserName="Steve"
          />
        </section>

        <MessageComposer
          currentUserId={user.id}
          recipientId={coach.id}
          clientUserId={user.id}
          isCoach={false}
          placeholder="Write a message..."
        />
      </div>
    </main>
  )
}