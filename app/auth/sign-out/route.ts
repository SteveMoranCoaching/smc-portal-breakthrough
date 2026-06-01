import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()

  await supabase.auth.signOut()

  const origin =
    request.headers.get("origin") ||
    request.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
    "http://localhost:3000"

  return NextResponse.redirect(`${origin}/`)
}