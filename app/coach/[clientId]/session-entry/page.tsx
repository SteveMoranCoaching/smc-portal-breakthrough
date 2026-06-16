import Link from "next/link"
import { requireCoach } from "@/lib/authGuards"
import CoachSessionEntryForm from "@/components/CoachSessionEntryForm"
import { addCoachSession } from "./actions"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.45rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] shadow-[0_16px_38px_rgba(0,0,0,0.62)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

const labelStyle =
  "text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold/80"

export default async function CoachSessionEntryPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const { supabase } = await requireCoach()

  const { data: client } = await supabase
    .from("clients")
    .select("id, user_id, name, email")
    .eq("id", clientId)
    .single()

  if (!client) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        Client not found.
      </main>
    )
  }

  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select(`
      id,
      title,
      week_number,
      notes,
      created_at,
      is_active,
      programme_sessions (
        id,
        week_number,
        day,
        title,
        exercises
      )
    `)
    .eq("user_id", client.user_id)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })

  const { data: previousLogs } = await supabase
    .from("workout_logs")
    .select("id, exercise_name, sets_completed, created_at, session_id, programme_id")
    .eq("user_id", client.user_id)
    .order("created_at", { ascending: false })

  return (
    <main className="min-h-screen bg-black px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link
          href={`/coach/${client.id}`}
          className="inline-flex items-center rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/55 transition hover:border-smc-gold/35 hover:text-white"
        >
          ← Back to client
        </Link>

        <section className={`${shellCard} p-4 sm:p-5`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent" />

          <div className="relative z-10">
            <p className={labelStyle}>Coach Session Entry</p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Add Coach Session
            </h1>

            <p className="mt-1 text-sm text-white/45">
              {client.name} · {client.email}
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
              Log an in-person or coach-led session for this client. These logs
              will appear as completed for the client and feed the coach overview.
            </p>
          </div>
        </section>

        {programmesError && (
          <div className="rounded-[1rem] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            Could not load programmes: {programmesError.message}
          </div>
        )}

        {!programmes || programmes.length === 0 ? (
          <section className={`${shellCard} p-4 sm:p-5`}>
            <div className="relative z-10">
              <p className={labelStyle}>No Programmes</p>
              <h2 className="mt-1 text-xl font-black text-white">
                Nothing to log yet
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/45">
                This client does not have any programmes uploaded yet.
              </p>
            </div>
          </section>
        ) : (
          <CoachSessionEntryForm
            clientId={client.id}
            programmes={programmes}
            previousLogs={previousLogs || []}
            action={addCoachSession}
          />
        )}
      </div>
    </main>
  )
}
