"use client"

import { useFormStatus } from "react-dom"

export default function MessageSubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending..." : "Send Message"}
    </button>
  )
}