"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  async function handleLogin() {
    setMessage("Sending magic link...")

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage("Check your email for login link 📩")
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3"
        />

        <button
          onClick={handleLogin}
          className="w-full rounded-lg bg-yellow-500 p-3 font-bold text-black"
        >
          Send login link
        </button>

        {message && <p className="text-sm text-zinc-400">{message}</p>}
      </div>
    </main>
  )
}