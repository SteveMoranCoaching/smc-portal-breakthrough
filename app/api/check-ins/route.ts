import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { checkCheckInAchievements } from "@/lib/achievements"

function getWeekWindow() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)

  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)

  const nextMonday = new Date(monday)
  nextMonday.setDate(monday.getDate() + 7)

  return {
    weekStart: monday.toISOString(),
    weekEnd: nextMonday.toISOString(),
  }
}

function isCheckInWindowOpen() {
  const day = new Date().getDay()

  return day === 5 || day === 6 || day === 0
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to submit a check-in." },
        { status: 401 }
      )
    }

    if (!isCheckInWindowOpen()) {
      return NextResponse.json(
        { error: "Weekly check-ins are available from Friday through Sunday." },
        { status: 403 }
      )
    }

    const { weekStart, weekEnd } = getWeekWindow()

    const { data: existingThisWeek, error: existingCheckInError } =
      await supabase
        .from("check_ins")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", weekStart)
        .lt("created_at", weekEnd)
        .maybeSingle()

    if (existingCheckInError) {
      console.error(
        "Check-in duplicate lookup error:",
        existingCheckInError
      )

      return NextResponse.json(
        { error: "Could not verify this week's check-in status." },
        { status: 500 }
      )
    }

    if (existingThisWeek) {
      return NextResponse.json(
        { error: "You've already completed this week's check-in." },
        { status: 409 }
      )
    }

    const formData = await request.formData()

    const painNiggles =
      formData.get("pain_niggles") === "yes"

    const { data: createdCheckIn, error: checkInError } =
      await supabase
        .from("check_ins")
        .insert({
          user_id: user.id,

          bodyweight: null,

          training_rating:
            Number(formData.get("training_rating")) || null,

          training_enjoyment:
            Number(formData.get("training_enjoyment")) || null,

          pain_niggles: painNiggles,

          pain_notes: painNiggles
            ? String(formData.get("pain_notes") || "").trim()
            : null,

          recovery_rating:
            Number(formData.get("recovery_rating")) || null,

          sleep_hours:
            Number(formData.get("sleep_hours")) || null,

          sleep_quality:
            Number(formData.get("sleep_quality")) || null,

          stress_rating:
            Number(formData.get("stress_rating")) || null,

          fatigue_rating:
            Number(formData.get("fatigue_rating")) || null,

          nutrition_rating:
            Number(formData.get("nutrition_rating")) || null,

          weekly_win:
            String(formData.get("weekly_win") || "").trim() || null,

          weekly_challenge:
            String(formData.get("weekly_challenge") || "").trim() || null,

          support_needed:
            String(formData.get("support_needed") || "").trim() || null,

          cardio_steps:
            String(formData.get("cardio_steps") || "").trim(),

          notes:
            String(formData.get("notes") || "").trim(),

          reviewed: false,
          feedback_seen: true,
          manual_entry: false,
          submitted_by: "client",
          coach_id: null,
        })
        .select("id")
        .single()

    if (checkInError || !createdCheckIn) {
      console.error("Check-in submit error:", checkInError)

      return NextResponse.json(
        {
          error:
            checkInError?.message ||
            "Could not create your check-in.",
        },
        { status: 500 }
      )
    }

    const dayKeys = [
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun",
    ]

    const now = new Date()
    const currentDay = now.getDay()
    const daysSinceMonday =
      currentDay === 0 ? 6 : currentDay - 1

    const monday = new Date(now)
    monday.setHours(12, 0, 0, 0)
    monday.setDate(now.getDate() - daysSinceMonday)

    const dailyMetricRows = dayKeys
      .map((dayKey, index) => {
        const calories = Number(
          formData.get(`nutrition_${dayKey}_calories`)
        )

        const protein = Number(
          formData.get(`nutrition_${dayKey}_protein`)
        )

        const carbs = Number(
          formData.get(`nutrition_${dayKey}_carbs`)
        )

        const fat = Number(
          formData.get(`nutrition_${dayKey}_fat`)
        )

        const bodyweight = Number(
          formData.get(`activity_${dayKey}_bodyweight`)
        )

        const steps = Number(
          formData.get(`activity_${dayKey}_steps`)
        )

        const cardioMinutes = Number(
          formData.get(`activity_${dayKey}_cardio`)
        )

        const hasDailyData =
          calories > 0 ||
          protein > 0 ||
          carbs > 0 ||
          fat > 0 ||
          bodyweight > 0 ||
          steps > 0 ||
          cardioMinutes > 0

        if (!hasDailyData) return null

        const metricDate = new Date(monday)
        metricDate.setDate(monday.getDate() + index)

        return {
          user_id: user.id,
          check_in_id: createdCheckIn.id,

          metric_date: [
            metricDate.getFullYear(),
            String(metricDate.getMonth() + 1).padStart(2, "0"),
            String(metricDate.getDate()).padStart(2, "0"),
          ].join("-"),

          calories: calories > 0 ? calories : null,
          protein: protein > 0 ? protein : null,
          carbs: carbs > 0 ? carbs : null,
          fat: fat > 0 ? fat : null,

          bodyweight:
            bodyweight > 0 ? bodyweight : null,

          steps:
            steps > 0 ? steps : null,

          cardio_minutes:
            cardioMinutes > 0 ? cardioMinutes : null,
        }
      })
      .filter((row) => row !== null)

      const weeklyBodyweights = dailyMetricRows
  .map((row) => row.bodyweight)
  .filter(
    (bodyweight): bodyweight is number =>
      typeof bodyweight === "number" && bodyweight > 0
  )

const averageBodyweight =
  weeklyBodyweights.length > 0
    ? Number(
        (
          weeklyBodyweights.reduce(
            (total, bodyweight) => total + bodyweight,
            0
          ) / weeklyBodyweights.length
        ).toFixed(1)
      )
    : null

if (averageBodyweight !== null) {
  const { error: bodyweightUpdateError } = await supabase
    .from("check_ins")
    .update({
      bodyweight: averageBodyweight,
    })
    .eq("id", createdCheckIn.id)
    .eq("user_id", user.id)

  if (bodyweightUpdateError) {
    console.error(
      "Check-in average bodyweight update error:",
      bodyweightUpdateError
    )
  }
}

    if (dailyMetricRows.length > 0) {
      const { error: dailyMetricsError } =
        await supabase
          .from("client_daily_metrics")
          .upsert(dailyMetricRows, {
            onConflict: "user_id,metric_date",
          })

      if (dailyMetricsError) {
        console.error(
          "Daily metrics insert error:",
          dailyMetricsError
        )
      }
    }

    const hasProgressPhotos =
      String(formData.get("has_progress_photos") || "") === "yes"

    if (hasProgressPhotos) {
      const progressPhotoViews = [
        "front",
        "side",
        "back",
      ] as const

      const photoDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-")

      for (const view of progressPhotoViews) {
        const storagePath = String(
          formData.get(`progress_photo_${view}_path`) || ""
        ).trim()

        if (!storagePath) continue

        if (!storagePath.startsWith(`${user.id}/`)) {
          console.error(
            `Invalid progress photo path (${view}):`,
            storagePath
          )
          continue
        }

        const { error: photoMetadataError } =
          await supabase
            .from("progress_photos")
            .upsert(
              {
                user_id: user.id,
                check_in_id: createdCheckIn.id,
                photo_date: photoDate,
                view,
                storage_path: storagePath,
              },
              {
                onConflict:
                  "user_id,photo_date,view",
              }
            )

        if (photoMetadataError) {
          console.error(
            `Progress photo metadata error (${view}):`,
            photoMetadataError
          )
        }
      }
    }

    await checkCheckInAchievements(
      supabase,
      user.id
    )

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/check-ins")
    revalidatePath("/coach")

    return NextResponse.json({
      success: true,
      checkInId: createdCheckIn.id,
    })
  } catch (error) {
    console.error("Check-in API error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while submitting your check-in.",
      },
      { status: 500 }
    )
  }
}