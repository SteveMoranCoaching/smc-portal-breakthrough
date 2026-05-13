import TeamFeedClient from "@/components/TeamFeedClient"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export default async function TeamFeed() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: feedPosts } = await supabase
    .from("team_feed_posts")
    .select("id, title, body, type, created_at")
    .order("created_at", { ascending: false })
    .limit(10)

  const postIds = feedPosts?.map((post) => post.id) || []

  const { data: reactions } =
    postIds.length > 0
      ? await supabase
          .from("team_feed_reactions")
          .select("id, post_id, user_id, reaction_type")
          .in("post_id", postIds)
      : { data: [] }

  const { data: comments } =
    postIds.length > 0
      ? await supabase
          .from("team_feed_comments")
          .select("id, post_id, user_id, body, created_at")
          .in("post_id", postIds)
          .order("created_at", { ascending: true })
      : { data: [] }

  const commenterUserIds = Array.from(
    new Set(comments?.map((comment) => comment.user_id) || [])
  )

  const { data: clients } =
    commenterUserIds.length > 0
      ? await supabase
          .from("clients")
          .select("user_id, name")
          .in("user_id", commenterUserIds)
      : { data: [] }

  return (
    <TeamFeedClient
      currentUserId={user?.id || ""}
      initialPosts={feedPosts || []}
      initialReactions={reactions || []}
      initialComments={comments || []}
      initialClients={clients || []}
    />
  )
}