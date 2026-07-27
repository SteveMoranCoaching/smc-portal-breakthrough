import { requireCoach } from "@/lib/authGuards"
import TeamFeed from "@/components/TeamFeed"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

import { notifyUser } from "@/lib/notifyUser"

export const dynamic = "force-dynamic"

async function createTeamFeedPost(formData: FormData) {
  "use server"

  const title = String(formData.get("title") || "").trim()
  const body = String(formData.get("body") || "").trim()
  const type = String(formData.get("type") || "Announcement")
  const notifyMembers = formData.get("notify_members") === "on"

  if (!title || !body) return

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.from("team_feed_posts").insert({
  title,
  body,
  type,
  notify_members: notifyMembers,
})

if (error) {
  console.error("Team feed post error:", error)
  redirect("/coach/smc-home?posted=error")
}

if (notifyMembers) {
  const { data: activeClients } = await supabase
    .from("clients")
    .select("user_id")
    .eq("status", "Active")

  await Promise.all(
    (activeClients || []).map((client) =>
      notifyUser({
        userId: client.user_id,
        title: "New SMC Community Post",
        body: title,
        url: "/dashboard",
      }).catch((error) => {
        console.error(
          `Failed to notify ${client.user_id}:`,
          error
        )
      })
    )
  )
}

revalidatePath("/dashboard")
revalidatePath("/coach/smc-home")

redirect(
  notifyMembers
    ? "/coach/smc-home?posted=true&notified=true"
    : "/coach/smc-home?posted=true"
)
}

export default async function CoachSmcHomePage({
  searchParams,
}: {
  searchParams: Promise<{
    posted?: string
    notified?: string
  }>
}) {
  await requireCoach()

  const params = await searchParams
  const posted = params.posted === "true"
  const notified = params.notified === "true"

  return (
  <div className="flex flex-col gap-4">
    <div className="rounded-[1.25rem] border border-white/[0.06] bg-black p-4 text-white">
  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold">
    SMC Community
  </p>

  <h1 className="mt-1 text-2xl font-black">
    SMC Home
  </h1>

  <p className="mt-2 text-sm text-white/50">
    Manage announcements and community posts.
  </p>
</div>

{posted && (
  <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
    {notified
      ? "Community post published and members will be notified."
      : "Community post published."}
  </div>
)}

    <form
  action={createTeamFeedPost}
  className="rounded-[1.25rem] border border-white/[0.06] bg-black p-4 text-white"
>
  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-smc-gold">
    Create Community Post
  </p>

  <div className="mt-4 flex flex-col gap-3">
    <input
      name="title"
      required
      placeholder="Post title"
      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
    />

    <select
      name="type"
      defaultValue="Announcement"
      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
    >
      <option value="Announcement">Announcement</option>
      <option value="Community">Community</option>
      <option value="Update">Update</option>
    </select>

    <textarea
      name="body"
      required
      rows={5}
      placeholder="Write your post..."
      className="resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
    />

    <label className="flex items-center gap-3 text-sm text-white/70">
      <input
  type="checkbox"
  name="notify_members"
  defaultChecked
  className="h-4 w-4"
/>

      Notify members
    </label>

    <button
      type="submit"
      className="rounded-xl bg-smc-gold px-4 py-3 text-sm font-black text-black"
    >
      Publish Post
    </button>
  </div>
</form>

    <TeamFeed />
  </div>
)
}