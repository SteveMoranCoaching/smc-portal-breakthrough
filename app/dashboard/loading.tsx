export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
        <div className="h-3 w-32 animate-pulse rounded-full bg-zinc-800" />
        <div className="mt-5 h-8 w-48 animate-pulse rounded-full bg-zinc-800" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-zinc-800" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-zinc-800" />
      </section>

      {[1, 2, 3].map((item) => (
        <section
          key={item}
          className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 animate-pulse rounded-full bg-zinc-800" />
            <div className="h-4 w-16 animate-pulse rounded-full bg-zinc-800" />
          </div>

          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-zinc-800" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded-full bg-zinc-800" />
        </section>
      ))}
    </div>
  )
}