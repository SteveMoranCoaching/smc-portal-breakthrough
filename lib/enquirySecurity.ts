
import "server-only"

import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

export const enquiryRateLimit =
  redisUrl && redisToken
    ? new Ratelimit({
        redis: new Redis({
          url: redisUrl,
          token: redisToken,
        }),
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "smc:coaching-enquiries",
      })
    : null

export async function verifyTurnstile(
  token: string,
  remoteIp?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret || !token) return false

  try {
    const formData = new FormData()

    formData.append("secret", secret)
    formData.append("response", token)

    if (remoteIp) {
      formData.append("remoteip", remoteIp)
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!response.ok) return false

    const result: {
      success?: boolean
      hostname?: string
    } = await response.json()

    return (
      result.success === true &&
      ["app.stevemorancoaching.com", "localhost"].includes(
        result.hostname ?? ""
      )
    )
  } catch {
    return false
  }
}
