"use client"

import { useState } from "react"

export default function TestPushPage() {
  const [userId, setUserId] = useState("")
  const [message, setMessage] = useState("")

  async function sendTest() {
    setMessage("Sending...")

    const response = await fetch("/api/notifications/send-to-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        title: "New SMC message",
        body: "This is a test push from the portal.",
        url: "/dashboard/messages",
      }),
    })

    const data = await response.json()

    setMessage(JSON.stringify(data))
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-black">Test Push</h1>

        <input
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          placeholder="Recipient user_id"
          className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm"
        />

        <button
          type="button"
          onClick={sendTest}
          className="w-full rounded-xl bg-smc-gold p-3 font-black text-black"
        >
          Send Test Push
        </button>

        {message && (
          <p className="break-words rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-white/60">
            {message}
          </p>
        )}
      </div>
    </main>
  )
}