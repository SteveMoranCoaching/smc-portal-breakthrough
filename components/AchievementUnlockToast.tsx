"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type AchievementUnlock = {
  title: string
  description?: string
  category?: string
}

type Props = {
  achievement: AchievementUnlock | null
  onClose?: () => void
}

export default function AchievementUnlockToast({
  achievement,
  onClose,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!achievement) {
      setVisible(false)
      return
    }

    setVisible(true)

    const timeout = setTimeout(() => {
      handleClose()
    }, 6000)

    return () => clearTimeout(timeout)
  }, [achievement])

  function handleClose() {
    setVisible(false)

    setTimeout(() => {
      onClose?.()
    }, 220)
  }

  if (!achievement) return null

  return (
    <div
      className={`fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 transition-all duration-300 sm:bottom-6 sm:justify-end ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0"
      }`}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-smc-gold/25 bg-[linear-gradient(180deg,rgba(20,20,20,0.96),rgba(5,5,5,0.98))] p-5 text-white shadow-[0_0_60px_rgba(212,175,55,0.14)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.16),transparent_45%)]" />

        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-smc-gold/30 bg-smc-gold/[0.12] text-smc-gold shadow-[0_0_22px_rgba(212,175,55,0.14)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path
                  d="M8 4h8v3.5a4 4 0 0 1-8 0V4Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M8.5 6H5.75A1.75 1.75 0 0 0 4 7.75v.5A3.75 3.75 0 0 0 7.75 12H9"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M15.5 6h2.75A1.75 1.75 0 0 1 20 7.75v.5A3.75 3.75 0 0 1 16.25 12H15"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M12 12v4M9 20h6M10 16h4v4h-4v-4Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-smc-gold/80">
                Achievement Unlocked
              </p>

              <h2 className="mt-2 text-xl font-black tracking-tight text-white">
                {achievement.title}
              </h2>

              {achievement.description && (
                <p className="mt-2 text-sm leading-6 text-white/55">
                  {achievement.description}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href="/dashboard/achievements"
                  className="rounded-2xl border border-smc-gold/30 bg-smc-gold/[0.10] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-smc-gold shadow-[0_0_18px_rgba(212,175,55,0.10)] transition hover:bg-smc-gold/[0.16]"
                >
                  View Achievements
                </Link>

                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/65 transition hover:bg-white/[0.08]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}