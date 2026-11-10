
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
      headers: {
        "Cache-Control": "no-store",
      },
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
    !("fileId" in body) ||
    typeof body.fileId !== "string" ||
    !UUID_PATTERN.test(body.fileId) ||
    !("folderId" in body) ||
    !(
      body.folderId === null ||
      (
        typeof body.folderId === "string" &&
        UUID_PATTERN.test(body.folderId)
      )
    )
  ) {
    return respond("Invalid media move request.", 400)
  }

  const fileId = body.fileId
  const folderId = body.folderId

  // Confirm the destination exists and is a root folder.
  // Null represents Unsorted.
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
        "SMC media destination lookup failed:",
        folderError.message
      )
      return respond("Unable to check destination folder.", 500)
    }

    if (!folder) {
      return respond("Destination folder not found.", 404)
    }
  }

  // Only approved files may be moved.
  // RLS still applies through the authenticated client.
  const { data: updated, error: updateError } =
    await supabase
      .from("media_files")
      .update({
        folder_id: folderId,
      })
      .eq("id", fileId)
      .eq("status", "approved")
      .select("id, folder_id, status")
      .maybeSingle()

  if (updateError) {
    console.error(
      "SMC media move failed:",
      updateError.message
    )

    return respond("Unable to move media.", 500)
  }

  if (!updated) {
    return respond(
      "Approved media file not found.",
      404
    )
  }

  return NextResponse.json(
    {
      success: true,
      fileId: updated.id,
      folderId: updated.folder_id,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
