"use client"

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
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

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] || null
    setError("")

    if (!selectedFile) {
      setFile(null)
      return
    }

    const maxSizeMb = 50
    const maxSizeBytes = maxSizeMb * 1024 * 1024

    if (selectedFile.size > maxSizeBytes) {
      setError(`Attachment is too large. Max file size is ${maxSizeMb}MB.`)
      event.target.value = ""
      setFile(null)
      return
    }

    setFile(selectedFile)
  }

  function clearFile() {
    setFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitLockRef.current) return

    const trimmedBody = body.trim()

    if (!trimmedBody && !file) return

    submitLockRef.current = true
    setSending(true)
    setError("")

    let attachmentPath: string | null = null
    let attachmentType: string | null = null
    let attachmentName: string | null = null

    try {
      if (file) {
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-")
        const filePath = `${clientUserId}/${currentUserId}/${Date.now()}-${safeFileName}`

        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(filePath, file)

        if (uploadError) {
          setError(`Upload failed: ${uploadError.message}`)
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
        return
      }

      setBody("")
      clearFile()
      textareaRef.current?.focus()
    } finally {
      setSending(false)
      submitLockRef.current = false
    }
  }

  const canSend = !sending && (!!body.trim() || !!file)

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

      <div className="rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 py-2.5">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span className="min-w-0 flex-1 truncate font-semibold text-white/80">
            {file ? file.name : "Add image/video"}
          </span>

          <span className="shrink-0 rounded-[0.85rem] bg-smc-gold px-3 py-2 text-xs font-black text-black">
            Choose file
          </span>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={sending}
          />
        </label>

        {file && (
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="truncate text-xs text-white/35">
              {(file.size / 1024 / 1024).toFixed(1)}MB selected
            </p>

            <button
              type="button"
              onClick={clearFile}
              disabled={sending}
              className="shrink-0 text-xs font-semibold text-white/45 underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        )}
      </div>

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
        {sending ? (file ? "Uploading..." : "Sending...") : "Send Message"}
      </button>
    </form>
  )
}