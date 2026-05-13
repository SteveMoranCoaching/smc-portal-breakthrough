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
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-6 pb-28 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-x-[-120px] top-[-180px] h-[420px] rounded-full bg-smc-gold/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-120px] top-[260px] h-[320px] w-[320px] rounded-full bg-smc-gold/6 blur-[120px]" />

      <GlobalMessageNotifications currentUserId={user.id} />

      <div className="relative z-10 mx-auto max-w-5xl space-y-6">
        <header className="relative overflow-hidden rounded-[2rem] border border-smc-gold/18 bg-black shadow-[0_18px_44px_rgba(0,0,0,0.78)]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_30%,rgba(212,175,55,0.045)_75%,transparent)]" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(212,175,55,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/70 to-transparent" />

          <div className="relative z-10 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-smc-gold">
                SMC Coach
              </p>

              <h1 className="mt-1 text-[1.75rem] font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.8)]">
                Coach Portal
              </h1>
            </div>

            <nav className="flex flex-wrap gap-2">
              <Link
                href="/coach"
                className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/[0.08] bg-black/38 px-5 py-2 text-sm font-semibold text-white/72 backdrop-blur-md transition hover:border-smc-gold/35 hover:bg-smc-gold/10 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/coach/messages"
                className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/[0.08] bg-black/38 px-5 py-2 text-sm font-semibold text-white/72 backdrop-blur-md transition hover:border-smc-gold/35 hover:bg-smc-gold/10 hover:text-white"
              >
                Messages
              </Link>

              <Link
                href="/coach/review"
                className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-smc-gold px-5 py-2 text-sm font-black text-black shadow-[0_0_28px_rgba(212,175,55,0.28)] transition hover:brightness-110 active:scale-[0.98]"
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