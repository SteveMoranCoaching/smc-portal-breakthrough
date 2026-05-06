import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

const softBorder = "border-[rgba(255,255,255,0.06)]"

const premiumCard =
  "relative overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[#111111] to-[#050505] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.75)] before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

const innerPanel =
  "rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#080808] shadow-inner"

const reactionOptions = [
  { type: "strong", emoji: "💪" },
  { type: "fire", emoji: "🔥" },
  { type: "congrats", emoji: "👏" },
  { type: "smc", emoji: "🖤" },
]

function getTagStyle(type: string) {
  if (type === "PB") return "bg-green-500 text-black"
  if (type === "Competition") return "bg-smc-gold text-black"
  return "bg-smc-card-soft text-smc-muted"
}

function formatTimestamp(dateString: string) {
  const date = new Date(dateString)

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}

async function toggleReaction(formData: FormData) {
  "use server"

  const postId = String(formData.get("postId") || "")
  const reactionType = String(formData.get("reactionType") || "")

  if (!postId || !reactionType) return

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { data: existingReaction } = await supabase
    .from("team_feed_reactions")
    .select("id, reaction_type")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (existingReaction?.reaction_type === reactionType) {
    await supabase
      .from("team_feed_reactions")
      .delete()
      .eq("id", existingReaction.id)
  } else if (existingReaction) {
    await supabase
      .from("team_feed_reactions")
      .update({ reaction_type: reactionType })
      .eq("id", existingReaction.id)
  } else {
    await supabase.from("team_feed_reactions").insert({
      post_id: postId,
      user_id: user.id,
      reaction_type: reactionType,
    })
  }

  revalidatePath("/dashboard")
}

async function addComment(formData: FormData) {
  "use server"

  const postId = String(formData.get("postId") || "")
  const body = String(formData.get("body") || "").trim()

  if (!postId || !body) return

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase.from("team_feed_comments").insert({
    post_id: postId,
    user_id: user.id,
    body,
  })

  revalidatePath("/dashboard")
}

export default async function Dashboard() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: feedPosts, error } = await supabase
    .from("team_feed_posts")
    .select("id, title, body, type, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
        <h2 className="mb-3 font-bold">Could not load team feed</h2>
        <pre className="whitespace-pre-wrap text-xs">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    )
  }

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

  const clientNames = new Map<string, string>()

  clients?.forEach((client) => {
    clientNames.set(client.user_id, client.name)
  })

  const reactionsByPost = new Map<string, typeof reactions>()
  const userReactionByPost = new Map<string, string>()
  const commentsByPost = new Map<string, typeof comments>()

  reactions?.forEach((reaction) => {
    const existingReactions = reactionsByPost.get(reaction.post_id) || []
    reactionsByPost.set(reaction.post_id, [...existingReactions, reaction])

    if (reaction.user_id === user?.id) {
      userReactionByPost.set(reaction.post_id, reaction.reaction_type)
    }
  })

  comments?.forEach((comment) => {
    const existingComments = commentsByPost.get(comment.post_id) || []
    commentsByPost.set(comment.post_id, [...existingComments, comment])
  })

  return (
    <div className="flex flex-col gap-4">
      <section className={premiumCard}>
        <div className="mb-4 h-1 w-16 rounded-full bg-smc-gold shadow-[0_0_18px_rgba(212,175,55,0.35)]" />

        <p className="text-xs uppercase tracking-[0.25em] text-smc-gold">
          Steve Moran Coaching
        </p>

        <h1 className="mt-4 text-2xl font-bold text-smc-text">SMC Home</h1>

        <p className="mt-2 text-sm leading-6 text-smc-muted">
          Team updates, PBs, competitions, records and announcements.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        {feedPosts?.map((post) => {
          const postReactions = reactionsByPost.get(post.id) || []
          const userReaction = userReactionByPost.get(post.id) || ""
          const postComments = commentsByPost.get(post.id) || []

          return (
            <article key={post.id} className={premiumCard}>
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${getTagStyle(
                      post.type
                    )}`}
                  >
                    {post.type}
                  </span>

                  <span className="text-xs text-smc-muted-soft">
                    {formatTimestamp(post.created_at)}
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-bold text-smc-text">
                  {post.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  {post.body}
                </p>

                <div className={`mt-5 ${innerPanel} p-3`}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-smc-muted-soft">
                      {postReactions.length}{" "}
                      {postReactions.length === 1 ? "reaction" : "reactions"}
                    </p>

                    {userReaction && (
                      <p className="text-xs font-bold text-smc-gold">
                        You reacted:{" "}
                        {
                          reactionOptions.find(
                            (reaction) => reaction.type === userReaction
                          )?.emoji
                        }
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {reactionOptions.map((reactionOption) => {
                      const count = postReactions.filter(
                        (reaction) =>
                          reaction.reaction_type === reactionOption.type
                      ).length

                      const isSelected = userReaction === reactionOption.type

                      return (
                        <form key={reactionOption.type} action={toggleReaction}>
                          <input type="hidden" name="postId" value={post.id} />
                          <input
                            type="hidden"
                            name="reactionType"
                            value={reactionOption.type}
                          />

                          <button
                            type="submit"
                            className={`flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition ${
                              isSelected
                                ? "border-smc-gold bg-smc-gold/90 text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]"
                                : `border ${softBorder} bg-smc-card text-smc-muted hover:border-smc-gold hover:text-smc-text`
                            }`}
                          >
                            <span>{reactionOption.emoji}</span>
                            <span>{count}</span>
                          </button>
                        </form>
                      )
                    })}
                  </div>
                </div>

                <div className={`mt-4 ${innerPanel} p-4`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-smc-text">
                      Comments
                    </h3>

                    <span className="text-xs text-smc-muted-soft">
                      {postComments.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {postComments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`rounded-2xl border ${softBorder} bg-[#111111] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)]`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <p className="text-xs font-bold text-smc-gold">
                            {clientNames.get(comment.user_id) || "Team SMC"}
                          </p>

                          <p className="text-[10px] text-smc-muted-soft">
                            {formatTimestamp(comment.created_at)}
                          </p>
                        </div>

                        <p className="text-sm leading-6 text-zinc-300">
                          {comment.body}
                        </p>
                      </div>
                    ))}

                    {postComments.length === 0 && (
                      <p className="text-xs text-smc-muted-soft">
                        No comments yet. Be the first.
                      </p>
                    )}
                  </div>

                  <form action={addComment} className="mt-4 flex flex-col gap-2">
                    <input type="hidden" name="postId" value={post.id} />

                    <textarea
                      name="body"
                      rows={2}
                      placeholder="Add a comment..."
                      className={`w-full rounded-2xl border ${softBorder} bg-[#111111] p-3 text-sm text-smc-text outline-none placeholder:text-smc-muted-soft focus:border-smc-gold`}
                    />

                    <button
                      type="submit"
                      className="rounded-2xl bg-smc-gold/90 px-4 py-3 text-sm font-bold text-black transition hover:bg-smc-gold-soft"
                    >
                      Post comment
                    </button>
                  </form>
                </div>
              </div>
            </article>
          )
        })}

        {(!feedPosts || feedPosts.length === 0) && (
          <div
            className={`rounded-3xl border ${softBorder} bg-smc-card p-5 text-center text-sm text-smc-muted`}
          >
            No team posts yet.
          </div>
        )}
      </section>
    </div>
  )
}