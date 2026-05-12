"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

const navItems = [
  { label: "Home", href: "/dashboard", icon: "⌂" },
  { label: "Workout", href: "/dashboard/workouts", icon: "＋" },
  { label: "SMC", href: "/dashboard/smc-home", isCentre: true },
  { label: "Messages", href: "/dashboard/messages", icon: "✉" },
  { label: "Check-ins", href: "/dashboard/check-ins", icon: "✓" },
]

export default function BottomNav({
  unreadMessages = 0,
  currentUserId,
}: {
  unreadMessages?: number
  currentUserId?: string
}) {
  const pathname = usePathname()

  const [liveUnreadMessages, setLiveUnreadMessages] =
    useState(unreadMessages)

  useEffect(() => {
    setLiveUnreadMessages(unreadMessages)
  }, [unreadMessages])

  useEffect(() => {
    if (!currentUserId) return

    async function refreshUnreadMessages() {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", currentUserId)
        .eq("read_by_client", false)

      setLiveUnreadMessages(count || 0)
    }

    const channel = supabase
      .channel(`bottom-nav-unread-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          refreshUnreadMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-transparent px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1">
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-[rgba(255,255,255,0.07)] bg-[rgba(5,5,5,0.94)] px-2 pb-1 pt-0 shadow-[0_-10px_35px_rgba(0,0,0,0.72)] backdrop-blur-2xl">
        <div className="grid grid-cols-5 items-end gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)

            const isMessages =
              item.href === "/dashboard/messages"

            if (item.isCentre) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex min-h-[58px] items-end justify-center"
                >
                  <div
  className={`absolute -top-0 flex h-[62px] w-[62px] items-center justify-center rounded-full border text-[1rem] font-black tracking-[-0.04em] text-white transition-all duration-200 active:scale-[0.96] ${
    isActive
      ? "border-smc-gold bg-smc-gold shadow-[0_0_0_1px_rgba(212,175,55,0.18),0_0_24px_rgba(212,175,55,0.14),0_10px_30px_rgba(0,0,0,0.65)]"
      : "border-smc-gold/50 bg-[linear-gradient(circle_at_top,rgba(212,175,55,0.22)_0%,rgba(5,5,5,0.98)_58%,rgba(0,0,0,1)_100%)]"
  }`}
>
  SMC
</div>
                </Link>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-[44px] flex-col items-center justify-center pt-2 rounded-[1.2rem] px-1.5 py-1.5 text-[10px] font-semibold transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? "bg-[rgba(212,175,55,0.12)] text-smc-gold shadow-[inset_0_0_0_1px_rgba(212,175,55,0.18)]"
                    : "text-smc-muted-soft hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                {isMessages && liveUnreadMessages > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-smc-gold px-1 text-[9px] font-black leading-none text-black shadow-[0_0_14px_rgba(212,175,55,0.9)] ring-2 ring-black">
                    {liveUnreadMessages > 9
                      ? "9+"
                      : liveUnreadMessages}
                  </span>
                )}

                <span
                  className={`text-[17px] leading-none transition ${
                    isActive
                      ? "scale-105 text-smc-gold"
                      : ""
                  }`}
                >
                  {item.icon}
                </span>

                <span className="mt-1 leading-none tracking-[-0.01em]">
                  {item.label}
                </span>

                <span
                  className={`mt-1 h-[2px] rounded-full transition-all ${
                    isActive
                      ? "w-5 bg-smc-gold shadow-[0_0_10px_rgba(212,175,55,0.55)]"
                      : "w-0 bg-transparent"
                  }`}
                />
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}