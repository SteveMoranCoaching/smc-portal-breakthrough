
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { createSupabaseMediaAdmin } from "@/lib/supabaseMediaAdmin"

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
    !("fileId" in body) ||
    typeof body.fileId !== "string" ||
    !UUID_PATTERN.test(body.fileId)
  ) {
    return respond("Invalid file identifier.", 400)
  }

  const fileId = body.fileId

  const admin = createSupabaseMediaAdmin()

  const { data: file, error: fileError } =
    await admin
      .from("media_files")
      .select(
        "id, storage_bucket, storage_path, original_filename, mime_type, media_type, status"
      )
      .eq("id", fileId)
      .single()

  if (fileError || !file) {
    return respond("Media file not found.", 404)
  }

  if (
    !["pending", "approved", "rejected"].includes(file.status)
  ) {
    return respond("Media file is not ready.", 409)
  }

  if (
    file.storage_bucket !== "smc-media" ||
    typeof file.storage_path !== "string" ||
    !UUID_PATTERN.test(file.storage_path.split("/")[0] || "") ||
    file.storage_path !==
      `${file.storage_path.split("/")[0]}/${file.id}`
  ) {
    console.error("Invalid SMC media storage path:", file.id)
    return respond("Media file is unavailable.", 500)
  }

  const { data: signed, error: signingError } =
    await admin.storage
      .from("smc-media")
      .createSignedUrl(file.storage_path, 60)

  if (signingError || !signed?.signedUrl) {
    console.error(
      "SMC media preview signing failed:",
      signingError?.message
    )

    return respond("Unable to open media preview.", 500)
  }

  return NextResponse.json(
    {
      fileId: file.id,
      filename: file.original_filename,
      mediaType: file.media_type,
      mimeType: file.mime_type,
      url: signed.signedUrl,
      expiresIn: 60,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
