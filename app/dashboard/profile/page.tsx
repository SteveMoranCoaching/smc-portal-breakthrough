export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
        <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">
          Account
        </p>

        <h1 className="mt-4 text-2xl font-bold">Profile</h1>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Your account, preferences and athlete details will live here.
        </p>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <h2 className="font-semibold">Coming soon</h2>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Profile settings, account info and app preferences will be added here.
        </p>
      </section>
    </div>
  )
}