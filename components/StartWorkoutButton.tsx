"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type Props = {
  href: string
  label?: string
  variant?: "primary" | "secondary"
}

export default function StartWorkoutButton({
  href,
  label = "Start Workout",
  variant = "primary",
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    router.prefetch(href)
  }, [href, router])

  function handleStart() {
    setPressed(true)

    startTransition(() => {
      router.push(href)
    })
  }

  const buttonStyle =
    variant === "secondary"
      ? "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.07)]"
      : "bg-smc-gold text-black shadow-[0_0_24px_rgba(212,175,55,0.22)] hover:brightness-110"

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={isPending}
      className={`w-full rounded-2xl px-4 py-3.5 text-center text-sm font-extrabold tracking-wide transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${buttonStyle}`}
    >
      {pressed || isPending ? "Opening..." : label}
    </button>
  )
}