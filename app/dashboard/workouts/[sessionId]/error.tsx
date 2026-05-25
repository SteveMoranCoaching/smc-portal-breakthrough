"use client"

import Link from "next/link"
import ErrorStateCard from "@/components/ui/ErrorStateCard"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-3 py-4 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <ErrorStateCard
          title="This session couldn’t load"
          body="Something interrupted the workout logger. Try again, or head back to your workouts and reopen the session."
          actionLabel="Try again"
          onAction={reset}
        />

        <Link
          href="/dashboard/workouts"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-black text-white/65 transition active:scale-[0.98]"
        >
          Back to workouts
        </Link>
      </div>
    </main>
  )
}