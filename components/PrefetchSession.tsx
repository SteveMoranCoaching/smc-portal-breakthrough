"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PrefetchSession({ href }: { href: string }) {
  const router = useRouter()

  useEffect(() => {
    router.prefetch(href)
  }, [href, router])

  return null
}