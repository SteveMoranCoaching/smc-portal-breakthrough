"use client"

import { ChangeEvent, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function MessageComposer({
  currentUserId,
  recipientId,
  clientUserId,
  isCoach,
  placeholder = "Write a message...",
}: {
  currentUserId: string
  recipientId: string
  clientUserId: string
  isCoach: boolean
  placeholder?: string
}) {
  const [body, setBody] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  const lastSentRef = useRef(0)
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  )

  useEffect(() => {
    const channel = supabase.channel(`message-typing-${clientUserId}`, {
      config: {
        broadcast: {
          self: false,
        },
      },
    })

    typingChannelRef.current = channel
    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
      typingChannelRef.current = null
    }
  }, [clientUserId])

  function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value
    setBody(value)

    if (!value.trim()) return

    const now = Date.now()

    if (now - lastSentRef.current < 700) return
    lastSentRef.current = now

    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: {
        clientUserId,
        userId: currentUserId,
      },
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedBody = body.trim()

    if (!trimmedBody && !file) return

    setSending(true)
    setError("")

    let attachmentPath: string | null = null
    let attachmentType: string | null = null
    let attachmentName: string | null = null

    if (file) {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-")
      const filePath = `${clientUserId}/${currentUserId}/${Date.now()}-${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(filePath, file)

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        setSending(false)
        return
      }

      attachmentPath = filePath
      attachmentName = file.name

      if (file.type.startsWith("image/")) {
        attachmentType = "image"
      } else if (file.type.startsWith("video/")) {
        attachmentType = "video"
      } else {
        attachmentType = "file"
      }
    }

    const { error: messageError } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      recipient_id: recipientId,
      client_user_id: clientUserId,
      body: trimmedBody,
      read_by_client: isCoach ? false : true,
      read_by_coach: isCoach ? true : false,
      attachment_path: attachmentPath,
      attachment_type: attachmentType,
      attachment_name: attachmentName,
    })

    if (messageError) {
      setError(`Message failed: ${messageError.message}`)
      setSending(false)
      return
    }

    setBody("")
    setFile(null)
    setSending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <textarea
        name="body"
        rows={3}
        value={body}
        onChange={handleBodyChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-800 bg-gray-950 p-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-yellow-400"
      />

      <div className="rounded-2xl border border-gray-800 bg-gray-950 p-3">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-white">
            {file ? file.name : "Add image/video"}
          </span>

          <span className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-black">
            Choose file
          </span>

          <input
            type="file"
            accept="image/*,video/*"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="hidden"
            disabled={sending}
          />
        </label>

        {file && (
          <button
            type="button"
            onClick={() => setFile(null)}
            className="mt-2 text-xs font-semibold text-gray-400 underline"
          >
            Remove attachment
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending || (!body.trim() && !file)}
        className="w-full rounded-2xl bg-yellow-400 px-5 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send Message"}
      </button>
    </form>
  )
}