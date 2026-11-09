
import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseMediaAdmin } from "@/lib/supabaseMediaAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TOKEN_PATTERN = /^[a-f0-9]{64}$/

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    )
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !("token" in body) ||
    typeof body.token !== "string" ||
    !TOKEN_PATTERN.test(body.token)
  ) {
    return NextResponse.json(
      { error: "Invalid invitation link." },
      { status: 400 }
    )
  }

  const tokenHash = createHash("sha256")
    .update(body.token)
    .digest("hex")

  const admin = createSupabaseMediaAdmin()

  const { data: invitation, error } = await admin
    .from("media_upload_links")
    .select(
      "id, title, description, event_name, is_active, expires_at, max_files, max_file_size_bytes"
    )
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (error) {
    console.error("Media invitation lookup failed:", error)

    return NextResponse.json(
      { error: "Unable to check invitation." },
      { status: 500 }
    )
  }

  if (
    !invitation ||
    !invitation.is_active ||
    (invitation.expires_at &&
      new Date(invitation.expires_at).getTime() <= Date.now())
  ) {
    return NextResponse.json(
      { error: "This invitation is invalid, expired or revoked." },
      { status: 404 }
    )
  }

  
const now = new Date().toISOString()

const { count: completedCount, error: completedError } =
  await admin
    .from("media_files")
    .select("id", { count: "exact", head: true })
    .eq("upload_link_id", invitation.id)
    .in("status", ["pending", "approved", "rejected"])

const { count: uploadingCount, error: uploadingError } =
  await admin
    .from("media_files")
    .select("id", { count: "exact", head: true })
    .eq("upload_link_id", invitation.id)
    .eq("status", "uploading")
    .gt("reservation_expires_at", now)

const countError = completedError || uploadingError

const count = (completedCount ?? 0) + (uploadingCount ?? 0)


  if (countError) {
    console.error("Media invitation capacity lookup failed:", countError)

    return NextResponse.json(
      { error: "Unable to check invitation capacity." },
      { status: 500 }
    )
  }

  const remainingFiles = Math.max(
    0,
    invitation.max_files - (count || 0)
  )

  if (remainingFiles === 0) {
    return NextResponse.json(
      { error: "This invitation has reached its upload limit." },
      { status: 409 }
    )
  }

  return NextResponse.json(
    {
      valid: true,
      invitation: {
        title: invitation.title,
        description: invitation.description,
        eventName: invitation.event_name,
        expiresAt: invitation.expires_at,
        maxFileSizeBytes: invitation.max_file_size_bytes,
        remainingFiles,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
