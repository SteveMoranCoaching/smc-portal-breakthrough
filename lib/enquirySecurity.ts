import "server-only"

import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

let cachedRateLimit: Ratelimit | null = null

export function getEnquiryRateLimit(): Ratelimit {
  if (cachedRateLimit) {
    return cachedRateLimit
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

  if (!redisUrl || !redisToken) {
    throw new Error(
      "Enquiry rate limiting is not configured. Check the Upstash environment variables."
    )
  }

  let parsedUrl: URL

  try {
    parsedUrl = new URL(redisUrl)
  } catch {
    throw new Error(
      "Invalid Upstash REST URL. Check UPSTASH_REDIS_REST_URL."
    )
  }

  if (
    parsedUrl.protocol !== "https:" ||
    !parsedUrl.hostname ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL must be a valid HTTPS REST endpoint."
    )
  }

  cachedRateLimit = new Ratelimit({
    redis: new Redis({
      url: parsedUrl.toString(),
      token: redisToken,
    }),
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "smc:coaching-enquiries",
  })

  return cachedRateLimit
}

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