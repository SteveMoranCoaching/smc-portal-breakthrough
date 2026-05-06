import { ReactNode } from "react"
import BottomNav from "@/components/BottomNav"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let unreadClientMessages = 0

  if (user) {
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("read_by_client", false)

    unreadClientMessages = count || 0
  }

  return (
    <main className="min-h-screen bg-smc-bg text-smc-text">
      <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-32 pt-5">
        {children}
      </div>

      <BottomNav
        unreadMessages={unreadClientMessages}
        currentUserId={user?.id}
      />
    </main>
  )
}