"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    window.location.href = "/post-login"
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <form onSubmit={login} className="w-full max-w-sm space-y-5">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Steve Moran Coaching</h1>
          <p className="mt-2 text-gray-400">Client Portal Login</p>
        </div>

        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white"
          placeholder="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          disabled={loading}
          className="w-full rounded-lg bg-white py-3 font-bold text-black disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </main>
  )
}