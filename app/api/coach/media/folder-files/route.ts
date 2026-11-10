
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PAGE_SIZE = 50

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
    !("folderId" in body) ||
    !(
      body.folderId === null ||
      (
        typeof body.folderId === "string" &&
        UUID_PATTERN.test(body.folderId)
      )
    ) ||
    !("page" in body) ||
    typeof body.page !== "number" ||
    !Number.isSafeInteger(body.page) ||
    body.page < 0 ||
    body.page > 100000
  ) {
    return respond("Invalid folder pagination request.", 400)
  }

  const folderId = body.folderId
  const page = body.page

  if (folderId !== null) {
    const { data: folder, error: folderError } =
      await supabase
        .from("media_folders")
        .select("id")
        .eq("id", folderId)
        .is("parent_id", null)
        .maybeSingle()

    if (folderError) {
      console.error(
        "SMC folder lookup failed:",
        folderError.message
      )
      return respond("Unable to load folder.", 500)
    }

    if (!folder) {
      return respond("Folder not found.", 404)
    }
  }

  let query = supabase
    .from("media_files")
    .select(
      "id, folder_id, original_filename, display_name, media_type, athlete_name, event_name, file_size_bytes, created_at",
      { count: "exact" }
    )
    .eq("status", "approved")

  if (folderId === null) {
    query = query.is("folder_id", null)
  } else {
    query = query.eq("folder_id", folderId)
  }

  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const {
    data: files,
    count,
    error: filesError,
  } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to)

  if (filesError) {
    console.error(
      "SMC folder pagination failed:",
      filesError.message
    )

    return respond("Unable to load folder media.", 500)
  }

  const total = count ?? 0

  return NextResponse.json(
    {
      success: true,
      files: files || [],
      page,
      pageSize: PAGE_SIZE,
      total,
      hasMore: to + 1 < total,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
