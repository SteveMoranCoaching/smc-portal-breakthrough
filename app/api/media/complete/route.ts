
import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseMediaAdmin } from "@/lib/supabaseMediaAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BUCKET = "smc-media"
const TOKEN_PATTERN = /^[a-f0-9]{64}$/
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

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")

  if (origin !== new URL(request.url).origin) {
    return respond("Request origin not allowed.", 403)
  }

  let body: Record<string, unknown>

  try {
    const parsed: unknown = await request.json()

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return respond("Invalid request.", 400)
    }

    body = parsed as Record<string, unknown>
  } catch {
    return respond("Invalid request.", 400)
  }

  const { token, fileId } = body

  if (
    typeof token !== "string" ||
    !TOKEN_PATTERN.test(token) ||
    typeof fileId !== "string" ||
    !UUID_PATTERN.test(fileId)
  ) {
    return respond("Invalid upload details.", 400)
  }

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex")

  const admin = createSupabaseMediaAdmin()

  // Retrieve the invitation using the token hash.
  const { data: invitation, error: invitationError } =
    await admin
      .from("media_upload_links")
      .select("id, is_active, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle()

  if (invitationError || !invitation) {
    return respond("Upload invitation unavailable.", 403)
  }

  if (
    !invitation.is_active ||
    (invitation.expires_at &&
      new Date(invitation.expires_at).getTime() <= Date.now())
  ) {
    return respond("Upload invitation expired or revoked.", 403)
  }

  // Retrieve the reservation associated with this invitation.
  const { data: file, error: fileError } =
    await admin
      .from("media_files")
      .select(
        "id, upload_link_id, storage_bucket, storage_path, mime_type, file_size_bytes, status, reservation_expires_at"
      )
      .eq("id", fileId)
      .eq("upload_link_id", invitation.id)
      .maybeSingle()

  if (fileError || !file || file.status !== "uploading") {
    return respond("Upload reservation unavailable.", 400)
  }

  if (
    !file.reservation_expires_at ||
    new Date(file.reservation_expires_at).getTime() <= Date.now()
  ) {
    return respond("Upload reservation expired.", 403)
  }

  const expectedPath = `${invitation.id}/${file.id}`

  if (
    file.storage_bucket !== BUCKET ||
    file.storage_path !== expectedPath
  ) {
    console.error("Media upload storage path mismatch.")
    return respond("Invalid upload reservation.", 400)
  }

  // Read object metadata from Supabase Storage.
  const { data: object, error: objectError } =
    await admin.storage
      .from(BUCKET)
      .info(file.storage_path)

  if (objectError || !object) {
    return respond("Uploaded file not found.", 400)
  }

 
const actualSize = object.size
const actualMimeType = object.contentType


  if (
    typeof actualSize !== "number" ||
    actualSize !== file.file_size_bytes ||
    typeof actualMimeType !== "string" ||
    actualMimeType.toLowerCase() !==
      String(file.mime_type).toLowerCase()
  ) {
    console.error("Media upload metadata mismatch:", {
      fileId,
      expectedSize: file.file_size_bytes,
      actualSize,
      expectedMimeType: file.mime_type,
      actualMimeType,
    })

    return respond(
      "Uploaded file does not match the reservation.",
      400
    )
  }

  // Atomically transition uploading -> pending.
  const { data: finalised, error: finaliseError } =
    await admin.rpc("finalise_smc_media_upload", {
      p_token_hash: tokenHash,
      p_file_id: fileId,
    })

  if (finaliseError || finalised !== true) {
    console.error(
      "Media upload finalisation failed:",
      finaliseError?.message
    )

    return respond("Unable to complete upload.", 400)
  }

  return NextResponse.json(
    {
      success: true,
      fileId,
      status: "pending",
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  )
}
