import webpush from "web-push"

let vapidConfigured = false

function configureVapid() {
  if (vapidConfigured) return

  const publicKey =
    process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID keys")
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:SteveMoranCoaching@outlook.com",
    publicKey,
    privateKey
  )

  vapidConfigured = true
}

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
  configureVapid()

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