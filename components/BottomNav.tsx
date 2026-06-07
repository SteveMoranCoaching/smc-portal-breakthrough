"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

const navItems = [
  { label: "Home", href: "/dashboard", icon: "⌂" },
  { label: "Calendar", href: "/dashboard/calendar", icon: "◷" },
  { label: "Workout", href: "/dashboard/workouts", icon: "✚" },
  { label: "History", href: "/dashboard/history", icon: "⟳" },
  { label: "Messages", href: "/dashboard/messages", icon: "✉" },
  { label: "Community", href: "/dashboard/smc-home", icon: "SMC" },
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
      <div className="mx-auto max-w-md rounded-[1.6rem] border border-[rgba(255,255,255,0.075)] bg-[rgba(5,5,5,0.95)] px-2 pb-1.5 pt-1 shadow-[0_-10px_35px_rgba(0,0,0,0.72)] backdrop-blur-2xl">
        <div className="grid grid-cols-6 items-center gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)

            const isMessages = item.href === "/dashboard/messages"

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-[44px] flex-col items-center justify-center rounded-[1rem] px-1 py-1.5 text-[9px] font-semibold transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? "bg-[rgba(212,175,55,0.12)] text-smc-gold shadow-[inset_0_0_0_1px_rgba(212,175,55,0.18)]"
                    : "text-white/80 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                {isMessages && liveUnreadMessages > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-smc-gold px-1 text-[9px] font-black leading-none text-black shadow-[0_0_14px_rgba(212,175,55,0.7)] ring-2 ring-black">
                    {liveUnreadMessages > 9 ? "9+" : liveUnreadMessages}
                  </span>
                )}

                <div className="flex h-[20px] items-center justify-center">
  <span
    className={`leading-none transition ${
      item.icon === "SMC"
  ? "text-[13px] font-black tracking-[-0.04em] text-smc-gold"
  : item.label === "History" || item.label === "Calendar"
  ? "text-[16px]"
  : "text-[15px]"
    } ${isActive ? "scale-105 text-smc-gold" : ""}`}
  >
    {item.icon}
  </span>
</div>

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