import Link from "next/link"
import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import GlobalMessageNotifications from "@/components/GlobalMessageNotifications"

export const dynamic = "force-dynamic"

function SidebarBadge({
  count,
  muted = false,
}: {
  count: number
  muted?: boolean
}) {
  return (
    <span
      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black ${
        muted
          ? "border border-white/[0.08] bg-white/[0.04] text-white/45"
          : count > 0
            ? "border border-smc-gold/25 bg-smc-gold/15 text-smc-gold"
            : "border border-white/[0.08] bg-white/[0.04] text-white/35"
      }`}
    >
      {count}
    </span>
  )
}

export default async function CoachLayout({
  children,
}: {
  children: ReactNode
}) {
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
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        You do not have permission to view this page.
      </main>
    )
  }

  const { count: unreadMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .neq("sender_id", user.id)
    .eq("read_by_coach", false)

  const { count: clientCount } = await supabase
  .from("clients")
  .select("*", { count: "exact", head: true })
  .eq("status", "Active")

  const { data: unreviewedVideos } = await supabase
  .from("exercise_videos")
  .select("id, user_id, session_id")
  .eq("reviewed", false)

const { data: unreviewedLogs } = await supabase
  .from("workout_logs")
  .select("id, user_id, session_id")
  .eq("reviewed", false)

const unreviewedSessionKeys = new Set<string>()

;(unreviewedLogs || [])
  .filter((log: any) => log.session_id)
  .forEach((log: any) => {
    unreviewedSessionKeys.add(`${log.user_id}-${log.session_id}`)
  })

;(unreviewedVideos || [])
  .filter((video: any) => video.session_id)
  .forEach((video: any) => {
    unreviewedSessionKeys.add(`${video.user_id}-${video.session_id}`)
  })

const sessionReviewCount = unreviewedSessionKeys.size

  const { count: checkInCount } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true })
    .eq("reviewed", false)

  const { count: pendingPBCount } = await supabase
    .from("exercise_pbs")
    .select("*", { count: "exact", head: true })
    .eq("team_feed_status", "pending")
    .eq("pb_type", "estimated_1rm")

  const reviewQueueCount =
  sessionReviewCount + (checkInCount || 0)

  const navItems = [
    { label: "Dashboard", href: "/coach", icon: "⌂" },
    {
      label: "Review Queue",
      href: "/coach/review",
      icon: "✓",
      badge: reviewQueueCount,
    },
    {
      label: "PB Approvals",
      href: "/coach/pbs/review",
      icon: "★",
      badge: pendingPBCount || 0,
    },
    {
      label: "Messages",
      href: "/coach/messages",
      icon: "✉",
      badge: unreadMessages || 0,
    },
    {
      label: "Clients",
      href: "/coach/clients",
      icon: "◉",
      badge: clientCount || 0,
      mutedBadge: true,
    },
    { label: "Programming", href: "/coach/programmes", icon: "▦" },
    { label: "Calendar", href: "/coach/calendar", icon: "◷" },
    { label: "Exercise Demos", href: "/coach/exercise-demos", icon: "▶" },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-x-[-120px] top-[-180px] h-[420px] rounded-full bg-smc-gold/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-120px] top-[260px] h-[320px] w-[320px] rounded-full bg-smc-gold/6 blur-[120px]" />

      <GlobalMessageNotifications currentUserId={user.id} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px]">
        <aside className="hidden w-[245px] shrink-0 border-r border-white/[0.06] bg-black/80 px-4 py-5 backdrop-blur-xl lg:block">
          <div className="sticky top-5">
            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-smc-gold">
                Steve Moran
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
                Coaching
              </h1>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-h-[44px] items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm font-bold text-white/56 transition hover:border-smc-gold/25 hover:bg-smc-gold/[0.07] hover:text-white"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] text-sm text-smc-gold/80 transition group-hover:border-smc-gold/25 group-hover:bg-smc-gold/10">
                    {item.icon}
                  </span>

                  <span>{item.label}</span>

                  {typeof item.badge === "number" ? (
                    <SidebarBadge count={item.badge} muted={item.mutedBadge} />
                  ) : null}
                </Link>
              ))}
            </nav>

            <form action="/auth/sign-out" method="post" className="mt-6">
  <button
    type="submit"
    className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm font-bold text-white/56 transition hover:border-red-500/25 hover:bg-red-500/[0.07] hover:text-white"
  >
    <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] text-sm text-red-400">
      ↩
    </span>

    <span>Log Out</span>
  </button>
</form>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col px-4 py-5 pb-28 sm:px-6 lg:px-7 lg:pb-8">
          <header className="mb-5 rounded-[1.5rem] border border-smc-gold/18 bg-black/78 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.62)] backdrop-blur-xl lg:hidden">
            <div className="flex items-start justify-between gap-3">
  <div>
    <p className="text-[10px] font-black uppercase tracking-[0.32em] text-smc-gold">
      SMC Coach
    </p>

    <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
      Coach Portal
    </h1>
  </div>

  <form action="/auth/sign-out" method="post">
    <button
      type="submit"
      className="rounded-full border border-white/[0.08] bg-black/25 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/60 transition hover:border-smc-gold/25 hover:text-smc-gold"
    >
      Log Out
    </button>
  </form>
</div>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navItems.slice(0, 5).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-full border border-white/[0.08] bg-black/38 px-4 py-2 text-xs font-black text-white/70 backdrop-blur-md"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <div className="w-full">{children}</div>
        </section>
      </div>
    </main>
  )
}