import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import LoginForm from "@/components/LoginForm"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/post-login")
  }

  return <LoginForm />
}