
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

import {
  enquiryRateLimit,
  verifyTurnstile,
} from "@/lib/enquirySecurity"

export const runtime = "nodejs"

const MAX_BODY_BYTES = 16_000

const VALID_METHODS = [
  "1-to-1 In Person",
  "Online Coaching",
  "Hybrid Coaching",
  "Programme Only",
  "Not Sure",
]

const VALID_CONTACT = [
  "Email",
  "Text/WhatsApp",
  "Phonecall",
]

const VALID_START = [
  "As soon as possible",
  "Within the next month",
  "In 1–3 months",
  "Just exploring options",
]

const VALID_GOALS = [
  "Powerlifting",
  "Sports Specific",
  "Strength Training",
  "Fat Loss",
  "Injury Rehab",
  "General Health",
  "Body Tone",
  "Other",
]

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : ""
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(
      request.headers.get("content-length") || 0
    )

    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Submission is too large." },
        { status: 413 }
      )
    }

    const rawBody = await request.text()

    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Submission is too large." },
        { status: 413 }
      )
    }

    let body: Record<string, unknown>

    try {
      const parsed: unknown = JSON.parse(rawBody)

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error("Invalid submission")
      }

      body = parsed as Record<string, unknown>
    } catch {
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 }
      )
    }

    // Honeypot: normal users never fill this field.
    if (body.website) {
      return NextResponse.json({ success: true })
    }


if (!enquiryRateLimit) {
  console.error("Enquiry rate limiting is not configured")

  return NextResponse.json(
    { error: "Enquiries are temporarily unavailable." },
    { status: 503 }
  )
}

// Use the visitor IP supplied by Vercel's trusted proxy.
// Do not trust arbitrary forwarded headers on an exposed origin.
const ip =
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  "unknown"

try {
  const result = await enquiryRateLimit.limit(ip)

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    )
  }
} catch {
  console.error("Enquiry rate limiting failed")

  return NextResponse.json(
    { error: "Enquiries are temporarily unavailable." },
    { status: 503 }
  )
}

const turnstileToken = cleanText(body.turnstile_token, 2048)

if (!(await verifyTurnstile(turnstileToken, ip))) {
  return NextResponse.json(
    {
      error: "Security verification failed. Please try again.",
    },
    { status: 403 }
  )
}


    const fullName = cleanText(body.full_name, 120)
    const email = cleanText(body.email, 254).toLowerCase()
    const phone = cleanText(body.phone, 40)
    const coachingMethod = cleanText(body.coaching_method, 80)
    const preferredContact = cleanText(body.preferred_contact, 40)
    const preferredStart = cleanText(body.preferred_start, 80)
    const referralSource = cleanText(body.referral_source, 100)
    const weeklyHours = cleanText(body.weekly_training_hours, 100)
    const experience = cleanText(body.training_experience, 3000)

    const goals = Array.isArray(body.goals)
      ? body.goals.filter(
          (goal): goal is string =>
            typeof goal === "string" &&
            VALID_GOALS.includes(goal)
        )
      : []

    if (
      !fullName ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !phone ||
      !VALID_METHODS.includes(coachingMethod) ||
      !VALID_CONTACT.includes(preferredContact) ||
      !VALID_START.includes(preferredStart) ||
      !referralSource ||
      !weeklyHours ||
      !experience ||
      goals.length === 0
    ) {
      return NextResponse.json(
        { error: "Please complete all required fields." },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secretKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !secretKey) {
      console.error("Coaching enquiry server configuration missing")

      return NextResponse.json(
        { error: "Enquiries are temporarily unavailable." },
        { status: 503 }
      )
    }

    const supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { error } = await supabase
      .from("coaching_enquiries")
      .insert({
        full_name: fullName,
        email,
        phone,
        gender: cleanText(body.gender, 80) || null,
        goals,
        coaching_method: coachingMethod,
        weekly_training_hours: weeklyHours,
        training_experience: experience,
        health_considerations:
          cleanText(body.health_considerations, 1500) || null,
        preferred_contact: preferredContact,
        referral_source: referralSource,
        referral_details:
          cleanText(body.referral_details, 300) || null,
        preferred_start: preferredStart,
        additional_information:
          cleanText(body.additional_information, 2000) || null,
      })

    if (error) {
      console.error("Coaching enquiry insert failed:", {
  code: error.code,
  message: error.message,
  details: error.details,
  hint: error.hint,
})

      return NextResponse.json(
        { error: "Unable to submit your enquiry. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true },
      { status: 201 }
    )
  } catch (error) {
  console.error("Unexpected coaching enquiry error:", error)

  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  )
}
}
