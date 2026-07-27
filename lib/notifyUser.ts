import { createClient } from "@supabase/supabase-js"

import { sendPushNotification } from "@/lib/sendPushNotification"

type NotifyUserInput = {
  userId: string
  title: string
  body: string
  url: string
}

export async function notifyUser({
  userId,
  title,
  body,
  url,
}: NotifyUserInput) {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subscriptions, error } = await adminSupabase
    .from("notification_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  const results = await Promise.allSettled(
    (subscriptions || []).map((subscription) =>
      sendPushNotification(subscription, {
        title,
        body,
        url,
      })
    )
  )

  return {
    requestedUserId: userId,
    subscriptionCount: subscriptions?.length || 0,
    subscriptions: subscriptions || [],
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  }
}