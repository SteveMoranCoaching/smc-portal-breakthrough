import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export async function requireCoach() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") {
    redirect("/dashboard")
  }

  return { supabase, user, profile }
}