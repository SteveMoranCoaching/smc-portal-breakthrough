
import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseMediaAdmin } from "@/lib/supabaseMediaAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_FILE_SIZE = 1073741824
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

  const {
    token,
    filename,
    mimeType,
    fileSize,
    uploaderName,
    athleteName,
  } = body

  if (
    typeof token !== "string" ||
    !TOKEN_PATTERN.test(token) ||
    typeof filename !== "string" ||
    filename.length < 1 ||
    filename.length > 255 ||
    typeof mimeType !== "string" ||
    (!mimeType.startsWith("image/") &&
      !mimeType.startsWith("video/")) ||
    !Number.isSafeInteger(fileSize) ||
    (fileSize as number) < 1 ||
    (fileSize as number) > MAX_FILE_SIZE ||
    typeof uploaderName !== "string" ||
    uploaderName.trim().length < 1 ||
    uploaderName.trim().length > 120 ||
    (athleteName !== undefined &&
      athleteName !== null &&
      (typeof athleteName !== "string" ||
        athleteName.trim().length > 120))
  ) {
    return respond("Invalid file or uploader details.", 400)
  }

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex")

  const admin = createSupabaseMediaAdmin()

  const { data, error } = await admin.rpc(
    "reserve_smc_media_upload",
    {
      p_token_hash: tokenHash,
      p_original_filename: filename,
      p_mime_type: mimeType,
      p_file_size_bytes: fileSize,
      p_uploader_name: uploaderName.trim(),
      p_athlete_name:
        typeof athleteName === "string"
          ? athleteName.trim() || null
          : null,
    }
  )

  if (error) {
    console.error("Media upload reservation failed:", {
      code: error.code,
      message: error.message,
    })

    return respond(
      "Unable to reserve upload. Check that the invitation is active and has available space.",
      400
    )
  }

  const reservation = Array.isArray(data) ? data[0] : data

  if (
    !reservation ||
    typeof reservation.file_id !== "string" ||
    !UUID_PATTERN.test(reservation.file_id) ||
    reservation.storage_path !==
      `${reservation.storage_path?.split("/")[0]}/${reservation.file_id}`
  ) {
    console.error("Unexpected media reservation response.")
    return respond("Unable to prepare upload.", 500)
  }

  const { data: signed, error: signingError } =
    await admin.storage
      .from("smc-media")
      .createSignedUploadUrl(reservation.storage_path)

  if (signingError || !signed?.token) {
    console.error(
      "Media upload signing failed:",
      signingError?.message
    )

    return respond("Unable to authorise upload.", 500)
  }

  return NextResponse.json(
    {
      fileId: reservation.file_id,
      bucket: "smc-media",
      storagePath: reservation.storage_path,
      uploadToken: signed.token,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  )
}
