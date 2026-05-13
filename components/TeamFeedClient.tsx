"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type FeedPost = {
  id: string
  title: string
  body: string
  type: string
  created_at: string
}

type Reaction = {
  id: string
  post_id: string
  user_id: string
  reaction_type: string
}

type Comment = {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
}

type Client = {
  user_id: string
  name: string
}

type Props = {
  currentUserId: string
  initialPosts: FeedPost[]
  initialReactions: Reaction[]
  initialComments: Comment[]
  initialClients: Client[]
}

const softBorder = "border-[rgba(255,255,255,0.08)]"

const glassCard =
  "relative overflow-hidden rounded-[1.75rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] shadow-[0_16px_42px_rgba(0,0,0,0.68)]"

const labelStyle =
  "text-[9px] font-semibold uppercase tracking-[0.24em] text-smc-gold"

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

export default function TeamFeedClient({
  currentUserId,
  initialPosts,
  initialReactions,
  initialComments,
  initialClients,
}: Props) {
  const router = useRouter()

  const [posts] = useState(initialPosts)
  const [reactions, setReactions] = useState(initialReactions)
  const [comments, setComments] = useState(initialComments)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [postingPostId, setPostingPostId] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({})
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null)
  const [toast, setToast] = useState("")

  const clientNames = useMemo(() => {
    const map = new Map<string, string>()

    initialClients.forEach((client) => {
      map.set(client.user_id, client.name)
    })

    return map
  }, [initialClients])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(""), 2200)
  }

  async function toggleReaction(postId: string, reactionType: string) {
    if (!currentUserId) return

    const existingReaction = reactions.find(
      (reaction) =>
        reaction.post_id === postId && reaction.user_id === currentUserId
    )

    if (existingReaction?.reaction_type === reactionType) {
      setReactions((current) =>
        current.filter((reaction) => reaction.id !== existingReaction.id)
      )

      const { error } = await supabase
        .from("team_feed_reactions")
        .delete()
        .eq("id", existingReaction.id)

      if (error) {
        showToast("Could not remove reaction")
        router.refresh()
      }

      return
    }

    if (existingReaction) {
      setReactions((current) =>
        current.map((reaction) =>
          reaction.id === existingReaction.id
            ? { ...reaction, reaction_type: reactionType }
            : reaction
        )
      )

      const { error } = await supabase
        .from("team_feed_reactions")
        .update({ reaction_type: reactionType })
        .eq("id", existingReaction.id)

      if (error) {
        showToast("Could not update reaction")
        router.refresh()
      }

      return
    }

    const tempId = `temp-${Date.now()}`

    setReactions((current) => [
      ...current,
      {
        id: tempId,
        post_id: postId,
        user_id: currentUserId,
        reaction_type: reactionType,
      },
    ])

    const { data, error } = await supabase
      .from("team_feed_reactions")
      .insert({
        post_id: postId,
        user_id: currentUserId,
        reaction_type: reactionType,
      })
      .select("id, post_id, user_id, reaction_type")
      .single()

    if (error || !data) {
      setReactions((current) =>
        current.filter((reaction) => reaction.id !== tempId)
      )
      showToast("Could not add reaction")
      return
    }

    setReactions((current) =>
      current.map((reaction) => (reaction.id === tempId ? data : reaction))
    )
  }

  async function postComment(postId: string) {
    if (postingPostId) return

    const body = (commentDrafts[postId] || "").trim()

    if (!body || !currentUserId) return

    setPostingPostId(postId)

    const tempId = `temp-${Date.now()}`
    const tempComment: Comment = {
      id: tempId,
      post_id: postId,
      user_id: currentUserId,
      body,
      created_at: new Date().toISOString(),
    }

    setComments((current) => [...current, tempComment])
    setCommentDrafts((current) => ({ ...current, [postId]: "" }))

    const { data, error } = await supabase
      .from("team_feed_comments")
      .insert({
        post_id: postId,
        user_id: currentUserId,
        body,
      })
      .select("id, post_id, user_id, body, created_at")
      .single()

    setPostingPostId(null)

    if (error || !data) {
      setComments((current) =>
        current.filter((comment) => comment.id !== tempId)
      )
      setCommentDrafts((current) => ({ ...current, [postId]: body }))
      showToast("Comment failed to post")
      return
    }

    setComments((current) =>
      current.map((comment) => (comment.id === tempId ? data : comment))
    )

    showToast("Comment posted ✅")
  }

  async function saveEditedComment(commentId: string) {
    const nextBody = (editDrafts[commentId] || "").trim()

    if (!nextBody) return

    setBusyCommentId(commentId)

    const previousComments = comments

    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId ? { ...comment, body: nextBody } : comment
      )
    )

    const { error } = await supabase
      .from("team_feed_comments")
      .update({ body: nextBody })
      .eq("id", commentId)
      .eq("user_id", currentUserId)

    setBusyCommentId(null)

    if (error) {
      setComments(previousComments)
      showToast("Could not edit comment")
      return
    }

    setEditingCommentId(null)
    showToast("Comment updated ✅")
  }

  async function deleteComment(commentId: string) {
    const confirmDelete = window.confirm("Delete this comment?")

    if (!confirmDelete) return

    setBusyCommentId(commentId)

    const previousComments = comments

    setComments((current) =>
      current.filter((comment) => comment.id !== commentId)
    )

    const { error } = await supabase
      .from("team_feed_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", currentUserId)

    setBusyCommentId(null)

    if (error) {
      setComments(previousComments)
      showToast("Could not delete comment")
      return
    }

    showToast("Comment deleted")
  }

  return (
    <section className="relative flex flex-col gap-3 pt-2">
      {toast && (
        <div className="fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-smc-gold/40 bg-black/95 px-4 py-3 text-center text-sm font-bold text-smc-text shadow-[0_0_28px_rgba(212,175,55,0.22)] backdrop-blur">
          {toast}
        </div>
      )}

      <div>
        <p className={labelStyle}>SMC Home</p>
        <h1 className="mt-1.5 text-2xl font-black tracking-[-0.04em] text-smc-text">
          Team Feed
        </h1>
      </div>

      {posts.length > 0 ? (
        posts.map((post) => {
          const postReactions = reactions.filter(
            (reaction) => reaction.post_id === post.id
          )

          const userReaction =
            postReactions.find(
              (reaction) => reaction.user_id === currentUserId
            )?.reaction_type || ""

          const postComments = comments.filter(
            (comment) => comment.post_id === post.id
          )

          return (
            <article key={post.id} className={`${glassCard} p-4`}>
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

                <h2 className="mt-3 text-xl font-black text-smc-text">
                  {post.title}
                </h2>

                <p className="mt-2.5 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                  {post.body}
                </p>

                <div className="mt-4 rounded-[1.35rem] border border-[rgba(255,255,255,0.06)] bg-black/40 p-3">
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
                        <button
                          key={reactionOption.type}
                          type="button"
                          onClick={() =>
                            toggleReaction(post.id, reactionOption.type)
                          }
                          className={`flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition active:scale-[0.98] ${
                            isSelected
                              ? "border-smc-gold bg-smc-gold text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]"
                              : `border ${softBorder} bg-smc-card text-smc-muted hover:border-smc-gold hover:text-smc-text`
                          }`}
                        >
                          <span>{reactionOption.emoji}</span>
                          <span>{count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-3 rounded-[1.35rem] border border-[rgba(255,255,255,0.06)] bg-black/40 p-3.5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-smc-text">
                      Comments
                    </h3>

                    <span className="text-xs text-smc-muted-soft">
                      {postComments.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {postComments.map((comment) => {
                      const isOwnComment = comment.user_id === currentUserId
                      const isEditing = editingCommentId === comment.id
                      const isBusy = busyCommentId === comment.id

                      return (
                        <div
                          key={comment.id}
                          className={`rounded-2xl border ${softBorder} bg-[#111111] p-3`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <p className="text-xs font-bold text-smc-gold">
                              {clientNames.get(comment.user_id) || "Team SMC"}
                            </p>

                            <p className="text-[10px] text-smc-muted-soft">
                              {formatTimestamp(comment.created_at)}
                            </p>
                          </div>

                          {isEditing ? (
                            <div className="mt-2 flex flex-col gap-2">
                              <textarea
                                rows={3}
                                value={editDrafts[comment.id] ?? comment.body}
                                onChange={(event) =>
                                  setEditDrafts((current) => ({
                                    ...current,
                                    [comment.id]: event.target.value,
                                  }))
                                }
                                className={`w-full resize-none rounded-2xl border ${softBorder} bg-black p-3 text-sm text-smc-text outline-none focus:border-smc-gold`}
                              />

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => saveEditedComment(comment.id)}
                                  className="min-h-[38px] rounded-xl bg-smc-gold px-3 py-2 text-xs font-black text-black disabled:opacity-60"
                                >
                                  {isBusy ? "Saving..." : "Save edit"}
                                </button>

                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setEditingCommentId(null)}
                                  className={`min-h-[38px] rounded-xl border ${softBorder} px-3 py-2 text-xs font-bold text-smc-muted disabled:opacity-60`}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
                                {comment.body}
                              </p>

                              {isOwnComment && (
                                <div className="mt-2 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(comment.id)
                                      setEditDrafts((current) => ({
                                        ...current,
                                        [comment.id]: comment.body,
                                      }))
                                    }}
                                    className="text-[11px] font-bold text-smc-gold"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => deleteComment(comment.id)}
                                    className="text-[11px] font-bold text-red-400 disabled:opacity-60"
                                  >
                                    {isBusy ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}

                    {postComments.length === 0 && (
                      <p className="text-xs text-smc-muted-soft">
                        No comments yet. Be the first.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <textarea
                      rows={2}
                      required
                      value={commentDrafts[post.id] || ""}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [post.id]: event.target.value,
                        }))
                      }
                      placeholder="Add a comment..."
                      className={`max-h-32 w-full resize-none rounded-2xl border ${softBorder} bg-[#111111] p-3 text-sm text-smc-text outline-none placeholder:text-smc-muted-soft focus:border-smc-gold`}
                    />

                    <button
                      type="button"
                      disabled={
                        postingPostId === post.id ||
                        !(commentDrafts[post.id] || "").trim()
                      }
                      onClick={() => postComment(post.id)}
                      className="min-h-[42px] rounded-2xl bg-smc-gold px-4 py-3 text-sm font-black text-black transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {postingPostId === post.id
                        ? "Posting..."
                        : "Post comment"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )
        })
      ) : (
        <div
          className={`rounded-3xl border ${softBorder} bg-smc-card p-5 text-center text-sm text-smc-muted`}
        >
          <p className="font-bold text-smc-text">Welcome to SMC Home.</p>
          <p className="mt-2 leading-6">
            Team updates, PBs, competitions and announcements will appear here
            once they’re posted.
          </p>
        </div>
      )}
    </section>
  )
}