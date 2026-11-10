
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
    !UUID_PATTERN.test(body.fileId) ||
    !("decision" in body) ||
    (body.decision !== "approved" &&
      body.decision !== "rejected")
  ) {
    return respond("Invalid review request.", 400)
  }

  const fileId = body.fileId
  const decision = body.decision

  // Approval uses the authenticated coach session.
  // PostgreSQL verifies coach access and assigns the event folder
  // in the same transaction as the approval.
  if (decision === "approved") {
    const { data, error } = await supabase.rpc(
      "approve_smc_media_file",
      {
        p_file_id: fileId,
        p_coach_id: user.id,
      }
    )

    if (error) {
      console.error(
        "SMC media automatic approval failed:",
        error.message
      )

      if (
        error.message.includes("no longer pending review")
      ) {
        return respond(
          "This file is no longer pending review. Refresh the page.",
          409
        )
      }

      return respond("Unable to approve media.", 500)
    }

    const approved = Array.isArray(data) ? data[0] : null

    if (!approved) {
      return respond("Unable to approve media.", 500)
    }

    return NextResponse.json(
      {
        success: true,
        fileId: approved.file_id,
        status: approved.file_status,
        folderId: approved.assigned_folder_id,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  }

  // Rejection keeps the existing working service-role workflow.
  const admin = createSupabaseMediaAdmin()

  const { data: updated, error: updateError } =
    await admin
      .from("media_files")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", fileId)
      .eq("status", "pending")
      .select("id, status, reviewed_at")
      .maybeSingle()

  if (updateError) {
    console.error(
      "SMC media rejection failed:",
      updateError.message
    )

    return respond("Unable to reject media.", 500)
  }

  if (!updated) {
    return respond(
      "This file is no longer pending review. Refresh the page.",
      409
    )
  }

  return NextResponse.json(
    {
      success: true,
      fileId: updated.id,
      status: updated.status,
      reviewedAt: updated.reviewed_at,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
