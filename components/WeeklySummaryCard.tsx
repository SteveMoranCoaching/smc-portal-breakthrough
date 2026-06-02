"use client"

export default function WeeklySummaryCard({
  workoutsCompleted,
  pbCount,
}: {
  workoutsCompleted: number
  pbCount: number
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] px-3 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.66)]">
      <div className="relative z-10">
        <p className="text-[8px] font-black uppercase tracking-[0.24em] text-smc-gold">
          Weekly Summary
        </p>

        <h2 className="mt-1 text-[0.95rem] font-black text-white">
          This week in numbers
        </h2>

        <div className="mt-3 grid grid-cols-2 gap-2">
  <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2">
    <p className="text-xl font-black text-smc-gold">
      {workoutsCompleted}
    </p>

    <p className="text-[10px] text-white/50">
      Workouts this week
    </p>
  </div>

  <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2">
    <p className="text-xl font-black text-smc-gold">
      {pbCount}
    </p>

    <p className="text-[10px] text-white/50">
      PBs achieved
    </p>
  </div>
</div>
      </div>
    </section>
  )
}