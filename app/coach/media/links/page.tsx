
import Link from "next/link"
import { requireCoach } from "@/lib/authGuards"
import MediaInvitationManager from "@/components/MediaInvitationManager"

export const dynamic = "force-dynamic"

export default async function MediaInvitationsPage() {
  const { supabase } = await requireCoach()

  const { data: invitations, error } = await supabase
    .from("media_upload_links")
    .select(
      "id, title, event_name, description, is_active, expires_at, max_files, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("Unable to load media invitations:", error)

    return (
      <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-5 text-red-300">
        Unable to load invitations. Check the server logs.
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-10">
      <header className="relative overflow-hidden rounded-[1.5rem] border border-smc-gold/25 bg-black p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(212,175,55,0.18),transparent_40%)]" />

        <div className="relative">
          <Link
            href="/coach/media"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold/75 hover:text-smc-gold"
          >
            ← Media Manager
          </Link>

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-smc-gold">
            SMC Portal / Media
          </p>

          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            Upload Invitations
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
            Generate secure guest upload links for competitions,
            events and athlete footage.
          </p>
        </div>
      </header>

      <MediaInvitationManager invitations={invitations || []} />
    </div>
  )
}
