
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { createSupabaseMediaAdmin } from "@/lib/supabaseMediaAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function respond(error: string, status: number) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}

export async function POST(request: NextRequest) {
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

  const { data: profile, error: profileError } =
    await supabase
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
    !("name" in body) ||
    typeof body.name !== "string"
  ) {
    return respond("Folder name is required.", 400)
  }

  const name = body.name.trim()

  if (name.length === 0 || name.length > 100) {
    return respond(
      "Folder name must contain between 1 and 100 characters.",
      400
    )
  }

  const admin = createSupabaseMediaAdmin()

  const { data: folder, error: insertError } =
    await admin
      .from("media_folders")
      .insert({
        name,
        parent_id: null,
        created_by: user.id,
      })
      .select("id, name, parent_id")
      .single()

  if (insertError) {
    if (insertError.code === "23505") {
      return respond(
        "A folder with this name already exists.",
        409
      )
    }

    console.error(
      "SMC media folder creation failed:",
      insertError.message
    )

    return respond("Unable to create folder.", 500)
  }

  return NextResponse.json(
    {
      success: true,
      folder,
    },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
