type SkeletonCardProps = {
  className?: string
  lines?: number
}

export default function SkeletonCard({
  className = "",
  lines = 3,
}: SkeletonCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.018))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.75)] ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="relative z-10 space-y-3">
        <div className="h-3 w-24 rounded-full bg-white/[0.08]" />
        <div className="h-7 w-2/3 rounded-full bg-white/[0.1]" />

        <div className="space-y-2 pt-2">
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className="h-3 rounded-full bg-white/[0.07]"
              style={{ width: `${90 - index * 14}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}