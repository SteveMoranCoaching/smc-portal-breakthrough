export default function WorkoutPage() {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
        <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">
          Training
        </p>

        <h1 className="mt-4 text-2xl font-bold">Workout</h1>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Your programme, sessions and workout logging will live here.
        </p>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-black p-5">
        <h2 className="text-lg font-bold">Coming next</h2>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          This page is ready for the existing programme/session content to be
          moved over from the dashboard when you’re ready.
        </p>
      </section>
    </div>
  )
}