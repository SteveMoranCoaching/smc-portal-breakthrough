"use client"

import { motion, AnimatePresence } from "framer-motion"

export default function MessageToast({
  message,
}: {
  message: {
    sender: string
    body: string
  } | null
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed left-1/2 top-5 z-[999] w-[92%] max-w-sm -translate-x-1/2 rounded-3xl border border-yellow-500/30 bg-black/95 p-4 shadow-2xl backdrop-blur-xl"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
            New Message
          </p>

          <p className="mt-2 font-semibold text-white">
            {message.sender}
          </p>

          <p className="mt-1 line-clamp-2 text-sm text-gray-400">
            {message.body}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}