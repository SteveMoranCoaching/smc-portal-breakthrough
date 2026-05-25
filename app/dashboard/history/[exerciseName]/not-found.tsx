import Link from "next/link"
import EmptyStateCard from "@/components/ui/EmptyStateCard"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-6 text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <EmptyStateCard
          eyebrow="Exercise history"
          title="Exercise not found"
          body="This exercise either has no logged history yet, has been renamed, or the link is no longer valid."
          href="/dashboard/history"
          actionLabel="Back to history"
        />

        <Link
          href="/dashboard"
          className="text-center text-xs font-bold uppercase tracking-[0.22em] text-white/35 transition hover:text-smc-gold"
        >
          Return to dashboard
        </Link>
      </section>
    </main>
  )
}