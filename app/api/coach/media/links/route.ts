
import { createHash, randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (!origin) return false

  try {
    const source = new URL(origin)
    const destination = new URL(request.url)

    return (
      source.protocol === destination.protocol &&
      source.host === destination.host
    )
  } catch {
    return false
  }
}

async function getCoach() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || profile?.role !== "coach") return null

  return { supabase, user }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return json({ error: "Invalid request origin." }, 403)
  }

  const coach = await getCoach()

  if (!coach) {
    return json({ error: "Coach access required." }, 403)
  }

  let body: Record<string, unknown>

  try {
    body = await request.json()

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "Invalid request." }, 400)
    }
  } catch {
    return json({ error: "Invalid request body." }, 400)
  }

  const action = body.action

  if (action === "revoke") {
    const id = body.id

    if (
      typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      return json({ error: "Invalid invitation ID." }, 400)
    }

    const { data, error } = await coach.supabase
      .from("media_upload_links")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id")
      .single()

    if (error || !data) {
      return json({ error: "Unable to revoke invitation." }, 500)
    }

    return json({ success: true })
  }

  if (action !== "create") {
    return json({ error: "Unknown action." }, 400)
  }

  const title =
    typeof body.title === "string" ? body.title.trim() : ""

  const eventName =
    typeof body.eventName === "string"
      ? body.eventName.trim()
      : ""

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : ""

  const expiryDays = body.expiryDays
  const maxFiles = body.maxFiles

  if (!title || title.length > 120) {
    return json(
      { error: "Invitation title must be 1–120 characters." },
      400
    )
  }

  if (eventName.length > 120 || description.length > 500) {
    return json({ error: "Event name or description is too long." }, 400)
  }

  if (
    typeof expiryDays !== "number" ||
    !Number.isInteger(expiryDays) ||
    expiryDays < 1 ||
    expiryDays > 30
  ) {
    return json({ error: "Expiry must be 1–30 days." }, 400)
  }

  if (
    typeof maxFiles !== "number" ||
    !Number.isInteger(maxFiles) ||
    maxFiles < 1 ||
    maxFiles > 1000
  ) {
    return json({ error: "File limit must be 1–1000." }, 400)
  }

  const token = randomBytes(32).toString("hex")

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex")

  const expiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data, error } = await coach.supabase
    .from("media_upload_links")
    .insert({
      title,
      description: description || null,
      event_name: eventName || null,
      token_hash: tokenHash,
      expires_at: expiresAt,
      max_files: maxFiles,
      max_file_size_bytes: 1073741824,
      is_active: true,
      created_by: coach.user.id,
    })
    .select("id, title, expires_at")
    .single()

  if (error || !data) {
    console.error("Media invitation creation failed:", error)
    return json({ error: "Unable to create invitation." }, 500)
  }

  const baseUrl = new URL(request.url).origin

  return json(
    {
      success: true,
      invitation: data,
      uploadUrl: `${baseUrl}/media/${token}`,
    },
    201
  )
}
