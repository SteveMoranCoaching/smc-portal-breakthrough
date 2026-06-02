import webpush from "web-push"

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:SteveMoranCoaching@outlook.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushNotification(
  subscription: {
    endpoint: string
    p256dh: string
    auth: string
  },
  payload: {
    title: string
    body: string
    url?: string
  }
) {
  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload)
  )
}