
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

type NavItem = {
  label: string
  href: string
  icon: string
  badge?: number
  mutedBadge?: boolean
}

export default function CoachMobileNav({
  items,
}: {
  items: NavItem[]
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  return (
    <>
      <header className="mb-5 flex items-center justify-between rounded-[1.5rem] border border-smc-gold/18 bg-black/80 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.62)] lg:hidden">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-smc-gold">
            Steve Moran Coaching
          </p>
          <h1 className="mt-1 text-xl font-black text-white">
            Coach Portal
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="coach-mobile-menu"
          className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-smc-gold/25 bg-smc-gold/10 text-xl text-smc-gold"
        >
          ☰

          {items.some(
            (item) =>
              !item.mutedBadge &&
              typeof item.badge === "number" &&
              item.badge > 0
          ) && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-smc-gold" />
          )}
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <aside
            id="coach-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Coach navigation"
            className="absolute right-0 top-0 flex h-full w-[min(340px,88vw)] flex-col border-l border-smc-gold/20 bg-[#090909] shadow-[-20px_0_70px_rgba(0,0,0,0.7)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-smc-gold">
                  Steve Moran Coaching
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Navigation
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-xl text-white/70"
              >
                ×
              </button>
            </div>

            <nav
              aria-label="Coach pages"
              className="flex-1 space-y-1 overflow-y-auto p-4"
            >
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/coach" &&
                    pathname.startsWith(`${item.href}/`))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                      active
                        ? "border-smc-gold/30 bg-smc-gold/10 text-white"
                        : "border-transparent text-white/65 hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-smc-gold">
                      {item.icon}
                    </span>

                    <span>{item.label}</span>

                    {typeof item.badge === "number" && (
                      <span
                        className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-black ${
                          item.mutedBadge || item.badge === 0
                            ? "border-white/10 bg-white/[0.04] text-white/40"
                            : "border-smc-gold/25 bg-smc-gold/15 text-smc-gold"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-white/10 p-4">
              <form action="/auth/sign-out" method="post">
                <button
                  type="submit"
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-red-500/15 bg-red-500/[0.05] px-4 text-sm font-bold text-red-400"
                >
                  ↩ Log Out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
