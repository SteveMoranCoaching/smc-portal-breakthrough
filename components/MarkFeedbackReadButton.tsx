"use client"

import { useState } from "react"

export default function MarkFeedbackReadButton({
  id,
  source,
  initialRead,
}: {
  id: string
  source: "log" | "video"
  initialRead: boolean
}) {
  const [read, setRead] = useState(initialRead)
  const [saving, setSaving] = useState(false)

  async function markRead() {
    if (read || saving) return

    setSaving(true)

    const formData = new FormData()
    formData.append("id", id)
    formData.append("source", source)

    const response = await fetch("/api/feedback/read", {
      method: "POST",
      body: formData,
    })

    if (response.ok) {
      setRead(true)
    }

    setSaving(false)
  }

  return (
    <button
      type="button"
      onClick={markRead}
      disabled={read || saving}
      className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase transition ${
        read
          ? "border border-white/[0.08] bg-white/[0.03] text-white/35"
          : "bg-smc-gold text-black active:scale-[0.96]"
      }`}
    >
      {read ? "Read" : saving ? "Saving" : "Mark read"}
    </button>
  )
}