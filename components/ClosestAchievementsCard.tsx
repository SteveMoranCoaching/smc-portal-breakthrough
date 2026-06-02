import Link from "next/link"

type AchievementPreview = {
  title: string
  progress: number
}

export default function ClosestAchievementsCard({
  achievements,
}: {
  achievements: AchievementPreview[]
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.55rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.66)]">
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.24em] text-smc-gold">
              Achievements
            </p>

            <h2 className="mt-1 text-[1.05rem] font-black tracking-[-0.035em] text-white">
              Achievement Progress
            </h2>
          </div>

          <Link
            href="/dashboard/achievements"
            className="rounded-full border border-smc-gold/25 bg-smc-gold/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-smc-gold"
          >
            View
          </Link>
        </div>

        <div className="mt-3 space-y-3">
          {achievements.map((achievement) => (
            <div key={achievement.title}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-black text-white">
                  {achievement.title}
                </p>

                <p className="text-[10px] font-black text-white">
                    {achievement.progress}%
                </p>
              </div>

              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/70 ring-1 ring-white/[0.06]">
                <div
                  className="h-full rounded-full bg-smc-gold shadow-[0_0_14px_rgba(212,175,55,0.45)]"
                  style={{ width: `${achievement.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}