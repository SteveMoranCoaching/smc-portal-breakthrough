
import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

type Enquiry = {
  id: string
  created_at: string
  full_name: string
  email: string
  coaching_method: string
  preferred_start: string | null
  status: string
}

const statusStyles: Record<string, string> = {
  new: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  contacted: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  consultation: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  converted: "border-green-500/40 bg-green-500/10 text-green-300",
  closed: "border-white/20 bg-white/5 text-white/50",
}

const enquiryFilters = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Consultation", value: "consultation" },
  { label: "Converted", value: "converted" },
  { label: "Closed", value: "closed" },
]

export default async function CoachEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams

  const activeFilter = enquiryFilters.some(
    (filter) => filter.value === status
  )
    ? status!
    : "all"
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

  if (profile?.role !== "coach") {
    redirect("/dashboard")
  }

  const { data, error } = await supabase
    .from("coaching_enquiries")
    .select(
      "id, created_at, full_name, email, coaching_method, preferred_start, status"
    )
    .order("created_at", { ascending: false })

  const enquiries = (data ?? []) as Enquiry[]
  const newCount = enquiries.filter(
    (enquiry) => enquiry.status === "new"
  ).length

  const filteredEnquiries = enquiries
  .filter(
    (enquiry) =>
      activeFilter === "all" ||
      enquiry.status === activeFilter
  )
  .sort((a, b) => {
    if (activeFilter === "all") {
      if (a.status === "new" && b.status !== "new") return -1
      if (a.status !== "new" && b.status === "new") return 1
    }

    return (
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
          SMC Coaching
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          Coaching Enquiries
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Manage prospective clients and coaching conversations.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-white/50">Total Enquiries</p>
          <p className="mt-2 text-3xl font-bold">
            {enquiries.length}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
          <p className="text-sm text-amber-300">
            New Enquiries
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-300">
            {newCount}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
  {enquiryFilters.map((filter) => {
    const isActive = activeFilter === filter.value

    const count =
      filter.value === "all"
        ? enquiries.length
        : enquiries.filter(
            (enquiry) => enquiry.status === filter.value
          ).length

    return (
      <Link
        key={filter.value}
        href={
          filter.value === "all"
            ? "/coach/enquiries"
            : `/coach/enquiries?status=${filter.value}`
        }
        className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
          isActive
            ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
            : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/25 hover:text-white"
        }`}
      >
        {filter.label}

        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            isActive
              ? "bg-amber-500/20 text-amber-300"
              : "bg-white/[0.06] text-white/40"
          }`}
        >
          {count}
        </span>
      </Link>
    )
  })}
</div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
          Unable to load enquiries. Please check database access.
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-lg font-semibold">
  {enquiries.length === 0
    ? "No enquiries yet"
    : "No enquiries in this category"}
</p>

<p className="mt-2 text-sm text-white/50">
  {enquiries.length === 0
    ? "New coaching enquiries will appear here."
    : "Try another status filter to view your enquiries."}
</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEnquiries.map((enquiry) => (
            <Link
              key={enquiry.id}
              href={`/coach/enquiries/${enquiry.id}`}
              className="block rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-amber-500/40 hover:bg-white/[0.07]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {enquiry.full_name}
                  </h2>
                  <p className="mt-1 break-all text-sm text-white/50">
                    {enquiry.email}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                    statusStyles[enquiry.status] ??
                    statusStyles.closed
                  }`}
                >
                  {enquiry.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
                <span>{enquiry.coaching_method}</span>
                {enquiry.preferred_start && (
                  <span>{enquiry.preferred_start}</span>
                )}
                <span>
                  {new Date(enquiry.created_at).toLocaleDateString(
                    "en-GB",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
