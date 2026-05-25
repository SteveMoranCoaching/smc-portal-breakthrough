import SkeletonCard from "./SkeletonCard"

type LoadingShellProps = {
  title?: string
  subtitle?: string
  cards?: number
}

export default function LoadingShell({
  title = "Loading",
  subtitle = "Pulling your training data together.",
  cards = 4,
}: LoadingShellProps) {
  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-6 text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="relative overflow-hidden rounded-[1.8rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.75)]">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          <div className="relative z-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-smc-gold">
              SMC Portal
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              {title}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: cards }).map((_, index) => (
            <SkeletonCard key={index} lines={4} />
          ))}
        </div>
      </section>
    </main>
  )
}