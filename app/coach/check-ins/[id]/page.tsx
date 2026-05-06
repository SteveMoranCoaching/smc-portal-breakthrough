import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; reviewed?: string }>
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

async function saveCoachFeedback(formData: FormData) {
  "use server"

  const id = String(formData.get("id") || "")
  const coach_feedback = String(formData.get("coach_feedback") || "").trim()

  if (!id) return

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from("check_ins")
    .update({
  coach_feedback,
  reviewed: true,
  feedback_seen: false,
})
    .eq("id", id)

  if (error) {
    redirect(`/coach/check-ins/${id}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/coach")
  revalidatePath(`/coach/check-ins/${id}`)

  redirect(`/coach/check-ins/${id}?saved=true`)
}

async function markAsReviewed(formData: FormData) {
  "use server"

  const id = String(formData.get("id") || "")

  if (!id) return

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from("check_ins")
    .update({
      reviewed: true,
    })
    .eq("id", id)

  if (error) {
    redirect(`/coach/check-ins/${id}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/coach")
  revalidatePath(`/coach/check-ins/${id}`)

  redirect(`/coach/check-ins/${id}?reviewed=true`)
}

export default async function CoachCheckInReviewPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const { saved, reviewed } = await searchParams

  const supabase = await createSupabaseServerClient()

  const { data: checkIn, error } = await supabase
  .from("check_ins")
  .select(`
    id,
    user_id,
    created_at,
    bodyweight,
    training_rating,
    recovery_rating,
    nutrition_rating,
    cardio_steps,
    notes,
    reviewed,
    coach_feedback
  `)
  .eq("id", id)
  .single()

const { data: client } = await supabase
  .from("clients")
  .select("name")
  .eq("user_id", checkIn?.user_id)
  .single()

  if (error || !checkIn) {
    return (
      <main className="min-h-screen bg-black p-4 text-white sm:p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-800 bg-gray-950 p-5">
          <h1 className="text-xl font-bold">Check-in not found</h1>
          <p className="mt-2 text-sm text-gray-400">
            {error?.message || "This check-in could not be loaded."}
          </p>

          <Link
            href="/coach"
            className="mt-5 inline-flex rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black"
          >
            Back to coach dashboard
          </Link>
        </div>
      </main>
    )
  }

  const clientName = client?.name

  return (
    <main className="min-h-screen bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/coach" className="text-sm text-gray-400 hover:text-white">
            ← Back to coach dashboard
          </Link>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              checkIn.reviewed
                ? "bg-yellow-400 text-black"
                : "border border-yellow-400 text-yellow-400"
            }`}
          >
            {checkIn.reviewed ? "Reviewed" : "NEW"}
          </span>
        </div>

        {saved && (
          <div className="rounded-2xl border border-yellow-400 bg-yellow-400/10 p-4 text-sm font-semibold text-yellow-300">
            Coach feedback saved.
          </div>
        )}

        {reviewed && (
          <div className="rounded-2xl border border-yellow-400 bg-yellow-400/10 p-4 text-sm font-semibold text-yellow-300">
            Check-in marked as reviewed.
          </div>
        )}

        <section className="rounded-3xl border border-gray-800 bg-gray-950 p-5 sm:p-6">
          <p className="text-sm font-semibold text-yellow-400">Client check-in</p>

          <h1 className="mt-2 text-2xl font-bold">
            {clientName || "Unknown client"}
          </h1>

          <p className="mt-1 text-sm text-gray-400">
            {formatDate(checkIn.created_at)}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoCard label="Bodyweight" value={`${checkIn.bodyweight ?? "-"}kg`} />
            <InfoCard label="Cardio / Steps" value={checkIn.cardio_steps || "-"} />
            <InfoCard label="Training" value={`${checkIn.training_rating ?? "-"}/10`} />
            <InfoCard label="Recovery" value={`${checkIn.recovery_rating ?? "-"}/10`} />
            <InfoCard label="Nutrition" value={`${checkIn.nutrition_rating ?? "-"}/10`} />
            <InfoCard
              label="Status"
              value={checkIn.reviewed ? "Reviewed" : "Needs review"}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-950 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-yellow-400">Client notes</h2>

          <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-gray-800 bg-black p-4 text-sm leading-6 text-gray-200">
            {checkIn.notes || "No notes added."}
          </p>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-950 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-yellow-400">Coach feedback</h2>

          {checkIn.coach_feedback && (
            <div className="mt-3 rounded-2xl border border-gray-800 bg-black p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Current feedback
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-200">
                {checkIn.coach_feedback}
              </p>
            </div>
          )}

          <form action={saveCoachFeedback} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={checkIn.id} />

            <textarea
              name="coach_feedback"
              defaultValue={checkIn.coach_feedback || ""}
              rows={7}
              placeholder="Write coach feedback here..."
              className="w-full rounded-2xl border border-gray-800 bg-black p-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-yellow-400"
            />

            <button
              type="submit"
              className="w-full rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
            >
              Save Feedback
            </button>
          </form>

          {!checkIn.reviewed && (
            <form action={markAsReviewed} className="mt-3">
              <input type="hidden" name="id" value={checkIn.id} />

              <button
                type="submit"
                className="w-full rounded-2xl border border-gray-800 bg-black px-5 py-3 text-sm font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400"
              >
                Mark as Reviewed
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}

function InfoCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-black p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  )
}