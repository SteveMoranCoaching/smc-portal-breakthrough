import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import SubmitButton from "@/components/SubmitButton"

export const dynamic = "force-dynamic"

const premiumCard =
  "relative overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] shadow-2xl"

const innerPanel =
  "rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.35)]"

const inputClass =
  "w-full rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-500/70"

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

async function submitCheckIn(formData: FormData) {
  "use server"

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/dashboard/check-ins?error=not-logged-in")
  }

  const { error } = await supabase.from("check_ins").insert({
    user_id: user.id,
    bodyweight: Number(formData.get("bodyweight")) || null,
    training_rating: Number(formData.get("training_rating")) || null,
    recovery_rating: Number(formData.get("recovery_rating")) || null,
    nutrition_rating: Number(formData.get("nutrition_rating")) || null,
    cardio_steps: String(formData.get("cardio_steps") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
    reviewed: false,
    feedback_seen: true,
  })

  if (error) {
    console.error("Check-in submit error:", error)

    const message = encodeURIComponent(
      `${error.message}${error.details ? ` | Details: ${error.details}` : ""}${
        error.hint ? ` | Hint: ${error.hint}` : ""
      }${error.code ? ` | Code: ${error.code}` : ""}`
    )

    redirect(`/dashboard/check-ins?error=${message}`)
  }

  revalidatePath("/dashboard/check-ins")
  revalidatePath("/coach")

  redirect("/dashboard/check-ins?submitted=true")
}

export default async function CheckInsPage({
  searchParams,
}: {
  searchParams?:
    | { submitted?: string; error?: string }
    | Promise<{ submitted?: string; error?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-black p-5 text-white">
        You must be logged in.
      </main>
    )
  }

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const unseenFeedbackIds =
    checkIns
      ?.filter(
        (checkIn) =>
          checkIn.coach_feedback && checkIn.feedback_seen === false
      )
      .map((checkIn) => checkIn.id) || []

  const hasUnseenFeedback = unseenFeedbackIds.length > 0

  if (unseenFeedbackIds.length > 0) {
    await supabase
      .from("check_ins")
      .update({ feedback_seen: true })
      .in("id", unseenFeedbackIds)
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-5 text-white">
      <section className="mx-auto max-w-2xl space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
            SMC Check-In
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Weekly Check-In
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Submit your weekly update so your coach can review progress,
            recovery and training direction.
          </p>
        </div>

        {hasUnseenFeedback && (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4">
            <p className="text-sm font-black text-yellow-500">
              New coach feedback available
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              Scroll to the check-in marked “New feedback” to read your coach’s
              notes.
            </p>
          </div>
        )}

        {resolvedSearchParams?.submitted === "true" && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm font-bold text-green-400">
            Check-in submitted successfully.
          </div>
        )}

        {resolvedSearchParams?.error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-400">
            <p>Check-in could not be submitted.</p>
            <p className="mt-2 break-words font-mono text-xs text-red-300">
              {decodeURIComponent(resolvedSearchParams.error)}
            </p>
          </div>
        )}

        <form action={submitCheckIn} className={`${premiumCard} p-5`}>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-yellow-500">
                  Bodyweight
                </span>
                <input
                  name="bodyweight"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 89.5"
                  className={inputClass}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold text-yellow-500">
                  Steps / Cardio
                </span>
                <input
                  name="cardio_steps"
                  type="text"
                  placeholder="e.g. 8k steps daily"
                  className={inputClass}
                />
              </label>
            </div>

            <div className={`${innerPanel} p-4`}>
              <p className="mb-4 text-sm font-bold text-zinc-300">
                Rate your week
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-yellow-500">
                    Training
                  </span>
                  <input
                    name="training_rating"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="/10"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-yellow-500">
                    Recovery
                  </span>
                  <input
                    name="recovery_rating"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="/10"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-yellow-500">
                    Nutrition
                  </span>
                  <input
                    name="nutrition_rating"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="/10"
                    className={inputClass}
                  />
                </label>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-yellow-500">
                Notes / anything to highlight?
              </span>
              <textarea
                name="notes"
                rows={5}
                placeholder="Wins, struggles, missed sessions, sleep, stress, niggles, anything useful..."
                className={inputClass}
              />
            </label>

            <SubmitButton />
          </div>
        </form>

        <section className="space-y-4">
          <h2 className="text-xl font-black">Previous Check-Ins</h2>

          {checkIns && checkIns.length > 0 ? (
            checkIns.map((checkIn) => {
              const hasNewFeedback =
                checkIn.coach_feedback && checkIn.feedback_seen === false

              return (
                <article key={checkIn.id} className={`${premiumCard} p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-yellow-500">
                        {formatDate(checkIn.created_at)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                        {hasNewFeedback
                          ? "New coach feedback"
                          : checkIn.reviewed
                            ? "Your coach has reviewed this"
                            : "Awaiting coach review"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {hasNewFeedback && (
                        <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-black text-black">
                          NEW FEEDBACK
                        </span>
                      )}

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          checkIn.reviewed
                            ? "bg-yellow-500 text-black"
                            : "border border-yellow-500/40 bg-yellow-500/10 text-yellow-500"
                        }`}
                      >
                        {checkIn.reviewed ? "REVIEWED" : "AWAITING"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className={innerPanel + " p-3"}>
                      <p className="text-xs text-zinc-500">BW</p>
                      <p className="font-black text-yellow-500">
                        {checkIn.bodyweight ? `${checkIn.bodyweight}kg` : "-"}
                      </p>
                    </div>

                    <div className={innerPanel + " p-3"}>
                      <p className="text-xs text-zinc-500">Training</p>
                      <p className="font-black text-yellow-500">
                        {checkIn.training_rating ?? "-"}/10
                      </p>
                    </div>

                    <div className={innerPanel + " p-3"}>
                      <p className="text-xs text-zinc-500">Recovery</p>
                      <p className="font-black text-yellow-500">
                        {checkIn.recovery_rating ?? "-"}/10
                      </p>
                    </div>

                    <div className={innerPanel + " p-3"}>
                      <p className="text-xs text-zinc-500">Nutrition</p>
                      <p className="font-black text-yellow-500">
                        {checkIn.nutrition_rating ?? "-"}/10
                      </p>
                    </div>
                  </div>

                  {checkIn.cardio_steps && (
                    <p className="mt-4 text-sm text-zinc-300">
                      <span className="font-bold text-yellow-500">
                        Steps/Cardio:
                      </span>{" "}
                      {checkIn.cardio_steps}
                    </p>
                  )}

                  {checkIn.notes && (
                    <div className={`${innerPanel} mt-4 p-4`}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Your notes
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                        {checkIn.notes}
                      </p>
                    </div>
                  )}

                  {checkIn.coach_feedback ? (
                    <div
                      className={`mt-4 rounded-2xl border p-4 ${
                        hasNewFeedback
                          ? "border-yellow-500 bg-yellow-500/15"
                          : "border-yellow-500/40 bg-yellow-500/10"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-wide text-yellow-500">
                          Coach feedback
                        </p>

                        {hasNewFeedback && (
                          <span className="rounded-full bg-yellow-500 px-2 py-1 text-[10px] font-black text-black">
                            NEW
                          </span>
                        )}
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                        {checkIn.coach_feedback}
                      </p>
                    </div>
                  ) : checkIn.reviewed ? (
                    <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/40 p-4">
                      <p className="text-sm text-zinc-400">
                        Reviewed — no written feedback added.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/40 p-4">
                      <p className="text-sm text-zinc-500">
                        Feedback will appear here once reviewed.
                      </p>
                    </div>
                  )}
                </article>
              )
            })
          ) : (
            <div className={`${innerPanel} p-5 text-sm text-zinc-400`}>
              No check-ins submitted yet.
            </div>
          )}
        </section>
      </section>
    </main>
  )
}