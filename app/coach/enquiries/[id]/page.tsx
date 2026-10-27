
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import EnquiryManagement from "@/components/EnquiryManagement"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ id: string }>
}

function Detail({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <div className="border-b border-white/10 py-4 last:border-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
        {label}
      </p>
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/90">
        {value || "Not provided"}
      </p>
    </div>
  )
}

export default async function EnquiryDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") redirect("/dashboard")

  const { data: enquiry, error } = await supabase
    .from("coaching_enquiries")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error("Unable to load coaching enquiry.")
  }

  if (!enquiry) notFound()

  const goals = Array.isArray(enquiry.goals)
    ? enquiry.goals.join(", ")
    : null

  const emailLink = `mailto:${enquiry.email}`

  const phoneDigits = String(enquiry.phone || "").replace(
    /[^\d+]/g,
    ""
  )

  const whatsappLink = `https://wa.me/${phoneDigits.replace(
    /\D/g,
    ""
  )}`

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <Link
        href="/coach/enquiries"
        className="inline-flex text-sm text-amber-400 hover:text-amber-300"
      >
        ← Back to enquiries
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
            Coaching Enquiry
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {enquiry.full_name}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Submitted{" "}
            {new Date(enquiry.created_at).toLocaleString(
              "en-GB",
              {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </p>
        </div>

        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold capitalize text-amber-300">
          {enquiry.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={emailLink}
          className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black hover:bg-amber-300"
        >
          Email Applicant
        </a>

        {phoneDigits && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white/10"
          >
            WhatsApp
          </a>
        )}

        {phoneDigits && (
          <a
            href={`tel:${phoneDigits}`}
            className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white/10"
          >
            Call
          </a>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-3 text-lg font-bold">
            Contact & Preferences
          </h2>

          <Detail label="Email" value={enquiry.email} />
          <Detail label="Phone" value={enquiry.phone} />
          <Detail label="Gender" value={enquiry.gender} />
          <Detail
            label="Preferred Contact"
            value={enquiry.preferred_contact}
          />
          <Detail
            label="When They Want to Start"
            value={enquiry.preferred_start}
          />
          <Detail
            label="Where They Heard About SMC"
            value={enquiry.referral_source}
          />
          <Detail
            label="Referral Details"
            value={enquiry.referral_details}
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-3 text-lg font-bold">
            Coaching & Training
          </h2>

          <Detail
            label="Coaching Method"
            value={enquiry.coaching_method}
          />
          <Detail label="Goals" value={goals} />
          <Detail
            label="Weekly Training Hours"
            value={enquiry.weekly_training_hours}
          />
          <Detail
            label="Training Experience"
            value={enquiry.training_experience}
          />
          <Detail
            label="Health Considerations"
            value={enquiry.health_considerations}
          />
          <Detail
            label="Additional Information"
            value={enquiry.additional_information}
          />
        </section>
      </div>

      <EnquiryManagement
  enquiryId={enquiry.id}
  initialStatus={enquiry.status}
  initialNotes={enquiry.coach_notes ?? ""}
/>
    </div>
  )
}
