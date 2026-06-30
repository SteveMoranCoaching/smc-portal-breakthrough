"use client"

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import FileUploader from "@/components/FileUploader"

type UploadedAttachment = {
  path: string
  name: string
  type: "image" | "video" | "file"
  size: number
}

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
  const [uploadedAttachment, setUploadedAttachment] =
    useState<UploadedAttachment | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const lastTypingSentRef = useRef(0)
  const submitLockRef = useRef(false)
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

  useEffect(() => {
    if (!textareaRef.current) return

    textareaRef.current.style.height = "auto"
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      130
    )}px`
  }, [body])

  function getMessagePreview({
    messageBody,
    attachmentType,
    attachmentName,
  }: {
    messageBody: string
    attachmentType: string | null
    attachmentName: string | null
  }) {
    if (messageBody.trim()) return messageBody.trim()
    if (attachmentType === "image") return "Sent an image"
    if (attachmentType === "video") return "Sent a video"
    if (attachmentName) return `Sent ${attachmentName}`

    return "Sent an attachment"
  }

  async function sendMessagePushNotification({
    messageBody,
    attachmentType,
    attachmentName,
  }: {
    messageBody: string
    attachmentType: string | null
    attachmentName: string | null
  }) {
    const preview = getMessagePreview({
      messageBody,
      attachmentType,
      attachmentName,
    })

    await fetch("/api/notifications/send-to-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: recipientId,
        title: "New SMC message",
        body: preview,
        url: isCoach
          ? "/dashboard/messages"
          : `/coach/messages/${clientUserId}`,
      }),
    })
  }

  function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value
    setBody(value)
    setError("")

    if (!value.trim()) return

    const now = Date.now()

    if (now - lastTypingSentRef.current < 700) return
    lastTypingSentRef.current = now

    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: {
        clientUserId,
        userId: currentUserId,
      },
    })
  }

  function clearAttachment() {
    setUploadedAttachment(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitLockRef.current) return

    const trimmedBody = body.trim()

    if (!trimmedBody && !uploadedAttachment) return

    submitLockRef.current = true
    setSending(true)
    setError("")

    const attachmentPath = uploadedAttachment?.path || null
    const attachmentType = uploadedAttachment?.type || null
    const attachmentName = uploadedAttachment?.name || null

    try {
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
        return
      }

      sendMessagePushNotification({
        messageBody: trimmedBody,
        attachmentType,
        attachmentName,
      }).catch((notificationError) => {
        console.error("Message push notification failed:", notificationError)
      })

      setBody("")
      clearAttachment()
      textareaRef.current?.focus()
    } finally {
      setSending(false)
      submitLockRef.current = false
    }
  }

  const canSend = !sending && (!!body.trim() || !!uploadedAttachment)

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 z-20 mt-3 space-y-2.5 border-t border-white/[0.06] bg-black/90 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-3 backdrop-blur-xl"
    >
      <textarea
        ref={textareaRef}
        name="body"
        rows={1}
        value={body}
        onChange={handleBodyChange}
        placeholder={placeholder}
        disabled={sending}
        className="max-h-32 min-h-[44px] w-full resize-none rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 py-3 text-sm leading-5 text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45 disabled:opacity-60"
      />

      <FileUploader
        bucket="message-attachments"
        pathPrefix={`${clientUserId}/${currentUserId}`}
        label="Add image/video"
        buttonLabel="Choose file"
        disabled={sending}
        onUploaded={setUploadedAttachment}
        onClear={clearAttachment}
      />

      {error && (
        <p className="rounded-[0.9rem] border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSend}
        className="min-h-[44px] w-full rounded-[1rem] bg-smc-gold px-5 py-2.5 text-sm font-black text-black shadow-[0_0_20px_rgba(212,175,55,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
      >
        {sending ? "Sending..." : "Send Message"}
      </button>
    </form>
  )
}