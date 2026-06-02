"use client"

import { useState } from "react"

export default function MomentumCard({
  score,
  items,
}: {
  score: number
  items: {
    label: string
    complete: boolean
  }[]
}) {
  const [expanded, setExpanded] = useState(false)

  return (
  <div className="rounded-[1.15rem] border border-smc-gold/15 bg-white/[0.02] px-3 py-2.5">
    <button
      onClick={() => setExpanded(!expanded)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <div className="min-w-0 text-left">
        <p className="text-[7px] font-black uppercase tracking-[0.24em] text-smc-gold">
          Weekly Momentum
        </p>

        <h3
  className={`mt-0.5 text-[1.25rem] font-black leading-tight ${
    score === 7 ? "text-smc-gold" : "text-white"
  }`}
>
  <span className={score === 7 ? "" : "text-smc-gold"}>{score}</span>
  {" / 7 Complete"}
</h3>

        <p className="mt-0.5 text-[11px] leading-4 text-white/55">
          {score === 7
            ? "Perfect week achieved 🔥"
            : `${7 - score} actions away from a perfect week`}
        </p>
      </div>

      <span className="shrink-0 text-xs text-smc-gold">
        {expanded ? "▲" : "▼"}
      </span>
    </button>

    {expanded && (
      <div className="mt-3 space-y-1.5 text-left">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-[12px]">
            <span
  className={
    item.complete
      ? "text-smc-gold"
      : "text-white/35"
  }
>
  {item.complete ? "✓" : "✗"}
</span>

            <span
  className={
    item.complete
      ? "text-smc-gold font-semibold"
      : "text-white/45"
  }
>
  {item.label}
</span>
          </div>
        ))}
      </div>
    )}
  </div>
)
}