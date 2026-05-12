import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/supabase"
import ProgrammeLibraryActions from "@/components/ProgrammeLibraryActions"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.45rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] shadow-[0_16px_38px_rgba(0,0,0,0.62)]"

const innerPanel = "rounded-[1.1rem] border border-white/[0.06] bg-black/35"

function getDayOrder(day: string) {
  const match = String(day || "").match(/\d+/)
  return match ? Number(match[0]) : 999
}

async function duplicateProgrammeForClient(formData: FormData) {
  "use server"

  const programmeId = String(formData.get("programmeId") || "")
  const targetUserId = String(formData.get("targetUserId") || "")

  if (!programmeId || !targetUserId) return

  const { data: sourceProgramme } = await supabase
    .from("programmes")
    .select("title, notes")
    .eq("id", programmeId)
    .single()

  if (!sourceProgramme) return

  const { data: sourceSessions } = await supabase
    .from("programme_sessions")
    .select("week_number, day, title, exercises")
    .eq("programme_id", programmeId)
    .order("week_number", { ascending: true })
    .order("created_at", { ascending: true })

  await supabase
    .from("programmes")
    .update({ is_active: false })
    .eq("user_id", targetUserId)

  const { data: newProgramme } = await supabase
    .from("programmes")
    .insert({
      user_id: targetUserId,
      title: `${sourceProgramme.title} Copy`,
      week_number: 1,
      notes: sourceProgramme.notes ?? "",
      is_active: true,
    })
    .select("id")
    .single()

  if (!newProgramme) return

  const sessionRows =
    sourceSessions?.map((session: any) => ({
      programme_id: newProgramme.id,
      week_number: session.week_number || 1,
      day: session.day,
      title: session.title,
      exercises: session.exercises,
    })) ?? []

  if (sessionRows.length > 0) {
    await supabase.from("programme_sessions").insert(sessionRows)
  }

  revalidatePath("/coach/programmes")
  redirect(`/coach/programmes/${newProgramme.id}/edit`)
}

export default async function ProgrammesPage() {
  const { data: programmes } = await supabase
    .from("programmes")
    .select(`
      id,
      user_id,
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
    .order("created_at", { ascending: false })

  const { data: clients } = await supabase
    .from("clients")
    .select("id, user_id, name, email")
    .order("name", { ascending: true })

  const clientsByUserId = new Map(
    (clients ?? []).map((client: any) => [client.user_id, client])
  )

  const programmeCount = programmes?.length ?? 0

  return (
    <main className="min-h-screen bg-black px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link
          href="/coach"
          className="inline-flex items-center rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/55 transition hover:border-smc-gold/35 hover:text-white"
        >
          ← Back to coach dashboard
        </Link>

        <section className={`${shellCard} p-5`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-smc-gold/80">
                Programmes
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                Programme Library
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                View, edit, duplicate, assign or delete programmes. Only one
                programme can be active for each client.
              </p>
            </div>

            <Link
              href="/coach/programmes/new"
              className="w-fit rounded-full bg-smc-gold px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:brightness-110"
            >
              Create Programme
            </Link>
          </div>
        </section>

        <section className={`${shellCard} p-4 sm:p-5`}>
          <div className="relative z-10">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-smc-gold/75">
                  Existing Programmes
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  All Programmes
                </h2>
              </div>

              <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-black uppercase text-white/45">
                {programmeCount} total
              </span>
            </div>

            {programmeCount === 0 ? (
              <div className={`${innerPanel} p-4 text-sm text-white/45`}>
                No programmes created yet.
              </div>
            ) : (
              <div className="space-y-3">
                {programmes?.map((programme: any) => {
                  const client = clientsByUserId.get(programme.user_id)

                  const sessions = [...(programme.programme_sessions ?? [])].sort(
                    (a: any, b: any) => {
                      const weekA = Number(a.week_number || 1)
                      const weekB = Number(b.week_number || 1)

                      if (weekA !== weekB) return weekA - weekB

                      return getDayOrder(a.day) - getDayOrder(b.day)
                    }
                  )

                  const weekCount =
                    sessions.length > 0
                      ? Math.max(
                          ...sessions.map((session: any) =>
                            Number(session.week_number || 1)
                          )
                        )
                      : 1

                  const exerciseCount = sessions.reduce(
                    (total: number, session: any) =>
                      total + (session.exercises?.length ?? 0),
                    0
                  )

                  return (
                    <details
                      key={programme.id}
                      className={`${innerPanel} group overflow-hidden`}
                    >
                      <summary className="cursor-pointer list-none p-3.5 transition hover:bg-white/[0.025]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-smc-gold/75">
                                {weekCount} week{weekCount === 1 ? "" : "s"}
                              </p>

                              <span
                                className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                                  programme.is_active
                                    ? "border-smc-gold/25 bg-smc-gold/10 text-smc-gold"
                                    : "border-white/[0.07] bg-white/[0.03] text-white/35"
                                }`}
                              >
                                {programme.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>

                            <h3 className="mt-1 truncate text-base font-black text-white">
                              {programme.title || "Untitled programme"}
                            </h3>

                            <p className="mt-1 truncate text-xs text-white/40">
                              {client?.name ?? "Unknown client"} ·{" "}
                              {sessions.length} sessions · {exerciseCount}{" "}
                              exercises
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <Link
                              href={`/coach/programmes/${programme.id}/edit`}
                              className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-smc-gold transition hover:bg-smc-gold hover:text-black"
                            >
                              Edit
                            </Link>

                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.07] bg-black/35 text-lg text-white/45 group-open:hidden">
                              +
                            </span>

                            <span className="hidden h-8 w-8 items-center justify-center rounded-full border border-white/[0.07] bg-black/35 text-lg text-white/45 group-open:flex">
                              −
                            </span>
                          </div>
                        </div>
                      </summary>

                      <div className="space-y-3 border-t border-white/[0.06] p-3.5">
                        {programme.notes && (
                          <p className="rounded-[0.9rem] border border-white/[0.05] bg-white/[0.025] p-3 text-xs leading-5 text-white/50">
                            {programme.notes}
                          </p>
                        )}

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {client?.id && (
                            <Link
                              href={`/coach/${client.id}`}
                              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:border-smc-gold/25 hover:text-smc-gold"
                            >
                              View Client
                            </Link>
                          )}

                          <ProgrammeLibraryActions
                            programmeId={programme.id}
                            userId={programme.user_id}
                            isActive={Boolean(programme.is_active)}
                            programmeTitle={
                              programme.title || "Untitled programme"
                            }
                          />
                        </div>

                        <form
                          action={duplicateProgrammeForClient}
                          className="rounded-[1rem] border border-white/[0.055] bg-black/35 p-3"
                        >
                          <input
                            type="hidden"
                            name="programmeId"
                            value={programme.id}
                          />

                          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                            Duplicate / assign to client
                          </label>

                          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <select
                              name="targetUserId"
                              required
                              defaultValue=""
                              className="w-full rounded-[0.95rem] border border-white/[0.08] bg-black/45 px-3 py-3 text-sm text-white outline-none focus:border-smc-gold/45"
                            >
                              <option value="">Choose client</option>
                              {clients?.map((targetClient: any) => (
                                <option
                                  key={targetClient.id}
                                  value={targetClient.user_id}
                                >
                                  {targetClient.name} — {targetClient.email}
                                </option>
                              ))}
                            </select>

                            <button
                              type="submit"
                              className="rounded-full bg-smc-gold px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:brightness-110"
                            >
                              Duplicate
                            </button>
                          </div>

                          <p className="mt-2 text-xs leading-5 text-white/35">
                            This creates a copy for the selected client and
                            automatically makes it their active programme.
                          </p>
                        </form>

                        <div className="grid gap-2.5 md:grid-cols-2">
                          {sessions.map((session: any) => (
                            <div
                              key={session.id}
                              className="rounded-[1rem] border border-white/[0.055] bg-black/35 p-3"
                            >
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold/70">
                                Week {session.week_number || 1} · {session.day}
                              </p>

                              <h4 className="mt-0.5 truncate text-sm font-black text-white">
                                {session.title || "Untitled session"}
                              </h4>

                              <p className="mt-1 text-xs text-white/35">
                                {session.exercises?.length ?? 0} exercises
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}