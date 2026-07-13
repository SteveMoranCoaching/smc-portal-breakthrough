import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

function formatPBType(type: string | null) {
  if (type === "heaviest") return "Heaviest"
  if (type === "rep") return "Rep PB"
  return "PB"
}

function formatDate(date: string | null) {
  if (!date) return "Unknown date"

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

async function getCoachUser() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") redirect("/dashboard")

  return { supabase, user }
}

async function approvePBToTeamFeed(formData: FormData) {
  "use server"

  const pbId = String(formData.get("pbId") || "")
  if (!pbId) return

  const { supabase, user } = await getCoachUser()

  const { data: pb, error: pbError } = await supabase
    .from("exercise_pbs")
    .select(
      "id, user_id, exercise_name, pb_type, weight, reps, estimated_1rm"
    )
    .eq("id", pbId)
    .single()

  if (pbError || !pb) {
    console.error("PB fetch error:", pbError)
    return
  }

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("user_id", pb.user_id)
    .maybeSingle()

  const clientName = client?.name || "A client"
  const pbLabel = formatPBType(pb.pb_type)

  const { error: postError } = await supabase.from("team_feed_posts").insert({
    title: `${clientName} hit a ${pbLabel}`,
    body: `${clientName} just logged ${pb.weight}kg × ${pb.reps} on ${pb.exercise_name}.`,
    type: "PB",
  })

  if (postError) {
    console.error("Team feed post error:", postError)
    return
  }

  const { error: updateError } = await supabase
    .from("exercise_pbs")
    .update({
      team_feed_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", pbId)

  if (updateError) {
    console.error("PB approval update error:", updateError)
    return
  }

  revalidatePath("/coach")
  revalidatePath("/coach/pbs/review")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/smc-home")

  redirect("/coach/pbs/review?approved=true")
}

async function dismissPBFromTeamFeed(formData: FormData) {
  "use server"

  const pbId = String(formData.get("pbId") || "")
  if (!pbId) return

  const { supabase, user } = await getCoachUser()

  const { error } = await supabase
    .from("exercise_pbs")
    .update({
      team_feed_status: "dismissed",
      approved_at: null,
      approved_by: user.id,
    })
    .eq("id", pbId)

  if (error) {
    console.error("PB dismiss error:", error)
    return
  }

  revalidatePath("/coach")
  revalidatePath("/coach/pbs/review")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/smc-home")

  redirect("/coach/pbs/review?dismissed=true")
}

export default async function PBReviewPage({
  searchParams,
}: {
  searchParams?:
    | { approved?: string; dismissed?: string }
    | Promise<{ approved?: string; dismissed?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const { supabase } = await getCoachUser()

  const { data: pbs, error: pbError } = await supabase
    .from("exercise_pbs")
    .select(
      "id, user_id, exercise_name, pb_type, weight, reps, estimated_1rm, previous_best, created_at, team_feed_status"
    )
    .eq("team_feed_status", "pending")
    .neq("pb_type", "estimated_1rm")
    .order("created_at", { ascending: false })

  const { data: clients } = await supabase
    .from("clients")
    .select("id, user_id, name, email")

  const clientMap = new Map(
    (clients || []).map((client) => [client.user_id, client])
  )

  const pendingPBs = pbs || []

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-yellow-400">
              SMC Coach
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              PB Review
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Approve PBs for the community feed or keep them private.
            </p>
          </div>

          <Link
            href="/coach"
            className="rounded-2xl border border-white/[0.08] px-4 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-yellow-400/60 hover:text-yellow-300"
          >
            Back to Coach Dashboard
          </Link>
        </div>

        {resolvedSearchParams?.approved ? (
          <div className="rounded-[1.35rem] border border-green-400/20 bg-green-400/10 p-4 text-sm text-green-200">
            PB approved and posted to the community feed.
          </div>
        ) : null}

        {resolvedSearchParams?.dismissed ? (
          <div className="rounded-[1.35rem] border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-white/70">
            PB kept private. It will remain visible to the client but won’t be
            posted to the community feed.
          </div>
        ) : null}

        {pbError ? (
          <div className="rounded-[1.35rem] border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
            Couldn’t load pending PBs. Check the console/Supabase query.
          </div>
        ) : null}

        {pendingPBs.length === 0 ? (
          <section className="rounded-[1.5rem] border border-green-400/20 bg-green-400/10 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.5)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-300">
              All caught up
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              No PBs waiting for community approval.
            </h2>
            <p className="mt-2 text-sm text-green-100/70">
              Any dismissed PBs still stay private to the client.
            </p>

            <Link
              href="/coach"
              className="mt-5 inline-flex rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
            >
              Back to coach dashboard
            </Link>
          </section>
        ) : (
          <section className="grid gap-4">
            {pendingPBs.map((pb) => {
              const client = clientMap.get(pb.user_id)
              const clientName = client?.name || "Unknown client"
              const clientEmail = client?.email || "No email found"

              return (
                <article
                  key={pb.id}
                  className="rounded-[1.5rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.5)] sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold">{clientName}</h2>
                        <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                          Pending Community Approval
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-white/50">
                        {clientEmail}
                      </p>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                            Exercise
                          </p>
                          <p className="mt-1 font-semibold">
                            {pb.exercise_name}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                            PB Type
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatPBType(pb.pb_type)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                            Lift
                          </p>
                          <p className="mt-1 font-semibold">
                            {pb.weight}kg × {pb.reps}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                            Logged
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatDate(pb.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-sm text-white/65">
                        {pb.estimated_1rm ? (
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
                            Estimated 1RM: {pb.estimated_1rm}kg
                          </span>
                        ) : null}

                        {pb.previous_best ? (
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
                            Previous best: {pb.previous_best}kg
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <form action={approvePBToTeamFeed}>
                      <input type="hidden" name="pbId" value={pb.id} />
                      <button
                        type="submit"
                        className="w-full rounded-2xl bg-yellow-400 px-5 py-4 text-sm font-bold text-black transition hover:bg-yellow-300"
                      >
                        Approve to Community
                      </button>
                    </form>

                    <form action={dismissPBFromTeamFeed}>
                      <input type="hidden" name="pbId" value={pb.id} />
                      <button
                        type="submit"
                        className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.04] px-5 py-4 text-sm font-bold text-white/85 transition hover:border-white/25 hover:bg-white/[0.08]"
                      >
                        Keep Private
                      </button>
                    </form>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}