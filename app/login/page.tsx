"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email) {
      setMessage("Please enter your email.")
      return
    }

    setLoading(true)
    setMessage("Sending magic link...")

    const redirectUrl = "http://192.168.4.22:3000/auth/callback?next=/dashboard"

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    setMessage("Magic link sent — check your email 📩")
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="w-full max-w-sm space-y-4 px-4">
        <h1 className="text-2xl font-bold">Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3"
        />

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-lg bg-yellow-500 p-3 font-bold text-black disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send login link"}
        </button>

        {message && (
          <p className="text-center text-sm text-zinc-400">{message}</p>
        )}
      </div>
    </main>
  )
}