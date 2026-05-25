import EmptyStateCard from "@/components/ui/EmptyStateCard"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%),#050505] px-3 py-4 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <EmptyStateCard
          eyebrow="Workout logger"
          title="Session not found"
          body="This session may have been deleted, moved, or it no longer belongs to your active programme."
          href="/dashboard/workouts"
          actionLabel="Back to workouts"
        />
      </div>
    </main>
  )
}