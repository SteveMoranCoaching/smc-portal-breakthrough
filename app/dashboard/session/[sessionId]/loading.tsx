export default function LoadingWorkoutSession() {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-md space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-800" />

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-800" />
          <div className="space-y-3">
            <div className="h-12 animate-pulse rounded-xl bg-zinc-900" />
            <div className="h-12 animate-pulse rounded-xl bg-zinc-900" />
            <div className="h-12 animate-pulse rounded-xl bg-zinc-900" />
          </div>
        </div>
      </div>
    </main>
  )
}