"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function Home() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function login(e: React.FormEvent) {
    e.preventDefault()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      return
    }

    window.location.href = "/post-login"
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <form onSubmit={login} className="w-full max-w-sm space-y-5">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">Steve Moran Coaching</h1>
          <p className="text-gray-400 mt-2">Client Portal Login</p>
        </div>

        <input
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-white"
          placeholder="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-white"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full rounded-lg bg-white text-black font-bold py-3">
          Log in
        </button>
      </form>
    </main>
  )
}