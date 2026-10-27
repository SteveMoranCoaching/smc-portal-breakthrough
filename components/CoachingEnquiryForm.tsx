
"use client"

import { useState, type FormEvent } from "react"
import { Turnstile } from "@marsidev/react-turnstile"

const goals = [
  "Powerlifting",
  "Sports Specific",
  "Strength Training",
  "Fat Loss",
  "Injury Rehab",
  "General Health",
  "Body Tone",
  "Other",
]

const coachingOptions = [
  "1-to-1 In Person",
  "Online Coaching",
  "Hybrid Coaching",
  "Programme Only",
  "Not Sure",
]

const referralOptions = [
  "Instagram",
  "Facebook",
  "TikTok",
  "Google Search",
  "Friend/Client Recommendation",
  "Smarter Fitness",
  "SMC Competition/Event",
  "Other",
]

const startOptions = [
  "As soon as possible",
  "Within the next month",
  "In 1–3 months",
  "Just exploring options",
]

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-500/60"

const labelClass =
  "mb-2 block text-sm font-bold text-white/85"

export default function CoachingEnquiryForm() {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileKey, setTurnstileKey] = useState(0)

  function toggleGoal(goal: string) {
    setSelectedGoals((current) =>
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal]
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setError("")

    if (selectedGoals.length === 0) {
      setError("Please select at least one training goal.")
      return
    }

    const form = event.currentTarget
    const data = new FormData(form)

    const payload = {
      full_name: data.get("full_name"),
      email: data.get("email"),
      phone: data.get("phone"),
      gender: data.get("gender"),
      goals: selectedGoals,
      coaching_method: data.get("coaching_method"),
      weekly_training_hours: data.get("weekly_training_hours"),
      training_experience: data.get("training_experience"),
      health_considerations: data.get("health_considerations"),
      preferred_contact: data.get("preferred_contact"),
      referral_source: data.get("referral_source"),
      referral_details: data.get("referral_details"),
      preferred_start: data.get("preferred_start"),
      additional_information: data.get("additional_information"),
      website: data.get("website"),
      turnstile_token: turnstileToken,
    }

    if (!turnstileToken) {
  setError("Please complete the security verification.")
  return
}

    setSubmitting(true)

    try {
      const response = await fetch("/api/coaching-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(
          result?.error || "Unable to submit your enquiry."
        )
      }

      setSubmitted(true)
      setSelectedGoals([])
      form.reset()
    } catch (err) {
  setError(
    err instanceof Error
      ? err.message
      : "Something went wrong. Please try again."
  )

  setTurnstileToken("")
  setTurnstileKey((current) => current + 1)
} finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-3xl border border-yellow-500/30 bg-yellow-500/[0.055] p-8 text-center"
      >
        <div className="text-4xl">✓</div>
        <h3 className="mt-4 text-2xl font-black">
          Enquiry received!
        </h3>
        <p className="mt-3 text-sm leading-7 text-white/65">
          Thanks for getting in touch with Steve Moran Coaching.
          I'll review your enquiry and get back to you using
          your preferred contact method.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-7 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-8"
    >
      <div>
        <h3 className="text-lg font-black">About You</h3>
        <p className="mt-1 text-xs text-white/45">
          A few details so I know who I'm speaking to.
        </p>
      </div>

      <div>
        <label htmlFor="full_name" className={labelClass}>
          Full Name *
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          maxLength={120}
          autoComplete="name"
          className={inputClass}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email Address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone Number *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            maxLength={40}
            autoComplete="tel"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="gender" className={labelClass}>
          Gender <span className="font-normal text-white/40">(optional)</span>
        </label>
        <select id="gender" name="gender" className={inputClass} defaultValue="">
          <option value="" className="bg-neutral-900">Prefer not to say</option>
          {["Female", "Male", "Other"].map((option) => (
            <option key={option} value={option} className="bg-neutral-900">
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="text-lg font-black">Your Training</h3>
        <p className="mt-1 text-xs text-white/45">
          Tell me what you're working towards.
        </p>
      </div>

      <fieldset>
        <legend className={labelClass}>
          What best describes your goals? *
        </legend>
        <p className="mb-3 text-xs text-white/45">
          Select as many as apply.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {goals.map((goal) => {
            const selected = selectedGoals.includes(goal)
            return (
              <label
                key={goal}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold transition sm:text-sm ${
                  selected
                    ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-400"
                    : "border-white/10 bg-white/[0.035] text-white/65"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleGoal(goal)}
                  className="accent-yellow-500"
                />
                {goal}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="coaching_method" className={labelClass}>
          Which coaching option interests you? *
        </label>
        <select
          id="coaching_method"
          name="coaching_method"
          required
          defaultValue=""
          className={inputClass}
        >
          <option value="" disabled className="bg-neutral-900">
            Select an option
          </option>
          {coachingOptions.map((option) => (
            <option key={option} value={option} className="bg-neutral-900">
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="weekly_training_hours" className={labelClass}>
          How many hours can you commit to training per week? *
        </label>
        <input
          id="weekly_training_hours"
          name="weekly_training_hours"
          required
          maxLength={100}
          placeholder="e.g. 3–4 hours across 3 sessions"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="training_experience" className={labelClass}>
          Tell me about your gym experience and current fitness levels *
        </label>
        <textarea
          id="training_experience"
          name="training_experience"
          required
          maxLength={3000}
          rows={5}
          placeholder="How long have you been training? What do you enjoy? How would you describe your current strength and fitness?"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="health_considerations" className={labelClass}>
          Any injuries, health considerations or accessibility needs
          you'd like me to take into account?
          <span className="font-normal text-white/40"> (optional)</span>
        </label>
        <textarea
          id="health_considerations"
          name="health_considerations"
          maxLength={1500}
          rows={3}
          placeholder="Only share what you're comfortable discussing at this stage."
          className={inputClass}
        />
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="text-lg font-black">Getting Started</h3>
      </div>

      <div>
        <label htmlFor="preferred_start" className={labelClass}>
          When would you like to start? *
        </label>
        <select
          id="preferred_start"
          name="preferred_start"
          required
          defaultValue=""
          className={inputClass}
        >
          <option value="" disabled className="bg-neutral-900">
            Select an option
          </option>
          {startOptions.map((option) => (
            <option key={option} value={option} className="bg-neutral-900">
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="referral_source" className={labelClass}>
          Where did you hear about Steve Moran Coaching? *
        </label>
        <select
          id="referral_source"
          name="referral_source"
          required
          defaultValue=""
          className={inputClass}
        >
          <option value="" disabled className="bg-neutral-900">
            Select an option
          </option>
          {referralOptions.map((option) => (
            <option key={option} value={option} className="bg-neutral-900">
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="referral_details" className={labelClass}>
          Anyone you'd like to give a shout-out to?
          <span className="font-normal text-white/40"> (optional)</span>
        </label>
        <input
          id="referral_details"
          name="referral_details"
          maxLength={300}
          placeholder="e.g. A friend or existing client"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="preferred_contact" className={labelClass}>
          What's the best way to contact you? *
        </label>
        <select
          id="preferred_contact"
          name="preferred_contact"
          required
          defaultValue=""
          className={inputClass}
        >
          <option value="" disabled className="bg-neutral-900">
            Select an option
          </option>
          {["Email", "Text/WhatsApp", "Phonecall"].map((option) => (
            <option key={option} value={option} className="bg-neutral-900">
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="additional_information" className={labelClass}>
          Anything else you'd like me to know?
          <span className="font-normal text-white/40"> (optional)</span>
        </label>
        <textarea
          id="additional_information"
          name="additional_information"
          maxLength={2000}
          rows={4}
          className={inputClass}
        />
      </div>

      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <p className="text-xs leading-6 text-white/45">
        Your details will be used to review and respond to your
        coaching enquiry. Please avoid including unnecessary
        sensitive medical information.
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}


<div className="flex justify-center">
  {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
    <Turnstile
      key={turnstileKey}
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      options={{ theme: "dark" }}
      onSuccess={(token) => setTurnstileToken(token)}
      onExpire={() => setTurnstileToken("")}
      onError={() => setTurnstileToken("")}
    />
  ) : (
    <p className="text-sm text-red-300">
      Security verification is not configured.
    </p>
  )}
</div>


      <button
        type="submit"
        disabled={submitting || !turnstileToken}
        className="min-h-12 w-full rounded-xl bg-yellow-500 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-400 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? "Sending Your Enquiry..." : "Submit Coaching Enquiry"}
      </button>
    </form>
  )
}
