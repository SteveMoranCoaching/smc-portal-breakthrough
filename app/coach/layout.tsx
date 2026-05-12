import Link from "next/link"
import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import GlobalMessageNotifications from "@/components/GlobalMessageNotifications"

export const dynamic = "force-dynamic"

export default async function CoachLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        You do not have permission to view this page.
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 pb-28 text-white sm:px-6">
      <GlobalMessageNotifications currentUserId={user.id} />

      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-gray-800 bg-gray-950 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-yellow-400">
                SMC Coach
              </p>
              <h1 className="mt-1 text-xl font-bold">Coach Portal</h1>
            </div>

            <nav className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/coach"
                className="rounded-full border border-gray-800 px-4 py-2 text-gray-300 transition hover:border-yellow-500 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/coach/messages"
                className="rounded-full border border-gray-800 px-4 py-2 text-gray-300 transition hover:border-yellow-500 hover:text-white"
              >
                Messages
              </Link>

              <Link
                href="/coach/review"
                className="rounded-full bg-yellow-500 px-4 py-2 font-semibold text-black transition hover:bg-yellow-400"
              >
                Review
              </Link>
            </nav>
          </div>
        </header>

        {children}
      </div>
    </main>
  )
}