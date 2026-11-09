
import MediaGuestPage from "@/components/MediaGuestPage"

export const dynamic = "force-dynamic"

export default async function GuestMediaPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return <MediaGuestPage token={token} />
}