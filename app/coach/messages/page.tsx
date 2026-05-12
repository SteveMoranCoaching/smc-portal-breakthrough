import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import CoachMessagesInbox from "@/components/CoachMessagesInbox"

export const dynamic = "force-dynamic"

export default async function CoachMessagesInboxPage() {
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

  const { data: clients } = await supabase
    .from("clients")
    .select("id, user_id, name, email")
    .order("name", { ascending: true })

  const { data: allMessages } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })

  return (
  <div className="mx-auto max-w-3xl">
    <header className="mb-6">
      <Link href="/coach" className="text-sm text-yellow-400">
        ← Back to Coach Dashboard
      </Link>

      <p className="mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
        SMC Coach
      </p>

      <h1 className="mt-2 text-3xl font-bold">Messages</h1>

      <p className="mt-2 text-sm text-gray-400">
        View and reply to client messages.
      </p>
    </header>

    <CoachMessagesInbox
      initialClients={clients || []}
      initialMessages={allMessages || []}
      currentUserId={user.id}
    />
  </div>
)
}