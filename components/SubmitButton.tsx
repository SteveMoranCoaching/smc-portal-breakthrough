"use client"

import { useFormStatus } from "react-dom"

export default function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-yellow-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Submitting..." : "Submit Check-In"}
    </button>
  )
}