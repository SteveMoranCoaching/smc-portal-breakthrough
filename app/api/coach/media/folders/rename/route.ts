
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function respond(error: string, status: number) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  )
}

export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin")

  if (origin !== new URL(request.url).origin) {
    return respond("Request origin not allowed.", 403)
  }

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return respond("Authentication required.", 401)
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "coach") {
    return respond("Coach access required.", 403)
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return respond("Invalid request.", 400)
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !("folderId" in body) ||
    typeof body.folderId !== "string" ||
    !UUID_PATTERN.test(body.folderId) ||
    !("name" in body) ||
    typeof body.name !== "string"
  ) {
    return respond("Invalid folder details.", 400)
  }

  const folderId = body.folderId
  const name = body.name.trim()

  if (name.length < 1 || name.length > 100) {
    return respond(
      "Folder name must contain between 1 and 100 characters.",
      400
    )
  }

  // Use the authenticated coach client so the existing
  // media folder RLS policy protects the update.
  const { data: folder, error } = await supabase
    .from("media_folders")
    .update({ name })
    .eq("id", folderId)
    .is("parent_id", null)
    .select("id, name, parent_id")
    .single()

  if (error) {
    if (error.code === "23505") {
      return respond("A folder with this name already exists.", 409)
    }

    if (error.code === "PGRST116") {
      return respond("Folder not found.", 404)
    }

    console.error("SMC media folder rename failed:", error.message)

    return respond("Unable to rename folder.", 500)
  }

  return NextResponse.json(
    { success: true, folder },
    {
      headers: { "Cache-Control": "no-store" },
    }
  )
}
