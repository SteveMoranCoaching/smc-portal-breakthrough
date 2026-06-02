import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

type AchievementDefinition = {
  id: string
  code: string
  title: string
  description: string | null
  category: string | null
  icon: string | null
  target_value: number | null
  created_at: string | null
}

type UserAchievement = {
  id: string
  user_id: string
  achievement_code: string
  unlocked_at: string | null
}

const softBorder = "border-[rgba(255,255,255,0.08)]"

const glassCard =
  "relative overflow-hidden rounded-[1.45rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] shadow-[0_14px_34px_rgba(0,0,0,0.66)]"

const categoryLabels: Record<string, string> = {
  workouts: "Workouts",
  pbs: "PBs",
  check_ins: "Check-ins",
}

function formatDate(date: string | null) {
  if (!date) return "Recently"

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

function TrophyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M8 4h8v3.5a4 4 0 0 1-8 0V4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 6H5.75A1.75 1.75 0 0 0 4 7.75v.5A3.75 3.75 0 0 0 7.75 12H9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 6h2.75A1.75 1.75 0 0 1 20 7.75v.5A3.75 3.75 0 0 1 16.25 12H15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12v4M9 20h6M10 16h4v4h-4v-4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7 10V8a5 5 0 0 1 10 0v2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.5 10h11A1.5 1.5 0 0 1 19 11.5v7A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-7A1.5 1.5 0 0 1 6.5 10Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default async function AchievementsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [{ data: definitions }, { data: unlockedRows }] = await Promise.all([
  supabase
    .from("achievement_definitions")
    .select("*")
    .order("category", { ascending: true })
    .order("display_order", { ascending: true }),

  supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false }),
])

  const achievementDefinitions = (definitions || []) as AchievementDefinition[]
  const userAchievements = (unlockedRows || []) as UserAchievement[]

  const unlockedMap = new Map(
    userAchievements.map((achievement) => [
      achievement.achievement_code,
      achievement,
    ])
  )

  const unlockedCount = achievementDefinitions.filter((achievement) =>
    unlockedMap.has(achievement.code)
  ).length

  const latestUnlock = userAchievements[0]
  const latestDefinition = latestUnlock
    ? achievementDefinitions.find(
        (achievement) => achievement.code === latestUnlock.achievement_code
      )
    : null

  const groupedAchievements = achievementDefinitions.reduce<
    Record<string, AchievementDefinition[]>
  >((groups, achievement) => {
    const category = achievement.category || "other"
    if (!groups[category]) groups[category] = []
    groups[category].push(achievement)
    return groups
  }, {})

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#242018_0%,#090909_42%,#000_100%)] px-4 pb-28 pt-4 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <Link
          href="/dashboard"
          className="text-[11px] font-semibold uppercase tracking-[0.22em] text-smc-gold/80"
        >
          ← Dashboard
        </Link>

        <section className={`${glassCard} p-3.5`}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-smc-gold/15 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-smc-gold">
                SMC Momentum
              </p>
              <h1 className="mt-1 text-[1.55rem] font-black tracking-tight">
                Achievements
              </h1>
              <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-white/50">
                Track training consistency, PB milestones and check-in momentum
                as your progress builds inside the portal.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className={`rounded-[1.15rem] border ${softBorder} bg-black/28 p-3`}>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">
                  Unlocked
                </p>
                <p className="mt-1 text-2xl font-black text-smc-gold">
                  {unlockedCount}
                  <span className="text-sm text-white/35">
                    /{achievementDefinitions.length}
                  </span>
                </p>
              </div>

              <div className={`rounded-[1.15rem] border ${softBorder} bg-black/28 p-3`}>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">
                  Latest unlock
                </p>
                <p className="mt-1 text-base font-black">
                  {latestDefinition?.title || "Nothing unlocked yet"}
                </p>
                <p className="mt-1 text-[11px] text-white/45">
                  {latestUnlock
                    ? formatDate(latestUnlock.unlocked_at)
                    : "Complete a workout, hit a PB or submit a check-in."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {achievementDefinitions.length === 0 ? (
          <section className={`${glassCard} p-4 text-center`}>
            <p className="text-sm font-bold">No achievements found yet.</p>
            <p className="mt-2 text-xs text-white/45">
              Once definitions are added, they’ll appear here automatically.
            </p>
          </section>
        ) : (
          Object.entries(groupedAchievements).map(([category, achievements]) => (
            <section key={category} className="flex flex-col gap-2">
              <div className="flex items-end justify-between px-1 pt-1">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-smc-gold">
                    Category
                  </p>
                  <h2 className="text-[1.1rem] font-black">
                    {categoryLabels[category] ||
                      category.replaceAll("_", " ").replace(/\b\w/g, (char) =>
                        char.toUpperCase()
                      )}
                  </h2>
                </div>

                <p className="text-xs font-semibold text-white/40">
                  {
                    achievements.filter((achievement) =>
                      unlockedMap.has(achievement.code)
                    ).length
                  }
                  /{achievements.length}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement) => {
                  const unlocked = unlockedMap.get(achievement.code)
                  const isUnlocked = Boolean(unlocked)

                  return (
                    <article
                      key={achievement.code}
                      className={`relative overflow-hidden rounded-[1.15rem] border p-2.5 transition ${
                        isUnlocked
                          ? "border-smc-gold/35 bg-[linear-gradient(180deg,rgba(212,175,55,0.16),rgba(255,255,255,0.035))] shadow-[0_12px_30px_rgba(212,175,55,0.08)]"
                          : "border-[rgba(255,255,255,0.06)] bg-black/24 opacity-55"
                      }`}
                    >
                      {isUnlocked && (
                        <div className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-smc-gold/20 blur-2xl" />
                      )}

                      <div className="relative z-10 flex items-start gap-2.5">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] border ${
                            isUnlocked
                              ? "border-smc-gold/35 bg-smc-gold/15 text-smc-gold"
                              : "border-white/10 bg-white/[0.03] text-white/35"
                          }`}
                        >
                          {isUnlocked ? <TrophyIcon /> : <LockIcon />}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-[13px] font-black leading-tight">
                            {achievement.title}
                          </h3>

                          <p className="mt-0.5 text-[10.5px] leading-4 text-white/45">
                            {achievement.description ||
                              "Keep building momentum to unlock this."}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${
                                isUnlocked
                                  ? "border-smc-gold/30 bg-smc-gold/10 text-smc-gold"
                                  : "border-white/10 bg-white/[0.03] text-white/35"
                              }`}
                            >
                              {isUnlocked ? "Unlocked" : "Locked"}
                            </span>

                            {isUnlocked && (
                              <span className="text-[10.5px] font-semibold text-white/45">
                                {formatDate(unlocked?.unlocked_at || null)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  )
}
