"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

const navItems = [
  { label: "Home", href: "/dashboard", icon: "⌂" },
  { label: "Workout", href: "/dashboard/workouts", icon: "＋" },
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
  const [liveUnreadMessages, setLiveUnreadMessages] = useState(unreadMessages)

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(255,255,255,0.06)] bg-smc-bg/95 px-4 pb-5 pt-3 shadow-[0_-10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
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
              className="relative flex flex-col items-center justify-center px-2 py-2 text-xs font-bold transition"
            >
              {isMessages && liveUnreadMessages > 0 && (
                <span className="absolute right-1 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-smc-gold px-1 text-[10px] font-bold text-black shadow-[0_0_10px_rgba(212,175,55,0.9)]">
                  {liveUnreadMessages > 9 ? "9+" : liveUnreadMessages}
                </span>
              )}

              <span
                className={`text-xl leading-none transition ${
                  isActive
                    ? "text-smc-gold"
                    : "text-smc-muted-soft hover:text-smc-gold"
                }`}
              >
                {item.icon}
              </span>

              <span
                className={`mt-1 transition ${
                  isActive
                    ? "text-smc-gold"
                    : "text-smc-muted-soft hover:text-smc-gold"
                }`}
              >
                {item.label}
              </span>

              <span
                className={`mt-2 h-[2px] rounded-full transition-all ${
                  isActive
                    ? "w-6 bg-smc-gold shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                    : "w-0 bg-transparent"
                }`}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}