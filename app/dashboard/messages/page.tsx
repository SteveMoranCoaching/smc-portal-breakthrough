import { createSupabaseServerClient } from "@/lib/supabaseServer"
import RealtimeMessageThread from "@/components/RealtimeMessageThread"
import MessageComposer from "@/components/MessageComposer"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.68)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

export default async function ClientMessagesPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-black px-3 py-4 text-white">
        <div className={`${shellCard} mx-auto w-full max-w-2xl`}>
          <div className="relative z-10 text-sm text-white/50">
            You must be logged in.
          </div>
        </div>
      </main>
    )
  }

  const { data: client } = await supabase
  .from("clients")
  .select("coach_user_id")
  .eq("user_id", user.id)
  .single()

const coachId = client?.coach_id

if (!coachId) {
  return (
    <main className="min-h-screen bg-black px-3 py-4 text-white">
      <div className={`${shellCard} mx-auto w-full max-w-2xl`}>
        <div className="relative z-10 text-sm text-white/50">
          Coach account not linked yet.
        </div>
      </div>
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.08),transparent_30%),#050505] px-3 py-4 pb-28 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-2xl flex-col gap-3">
        <section className={shellCard}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent" />

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                  SMC Messages
                </p>

                <h1 className="mt-1.5 text-xl font-black leading-tight tracking-tight text-white">
                  Coach Chat
                </h1>

                <p className="mt-1 text-xs leading-5 text-white/45">
                  Your direct line to Steve for training questions, feedback and
                  support.
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-green-400">
                Direct
              </span>
            </div>
          </div>
        </section>

        <section className="max-h-[52vh] min-h-[34vh] flex-1 overflow-y-auto rounded-[1.35rem] border border-white/[0.06] bg-[#05070c]/80 p-3 shadow-[0_14px_34px_rgba(0,0,0,0.62)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <RealtimeMessageThread
            initialMessages={messages || []}
            currentUserId={user.id}
            clientUserId={user.id}
            otherUserName="Steve"
          />
        </section>

        <MessageComposer
          currentUserId={user.id}
          recipientId={client.coach_user_id}
          clientUserId={user.id}
          isCoach={false}
          placeholder="Write a message..."
        />
      </div>
    </main>
  )
}