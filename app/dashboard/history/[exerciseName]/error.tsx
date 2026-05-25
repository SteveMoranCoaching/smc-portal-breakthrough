"use client"

import ErrorStateCard from "@/components/ui/ErrorStateCard"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-6 text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <ErrorStateCard
          title="Exercise breakdown didn’t load"
          body="Your training data is safe — this view just didn’t load cleanly. Retry and we’ll pull the full breakdown back in."
          actionLabel="Reload breakdown"
          onAction={reset}
        />
      </section>
    </main>
  )
}