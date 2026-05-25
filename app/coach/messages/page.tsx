import Link from "next/link"
import CoachMessagesInbox from "@/components/CoachMessagesInbox"
import { requireCoach } from "@/lib/authGuards"

export const dynamic = "force-dynamic"

export default async function CoachMessagesInboxPage() {
  const { supabase, user } = await requireCoach()

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