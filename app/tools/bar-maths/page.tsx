
"use client"

import { useState } from "react"
import Link from "next/link"
import BarMathCalculator from "@/components/BarMathCalculator"

export default function PublicBarMathsPage() {
  const [weightInput, setWeightInput] = useState("100")

  const targetWeight = Number(weightInput)
  const validWeight =
    weightInput.trim() !== "" &&
    Number.isFinite(targetWeight) &&
    targetWeight > 0

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-smc-gold">
            Steve Moran Coaching
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Bar Maths Calculator
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/50">
            No more mental maths between sets. Enter your target
            weight and see exactly which plates to load on
            each side of the bar.
          </p>
        </header>

        <section className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-4">
          <label
            htmlFor="public-target-weight"
            className="text-[10px] font-black uppercase tracking-[0.18em] text-smc-gold/80"
          >
            Target Weight
          </label>

          <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-black/50">
            <input
              id="public-target-weight"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.25"
              value={weightInput}
              onChange={(event) =>
                setWeightInput(event.target.value)
              }
              placeholder="Enter weight"
              className="h-14 min-w-0 flex-1 bg-transparent px-4 text-xl font-black text-white outline-none"
            />

            <span className="pr-4 text-sm font-black text-white/40">
              kg
            </span>
          </div>

          <div className="mt-4">
            {validWeight ? (
              <BarMathCalculator targetWeight={targetWeight} />
            ) : (
              <div className="rounded-xl border border-white/[0.06] bg-black/30 p-5 text-center text-sm text-white/45">
                Enter a valid target weight to calculate your plates.
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-smc-gold/15 bg-smc-gold/[0.035] p-6 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold/70">
            Steve Moran Coaching
          </p>

          <h2 className="mt-3 text-xl font-black">
            Ready to take your strength further?
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/50">
            Personalised strength and powerlifting coaching,
            built around your goals.
          </p>

          <Link
            href="/coaching/enquire"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-smc-gold px-6 text-xs font-black text-black transition active:scale-[0.98]"
          >
            Enquire About Coaching
          </Link>
        </section>

        <footer className="mt-8 text-center text-[10px] text-white/30">
          © {new Date().getFullYear()} Steve Moran Coaching
        </footer>
      </div>
    </main>
  )
}
